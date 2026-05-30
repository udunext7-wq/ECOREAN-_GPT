'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_VERSION = 'RC-0.3.2';

const FORBIDDEN_CUSTOMER_TERMS = [
  'internal cost',
  'cost',
  'margin',
  'pce',
  'vendor',
  'labor',
  'purchase',
  'receiving',
  'actual_used',
  'variance',
  'calibration',
  'backup path',
  'onboarding issue',
  'import rows',
  'manual matching logs',
  'approval queue',
  'internal',
  'profit',
  'risk_score'
];

const VALID_ESTIMATE_TYPES = new Set(['BATHROOM', 'KITCHEN', 'FULL_REMODELING']);
const HIGH_PRIORITY_PRICE_TERMS = ['타일', '방수', '도기', '수전', '주방', '상판', '바닥', '도배', '목공', '전기', '철거', '폐기물'];
const SENSITIVE_LOG_FIELDS = new Set(['customer_phone', 'customer_email', 'detailed_address', 'memo']);

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function sanitizeText(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function toJson(value) {
  if (value === undefined || value === null || value === '') return '';
  return JSON.stringify(value);
}

function normalizeJsonPayload(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    return parseJson(value, value);
  }
  return null;
}

function redactForLog(payload) {
  const source = payload || {};
  return Object.fromEntries(Object.entries(source).map(([key, value]) => (
    SENSITIVE_LOG_FIELDS.has(key) ? [key, '[REDACTED]'] : [key, value]
  )));
}

