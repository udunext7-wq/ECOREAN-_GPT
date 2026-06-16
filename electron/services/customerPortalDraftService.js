'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORTAL_STATUSES = ['DRAFT', 'REVIEW_REQUIRED', 'INTERNAL_APPROVED', 'REJECTED', 'ARCHIVED', 'PUBLISH_BLOCKED'];
const REVIEW_STATUSES = ['NOT_REVIEWED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUIRED'];
const EXTERNAL_DELIVERY_STATUS = 'DISABLED';
const AUTHENTICATION_STATUS = 'INTERNAL_PREVIEW_ONLY';
const PUBLIC_PORTAL_STATUS = 'NOT_AVAILABLE';

const DOCUMENT_TYPES = [
  'CUSTOMER_ESTIMATE',
  'CUSTOMER_CONTRACT',
  'CUSTOMER_SCHEDULE',
  'CUSTOMER_CHANGE_ORDER',
  'CUSTOMER_COMPLETION',
  'CUSTOMER_VISUALIZATION',
  'CUSTOMER_BOARD'
];

const INTERNAL_DOCUMENT_TYPES = [
  'INTERNAL_ESTIMATE',
  'INTERNAL_COST',
  'PURCHASE_ORDER_INTERNAL',
  'VENDOR_QUOTE',
  'LABOR_REPORT_INTERNAL',
  'PROFIT_REPORT',
  'MARGIN_REPORT',
  'PCE_REPORT',
  'ROOT_CAUSE_REPORT',
  'INTERNAL_INSPECTION',
  'BACKUP_MANIFEST'
];

const FORBIDDEN_KEY_PARTS = [
  'internal_cost', 'internalcost', 'purchase_cost', 'purchasecost', 'labor_cost', 'laborcost',
  'vendor_cost', 'vendorcost', 'margin', 'profit', 'expected_profit', 'expectedprofit',
  'live_margin', 'livemargin', 'pce', 'minimum_margin', 'cashflow_risk', 'vendor_amount',
  'internal_estimate', 'cost_breakdown', 'unit_price', 'supplier_price', 'vendor_comparison',
  'price_queue', 'price_calibration', 'unmatched_price', 'recommendation_scoring',
  'score_breakdown', 'approval_queue', 'internal_discount', 'internal_action', 'next_action',
  'overdue_risk', 'internal_notification', 'notification_severity', 'internal_priority',
  'internal_memo', 'memo_internal', 'consultation_internal', 'sales_probability', 'loss_reason',
  'strategy', 'risk_score', 'address_detail_internal', 'normalized_address_detail_internal',
  'canonical', 'fingerprint', 'hash', 'duplicate_candidate', 'provider_payload',
  'provider_configuration', 'coordinate', 'latitude', 'longitude', 'validation_reason',
  'review_memo', 'vendor', 'subcontractor', 'payroll', 'purchase_order', 'receiving_cost',
  'root_cause', 'prevention_rule', 'inspection_failure', 'backup', 'db_id', 'storage_path',
  'system_log', 'userdata', 'raw_phone', 'raw_email', 'resident_registration', 'account_number',
  'id_card', 'token'
];

