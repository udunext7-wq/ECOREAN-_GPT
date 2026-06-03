'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_VERSION = 'RC-0.3.3';
const DEFAULT_STATUS = 'IN_PROGRESS';
const SENSITIVE_FIELDS = new Set([
  'customer_phone',
  'customerPhone',
  'phone',
  'customer_email',
  'customerEmail',
  'email',
  'detailed_address',
  'detailedAddress',
  'memo',
  'customer_memo',
  'customerMemo'
]);

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function sanitizeText(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

function anonymizeName(value) {
  const text = sanitizeText(value);
  if (!text) return '익명 고객';
  if (text.includes('익명') || text.includes('테스트')) return text;
  return `${text.slice(0, 1)}**`;
}

function redactPayload(payload = {}) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => (
    SENSITIVE_FIELDS.has(key) ? [key, '[REDACTED]'] : [key, value]
  )));
}

function toJson(value) {
  if (value === undefined || value === null || value === '') return '';
  return JSON.stringify(value);
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

function normalizeDecision({ issues = [], customerSafetyStatus = '', customerOutputStatus = '', internalOutputStatus = '' } = {}) {
  const openIssues = issues.filter((issue) => String(issue.status || 'OPEN') === 'OPEN');
  const hasS1 = openIssues.some((issue) => issue.severity === 'S1');
  const hasS2 = openIssues.some((issue) => issue.severity === 'S2');
  if (hasS1) return '운영 보류';
  if (hasS2) return '수정 후 재검토';
  if (customerSafetyStatus === 'PASSED' && customerOutputStatus === 'READY' && internalOutputStatus === 'READY') {
    return '실제 고객 Pilot 가능';
  }
  return '조건부 Pilot 가능';
}

function createActualCustomerPilotService({ sqliteService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.project) {
    throw new Error('sqliteService with project database path is required');
  }

  const dbPath = sqliteService.dbPaths.project;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function withDb(callback) {
    const database = new DatabaseSync(dbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS actual_customer_pilot_runs (
        id TEXT PRIMARY KEY,
        pilot_id TEXT UNIQUE NOT NULL,
        version TEXT NOT NULL,
        intake_id TEXT,
        project_name TEXT,
        anonymized_customer_name TEXT,
        lightbim_import_id TEXT,
        estimate_id TEXT,
        pce_result TEXT,
        customer_output_status TEXT,
        internal_output_status TEXT,
        customer_safety_status TEXT,
        final_decision TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS actual_customer_pilot_issues (
        id TEXT PRIMARY KEY,
        pilot_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        screen TEXT,
        description TEXT NOT NULL,
        reproduction_steps TEXT,
        decision TEXT,
        target_version TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS actual_customer_pilot_steps (
        id TEXT PRIMARY KEY,
        pilot_id TEXT NOT NULL,
        step_key TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(pilot_id, step_key)
      );
    `);
  }

  function rowToRun(database, pilotId) {
    const run = database.prepare('SELECT * FROM actual_customer_pilot_runs WHERE pilot_id = ?').get(pilotId);
    if (!run) return null;
    const issues = database.prepare('SELECT * FROM actual_customer_pilot_issues WHERE pilot_id = ? ORDER BY created_at').all(pilotId);
    const steps = database.prepare('SELECT * FROM actual_customer_pilot_steps WHERE pilot_id = ? ORDER BY created_at').all(pilotId)
      .map((step) => ({ ...step, payload: parseJson(step.payload_json, {}) }));
    const finalDecision = normalizeDecision({
      issues,
      customerSafetyStatus: run.customer_safety_status,
      customerOutputStatus: run.customer_output_status,
      internalOutputStatus: run.internal_output_status
    });
    return { ...run, issues, steps, summary: { pilotId, issueCount: issues.length, stepCount: steps.length, finalDecision } };
  }

  function createActualCustomerPilotRun(payload = {}) {
    const createdAt = nowIso();
    const pilotId = sanitizeText(payload.pilotId || payload.pilot_id) || makeId('ACP');
    const anonymizedCustomerName = anonymizeName(payload.anonymizedCustomerName || payload.anonymized_customer_name || payload.customerName || payload.customer_name);
    const projectName = sanitizeText(payload.projectName || payload.project_name || 'RC-0.3.3 actual customer data pilot');
    return withDb((database) => {
      database.prepare(`
        INSERT OR REPLACE INTO actual_customer_pilot_runs (
          id, pilot_id, version, intake_id, project_name, anonymized_customer_name,
          lightbim_import_id, estimate_id, pce_result, customer_output_status,
          internal_output_status, customer_safety_status, final_decision, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        pilotId,
        pilotId,
        sanitizeText(payload.version || DEFAULT_VERSION),
        sanitizeText(payload.intakeId || payload.intake_id),
        projectName,
        anonymizedCustomerName,
        sanitizeText(payload.lightbimImportId || payload.lightbim_import_id),
        sanitizeText(payload.estimateId || payload.estimate_id),
        sanitizeText(payload.pceResult || payload.pce_result),
        sanitizeText(payload.customerOutputStatus || payload.customer_output_status || 'PENDING'),
        sanitizeText(payload.internalOutputStatus || payload.internal_output_status || 'PENDING'),
        sanitizeText(payload.customerSafetyStatus || payload.customer_safety_status || 'PENDING'),
        sanitizeText(payload.finalDecision || payload.final_decision || '진행 중'),
        createdAt,
        createdAt
      );
      return { ok: true, pilotId, run: rowToRun(database, pilotId) };
    });
  }

  function updateRun(pilotId, payload = {}) {
    const normalizedPilotId = sanitizeText(pilotId || payload.pilotId || payload.pilot_id);
    return withDb((database) => {
      const before = rowToRun(database, normalizedPilotId);
      if (!before) throw new Error('Actual customer pilot run not found');
      const next = {
        intake_id: sanitizeText(payload.intakeId || payload.intake_id || before.intake_id),
        project_name: sanitizeText(payload.projectName || payload.project_name || before.project_name),
        anonymized_customer_name: sanitizeText(payload.anonymizedCustomerName || payload.anonymized_customer_name || before.anonymized_customer_name),
        lightbim_import_id: sanitizeText(payload.lightbimImportId || payload.lightbim_import_id || before.lightbim_import_id),
        estimate_id: sanitizeText(payload.estimateId || payload.estimate_id || before.estimate_id),
        pce_result: sanitizeText(payload.pceResult || payload.pce_result || before.pce_result),
        customer_output_status: sanitizeText(payload.customerOutputStatus || payload.customer_output_status || before.customer_output_status),
        internal_output_status: sanitizeText(payload.internalOutputStatus || payload.internal_output_status || before.internal_output_status),
        customer_safety_status: sanitizeText(payload.customerSafetyStatus || payload.customer_safety_status || before.customer_safety_status),
        final_decision: sanitizeText(payload.finalDecision || payload.final_decision || before.final_decision)
      };
      database.prepare(`
        UPDATE actual_customer_pilot_runs
        SET intake_id = ?, project_name = ?, anonymized_customer_name = ?, lightbim_import_id = ?,
            estimate_id = ?, pce_result = ?, customer_output_status = ?, internal_output_status = ?,
            customer_safety_status = ?, final_decision = ?, updated_at = ?
        WHERE pilot_id = ?
      `).run(
        next.intake_id,
        next.project_name,
        next.anonymized_customer_name,
        next.lightbim_import_id,
        next.estimate_id,
        next.pce_result,
        next.customer_output_status,
        next.internal_output_status,
        next.customer_safety_status,
        next.final_decision,
        nowIso(),
        normalizedPilotId
      );
      return { ok: true, pilotId: normalizedPilotId, run: rowToRun(database, normalizedPilotId) };
    });
  }

  function connectPilotToIntake(pilotId, intakeId) {
    return updateRun(pilotId, { intakeId });
  }

  function recordPilotStep(pilotId, payload = {}) {
    const normalizedPilotId = sanitizeText(pilotId || payload.pilotId || payload.pilot_id);
    const stepKey = sanitizeText(payload.stepKey || payload.step_key || payload.key);
    if (!stepKey) throw new Error('stepKey is required');
    const timestamp = nowIso();
    return withDb((database) => {
      if (!rowToRun(database, normalizedPilotId)) throw new Error('Actual customer pilot run not found');
      database.prepare(`
        INSERT INTO actual_customer_pilot_steps (
          id, pilot_id, step_key, status, payload_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(pilot_id, step_key) DO UPDATE SET
          status = excluded.status,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `).run(
        makeId('ACPSTEP'),
        normalizedPilotId,
        stepKey,
        sanitizeText(payload.status || 'PASSED'),
        toJson(redactPayload(payload.payload || payload)),
        timestamp,
        timestamp
      );
      return { ok: true, pilotId: normalizedPilotId, stepKey, run: rowToRun(database, normalizedPilotId) };
    });
  }

  function createPilotIssue(pilotId, payload = {}) {
    const normalizedPilotId = sanitizeText(pilotId || payload.pilotId || payload.pilot_id);
    const issueId = sanitizeText(payload.issueId || payload.issue_id) || makeId('ACPI');
    const timestamp = nowIso();
    return withDb((database) => {
      if (!rowToRun(database, normalizedPilotId)) throw new Error('Actual customer pilot run not found');
      database.prepare(`
        INSERT INTO actual_customer_pilot_issues (
          id, pilot_id, severity, screen, description, reproduction_steps,
          decision, target_version, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        issueId,
        normalizedPilotId,
        sanitizeText(payload.severity || 'S3'),
        sanitizeText(payload.screen),
        sanitizeText(payload.description || 'Pilot issue'),
        sanitizeText(payload.reproductionSteps || payload.reproduction_steps),
        sanitizeText(payload.decision || '검토 필요'),
        sanitizeText(payload.targetVersion || payload.target_version || DEFAULT_VERSION),
        sanitizeText(payload.status || 'OPEN'),
        timestamp,
        timestamp
      );
      return { ok: true, pilotId: normalizedPilotId, issueId, run: rowToRun(database, normalizedPilotId) };
    });
  }

  function getActualCustomerPilotSummary(pilotId) {
    return withDb((database) => {
      const run = rowToRun(database, sanitizeText(pilotId?.pilotId || pilotId?.pilot_id || pilotId));
      if (!run) throw new Error('Actual customer pilot run not found');
      return run.summary;
    });
  }

  function generateActualCustomerPilotReport(pilotId) {
    return withDb((database) => {
      const run = rowToRun(database, sanitizeText(pilotId?.pilotId || pilotId?.pilot_id || pilotId));
      if (!run) throw new Error('Actual customer pilot run not found');
      const finalDecision = normalizeDecision({
        issues: run.issues,
        customerSafetyStatus: run.customer_safety_status,
        customerOutputStatus: run.customer_output_status,
        internalOutputStatus: run.internal_output_status
      });
      fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, `RC_0_3_3_ACTUAL_CUSTOMER_DATA_PILOT_REPORT_${run.pilot_id}.md`);
      const lines = [
        '# RC-0.3.3 Actual Customer Data Pilot Report',
        '',
        `- Pilot ID: \`${run.pilot_id}\``,
        `- Version: \`${run.version}\``,
        `- Intake ID: \`${run.intake_id || 'N/A'}\``,
        `- Anonymized customer name: \`${run.anonymized_customer_name || '익명 고객'}\``,
        `- Project name: \`${run.project_name || 'N/A'}\``,
        `- LightBIM import ID: \`${run.lightbim_import_id || 'N/A'}\``,
        `- Estimate ID: \`${run.estimate_id || 'N/A'}\``,
        `- PCE result: \`${run.pce_result || 'N/A'}\``,
        `- Customer output: \`${run.customer_output_status || 'PENDING'}\``,
        `- Internal output: \`${run.internal_output_status || 'PENDING'}\``,
        `- Customer safety: \`${run.customer_safety_status || 'PENDING'}\``,
        `- Final decision: \`${finalDecision}\``,
        '',
        '## Steps',
        '',
        ...(run.steps.length ? run.steps.map((step) => `- ${step.step_key}: ${step.status}`) : ['- 기록된 step 없음']),
        '',
        '## Issues',
        '',
        ...(run.issues.length ? run.issues.map((issue) => `- ${issue.severity} / ${issue.screen || 'N/A'} / ${issue.status}: ${issue.description}`) : ['- 발견 이슈 없음']),
        '',
        '## Privacy',
        '',
        '- 실제 전화번호, 이메일, 상세주소, 고객 메모 원문은 이 리포트에 저장하지 않습니다.',
        '- 고객명은 익명화된 값만 사용합니다.'
      ];
      fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
      database.prepare('UPDATE actual_customer_pilot_runs SET final_decision = ?, updated_at = ? WHERE pilot_id = ?')
        .run(finalDecision, nowIso(), run.pilot_id);
      return { ok: true, pilotId: run.pilot_id, reportPath, finalDecision };
    });
  }

  return {
    createActualCustomerPilotRun,
    connectPilotToIntake,
    recordPilotStep,
    createPilotIssue,
    getActualCustomerPilotSummary,
    generateActualCustomerPilotReport
  };
}

module.exports = {
  createActualCustomerPilotService,
  anonymizeName,
  redactPayload,
  normalizeDecision
};