function createRealProjectIntakeService({ sqliteService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) {
    throw new Error('sqliteService with project database path is required');
  }

  const projectDbPath = sqliteService.dbPaths.project;
  const masterDbPath = sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function withProjectDb(callback) {
    const database = new DatabaseSync(projectDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function withMasterDb(callback) {
    const database = new DatabaseSync(masterDbPath);
    try {
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS real_project_intakes (
        id TEXT PRIMARY KEY,
        intake_id TEXT UNIQUE NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        customer_email TEXT,
        customer_type TEXT,
        site_name TEXT,
        address_summary TEXT,
        detailed_address TEXT,
        building_type TEXT,
        floor TEXT,
        elevator_available INTEGER,
        parking_available INTEGER,
        site_access_note TEXT,
        estimate_type TEXT,
        total_area_m2 REAL,
        budget_amount REAL,
        budget_grade TEXT,
        desired_start_date TEXT,
        desired_end_date TEXT,
        construction_scope_json TEXT,
        space_program_json TEXT,
        lightbim_import_id TEXT,
        price_profile_status TEXT,
        pce_result TEXT,
        generated_estimate_id TEXT,
        customer_safety_checked INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS real_project_intake_logs (
        id TEXT PRIMARY KEY,
        intake_id TEXT NOT NULL,
        action TEXT NOT NULL,
        before_json TEXT,
        after_json TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS real_project_intake_issues (
        id TEXT PRIMARY KEY,
        intake_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        resolution_status TEXT NOT NULL,
        target_version TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  function rowToIntake(database, intakeId) {
    const row = database.prepare('SELECT * FROM real_project_intakes WHERE intake_id = ? OR id = ?').get(intakeId, intakeId);
    if (!row) return null;
    const issues = database.prepare('SELECT * FROM real_project_intake_issues WHERE intake_id = ? ORDER BY created_at DESC').all(row.intake_id);
    const logs = database.prepare('SELECT * FROM real_project_intake_logs WHERE intake_id = ? ORDER BY created_at DESC LIMIT 25').all(row.intake_id);
    return {
      ...row,
      elevator_available: Boolean(row.elevator_available),
      parking_available: Boolean(row.parking_available),
      customer_safety_checked: Boolean(row.customer_safety_checked),
      construction_scope: parseJson(row.construction_scope_json, []),
      space_program: parseJson(row.space_program_json, []),
      pce_result: parseJson(row.pce_result, null),
      issues,
      logs
    };
  }

  function logAction(database, intakeId, action, beforePayload, afterPayload, note = '') {
    database.prepare(`
      INSERT INTO real_project_intake_logs (
        id, intake_id, action, before_json, after_json, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      makeId('RPIL'),
      intakeId,
      action,
      toJson(redactForLog(beforePayload)),
      toJson(redactForLog(afterPayload)),
      sanitizeText(note),
      nowIso()
    );
  }

  function normalizePayload(payload = {}) {
    const estimateType = sanitizeText(payload.estimate_type || payload.estimateType).toUpperCase();
    const constructionScope = normalizeJsonPayload(payload.construction_scope_json || payload.constructionScope || payload.construction_scope);
    const spaceProgram = normalizeJsonPayload(payload.space_program_json || payload.spaceProgram || payload.space_program);
    return {
      customer_name: sanitizeText(payload.customer_name || payload.customerName),
      customer_phone: sanitizeText(payload.customer_phone || payload.customerPhone),
      customer_email: sanitizeText(payload.customer_email || payload.customerEmail),
      customer_type: sanitizeText(payload.customer_type || payload.customerType || 'TEST'),
      site_name: sanitizeText(payload.site_name || payload.siteName),
      address_summary: sanitizeText(payload.address_summary || payload.addressSummary),
      detailed_address: sanitizeText(payload.detailed_address || payload.detailedAddress),
      building_type: sanitizeText(payload.building_type || payload.buildingType),
      floor: sanitizeText(payload.floor),
      elevator_available: payload.elevator_available ?? payload.elevatorAvailable,
      parking_available: payload.parking_available ?? payload.parkingAvailable,
      site_access_note: sanitizeText(payload.site_access_note || payload.siteAccessNote),
      estimate_type: VALID_ESTIMATE_TYPES.has(estimateType) ? estimateType : estimateType,
      total_area_m2: payload.total_area_m2 ?? payload.totalAreaM2,
      budget_amount: payload.budget_amount ?? payload.budgetAmount,
      budget_grade: sanitizeText(payload.budget_grade || payload.budgetGrade || 'UNKNOWN').toUpperCase(),
      desired_start_date: sanitizeText(payload.desired_start_date || payload.desiredStartDate),
      desired_end_date: sanitizeText(payload.desired_end_date || payload.desiredEndDate),
      construction_scope_json: toJson(constructionScope),
      space_program_json: toJson(spaceProgram),
      lightbim_import_id: sanitizeText(payload.lightbim_import_id || payload.lightbimImportId),
      price_profile_status: sanitizeText(payload.price_profile_status || payload.priceProfileStatus),
      pce_result: toJson(payload.pce_result || payload.pceResult),
      generated_estimate_id: sanitizeText(payload.generated_estimate_id || payload.generatedEstimateId)
    };
  }

  function createRealProjectIntake(payload = {}) {
    return withProjectDb((database) => {
      const normalized = normalizePayload(payload);
      const intakeId = sanitizeText(payload.intake_id || payload.intakeId) || makeId('RPI');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO real_project_intakes (
          id, intake_id, customer_name, customer_phone, customer_email, customer_type,
          site_name, address_summary, detailed_address, building_type, floor,
          elevator_available, parking_available, site_access_note, estimate_type,
          total_area_m2, budget_amount, budget_grade, desired_start_date, desired_end_date,
          construction_scope_json, space_program_json, lightbim_import_id,
          price_profile_status, pce_result, generated_estimate_id,
          customer_safety_checked, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'DRAFT', ?, ?)
      `).run(
        makeId('RPIROW'),
        intakeId,
        normalized.customer_name,
        normalized.customer_phone,
        normalized.customer_email,
        normalized.customer_type,
        normalized.site_name,
        normalized.address_summary,
        normalized.detailed_address,
        normalized.building_type,
        normalized.floor,
        normalized.elevator_available === undefined ? null : Number(Boolean(normalized.elevator_available)),
        normalized.parking_available === undefined ? null : Number(Boolean(normalized.parking_available)),
        normalized.site_access_note,
        normalized.estimate_type,
        normalized.total_area_m2 === undefined ? null : toNumber(normalized.total_area_m2),
        normalized.budget_amount === undefined ? null : toNumber(normalized.budget_amount),
        normalized.budget_grade || 'UNKNOWN',
        normalized.desired_start_date,
        normalized.desired_end_date,
        normalized.construction_scope_json,
        normalized.space_program_json,
        normalized.lightbim_import_id,
        normalized.price_profile_status,
        normalized.pce_result,
        normalized.generated_estimate_id,
        createdAt,
        createdAt
      );
      logAction(database, intakeId, 'CREATE', {}, normalized, '실제 프로젝트 접수 초안 생성');
      return { ok: true, intakeId, intake: rowToIntake(database, intakeId) };
    });
  }

  function updateRealProjectIntake(intakeId, payload = {}) {
    const normalizedArgs = typeof intakeId === 'object'
      ? { intakeId: intakeId.intakeId || intakeId.intake_id, payload: intakeId.payload || intakeId }
      : { intakeId, payload };
    return withProjectDb((database) => {
      const before = rowToIntake(database, normalizedArgs.intakeId);
      if (!before) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
      const next = { ...before, ...normalizePayload(normalizedArgs.payload || {}) };
      const updatedAt = nowIso();
      database.prepare(`
        UPDATE real_project_intakes
        SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_type = ?,
            site_name = ?, address_summary = ?, detailed_address = ?, building_type = ?, floor = ?,
            elevator_available = ?, parking_available = ?, site_access_note = ?, estimate_type = ?,
            total_area_m2 = ?, budget_amount = ?, budget_grade = ?, desired_start_date = ?, desired_end_date = ?,
            construction_scope_json = ?, space_program_json = ?, lightbim_import_id = ?,
            price_profile_status = ?, pce_result = ?, generated_estimate_id = ?, updated_at = ?
        WHERE intake_id = ?
      `).run(
        next.customer_name,
        next.customer_phone,
        next.customer_email,
        next.customer_type,
        next.site_name,
        next.address_summary,
        next.detailed_address,
        next.building_type,
        next.floor,
        next.elevator_available === undefined || next.elevator_available === null ? null : Number(Boolean(next.elevator_available)),
        next.parking_available === undefined || next.parking_available === null ? null : Number(Boolean(next.parking_available)),
        next.site_access_note,
        next.estimate_type,
        next.total_area_m2 === undefined || next.total_area_m2 === null ? null : toNumber(next.total_area_m2),
        next.budget_amount === undefined || next.budget_amount === null ? null : toNumber(next.budget_amount),
        next.budget_grade || 'UNKNOWN',
        next.desired_start_date,
        next.desired_end_date,
        typeof next.construction_scope_json === 'string' ? next.construction_scope_json : toJson(next.construction_scope),
        typeof next.space_program_json === 'string' ? next.space_program_json : toJson(next.space_program),
        next.lightbim_import_id,
        next.price_profile_status,
        typeof next.pce_result === 'string' ? next.pce_result : toJson(next.pce_result),
        next.generated_estimate_id,
        updatedAt,
        before.intake_id
      );
      logAction(database, before.intake_id, 'UPDATE', before, normalizedArgs.payload, '실제 프로젝트 접수 정보 수정');
      return { ok: true, intakeId: before.intake_id, intake: rowToIntake(database, before.intake_id) };
    });
  }

  function getRealProjectIntake(intakeId) {
    const normalizedIntakeId = typeof intakeId === 'object' ? intakeId.intakeId || intakeId.intake_id || intakeId.id : intakeId;
    return withProjectDb((database) => rowToIntake(database, normalizedIntakeId));
  }

  function listRealProjectIntakes() {
    return withProjectDb((database) => database
      .prepare('SELECT * FROM real_project_intakes ORDER BY created_at DESC LIMIT 100')
      .all()
      .map((row) => ({
        ...row,
        customer_safety_checked: Boolean(row.customer_safety_checked)
      })));
  }

  function getLightBIMSummary(database, importId) {
    if (!importId) return null;
    const row = database.prepare('SELECT * FROM lightbim_imports WHERE id = ?').get(importId);
    if (!row) return null;
    const summary = parseJson(row.normalized_summary_json, {});
    const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];
    return {
      importId: row.id,
      projectName: row.project_name,
      spaceCount: row.space_count,
      totalAreaM2: row.total_area_m2,
      suggestedEstimateType: row.detected_estimate_type,
      quantityWarningCount: warnings.length,
      warnings
    };
  }

  function validateRealProjectIntake(intakeId) {
    const normalizedIntakeId = typeof intakeId === 'object' ? intakeId.intakeId || intakeId.intake_id || intakeId.id : intakeId;
    return withProjectDb((database) => {
      const intake = rowToIntake(database, normalizedIntakeId);
      if (!intake) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
      const lightbim = getLightBIMSummary(database, intake.lightbim_import_id);
      const missing = [];
      const warnings = [];
      const hasScope = Array.isArray(intake.construction_scope)
        ? intake.construction_scope.length > 0
        : Boolean(intake.construction_scope && Object.keys(intake.construction_scope).length);

      if (!intake.customer_name) missing.push('고객명 또는 테스트 고객명이 필요합니다.');
      if (!intake.site_name) missing.push('현장명이 필요합니다.');
      if (!VALID_ESTIMATE_TYPES.has(intake.estimate_type)) missing.push('견적 유형이 필요합니다.');
      if (!toNumber(intake.total_area_m2) && !toNumber(lightbim?.totalAreaM2)) missing.push('면적 또는 LightBIM 면적이 필요합니다.');
      if (!hasScope) missing.push('공사 범위가 필요합니다.');
      if (!toNumber(intake.budget_amount) && (!intake.budget_grade || intake.budget_grade === 'UNKNOWN')) missing.push('예산 등급 또는 예산 금액이 필요합니다.');

      if (!lightbim) warnings.push('LightBIM 도면이 연결되지 않았습니다.');
      if (lightbim?.suggestedEstimateType && intake.estimate_type && lightbim.suggestedEstimateType !== intake.estimate_type) {
        warnings.push('선택한 견적 유형과 LightBIM 추천 유형이 다릅니다.');
      }
      if (!intake.desired_start_date || !intake.desired_end_date) warnings.push('희망 일정 정보가 부족합니다.');
      if (intake.elevator_available === null || intake.elevator_available === undefined) warnings.push('엘리베이터 정보가 없습니다.');
      if (intake.parking_available === null || intake.parking_available === undefined) warnings.push('주차 정보가 없습니다.');
      if (!intake.price_profile_status || intake.price_profile_status === 'NEEDS_UPDATE') warnings.push('실제 단가 적용 상태를 확인해야 합니다.');

      const statusKo = missing.length > 0
        ? '차단'
        : warnings.length > 0
          ? '확인 필요'
          : '견적 생성 가능';
      const status = missing.length > 0 ? 'DRAFT' : 'READY_FOR_ESTIMATE';
      database.prepare('UPDATE real_project_intakes SET status = ?, updated_at = ? WHERE intake_id = ?')
        .run(status, nowIso(), intake.intake_id);
      return {
        ok: missing.length === 0,
        intakeId: intake.intake_id,
        status,
        statusKo,
        missing,
        warnings,
        lightbimSummary: lightbim,
        canGenerateEstimate: missing.length === 0
      };
    });
  }

  function connectLightBIMImport(intakeId, importId) {
    const normalized = typeof intakeId === 'object'
      ? { intakeId: intakeId.intakeId || intakeId.intake_id, importId: intakeId.importId || intakeId.lightbimImportId || intakeId.lightbim_import_id }
      : { intakeId, importId };
    return withProjectDb((database) => {
      const intake = rowToIntake(database, normalized.intakeId);
      if (!intake) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
      const summary = getLightBIMSummary(database, normalized.importId);
      if (!summary) throw new Error('LightBIM 가져오기 정보를 찾을 수 없습니다.');
      const nextArea = toNumber(intake.total_area_m2) || toNumber(summary.totalAreaM2);
      database.prepare(`
        UPDATE real_project_intakes
        SET lightbim_import_id = ?, total_area_m2 = ?, updated_at = ?
        WHERE intake_id = ?
      `).run(normalized.importId, nextArea || null, nowIso(), intake.intake_id);
      logAction(database, intake.intake_id, 'CONNECT_LIGHTBIM', { lightbim_import_id: intake.lightbim_import_id }, { lightbim_import_id: normalized.importId }, 'LightBIM 도면 연결');
      const warning = summary.suggestedEstimateType && intake.estimate_type && summary.suggestedEstimateType !== intake.estimate_type
        ? '선택한 견적 유형과 LightBIM 추천 유형이 다릅니다.'
        : '';
      return { ok: true, intakeId: intake.intake_id, lightbimSummary: summary, warning, intake: rowToIntake(database, intake.intake_id) };
    });
  }

  function safeCount(database, tableName, where = '') {
    try {
      return Number(database.prepare(`SELECT COUNT(*) AS count FROM ${tableName} ${where}`).get().count || 0);
    } catch (_error) {
      return 0;
    }
  }

  function checkPriceProfileReadiness(intakeId) {
    const normalizedIntakeId = typeof intakeId === 'object' ? intakeId.intakeId || intakeId.intake_id || intakeId.id : intakeId;
    const result = withMasterDb((database) => {
      const materialCount = safeCount(database, 'material_master');
      const laborCount = safeCount(database, 'labor_master');
      const standardItemCount = safeCount(database, 'standard_estimate_items');
      const needsUpdateMaterials = safeCount(database, 'material_master', "WHERE price_status = 'NEEDS_UPDATE'");
      const needsUpdateLabor = safeCount(database, 'labor_master', "WHERE price_status = 'NEEDS_UPDATE'");
      const needsUpdateItems = safeCount(database, 'standard_estimate_items', "WHERE price_status = 'NEEDS_UPDATE'");
      const appliedUpdates = safeCount(database, 'real_price_update_history');
      const highPriorityRows = (() => {
        try {
          return database.prepare(`
            SELECT material_name AS name FROM material_master WHERE price_status = 'NEEDS_UPDATE'
            UNION ALL
            SELECT role AS name FROM labor_master WHERE price_status = 'NEEDS_UPDATE'
            UNION ALL
            SELECT item_name AS name FROM standard_estimate_items WHERE price_status = 'NEEDS_UPDATE'
          `).all();
        } catch (_error) {
          return [];
        }
      })();
      const highPriorityNeedsUpdateCount = highPriorityRows.filter((row) => HIGH_PRIORITY_PRICE_TERMS.some((term) => String(row.name || '').includes(term))).length;
      const missingCore = materialCount === 0 || laborCount === 0 || standardItemCount === 0;
      const remainingNeedsUpdate = needsUpdateMaterials + needsUpdateLabor + needsUpdateItems;
      const status = missingCore
        ? 'NEEDS_UPDATE'
        : remainingNeedsUpdate > 0 || appliedUpdates === 0
          ? 'PARTIAL'
          : 'READY';
      return {
        status,
        labelKo: status === 'READY' ? '단가 준비 완료' : status === 'PARTIAL' ? '일부 단가 확인 필요' : '단가 보정 필요',
        materialCount,
        laborCount,
        standardItemCount,
        remainingNeedsUpdate,
        highPriorityNeedsUpdateCount,
        appliedUpdateCount: appliedUpdates
      };
    });
    if (normalizedIntakeId) {
      withProjectDb((database) => {
        const intake = rowToIntake(database, normalizedIntakeId);
        if (intake) {
          database.prepare('UPDATE real_project_intakes SET price_profile_status = ?, updated_at = ? WHERE intake_id = ?')
            .run(result.status, nowIso(), intake.intake_id);
          logAction(database, intake.intake_id, 'CHECK_PRICE_PROFILE', {}, result, result.labelKo);
        }
      });
    }
    return result;
  }

  function buildManualEstimateInput(intake, estimateId) {
    const area = toNumber(intake.total_area_m2, 30);
    const base = {
      estimateId,
      customerName: intake.customer_name,
      siteName: intake.site_name,
      customerType: intake.customer_type || 'TEST',
      addressSummary: intake.address_summary,
      totalAreaM2: area,
      areaM2: area,
      projectAreaM2: area,
      customerPriceMultiplier: 1.18,
      constructionScope: intake.construction_scope,
      budgetGrade: intake.budget_grade || 'UNKNOWN'
    };
    if (intake.estimate_type === 'BATHROOM') {
      return { ...base, bathroomCount: 1, bathroomSizeM2: Math.min(area, 6) };
    }
    if (intake.estimate_type === 'KITCHEN') {
      return { ...base, kitchenSizeM2: Math.min(area, 12), kitchenType: 'STANDARD' };
    }
    return { ...base, rooms: Math.max(2, Math.round(area / 20)), bathrooms: 1 };
  }

  function saveEstimateByType(estimateType, payload) {
    if (estimateType === 'BATHROOM') return sqliteService.saveBathroomEstimate(payload);
    if (estimateType === 'KITCHEN') return sqliteService.saveKitchenEstimate(payload);
    return sqliteService.saveFullRemodelingEstimate(payload);
  }

  function generateEstimateFromIntake(intakeId) {
    const normalizedIntakeId = typeof intakeId === 'object' ? intakeId.intakeId || intakeId.intake_id || intakeId.id : intakeId;
    const validation = validateRealProjectIntake(normalizedIntakeId);
    if (!validation.canGenerateEstimate) {
      return { ok: false, blocked: true, validation, messageKo: '필수 접수 정보가 부족하여 견적을 생성할 수 없습니다.' };
    }

    return withProjectDb((database) => {
      const intake = rowToIntake(database, normalizedIntakeId);
      const estimateId = `INTAKE-${intake.estimate_type}-${Date.now()}`;
      let saved;
      let draft = null;
      if (intake.lightbim_import_id) {
        draft = sqliteService.createEstimateFromLightBIM({
          importId: intake.lightbim_import_id,
          estimateTypeOverride: intake.estimate_type
        });
        if (!draft?.ok) throw new Error('LightBIM 기반 견적 초안을 생성하지 못했습니다.');
        saved = saveEstimateByType(intake.estimate_type, {
          ...(draft.input || {}),
          estimateId,
          customerName: intake.customer_name,
          siteName: intake.site_name,
          lightBimImportId: intake.lightbim_import_id,
          customerPriceMultiplier: 1.18
        });
      } else {
        saved = saveEstimateByType(intake.estimate_type, buildManualEstimateInput(intake, estimateId));
      }
      const pce = saved.pce || saved.estimate?.pce || draft?.preview?.pce || draft?.preview?.estimate?.pce || null;
      database.prepare(`
        UPDATE real_project_intakes
        SET generated_estimate_id = ?, pce_result = ?, status = 'ESTIMATE_CREATED', updated_at = ?
        WHERE intake_id = ?
      `).run(saved.estimateId || estimateId, toJson(pce), nowIso(), intake.intake_id);
      logAction(database, intake.intake_id, 'GENERATE_ESTIMATE', {}, { estimateId: saved.estimateId || estimateId, pce }, '접수 정보 기반 견적 생성');
      return {
        ok: true,
        intakeId: intake.intake_id,
        estimateId: saved.estimateId || estimateId,
        estimateType: intake.estimate_type,
        pce,
        saved,
        lightbimDraft: draft
      };
    });
  }

  function runPCEForIntake(intakeId) {
    const normalizedIntakeId = typeof intakeId === 'object' ? intakeId.intakeId || intakeId.intake_id || intakeId.id : intakeId;
    const intake = getRealProjectIntake(normalizedIntakeId);
    if (!intake) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
    if (intake.pce_result) {
      return { ok: true, intakeId: intake.intake_id, pce: intake.pce_result, estimateId: intake.generated_estimate_id };
    }
    const generated = generateEstimateFromIntake(intake.intake_id);
    return { ok: generated.ok, intakeId: intake.intake_id, pce: generated.pce, estimateId: generated.estimateId };
  }

  function inspectForbidden(payload) {
    const serialized = JSON.stringify(payload || {}).toLowerCase();
    return FORBIDDEN_CUSTOMER_TERMS.filter((term) => serialized.includes(term.toLowerCase()));
  }

  function buildCustomerSafePayload(intake) {
    return {
      customer_name: intake.customer_name,
      site_name: intake.site_name,
      address_summary: intake.address_summary,
      estimate_type: intake.estimate_type,
      total_area_m2: intake.total_area_m2,
      construction_scope: intake.construction_scope,
      space_program: intake.space_program,
      budget_grade: intake.budget_grade,
      desired_start_date: intake.desired_start_date,
      desired_end_date: intake.desired_end_date,
      customer_safe: true
    };
  }

  function runCustomerSafetyCheckForIntake(intakeId, payload) {
    const normalized = typeof intakeId === 'object'
      ? { intakeId: intakeId.intakeId || intakeId.intake_id || intakeId.id, payload: intakeId.payload || intakeId.customerPayload || intakeId }
      : { intakeId, payload };
    return withProjectDb((database) => {
      const intake = rowToIntake(database, normalized.intakeId);
      if (!intake) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
      const customerPayload = normalized.payload && Object.keys(normalized.payload).some((key) => key !== 'intakeId' && key !== 'intake_id' && key !== 'id')
        ? normalized.payload
        : buildCustomerSafePayload(intake);
      const leaks = inspectForbidden(customerPayload);
      if (leaks.length > 0) {
        const issueId = makeId('RPII');
        const createdAt = nowIso();
        database.prepare(`
          INSERT INTO real_project_intake_issues (
            id, intake_id, severity, category, description, resolution_status, target_version, created_at, updated_at
          ) VALUES (?, ?, 'S1', 'CUSTOMER_SAFETY', ?, 'OPEN', ?, ?, ?)
        `).run(
          issueId,
          intake.intake_id,
          `고객 출력 payload에서 내부 정보 키가 발견되었습니다: ${leaks.join(', ')}`,
          DEFAULT_VERSION,
          createdAt,
          createdAt
        );
        database.prepare('UPDATE real_project_intakes SET customer_safety_checked = 0, status = ?, updated_at = ? WHERE intake_id = ?')
          .run('BLOCKED', nowIso(), intake.intake_id);
        logAction(database, intake.intake_id, 'CUSTOMER_SAFETY_BLOCKED', {}, { leaks }, '고객 출력 전 내부정보 검사 차단');
        return { ok: false, blocked: true, intakeId: intake.intake_id, leaks, issueId, customerPayload: null };
      }
      database.prepare('UPDATE real_project_intakes SET customer_safety_checked = 1, updated_at = ? WHERE intake_id = ?')
        .run(nowIso(), intake.intake_id);
      logAction(database, intake.intake_id, 'CUSTOMER_SAFETY_CHECK', {}, { ok: true }, '고객 출력 전 내부정보 검사 통과');
      return { ok: true, blocked: false, intakeId: intake.intake_id, leaks: [], customerPayload };
    });
  }

  function createIntakeIssue(intakeId, payload = {}) {
    const normalized = typeof intakeId === 'object'
      ? { intakeId: intakeId.intakeId || intakeId.intake_id || intakeId.id, payload: intakeId.payload || intakeId }
      : { intakeId, payload };
    return withProjectDb((database) => {
      const intake = rowToIntake(database, normalized.intakeId);
      if (!intake) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
      const body = normalized.payload || {};
      const issueId = makeId('RPII');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO real_project_intake_issues (
          id, intake_id, severity, category, description, resolution_status, target_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        issueId,
        intake.intake_id,
        sanitizeText(body.severity || 'S3'),
        sanitizeText(body.category || 'INTAKE'),
        sanitizeText(body.description || '실제 프로젝트 접수 확인 필요'),
        sanitizeText(body.resolutionStatus || body.resolution_status || 'OPEN'),
        sanitizeText(body.targetVersion || body.target_version || DEFAULT_VERSION),
        createdAt,
        createdAt
      );
      if (body.severity === 'S1' || body.severity === 'S2') {
        database.prepare('UPDATE real_project_intakes SET status = ?, updated_at = ? WHERE intake_id = ?')
          .run('BLOCKED', createdAt, intake.intake_id);
      }
      logAction(database, intake.intake_id, 'CREATE_ISSUE', {}, body, '접수 이슈 기록');
      return { ok: true, issueId, intake: rowToIntake(database, intake.intake_id) };
    });
  }

  function createIntakeReport(intakeId) {
    const normalizedIntakeId = typeof intakeId === 'object' ? intakeId.intakeId || intakeId.intake_id || intakeId.id : intakeId;
    return withProjectDb((database) => {
      const intake = rowToIntake(database, normalizedIntakeId);
      if (!intake) throw new Error('실제 프로젝트 접수 정보를 찾을 수 없습니다.');
      fs.mkdirSync(reportDir, { recursive: true });
      const safety = intake.customer_safety_checked ? '통과' : '확인 필요';
      const pce = intake.pce_result?.decision || intake.pce_result?.result || '미실행';
      const openCritical = intake.issues.filter((issue) => issue.resolution_status === 'OPEN' && (issue.severity === 'S1' || issue.severity === 'S2')).length;
      const finalDecision = openCritical > 0
        ? '접수 보류'
        : intake.generated_estimate_id
          ? '견적 진행 가능'
          : '조건부 견적 가능';
      const reportPath = path.join(reportDir, `RC_0_3_2_REAL_PROJECT_INTAKE_REPORT_${intake.intake_id}.md`);
      const lines = [
        '# RC-0.3.2 실제 프로젝트 접수 리포트',
        '',
        `- 프로젝트명: ${intake.site_name || '미입력'}`,
        `- 고객명 또는 테스트 고객명: ${intake.customer_name || '미입력'}`,
        `- 현장명: ${intake.site_name || '미입력'}`,
        `- 견적 유형: ${intake.estimate_type || '미입력'}`,
        `- 면적: ${intake.total_area_m2 || '미입력'}`,
        `- 공사 범위: ${Array.isArray(intake.construction_scope) ? intake.construction_scope.join(' / ') : JSON.stringify(intake.construction_scope || {})}`,
        `- LightBIM 연결 여부: ${intake.lightbim_import_id ? '연결됨' : '미연결'}`,
        `- 단가 준비 상태: ${intake.price_profile_status || '확인 필요'}`,
        `- 견적 ID: ${intake.generated_estimate_id || '미생성'}`,
        `- PCE 결과: ${pce}`,
        `- 고객 안전성 결과: ${safety}`,
        `- 출력 결과: ${intake.customer_safety_checked ? '고객 출력 전 점검 통과' : '출력 전 점검 필요'}`,
        '',
        '## 발견 이슈',
        intake.issues.length > 0
          ? intake.issues.map((issue) => `- [${issue.severity}] ${issue.category}: ${issue.description} (${issue.resolution_status})`).join('\n')
          : '- 없음',
        '',
        `## 최종 판정: ${finalDecision}`,
        ''
      ];
      fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
      logAction(database, intake.intake_id, 'CREATE_REPORT', {}, { reportPath }, '접수 리포트 생성');
      return { ok: true, reportPath, finalDecision };
    });
  }

  return {
    createRealProjectIntake,
    updateRealProjectIntake,
    getRealProjectIntake,
    listRealProjectIntakes,
    validateRealProjectIntake,
    connectLightBIMImport,
    checkPriceProfileReadiness,
    generateEstimateFromIntake,
    runPCEForIntake,
    runCustomerSafetyCheckForIntake,
    createIntakeReport,
    createIntakeIssue
  };
}

module.exports = {
  DEFAULT_VERSION,
  FORBIDDEN_CUSTOMER_TERMS,
  createRealProjectIntakeService
};