const FORBIDDEN_VALUE_PATTERNS = [
  /<\s*script/i,
  /javascript:/i,
  /data:text\/html/i,
  /[a-zA-Z]:\\[^"']+/,
  /%APPDATA%/i,
  /userData/i,
  /app\.asar/i,
  /provider[_ -]?payload/i,
  /canonical[_ -]?key/i,
  /fingerprint/i,
  /risk[_ -]?score/i
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampProgress(value) {
  const number = safeNumber(value, 0);
  return Math.max(0, Math.min(100, Math.round(number)));
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function stableJson(value) {
  return JSON.stringify(value ?? null);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

function normalizeEnum(value, allowed, fallback) {
  const next = clean(value).toUpperCase();
  return allowed.includes(next) ? next : fallback;
}

function customerReference(prefix, id) {
  const raw = clean(id);
  return raw ? `${prefix}-${sha256(raw).slice(0, 10).toUpperCase()}` : '';
}

function safeDate(value) {
  const text = clean(value);
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function safeUrlReference(value) {
  const text = clean(value);
  if (!text) return '';
  if (/^[a-zA-Z]:\\/.test(text) || text.startsWith('\\\\')) return '';
  if (/^(javascript|data|file):/i.test(text)) return '';
  if (/^https?:\/\//i.test(text)) return text;
  return text.replace(/[\\/]/g, '-').slice(0, 120);
}

function publicMilestones(source) {
  const rows = asArray(source.milestones || source.scheduleItems || source.schedule_items);
  return rows.filter((row) => asObject(row).customer_visible === true || asObject(row).customerVisible === true)
    .map((row) => {
      row = asObject(row);
      return {
        title: clean(row.title || row.milestone_title || row.name),
        plannedDate: safeDate(row.plannedDate || row.planned_date),
        completedDate: safeDate(row.completedDate || row.completed_date),
        status: clean(row.status || row.customer_status || '예정'),
        progressNote: clean(row.progressNote || row.progress_note || row.public_note)
      };
    }).filter((row) => row.title);
}

function publicDocuments(source) {
  const rows = asArray(source.documents || source.documentItems || source.document_items);
  return rows.filter((row) => {
    row = asObject(row);
    const type = clean(row.documentType || row.document_type).toUpperCase();
    return (row.customer_approved === true || row.customerApproved === true) &&
      ['FINAL', 'APPROVED'].includes(clean(row.documentStatus || row.document_status).toUpperCase()) &&
      DOCUMENT_TYPES.includes(type) &&
      !INTERNAL_DOCUMENT_TYPES.includes(type);
  }).map((row) => {
    row = asObject(row);
    return {
      documentType: clean(row.documentType || row.document_type).toUpperCase(),
      title: clean(row.title || row.document_title),
      reference: customerReference('DOC', row.documentId || row.document_id || row.reference || row.path),
      displayReference: safeUrlReference(row.customerReference || row.customer_reference || row.reference || row.title)
    };
  }).filter((row) => row.title && row.reference);
}

function visiblePaymentSchedule(source) {
  return asArray(source.paymentSchedule || source.payment_schedule).filter((row) => {
    row = asObject(row);
    return row.customer_visible === true || row.customerVisible === true;
  }).map((row) => {
    row = asObject(row);
    return {
      title: clean(row.title || row.payment_title),
      dueDate: safeDate(row.dueDate || row.due_date),
      amount: safeNumber(row.customerAmount || row.customer_amount || row.amount),
      receivedStatus: clean(row.receivedStatus || row.received_status || '확인 필요')
    };
  });
}

function calculateProgress(source, milestones) {
  if (source.customerVisibleProgressPercentage !== undefined || source.customer_visible_progress_percentage !== undefined) {
    return clampProgress(source.customerVisibleProgressPercentage ?? source.customer_visible_progress_percentage);
  }
  if (!milestones.length) return 0;
  const done = milestones.filter((row) => ['완료', 'DONE', 'COMPLETED'].includes(clean(row.status).toUpperCase()) || row.completedDate).length;
  return clampProgress((done / milestones.length) * 100);
}

function scanForbidden(value, prefix = '') {
  const leaks = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => leaks.push(...scanForbidden(item, `${prefix}[${index}]`)));
    return leaks;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const pathKey = prefix ? `${prefix}.${key}` : key;
      const normalized = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const matched = FORBIDDEN_KEY_PARTS.find((part) => normalized.includes(part.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()));
      if (matched) leaks.push({ path: pathKey, reason: `forbidden key: ${matched}` });
      leaks.push(...scanForbidden(child, pathKey));
    });
    return leaks;
  }
  if (typeof value === 'string') {
    FORBIDDEN_VALUE_PATTERNS.forEach((pattern) => {
      if (pattern.test(value)) leaks.push({ path: prefix, reason: `forbidden value pattern: ${pattern}` });
    });
  }
  return leaks;
}

function summarizeExcludedInternalFields(source) {
  const leaks = scanForbidden(source);
  const categories = {
    finance: 0,
    estimate: 0,
    crm: 0,
    address: 0,
    operation: 0,
    privacy: 0,
    credential: 0
  };
  leaks.forEach((leak) => {
    const text = `${leak.path} ${leak.reason}`.toLowerCase();
    if (/cost|margin|profit|cashflow|vendor_amount|labor|purchase/.test(text)) categories.finance += 1;
    else if (/estimate|queue|scoring|calibration|pce|discount/.test(text)) categories.estimate += 1;
    else if (/action|notification|memo|probability|strategy|risk/.test(text)) categories.crm += 1;
    else if (/address|coordinate|latitude|longitude|provider|canonical|fingerprint|hash/.test(text)) categories.address += 1;
    else if (/vendor|subcontractor|payroll|receiving|inspection|backup|storage|system/.test(text)) categories.operation += 1;
    else if (/phone|email|resident|account|id_card/.test(text)) categories.privacy += 1;
    else if (/token/.test(text)) categories.credential += 1;
  });
  return {
    total: leaks.length,
    categories
  };
}

function buildCustomerSafePortalPayload(sourcePayload = {}) {
  sourcePayload = asObject(sourcePayload);
  const source = asObject(sourcePayload.sourcePayload || sourcePayload);
  const milestones = publicMilestones(source);
  const documents = publicDocuments(source);
  const progress = calculateProgress(source, milestones);
  const approvedTotal = safeNumber(source.approvedCustomerTotal || source.approved_customer_total || source.customerContractTotal || source.customer_contract_total);
  const paymentSchedule = visiblePaymentSchedule(source);

  return {
    portal: {
      title: clean(source.portalTitle || source.portal_title),
      status: 'INTERNAL_PREVIEW_ONLY',
      publicPortalStatus: PUBLIC_PORTAL_STATUS,
      externalDeliveryStatus: EXTERNAL_DELIVERY_STATUS,
      authenticationStatus: AUTHENTICATION_STATUS
    },
    project: {
      customerDisplayName: clean(source.customerDisplayName || source.customer_display_name || source.customerName || source.customer_name),
      projectDisplayName: clean(source.projectDisplayName || source.project_display_name || source.projectName || source.project_name || '프로젝트'),
      projectType: clean(source.projectType || source.project_type || 'UNKNOWN'),
      siteLocationSummary: clean(source.customerSafeAddressSummary || source.customer_safe_address_summary || source.approvedSiteLocationSummary || source.approved_site_location_summary || source.siteLocationSummary || source.site_location_summary),
      statusLabel: clean(source.projectStatusDisplayLabel || source.project_status_display_label || '준비 중'),
      startDate: safeDate(source.projectStartDate || source.project_start_date),
      expectedCompletionDate: safeDate(source.expectedCompletionDate || source.expected_completion_date),
      progressPercentage: progress
    },
    schedule: {
      milestones
    },
    estimate: {
      title: clean(source.approvedCustomerEstimateTitle || source.approved_customer_estimate_title || '고객용 견적 요약'),
      approvedCustomerTotal: approvedTotal,
      vatDisplay: clean(source.approvedVatDisplay || source.approved_vat_display || 'VAT 포함 여부 확인'),
      validityDate: safeDate(source.estimateValidityDate || source.estimate_validity_date),
      optionalItems: asArray(source.approvedOptionalItems || source.approved_optional_items).map((item) => clean(item)).filter(Boolean),
      documentReference: documents.find((doc) => doc.documentType === 'CUSTOMER_ESTIMATE')?.reference || ''
    },
    contract: {
      title: clean(source.contractTitle || source.contract_title || '계약 요약'),
      contractDate: safeDate(source.contractDate || source.contract_date),
      customerContractTotal: safeNumber(source.customerContractTotal || source.customer_contract_total || approvedTotal),
      paymentSchedule,
      paymentReceivedStatus: clean(source.paymentReceivedStatus || source.payment_received_status || '확인 필요'),
      remainingCustomerPaymentAmount: safeNumber(source.remainingCustomerPaymentAmount || source.remaining_customer_payment_amount),
      documentReference: documents.find((doc) => doc.documentType === 'CUSTOMER_CONTRACT')?.reference || ''
    },
    documents,
    contact: {
      companyName: clean(source.companyName || source.company_name || 'ECOREAN'),
      companyRepresentativeDisplayName: clean(source.companyRepresentativeDisplayName || source.company_representative_display_name || '대표'),
      publicBusinessPhone: clean(source.publicBusinessPhone || source.public_business_phone || ''),
      publicBusinessEmail: clean(source.publicBusinessEmail || source.public_business_email || ''),
      assignedCustomerContactDisplayName: clean(source.assignedCustomerContactDisplayName || source.assigned_customer_contact_display_name || '담당자'),
      businessHours: clean(source.approvedBusinessHoursInformation || source.approved_business_hours_information || '영업시간 확인 필요')
    },
    safety: {
      customerSafe: true,
      excludedInternalFieldSummary: summarizeExcludedInternalFields(source),
      generatedBy: 'allowlist'
    }
  };
}

function validateCustomerSafePortalPayload(payload = {}) {
  const safePayload = asObject(payload);
  const leaks = scanForbidden(safePayload);
  const documents = asArray(safePayload.documents);
  const blockedReasons = [];
  if (!clean(safePayload.portal?.title)) blockedReasons.push('portal title 누락');
  if (!clean(safePayload.project?.customerDisplayName)) blockedReasons.push('고객 표시명 누락');
  documents.forEach((doc) => {
    if (!DOCUMENT_TYPES.includes(clean(doc.documentType).toUpperCase())) blockedReasons.push(`승인되지 않은 문서 유형: ${clean(doc.documentType)}`);
  });
  leaks.forEach((leak) => blockedReasons.push(leak.reason));
  return {
    validationStatus: blockedReasons.length ? 'FAILED' : 'PASSED',
    customerSafety: blockedReasons.length ? 'FAILED' : 'PASSED',
    publishBlocked: blockedReasons.length > 0,
    blockedReasons,
    forbiddenLeaks: leaks,
    publicPortalStatus: PUBLIC_PORTAL_STATUS,
    externalDeliveryStatus: EXTERNAL_DELIVERY_STATUS,
    authenticationStatus: AUTHENTICATION_STATUS
  };
}

function getDraftBlockReasons(row, payload = {}) {
  const reasons = [];
  const validation = validateCustomerSafePortalPayload(payload);
  reasons.push(...validation.blockedReasons);
  if (!clean(row?.project_id)) reasons.push('프로젝트 연결 없음');
  if (!clean(row?.portal_title)) reasons.push('portal title 누락');
  if (!clean(row?.customer_display_name)) reasons.push('고객 표시명 누락');
  return [...new Set(reasons)];
}

function rowToDraft(row, database) {
  if (!row) return null;
  const snapshots = database.prepare('SELECT * FROM customer_portal_snapshots WHERE portal_draft_id = ? ORDER BY revision DESC').all(row.portal_draft_id);
  const history = database.prepare('SELECT * FROM customer_portal_audit_history WHERE portal_draft_id = ? ORDER BY changed_at DESC').all(row.portal_draft_id);
  return {
    ...row,
    customer_safe_payload: parseJson(row.customer_safe_payload_json, {}),
    snapshots: snapshots.map((snapshot) => ({
      ...snapshot,
      snapshot_payload: parseJson(snapshot.snapshot_payload_json, {})
    })),
    audit_history: history
  };
}

function createCustomerPortalDraftService({ sqliteService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) throw new Error('sqliteService with project database path is required');
  const projectDbPath = sqliteService.dbPaths.project;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS customer_portal_drafts (
        id TEXT PRIMARY KEY,
        portal_draft_id TEXT UNIQUE NOT NULL,
        lead_id TEXT,
        project_id TEXT,
        estimate_id TEXT,
        contract_id TEXT,
        portal_title TEXT,
        customer_display_name TEXT,
        project_display_name TEXT,
        project_type TEXT,
        site_location_summary TEXT,
        portal_status TEXT NOT NULL,
        review_status TEXT NOT NULL,
        authentication_status TEXT NOT NULL,
        external_delivery_status TEXT NOT NULL,
        internal_preview_enabled INTEGER DEFAULT 0,
        customer_safe_payload_json TEXT NOT NULL,
        customer_safe_payload_hash TEXT NOT NULL,
        source_revision INTEGER DEFAULT 1,
        approved_by TEXT,
        approved_at TEXT,
        rejected_by TEXT,
        rejected_at TEXT,
        rejection_reason TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );
      CREATE TABLE IF NOT EXISTS customer_portal_snapshots (
        id TEXT PRIMARY KEY,
        snapshot_id TEXT UNIQUE NOT NULL,
        portal_draft_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        snapshot_payload_json TEXT NOT NULL,
        snapshot_hash TEXT NOT NULL,
        validation_status TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customer_portal_audit_history (
        id TEXT PRIMARY KEY,
        history_id TEXT UNIQUE NOT NULL,
        portal_draft_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT,
        reason TEXT,
        changed_by TEXT,
        changed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customer_portal_preview_sessions (
        id TEXT PRIMARY KEY,
        preview_session_id TEXT UNIQUE NOT NULL,
        portal_draft_id TEXT NOT NULL,
        preview_token_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        expires_at TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_customer_portal_draft_status ON customer_portal_drafts(portal_status, review_status);
      CREATE INDEX IF NOT EXISTS idx_customer_portal_snapshot_draft ON customer_portal_snapshots(portal_draft_id, revision);
      CREATE INDEX IF NOT EXISTS idx_customer_portal_history_draft ON customer_portal_audit_history(portal_draft_id, changed_at);
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

  function addHistory(database, draftId, action, oldStatus, newStatus, payload = {}) {
    database.prepare(`
      INSERT INTO customer_portal_audit_history (
        id, history_id, portal_draft_id, action, old_status, new_status, reason, changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      makeId('CPHR'), makeId('CPH'), draftId, action, clean(oldStatus), clean(newStatus),
      clean(payload.reason || payload.note || payload.rejectionReason), clean(payload.changedBy || payload.actor || payload.createdBy || 'SYSTEM'), nowIso()
    );
  }

  function getRow(database, draftId) {
    return database.prepare('SELECT * FROM customer_portal_drafts WHERE portal_draft_id = ?').get(clean(draftId));
  }

  function saveDraft(database, draftId, payload, before) {
    payload = asObject(payload);
    if (before?.portal_status === 'ARCHIVED') throw new Error('Archived portal draft cannot be updated');
    const sourcePayload = asObject(payload.sourcePayload || payload);
    const safePayload = buildCustomerSafePortalPayload(sourcePayload);
    const validation = validateCustomerSafePortalPayload(safePayload);
    const timestamp = nowIso();
    const safeJson = stableJson(safePayload);
    const values = {
      portalTitle: safePayload.portal.title,
      customerDisplayName: safePayload.project.customerDisplayName,
      projectDisplayName: safePayload.project.projectDisplayName,
      projectType: safePayload.project.projectType,
      siteLocationSummary: safePayload.project.siteLocationSummary,
      payloadHash: sha256(safeJson)
    };
    const nextLinks = {
      leadId: clean(payload.leadId || payload.lead_id) || before?.lead_id || '',
      projectId: clean(payload.projectId || payload.project_id) || before?.project_id || '',
      estimateId: clean(payload.estimateId || payload.estimate_id) || before?.estimate_id || '',
      contractId: clean(payload.contractId || payload.contract_id) || before?.contract_id || ''
    };
    const blockReasons = getDraftBlockReasons({
      project_id: nextLinks.projectId,
      portal_title: values.portalTitle,
      customer_display_name: values.customerDisplayName
    }, safePayload);
    let portalStatus = blockReasons.length ? 'PUBLISH_BLOCKED' : normalizeEnum(payload.portalStatus || payload.portal_status, PORTAL_STATUSES, before?.portal_status || 'DRAFT');
    let reviewStatus = normalizeEnum(payload.reviewStatus || payload.review_status, REVIEW_STATUSES, before?.review_status || 'NOT_REVIEWED');
    if (before?.portal_status === 'INTERNAL_APPROVED' && before.customer_safe_payload_hash !== values.payloadHash) {
      portalStatus = blockReasons.length ? 'PUBLISH_BLOCKED' : 'REVIEW_REQUIRED';
      reviewStatus = 'REVISION_REQUIRED';
    }
    if (before) {
      database.prepare(`
        UPDATE customer_portal_drafts SET
          lead_id = COALESCE(?, lead_id), project_id = COALESCE(?, project_id),
          estimate_id = COALESCE(?, estimate_id), contract_id = COALESCE(?, contract_id),
          portal_title = ?, customer_display_name = ?, project_display_name = ?,
          project_type = ?, site_location_summary = ?, portal_status = ?, review_status = ?,
          authentication_status = ?, external_delivery_status = ?,
          customer_safe_payload_json = ?, customer_safe_payload_hash = ?,
          source_revision = source_revision + 1, updated_at = ?
        WHERE portal_draft_id = ?
      `).run(
        clean(payload.leadId || payload.lead_id) || null,
        clean(payload.projectId || payload.project_id) || null,
        clean(payload.estimateId || payload.estimate_id) || null,
        clean(payload.contractId || payload.contract_id) || null,
        values.portalTitle, values.customerDisplayName, values.projectDisplayName, values.projectType,
        values.siteLocationSummary, portalStatus, reviewStatus, AUTHENTICATION_STATUS,
        EXTERNAL_DELIVERY_STATUS, safeJson, values.payloadHash, timestamp, draftId
      );
    } else {
      database.prepare(`
        INSERT INTO customer_portal_drafts (
          id, portal_draft_id, lead_id, project_id, estimate_id, contract_id,
          portal_title, customer_display_name, project_display_name, project_type,
          site_location_summary, portal_status, review_status, authentication_status,
          external_delivery_status, internal_preview_enabled, customer_safe_payload_json,
          customer_safe_payload_hash, source_revision, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        makeId('CPDR'), draftId, clean(payload.leadId || payload.lead_id), clean(payload.projectId || payload.project_id),
        clean(payload.estimateId || payload.estimate_id), clean(payload.contractId || payload.contract_id),
        values.portalTitle, values.customerDisplayName, values.projectDisplayName, values.projectType,
        values.siteLocationSummary, portalStatus, reviewStatus, AUTHENTICATION_STATUS, EXTERNAL_DELIVERY_STATUS,
        0, safeJson, values.payloadHash, 1, clean(payload.createdBy || 'CEO'), timestamp, timestamp
      );
    }
    addHistory(database, draftId, before ? 'UPDATED' : 'CREATED', before?.portal_status || '', portalStatus, payload);
    addHistory(database, draftId, 'UPDATED', before?.portal_status || '', portalStatus, { ...payload, reason: `payload validation ${validation.validationStatus}` });
    return rowToDraft(getRow(database, draftId), database);
  }

  function createPortalDraft(payload = {}) {
    return withDb((database) => {
      const draftId = clean(payload.draftId || payload.portalDraftId || payload.portal_draft_id) || makeId('CPD');
      return saveDraft(database, draftId, payload, null);
    });
  }

  function updatePortalDraft(draftId, payload = {}) {
    if (asObject(draftId) === draftId) {
      payload = draftId;
      draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id;
    }
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      return saveDraft(database, clean(draftId), { ...payload, sourcePayload: payload.sourcePayload || payload }, before);
    });
  }

  function listPortalDrafts(filters = {}) {
    filters = asObject(filters);
    return withDb((database) => {
      let rows = database.prepare('SELECT * FROM customer_portal_drafts ORDER BY updated_at DESC').all();
      if (filters.portalStatus) rows = rows.filter((row) => row.portal_status === filters.portalStatus);
      if (filters.reviewStatus) rows = rows.filter((row) => row.review_status === filters.reviewStatus);
      if (filters.customerSafetyFailed) {
        rows = rows.filter((row) => validateCustomerSafePortalPayload(parseJson(row.customer_safe_payload_json, {})).customerSafety === 'FAILED');
      }
      return rows.map((row) => rowToDraft(row, database));
    });
  }

  function getPortalDraftDetail(draftId) {
    if (asObject(draftId) === draftId) draftId = draftId.draftId || draftId.portalDraftId || draftId.portal_draft_id;
    return withDb((database) => {
      const row = getRow(database, draftId);
      if (!row) throw new Error('Portal draft not found');
      return rowToDraft(row, database);
    });
  }

  function setStatus(draftId, status, action, payload = {}) {
    if (asObject(draftId) === draftId) {
      payload = draftId;
      draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id;
    }
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, updated_at = ?, archived_at = ? WHERE portal_draft_id = ?')
        .run(status, nowIso(), status === 'ARCHIVED' ? nowIso() : null, draftId);
      addHistory(database, draftId, action, before.portal_status, status, payload);
      return rowToDraft(getRow(database, draftId), database);
    });
  }

  function archivePortalDraft(draftId, payload = {}) {
    return setStatus(draftId, 'ARCHIVED', 'ARCHIVED', payload);
  }

  function restorePortalDraft(draftId, payload = {}) {
    return setStatus(draftId, 'DRAFT', 'RESTORED', payload);
  }

  function linkField(draftId, field, value, actionPayload = {}) {
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      database.prepare(`UPDATE customer_portal_drafts SET ${field} = ?, updated_at = ? WHERE portal_draft_id = ?`).run(clean(value), nowIso(), draftId);
      const after = getRow(database, draftId);
      const safePayload = parseJson(after.customer_safe_payload_json, {});
      const blockReasons = getDraftBlockReasons(after, safePayload);
      if (blockReasons.length) {
        database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, review_status = ?, updated_at = ? WHERE portal_draft_id = ?')
          .run('PUBLISH_BLOCKED', 'REVISION_REQUIRED', nowIso(), draftId);
      } else if (before.portal_status === 'PUBLISH_BLOCKED') {
        database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, updated_at = ? WHERE portal_draft_id = ?')
          .run('DRAFT', nowIso(), draftId);
      }
      addHistory(database, draftId, 'LINKED', before.portal_status, getRow(database, draftId).portal_status, { ...actionPayload, reason: `${field} linked` });
      return rowToDraft(getRow(database, draftId), database);
    });
  }

  function linkPortalDraftToLead(draftId, leadId) {
    if (asObject(draftId) === draftId) { leadId = draftId.leadId || draftId.lead_id; draftId = draftId.draftId || draftId.portalDraftId || draftId.portal_draft_id; }
    return linkField(clean(draftId), 'lead_id', leadId);
  }

  function linkPortalDraftToProject(draftId, projectId) {
    if (asObject(draftId) === draftId) { projectId = draftId.projectId || draftId.project_id; draftId = draftId.draftId || draftId.portalDraftId || draftId.portal_draft_id; }
    return linkField(clean(draftId), 'project_id', projectId);
  }

  function linkPortalDraftToEstimate(draftId, estimateId) {
    if (asObject(draftId) === draftId) { estimateId = draftId.estimateId || draftId.estimate_id; draftId = draftId.draftId || draftId.portalDraftId || draftId.portal_draft_id; }
    return linkField(clean(draftId), 'estimate_id', estimateId);
  }

  function linkPortalDraftToContract(draftId, contractId) {
    if (asObject(draftId) === draftId) { contractId = draftId.contractId || draftId.contract_id; draftId = draftId.draftId || draftId.portalDraftId || draftId.portal_draft_id; }
    return linkField(clean(draftId), 'contract_id', contractId);
  }

  function createPortalSnapshot(draftId, payload = {}) {
    if (asObject(draftId) === draftId) {
      payload = draftId;
      draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id;
    }
    return withDb((database) => {
      const row = getRow(database, draftId);
      if (!row) throw new Error('Portal draft not found');
      const revision = Number(database.prepare('SELECT COALESCE(MAX(revision), 0) + 1 AS next_revision FROM customer_portal_snapshots WHERE portal_draft_id = ?').get(draftId).next_revision);
      const snapshotPayload = parseJson(row.customer_safe_payload_json, {});
      const validation = validateCustomerSafePortalPayload(snapshotPayload);
      const snapshotId = makeId('CPS');
      const snapshotJson = stableJson(snapshotPayload);
      database.prepare(`
        INSERT INTO customer_portal_snapshots (
          id, snapshot_id, portal_draft_id, revision, snapshot_payload_json, snapshot_hash,
          validation_status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(makeId('CPSR'), snapshotId, draftId, revision, snapshotJson, sha256(snapshotJson), validation.validationStatus, clean(payload.createdBy || 'CEO'), nowIso());
      addHistory(database, draftId, 'SNAPSHOT_CREATED', row.portal_status, row.portal_status, { ...payload, reason: `revision ${revision}` });
      return database.prepare('SELECT * FROM customer_portal_snapshots WHERE snapshot_id = ?').get(snapshotId);
    });
  }

  function listPortalSnapshots(draftId) {
    if (asObject(draftId) === draftId) draftId = draftId.draftId || draftId.portalDraftId || draftId.portal_draft_id;
    return withDb((database) => database.prepare('SELECT * FROM customer_portal_snapshots WHERE portal_draft_id = ? ORDER BY revision DESC').all(clean(draftId)));
  }

  function getPortalSnapshotDetail(snapshotId) {
    if (asObject(snapshotId) === snapshotId) snapshotId = snapshotId.snapshotId || snapshotId.snapshot_id;
    return withDb((database) => {
      const row = database.prepare('SELECT * FROM customer_portal_snapshots WHERE snapshot_id = ?').get(clean(snapshotId));
      return row ? { ...row, snapshot_payload: parseJson(row.snapshot_payload_json, {}) } : null;
    });
  }

  function requestPortalDraftReview(draftId, payload = {}) {
    if (asObject(draftId) === draftId) { payload = draftId; draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id; }
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, review_status = ?, updated_at = ? WHERE portal_draft_id = ?')
        .run('REVIEW_REQUIRED', 'IN_REVIEW', nowIso(), draftId);
      addHistory(database, draftId, 'REVIEW_REQUESTED', before.portal_status, 'REVIEW_REQUIRED', payload);
      return rowToDraft(getRow(database, draftId), database);
    });
  }

  function approvePortalDraftInternal(draftId, payload = {}) {
    if (asObject(draftId) === draftId) { payload = draftId; draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id; }
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      const blockReasons = getDraftBlockReasons(before, parseJson(before.customer_safe_payload_json, {}));
      if (blockReasons.length) {
        database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, review_status = ?, updated_at = ? WHERE portal_draft_id = ?')
          .run('PUBLISH_BLOCKED', 'REVISION_REQUIRED', nowIso(), draftId);
        addHistory(database, draftId, 'APPROVAL_REVOKED', before.portal_status, 'PUBLISH_BLOCKED', { ...payload, reason: blockReasons.join('; ') });
        return rowToDraft(getRow(database, draftId), database);
      }
      database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, review_status = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE portal_draft_id = ?')
        .run('INTERNAL_APPROVED', 'APPROVED', clean(payload.approvedBy || payload.actor || 'CEO'), nowIso(), nowIso(), draftId);
      addHistory(database, draftId, 'APPROVED_INTERNAL', before.portal_status, 'INTERNAL_APPROVED', payload);
      return rowToDraft(getRow(database, draftId), database);
    });
  }

  function rejectPortalDraftInternal(draftId, payload = {}) {
    if (asObject(draftId) === draftId) { payload = draftId; draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id; }
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, review_status = ?, rejected_by = ?, rejected_at = ?, rejection_reason = ?, updated_at = ? WHERE portal_draft_id = ?')
        .run('REJECTED', 'REJECTED', clean(payload.rejectedBy || payload.actor || 'CEO'), nowIso(), clean(payload.reason || payload.rejectionReason), nowIso(), draftId);
      addHistory(database, draftId, 'REJECTED_INTERNAL', before.portal_status, 'REJECTED', payload);
      return rowToDraft(getRow(database, draftId), database);
    });
  }

  function revokePortalDraftApproval(draftId, payload = {}) {
    if (asObject(draftId) === draftId) { payload = draftId; draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id; }
    return withDb((database) => {
      const before = getRow(database, draftId);
      if (!before) throw new Error('Portal draft not found');
      database.prepare('UPDATE customer_portal_drafts SET portal_status = ?, review_status = ?, approved_by = NULL, approved_at = NULL, updated_at = ? WHERE portal_draft_id = ?')
        .run('REVIEW_REQUIRED', 'REVISION_REQUIRED', nowIso(), draftId);
      addHistory(database, draftId, 'APPROVAL_REVOKED', before.portal_status, 'REVIEW_REQUIRED', payload);
      return rowToDraft(getRow(database, draftId), database);
    });
  }

  function createInternalPreviewSession(draftId, payload = {}) {
    if (asObject(draftId) === draftId) { payload = draftId; draftId = payload.draftId || payload.portalDraftId || payload.portal_draft_id; }
    return withDb((database) => {
      const row = getRow(database, draftId);
      if (!row) throw new Error('Portal draft not found');
      const sessionId = makeId('CPPS');
      const rawToken = `${sessionId}.${crypto.randomBytes(24).toString('hex')}`;
      const tokenHash = sha256(rawToken);
      const expiresAt = payload.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString();
      database.prepare(`
        INSERT INTO customer_portal_preview_sessions (
          id, preview_session_id, portal_draft_id, preview_token_hash, status, expires_at,
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(makeId('CPPSR'), sessionId, draftId, tokenHash, 'ACTIVE', expiresAt, clean(payload.createdBy || 'CEO'), nowIso());
      database.prepare('UPDATE customer_portal_drafts SET internal_preview_enabled = 1, updated_at = ? WHERE portal_draft_id = ?').run(nowIso(), draftId);
      addHistory(database, draftId, 'PREVIEW_CREATED', row.portal_status, row.portal_status, payload);
      return {
        previewSessionId: sessionId,
        previewTokenHash: tokenHash,
        previewTokenMasked: `${rawToken.slice(0, 6)}...${rawToken.slice(-4)}`,
        status: 'ACTIVE',
        expiresAt,
        externalUrlCreated: false,
        authenticationStatus: AUTHENTICATION_STATUS
      };
    });
  }

  function revokeInternalPreviewSession(sessionId) {
    if (asObject(sessionId) === sessionId) sessionId = sessionId.sessionId || sessionId.previewSessionId || sessionId.preview_session_id;
    return withDb((database) => {
      const row = database.prepare('SELECT * FROM customer_portal_preview_sessions WHERE preview_session_id = ?').get(clean(sessionId));
      if (!row) throw new Error('Preview session not found');
      database.prepare('UPDATE customer_portal_preview_sessions SET status = ?, revoked_at = ? WHERE preview_session_id = ?').run('REVOKED', nowIso(), sessionId);
      addHistory(database, row.portal_draft_id, 'PREVIEW_REVOKED', '', '', { reason: 'preview revoked' });
      return { previewSessionId: sessionId, status: 'REVOKED' };
    });
  }

  function getInternalPreviewPayload(sessionId) {
    if (asObject(sessionId) === sessionId) sessionId = sessionId.sessionId || sessionId.previewSessionId || sessionId.preview_session_id;
    return withDb((database) => {
      const session = database.prepare('SELECT * FROM customer_portal_preview_sessions WHERE preview_session_id = ?').get(clean(sessionId));
      if (!session || session.status !== 'ACTIVE') throw new Error('Preview session is not active');
      if (session.expires_at && new Date(session.expires_at).getTime() <= Date.now()) {
        database.prepare('UPDATE customer_portal_preview_sessions SET status = ? WHERE preview_session_id = ?').run('EXPIRED', clean(sessionId));
        addHistory(database, session.portal_draft_id, 'PREVIEW_REVOKED', '', '', { reason: 'preview expired' });
        throw new Error('Preview session is expired');
      }
      const row = getRow(database, session.portal_draft_id);
      const payload = parseJson(row.customer_safe_payload_json, {});
      return {
        previewSessionId: session.preview_session_id,
        status: session.status,
        expiresAt: session.expires_at,
        payload,
        publicPortalStatus: PUBLIC_PORTAL_STATUS,
        externalUrlCreated: false
      };
    });
  }

  function getPortalDraftSummary() {
    return withDb((database) => {
      const rows = database.prepare('SELECT portal_status, review_status, customer_safe_payload_json FROM customer_portal_drafts').all();
      const count = (predicate) => rows.filter(predicate).length;
      return {
        totalDrafts: rows.length,
        reviewRequired: count((row) => row.portal_status === 'REVIEW_REQUIRED'),
        internalApproved: count((row) => row.portal_status === 'INTERNAL_APPROVED'),
        revisionRequired: count((row) => row.review_status === 'REVISION_REQUIRED'),
        publishBlocked: count((row) => row.portal_status === 'PUBLISH_BLOCKED'),
        archived: count((row) => row.portal_status === 'ARCHIVED'),
        customerSafetyFailed: count((row) => validateCustomerSafePortalPayload(parseJson(row.customer_safe_payload_json, {})).customerSafety === 'FAILED'),
        externalPublicDisabled: true,
        publicPortalStatus: PUBLIC_PORTAL_STATUS
      };
    });
  }

  function createPortalDraftAuditReport(payload = {}) {
    return withDb((database) => {
      const rows = database.prepare('SELECT * FROM customer_portal_drafts ORDER BY updated_at DESC').all();
      const history = database.prepare('SELECT * FROM customer_portal_audit_history ORDER BY changed_at DESC LIMIT 80').all();
      const summary = getPortalDraftSummary();
      fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, 'RC_0_4_3_CUSTOMER_PORTAL_DRAFT_AUDIT_REPORT.md');
      const lines = [
        '# RC-0.4.3 Customer Portal Draft Audit Report',
        '',
        `- generated_at: ${nowIso()}`,
        `- final_decision: ${clean(payload.finalDecision || 'MERGE_READY')}`,
        `- total_drafts: ${summary.totalDrafts}`,
        `- publish_blocked: ${summary.publishBlocked}`,
        `- customer_safety_failed: ${summary.customerSafetyFailed}`,
        `- external_delivery_status: ${EXTERNAL_DELIVERY_STATUS}`,
        `- authentication_status: ${AUTHENTICATION_STATUS}`,
        `- public_portal_status: ${PUBLIC_PORTAL_STATUS}`,
        '',
        '## Drafts',
        ...rows.map((row) => `- ${row.portal_draft_id}: ${row.portal_title} / ${row.portal_status} / ${row.review_status}`),
        '',
        '## Recent Audit History',
        ...history.map((row) => `- ${row.changed_at} ${row.portal_draft_id} ${row.action} ${row.old_status || '-'} -> ${row.new_status || '-'}`)
      ];
      fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
      return { ok: true, reportPath, summary };
    });
  }

  return {
    createPortalDraft,
    updatePortalDraft,
    listPortalDrafts,
    getPortalDraftDetail,
    archivePortalDraft,
    restorePortalDraft,
    buildCustomerSafePortalPayload,
    validateCustomerSafePortalPayload,
    createPortalSnapshot,
    listPortalSnapshots,
    getPortalSnapshotDetail,
    linkPortalDraftToLead,
    linkPortalDraftToProject,
    linkPortalDraftToEstimate,
    linkPortalDraftToContract,
    approvePortalDraftInternal,
    rejectPortalDraftInternal,
    requestPortalDraftReview,
    revokePortalDraftApproval,
    createInternalPreviewSession,
    revokeInternalPreviewSession,
    getInternalPreviewPayload,
    getPortalDraftSummary,
    createPortalDraftAuditReport
  };
}

module.exports = {
  createCustomerPortalDraftService,
  buildCustomerSafePortalPayload,
  validateCustomerSafePortalPayload,
  scanForbidden
};
