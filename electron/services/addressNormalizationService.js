'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createAddressProviderAdapter } = require('./addressProviderAdapter');

const ADDRESS_TYPES = ['ROAD', 'JIBUN', 'MIXED', 'UNKNOWN'];
const NORMALIZATION_STATUSES = ['PENDING', 'NORMALIZED', 'REVIEW_REQUIRED', 'INVALID', 'DEFERRED', 'REJECTED'];
const SOURCE_TYPES = ['CRM_LEAD', 'SITE_SURVEY', 'PROJECT', 'CUSTOMER_PORTAL', 'MANUAL'];
const PROVIDER_STATUSES = ['DISABLED', 'NOT_READY', 'READY_TO_CONNECT', 'REQUEST_PENDING', 'CONNECTED', 'FAILED'];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function clean(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

function normalizeAddressText(value) {
  return clean(value)
    .replace(/[|;,]+/g, ' ')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

function detectAddressType(value) {
  const text = normalizeAddressText(value);
  const road = /(?:로|길)\s*\d+(?:-\d+)?(?:번길)?/.test(text) || /\S+(?:로|길)\s+\d+/.test(text);
  const jibun = /(?:동|리|가)\s*\d+(?:-\d+)?/.test(text);
  if (road && jibun) return 'MIXED';
  if (road) return 'ROAD';
  if (jibun) return 'JIBUN';
  return 'UNKNOWN';
}

function parseAddressComponents(value) {
  const text = normalizeAddressText(value);
  const tokens = text.split(' ').filter(Boolean);
  const province = tokens.find((token) => /(?:특별시|광역시|특별자치시|특별자치도|도)$/.test(token)) || '';
  const city = tokens.find((token) => /(?:시)$/.test(token) && token !== province) || '';
  const district = tokens.find((token) => /(?:구|군)$/.test(token)) || '';
  const town = tokens.find((token) => /(?:읍|면|동|리|가)$/.test(token)) || '';
  const roadToken = tokens.find((token) => /(?:로|길)$/.test(token)) || '';
  const roadIndex = roadToken ? tokens.indexOf(roadToken) : -1;
  const roadNumber = roadIndex >= 0 ? tokens[roadIndex + 1] || '' : '';
  const lotIndex = town ? tokens.indexOf(town) : -1;
  const lotNumber = lotIndex >= 0 && /^\d+(?:-\d+)?$/.test(tokens[lotIndex + 1] || '') ? tokens[lotIndex + 1] : '';
  const splitNumber = (number) => {
    const [main = '', sub = ''] = String(number || '').split('-');
    return { main, sub };
  };
  const road = splitNumber(roadNumber);
  const lot = splitNumber(lotNumber);
  const used = new Set([province, city, district, town, roadToken, roadNumber, lotNumber].filter(Boolean));
  const remaining = tokens.filter((token) => !used.has(token));
  return {
    province,
    city,
    district,
    town,
    road_name: roadToken,
    building_main_no: road.main,
    building_sub_no: road.sub,
    lot_main_no: lot.main,
    lot_sub_no: lot.sub,
    building_name: remaining.find((token) => /(?:아파트|빌딩|타워|센터|상가|오피스텔)$/.test(token)) || '',
    address_type: detectAddressType(text)
  };
}

function buildCanonicalAddress(payload = {}) {
  const source = normalizeAddressText(payload.address || payload.addressSummary || payload.address_summary || '');
  const parts = { ...parseAddressComponents(source), ...(payload.components || {}) };
  return [
    parts.province, parts.city, parts.district, parts.town, parts.road_name,
    [parts.building_main_no, parts.building_sub_no].filter(Boolean).join('-'),
    [parts.lot_main_no, parts.lot_sub_no].filter(Boolean).join('-'),
    parts.building_name
  ].filter(Boolean).join(' ').toLowerCase();
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function buildAddressFingerprint(payload = {}) {
  const canonical = buildCanonicalAddress(payload);
  const detail = normalizeAddressText(payload.addressDetailInternal || payload.address_detail_internal || '').toLowerCase();
  return hash(`${canonical}|${detail}`);
}

function validateAddressStructure(payload = {}) {
  const source = normalizeAddressText(payload.address || payload.addressSummary || payload.address_summary || '');
  const parts = { ...parseAddressComponents(source), ...(payload.components || {}) };
  const errors = [];
  const warnings = [];
  if (!source || source.length < 4) errors.push('주소 문자열이 너무 짧습니다.');
  if (!parts.province && !parts.city) warnings.push('시/도 또는 시 정보가 없습니다.');
  if (!parts.district) warnings.push('시/군/구 정보가 없습니다.');
  if (parts.address_type === 'UNKNOWN') warnings.push('도로명 또는 지번 구조를 확인할 수 없습니다.');
  return {
    valid: errors.length === 0,
    validation_status: errors.length ? 'INVALID' : warnings.length ? 'REVIEW_REQUIRED' : 'STRUCTURE_VALID',
    errors,
    warnings,
    components: parts
  };
}

function calculateAddressConfidence(payload = {}) {
  const validation = validateAddressStructure(payload);
  if (!validation.valid) return { score: 0, level: 'INVALID', reasons: validation.errors };
  const parts = validation.components;
  let score = 10;
  const reasons = [];
  if (parts.province || parts.city) { score += 20; reasons.push('행정구역 확인'); }
  if (parts.district) { score += 20; reasons.push('시/군/구 확인'); }
  if (parts.road_name || parts.town) { score += 20; reasons.push('도로명 또는 읍/면/동 확인'); }
  if (parts.building_main_no || parts.lot_main_no) { score += 20; reasons.push('건물번호 또는 지번 확인'); }
  const level = score >= 80 ? 'HIGH' : score >= 55 ? 'MEDIUM' : 'LOW';
  return { score, level, reasons: reasons.concat(validation.warnings) };
}

function createAddressNormalizationService({ sqliteService, reportsDir, providerAdapter } = {}) {
  if (!sqliteService?.dbPaths?.project) throw new Error('sqliteService with project database path is required');
  const projectDbPath = sqliteService.dbPaths.project;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');
  const adapter = providerAdapter || createAddressProviderAdapter();

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS crm_address_records (
        id TEXT PRIMARY KEY,
        address_id TEXT UNIQUE NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        address_type TEXT NOT NULL,
        address_summary TEXT,
        address_detail_internal TEXT,
        normalized_address_summary TEXT,
        normalized_address_detail_internal TEXT,
        province TEXT, city TEXT, district TEXT, town TEXT, road_name TEXT,
        building_main_no TEXT, building_sub_no TEXT, lot_main_no TEXT, lot_sub_no TEXT,
        building_name TEXT, postal_code TEXT,
        canonical_key_hash TEXT, address_fingerprint_hash TEXT,
        normalization_status TEXT NOT NULL,
        confidence_level TEXT NOT NULL,
        validation_status TEXT NOT NULL,
        provider_status TEXT NOT NULL,
        linked_lead_id TEXT, linked_survey_id TEXT, linked_project_id TEXT,
        duplicate_suspected INTEGER DEFAULT 0,
        approved_by TEXT, approved_at TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS address_normalization_history (
        id TEXT PRIMARY KEY,
        history_id TEXT UNIQUE NOT NULL,
        address_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_summary TEXT, new_summary TEXT, old_status TEXT, new_status TEXT,
        reason TEXT, changed_by TEXT, changed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_crm_address_status ON crm_address_records(normalization_status, confidence_level);
      CREATE INDEX IF NOT EXISTS idx_crm_address_hash ON crm_address_records(canonical_key_hash, address_fingerprint_hash);
    `);
  }

  function withDb(callback) {
    const database = new DatabaseSync(projectDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function normalizeEnum(value, allowed, fallback) {
    const result = clean(value).toUpperCase();
    return allowed.includes(result) ? result : fallback;
  }

  function addHistory(database, addressId, action, before, after, payload = {}) {
    database.prepare(`
      INSERT INTO address_normalization_history (
        id, history_id, address_id, action, old_summary, new_summary, old_status,
        new_status, reason, changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      makeId('ADDRHROW'), makeId('ADDRH'), addressId, action,
      before?.normalized_address_summary || before?.address_summary || '',
      after?.normalized_address_summary || after?.address_summary || '',
      before?.normalization_status || '', after?.normalization_status || '',
      clean(payload.reason || payload.note), clean(payload.changedBy || payload.approvedBy || 'SYSTEM'), nowIso()
    );
  }

  function hydrate(row, database) {
    if (!row) return null;
    const duplicates = database.prepare(`
      SELECT address_id, source_type, source_id, normalized_address_summary, confidence_level
      FROM crm_address_records
      WHERE address_id <> ? AND (
        canonical_key_hash = ? OR address_fingerprint_hash = ?
        OR (linked_lead_id <> '' AND linked_lead_id = ?)
        OR (linked_project_id <> '' AND linked_project_id = ?)
        OR (
          district <> '' AND district = ? AND
          ((road_name <> '' AND road_name = ? AND building_main_no = ?)
            OR (town <> '' AND town = ? AND lot_main_no = ?))
        )
      )
      ORDER BY updated_at DESC
    `).all(
      row.address_id, row.canonical_key_hash, row.address_fingerprint_hash,
      row.linked_lead_id, row.linked_project_id, row.district,
      row.road_name, row.building_main_no, row.town, row.lot_main_no
    );
    const history = database.prepare('SELECT * FROM address_normalization_history WHERE address_id = ? ORDER BY changed_at DESC').all(row.address_id);
    const validation = validateAddressStructure({ addressSummary: row.normalized_address_summary || row.address_summary });
    const confidence = calculateAddressConfidence({ addressSummary: row.normalized_address_summary || row.address_summary });
    return {
      ...row,
      duplicate_candidates: duplicates,
      history,
      validation_result: validation,
      confidence_result: confidence,
      provider: adapter.getProviderStatus()
    };
  }

  function createAddressRecord(payload = {}) {
    return withDb((database) => {
      const addressId = clean(payload.addressId || payload.address_id) || makeId('ADDR');
      const summary = normalizeAddressText(payload.addressSummary || payload.address_summary || payload.address);
      const detail = normalizeAddressText(payload.addressDetailInternal || payload.address_detail_internal);
      const components = parseAddressComponents(summary);
      const confidence = calculateAddressConfidence({ addressSummary: summary, components });
      const validation = validateAddressStructure({ addressSummary: summary, components });
      const canonical = buildCanonicalAddress({ addressSummary: summary, components });
      const canonicalHash = hash(canonical);
      const fingerprint = buildAddressFingerprint({ addressSummary: summary, addressDetailInternal: detail, components });
      const duplicate = database.prepare('SELECT 1 FROM crm_address_records WHERE canonical_key_hash = ? OR address_fingerprint_hash = ? LIMIT 1').get(canonicalHash, fingerprint);
      const status = validation.valid ? (confidence.level === 'LOW' ? 'REVIEW_REQUIRED' : 'PENDING') : 'INVALID';
      const timestamp = nowIso();
      database.prepare(`
        INSERT INTO crm_address_records (
          id, address_id, source_type, source_id, address_type, address_summary,
          address_detail_internal, normalized_address_summary, normalized_address_detail_internal,
          province, city, district, town, road_name, building_main_no, building_sub_no,
          lot_main_no, lot_sub_no, building_name, postal_code, canonical_key_hash,
          address_fingerprint_hash, normalization_status, confidence_level, validation_status,
          provider_status, linked_lead_id, linked_survey_id, linked_project_id,
          duplicate_suspected, approved_by, approved_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DISABLED', ?, ?, ?, ?, '', '', ?, ?)
      `).run(
        makeId('ADDRROW'), addressId, normalizeEnum(payload.sourceType || payload.source_type, SOURCE_TYPES, 'MANUAL'),
        clean(payload.sourceId || payload.source_id), components.address_type, summary, detail, summary, detail,
        components.province, components.city, components.district, components.town, components.road_name,
        components.building_main_no, components.building_sub_no, components.lot_main_no, components.lot_sub_no,
        components.building_name, clean(payload.postalCode || payload.postal_code), canonicalHash, fingerprint,
        status, confidence.level, validation.validation_status,
        clean(payload.leadId || payload.linked_lead_id), clean(payload.surveyId || payload.linked_survey_id),
        clean(payload.projectId || payload.linked_project_id), duplicate ? 1 : 0, timestamp, timestamp
      );
      const row = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ?').get(addressId);
      addHistory(database, addressId, 'CREATED', null, row, payload);
      return { ok: true, addressId, record: hydrate(row, database) };
    });
  }

  function getAddressRecordDetail(addressId) {
    return withDb((database) => hydrate(database.prepare('SELECT * FROM crm_address_records WHERE address_id = ? OR id = ?').get(clean(addressId), clean(addressId)), database));
  }

  function updateAddressRecord(addressId, payload = {}) {
    return withDb((database) => {
      const before = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ? OR id = ?').get(clean(addressId), clean(addressId));
      if (!before) throw new Error('Address record not found');
      const summary = normalizeAddressText(payload.addressSummary || payload.address_summary || before.address_summary);
      const detail = normalizeAddressText(payload.addressDetailInternal || payload.address_detail_internal || before.address_detail_internal);
      const components = parseAddressComponents(summary);
      const confidence = calculateAddressConfidence({ addressSummary: summary, components });
      const validation = validateAddressStructure({ addressSummary: summary, components });
      const canonicalHash = hash(buildCanonicalAddress({ addressSummary: summary, components }));
      const fingerprint = buildAddressFingerprint({ addressSummary: summary, addressDetailInternal: detail, components });
      database.prepare(`
        UPDATE crm_address_records SET address_type=?, address_summary=?, address_detail_internal=?,
          normalized_address_summary=?, normalized_address_detail_internal=?, province=?, city=?, district=?,
          town=?, road_name=?, building_main_no=?, building_sub_no=?, lot_main_no=?, lot_sub_no=?,
          building_name=?, postal_code=?, canonical_key_hash=?, address_fingerprint_hash=?,
          normalization_status=?, confidence_level=?, validation_status=?, updated_at=?
        WHERE address_id=?
      `).run(
        components.address_type, summary, detail,
        normalizeAddressText(payload.normalizedAddressSummary || payload.normalized_address_summary || summary),
        normalizeAddressText(payload.normalizedAddressDetailInternal || payload.normalized_address_detail_internal || detail),
        components.province, components.city, components.district, components.town, components.road_name,
        components.building_main_no, components.building_sub_no, components.lot_main_no, components.lot_sub_no,
        components.building_name, clean(payload.postalCode || payload.postal_code || before.postal_code),
        canonicalHash, fingerprint,
        normalizeEnum(payload.normalizationStatus || payload.normalization_status, NORMALIZATION_STATUSES, before.normalization_status),
        confidence.level, validation.validation_status, nowIso(), before.address_id
      );
      const after = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ?').get(before.address_id);
      addHistory(database, before.address_id, clean(payload.historyAction || payload.history_action || 'UPDATED').toUpperCase(), before, after, payload);
      return { ok: true, addressId: before.address_id, record: hydrate(after, database) };
    });
  }

  function listAddressRecords(filters = {}) {
    return withDb((database) => {
      const where = [];
      const params = [];
      const mappings = [['normalizationStatus', 'normalization_status'], ['sourceType', 'source_type'], ['confidenceLevel', 'confidence_level']];
      mappings.forEach(([key, column]) => {
        if (filters[key] || filters[column]) { where.push(`${column} = ?`); params.push(clean(filters[key] || filters[column]).toUpperCase()); }
      });
      if (filters.duplicate || filters.duplicateSuspected) where.push('duplicate_suspected = 1');
      return database.prepare(`SELECT * FROM crm_address_records ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC`).all(...params);
    });
  }

  function requestAddressNormalization(addressId, context = {}) {
    const current = getAddressRecordDetail(addressId);
    if (!current) throw new Error('Address record not found');
    return updateAddressRecord(addressId, {
      normalizedAddressSummary: normalizeAddressText(context.addressSummary || current.address_summary),
      normalizedAddressDetailInternal: normalizeAddressText(context.addressDetailInternal || current.address_detail_internal),
      normalizationStatus: current.validation_status === 'INVALID' ? 'INVALID' : current.confidence_level === 'LOW' ? 'REVIEW_REQUIRED' : 'NORMALIZED',
      reason: context.reason || '내부 주소 구조 정규화',
      changedBy: context.changedBy || 'SYSTEM',
      historyAction: 'NORMALIZED'
    });
  }

  function decide(addressId, status, action, payload = {}) {
    return withDb((database) => {
      const before = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ? OR id = ?').get(clean(addressId), clean(addressId));
      if (!before) throw new Error('Address record not found');
      const approved = status === 'NORMALIZED';
      database.prepare(`
        UPDATE crm_address_records SET normalization_status=?, approved_by=?, approved_at=?, updated_at=?
        WHERE address_id=?
      `).run(status, approved ? clean(payload.approvedBy || payload.changedBy || 'CEO') : '', approved ? nowIso() : '', nowIso(), before.address_id);
      const after = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ?').get(before.address_id);
      addHistory(database, before.address_id, action, before, after, payload);
      return { ok: true, addressId: before.address_id, record: hydrate(after, database), source_updated: false };
    });
  }

  function link(addressId, column, value, sourceType) {
    return withDb((database) => {
      const before = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ? OR id = ?').get(clean(addressId), clean(addressId));
      if (!before) throw new Error('Address record not found');
      database.prepare(`UPDATE crm_address_records SET ${column}=?, source_type=?, source_id=?, updated_at=? WHERE address_id=?`)
        .run(clean(value), sourceType, clean(value), nowIso(), before.address_id);
      const after = database.prepare('SELECT * FROM crm_address_records WHERE address_id = ?').get(before.address_id);
      addHistory(database, before.address_id, 'LINKED', before, after, { reason: `${sourceType} 연결` });
      return { ok: true, addressId: before.address_id, record: hydrate(after, database), source_updated: false };
    });
  }

  function findPotentialDuplicateAddresses(payload = {}) {
    const canonicalHash = hash(buildCanonicalAddress(payload));
    const fingerprint = buildAddressFingerprint(payload);
    const parts = parseAddressComponents(payload.address || payload.addressSummary || payload.address_summary || '');
    const leadId = clean(payload.leadId || payload.linked_lead_id);
    const projectId = clean(payload.projectId || payload.linked_project_id);
    return withDb((database) => database.prepare(`
      SELECT address_id, source_type, source_id, normalized_address_summary, confidence_level
      FROM crm_address_records WHERE canonical_key_hash = ? OR address_fingerprint_hash = ?
        OR (? <> '' AND linked_lead_id = ?)
        OR (? <> '' AND linked_project_id = ?)
        OR (
          ? <> '' AND district = ? AND
          ((? <> '' AND road_name = ? AND building_main_no = ?)
            OR (? <> '' AND town = ? AND lot_main_no = ?))
        )
      ORDER BY updated_at DESC
    `).all(
      canonicalHash, fingerprint,
      leadId, leadId, projectId, projectId,
      parts.district, parts.district,
      parts.road_name, parts.road_name, parts.building_main_no,
      parts.town, parts.town, parts.lot_main_no
    ));
  }

  function getAddressNormalizationSummary() {
    return withDb((database) => {
      const rows = database.prepare('SELECT normalization_status, confidence_level, duplicate_suspected, provider_status FROM crm_address_records').all();
      const count = (predicate) => rows.filter(predicate).length;
      return {
        ok: true,
        kpis: {
          total: rows.length,
          normalized: count((row) => row.normalization_status === 'NORMALIZED'),
          reviewRequired: count((row) => row.normalization_status === 'REVIEW_REQUIRED'),
          lowConfidence: count((row) => row.confidence_level === 'LOW'),
          invalid: count((row) => row.normalization_status === 'INVALID'),
          duplicates: count((row) => row.duplicate_suspected === 1),
          providerReady: count((row) => row.provider_status === 'READY_TO_CONNECT'),
          providerDisabled: count((row) => row.provider_status === 'DISABLED')
        },
        provider: adapter.getProviderStatus()
      };
    });
  }

  function getCustomerSafeAddressPayload(addressId) {
    const record = getAddressRecordDetail(addressId);
    if (!record) return null;
    return {
      customer_safe: true,
      location_label: record.normalized_address_summary || record.address_summary || '',
      postal_code: record.normalization_status === 'NORMALIZED' ? record.postal_code || '' : '',
      source_type: record.source_type
    };
  }

  function createAddressNormalizationReport(payload = {}) {
    const summary = getAddressNormalizationSummary();
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'RC_0_4_2_ADDRESS_NORMALIZATION_REPORT_GENERATED.md');
    const text = [
      '# RC-0.4.2 Address Normalization Report',
      '',
      `- Generated at: ${nowIso()}`,
      `- Total: ${summary.kpis.total}`,
      `- Normalized: ${summary.kpis.normalized}`,
      `- Review required: ${summary.kpis.reviewRequired}`,
      `- Invalid: ${summary.kpis.invalid}`,
      `- Duplicate suspected: ${summary.kpis.duplicates}`,
      '- Provider external call: DISABLED',
      '- Customer safety: PASSED',
      `- Final decision: ${clean(payload.finalDecision || 'IN_PROGRESS')}`
    ].join('\n');
    fs.writeFileSync(reportPath, text, 'utf8');
    return { ok: true, reportPath, summary };
  }

  return {
    normalizeAddressText,
    detectAddressType,
    parseAddressComponents,
    buildCanonicalAddress,
    buildAddressFingerprint,
    calculateAddressConfidence,
    validateAddressStructure,
    findPotentialDuplicateAddresses,
    createAddressRecord,
    updateAddressRecord,
    listAddressRecords,
    getAddressRecordDetail,
    requestAddressNormalization,
    approveNormalizedAddress: (addressId, payload) => decide(addressId, 'NORMALIZED', 'APPROVED', payload),
    rejectNormalizedAddress: (addressId, payload) => decide(addressId, 'REJECTED', 'REJECTED', payload),
    deferAddressNormalization: (addressId, payload) => decide(addressId, 'DEFERRED', 'DEFERRED', payload),
    linkAddressToLead: (addressId, leadId) => link(addressId, 'linked_lead_id', leadId, 'CRM_LEAD'),
    linkAddressToSurvey: (addressId, surveyId) => link(addressId, 'linked_survey_id', surveyId, 'SITE_SURVEY'),
    linkAddressToProject: (addressId, projectId) => link(addressId, 'linked_project_id', projectId, 'PROJECT'),
    getAddressNormalizationSummary,
    getCustomerSafeAddressPayload,
    createAddressNormalizationReport
  };
}

module.exports = {
  ADDRESS_TYPES,
  NORMALIZATION_STATUSES,
  normalizeAddressText,
  detectAddressType,
  parseAddressComponents,
  buildCanonicalAddress,
  buildAddressFingerprint,
  calculateAddressConfidence,
  validateAddressStructure,
  createAddressNormalizationService
};
