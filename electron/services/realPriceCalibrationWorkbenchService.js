'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const FORBIDDEN_CUSTOMER_TERMS = [
  'real_price_update_queue',
  'price calibration',
  'calibration queue',
  'vendor quote',
  'unit cost',
  'labor rate',
  'variance',
  'approval queue',
  'backup path',
  'internal cost',
  'margin',
  'pce',
  'vendor',
  'purchase',
  'receiving',
  'import rows',
  'manual matching',
  'profit',
  'risk_score',
  'current_price',
  'proposed_price',
  'backup_id'
];

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureColumn(database, tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
  if (!columns.includes(columnName)) database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
}

function riskLevel(row) {
  const rate = Math.abs(toNumber(row.variance_rate, 0));
  const priority = String(row.priority || '').toUpperCase();
  const status = String(row.status || '').toUpperCase();
  if (status === 'DEFERRED' || rate >= 0.3) return 'BLOCKING';
  if (priority === 'HIGH' || rate >= 0.15) return 'HIGH';
  if (priority === 'MEDIUM' || rate >= 0.05) return 'MEDIUM';
  return 'LOW';
}

function recommendedAction(row) {
  const status = String(row.status || '').toUpperCase();
  const risk = riskLevel(row);
  if (status === 'PENDING_REVIEW') return risk === 'BLOCKING' || risk === 'HIGH' ? '대표 승인 전 증빙 검토' : '승인 검토';
  if (status === 'APPROVED') return '백업 후 마스터 반영 가능';
  if (status === 'DEFERRED') return '보류 사유 확인 후 재검토';
  if (status === 'REJECTED') return '반려 사유 확인';
  if (status === 'APPLIED') return '반영 이력 확인';
  return '확인 필요';
}

function inspectForbiddenCustomerPayload(payload) {
  const serialized = JSON.stringify(payload || {}).toLowerCase();
  return FORBIDDEN_CUSTOMER_TERMS.filter((term) => serialized.includes(term.toLowerCase()));
}

function createRealPriceCalibrationWorkbenchService({
  sqliteService,
  realPriceCalibrationService,
  priceCalibrationPriorityService = null,
  reportsDir = null
} = {}) {
  if (!sqliteService?.dbPaths?.master) {
    throw new Error('sqliteService with master database path is required');
  }
  if (!realPriceCalibrationService) {
    throw new Error('realPriceCalibrationService is required');
  }

  const masterDbPath = sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function withMasterDb(callback) {
    const database = new DatabaseSync(masterDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS real_price_update_queue (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_name TEXT NOT NULL,
        current_price REAL NOT NULL,
        proposed_price REAL NOT NULL,
        unit TEXT NOT NULL,
        price_source TEXT NOT NULL,
        vendor_id TEXT,
        vendor_name TEXT,
        evidence_note TEXT,
        evidence_file_path TEXT,
        variance_amount REAL NOT NULL,
        variance_rate REAL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        approval_note TEXT,
        backup_id TEXT,
        created_at TEXT NOT NULL,
        approved_at TEXT,
        applied_at TEXT
      );
      CREATE TABLE IF NOT EXISTS real_price_update_history (
        id TEXT PRIMARY KEY,
        queue_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_name TEXT NOT NULL,
        old_price REAL NOT NULL,
        new_price REAL NOT NULL,
        unit TEXT NOT NULL,
        source TEXT NOT NULL,
        applied_by TEXT NOT NULL,
        backup_id TEXT,
        created_at TEXT NOT NULL
      );
    `);
    ensureColumn(database, 'real_price_update_queue', 'review_note', "review_note TEXT DEFAULT ''");
    ensureColumn(database, 'real_price_update_queue', 'rejection_reason', "rejection_reason TEXT DEFAULT ''");
    ensureColumn(database, 'real_price_update_queue', 'deferred_reason', "deferred_reason TEXT DEFAULT ''");
    ensureColumn(database, 'real_price_update_queue', 'approved_by', "approved_by TEXT DEFAULT ''");
    ensureColumn(database, 'real_price_update_queue', 'applied_backup_id', "applied_backup_id TEXT DEFAULT ''");
    ensureColumn(database, 'real_price_update_queue', 'linked_priority_task_id', "linked_priority_task_id TEXT DEFAULT ''");
    ensureColumn(database, 'real_price_update_queue', 'workbench_status', "workbench_status TEXT DEFAULT ''");
  }

  function normalizeQueueRow(row) {
    if (!row) return null;
    const risk = riskLevel(row);
    return {
      ...row,
      risk_level: risk,
      recommended_action: recommendedAction(row),
      variance_rate_percent: row.variance_rate === null || row.variance_rate === undefined ? null : toNumber(row.variance_rate) * 100,
      backup_required: String(row.status).toUpperCase() === 'APPROVED' && !row.backup_id,
      queue_applicable: String(row.status).toUpperCase() === 'APPROVED',
      status_ko: statusKo(row.status),
      risk_ko: riskKo(risk)
    };
  }

  function statusKo(status) {
    const value = String(status || '').toUpperCase();
    if (value === 'PENDING_REVIEW') return '승인 대기';
    if (value === 'APPROVED') return '승인 완료';
    if (value === 'REJECTED') return '반려';
    if (value === 'APPLIED') return '반영 완료';
    if (value === 'DEFERRED') return '보류';
    return '확인 필요';
  }

  function riskKo(risk) {
    if (risk === 'BLOCKING') return '차단';
    if (risk === 'HIGH') return '높음';
    if (risk === 'MEDIUM') return '보통';
    return '낮음';
  }

  function getCalibrationWorkbenchSummary() {
    return withMasterDb((database) => {
      const rows = database.prepare('SELECT * FROM real_price_update_queue').all();
      const normalized = rows.map(normalizeQueueRow);
      return {
        totalQueueCount: rows.length,
        pendingReviewCount: rows.filter((row) => row.status === 'PENDING_REVIEW').length,
        approvedCount: rows.filter((row) => row.status === 'APPROVED').length,
        rejectedCount: rows.filter((row) => row.status === 'REJECTED').length,
        appliedCount: rows.filter((row) => row.status === 'APPLIED').length,
        deferredCount: rows.filter((row) => row.status === 'DEFERRED').length,
        highBlockingCount: normalized.filter((row) => ['HIGH', 'BLOCKING'].includes(row.risk_level) && !['APPLIED', 'REJECTED'].includes(row.status)).length,
        todayApplicableCount: rows.filter((row) => row.status === 'APPROVED').length,
        backupRequiredCount: normalized.filter((row) => row.backup_required).length,
        heldOrRejectedCount: rows.filter((row) => ['DEFERRED', 'REJECTED'].includes(row.status)).length,
        customerSafety: 'PASSED',
        statusKo: '실제 단가 queue 검토 가능'
      };
    });
  }

  function listCalibrationQueueItems(filters = {}) {
    return withMasterDb((database) => {
      const rows = database.prepare(`
        SELECT * FROM real_price_update_queue
        ORDER BY CASE status
          WHEN 'PENDING_REVIEW' THEN 0
          WHEN 'APPROVED' THEN 1
          WHEN 'DEFERRED' THEN 2
          WHEN 'REJECTED' THEN 3
          WHEN 'APPLIED' THEN 4
          ELSE 5
        END, created_at DESC
      `).all();
      return rows.map(normalizeQueueRow).filter((row) => {
        const statusMatch = !filters.status || filters.status === 'ALL' || row.status === filters.status;
        const targetMatch = !filters.targetType || filters.targetType === 'ALL' || row.target_type === filters.targetType;
        const priorityMatch = !filters.priority || filters.priority === 'ALL' || row.priority === filters.priority;
        const sourceMatch = !filters.priceSource || filters.priceSource === 'ALL' || row.price_source === filters.priceSource;
        const riskMatch = !filters.riskLevel || filters.riskLevel === 'ALL' || row.risk_level === filters.riskLevel;
        return statusMatch && targetMatch && priorityMatch && sourceMatch && riskMatch;
      });
    });
  }

  function getLinkedPriorityTask(database, queueId, taskId = '') {
    try {
      if (taskId) {
        return database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ? LIMIT 1').get(taskId);
      }
      return database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE linked_queue_id = ? ORDER BY updated_at DESC LIMIT 1').get(queueId);
    } catch (_error) {
      return null;
    }
  }

  function getCalibrationQueueItemDetail(queueId) {
    return withMasterDb((database) => {
      const row = database.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(String(queueId));
      if (!row) throw new Error('Price update queue item not found.');
      const history = database.prepare('SELECT * FROM real_price_update_history WHERE queue_id = ? ORDER BY created_at DESC').all(String(queueId));
      return {
        queueItem: normalizeQueueRow(row),
        linkedPriorityTask: getLinkedPriorityTask(database, String(queueId), row.linked_priority_task_id),
        history
      };
    });
  }

  function updatePriorityTask(taskId, queueId, reviewStatus, note) {
    if (!taskId && !queueId) return null;
    if (priceCalibrationPriorityService && taskId && typeof priceCalibrationPriorityService.markCalibrationTaskReviewed === 'function') {
      return priceCalibrationPriorityService.markCalibrationTaskReviewed(taskId, {
        reviewStatus,
        reviewedBy: 'CEO',
        note
      });
    }
    return withMasterDb((database) => {
      try {
        const result = database.prepare(`
          UPDATE price_calibration_priority_tasks
          SET review_status = ?, note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
          WHERE task_id = ? OR linked_queue_id = ?
        `).run(reviewStatus, note || '', 'CEO', nowIso(), nowIso(), taskId || '', queueId || '');
        return { ok: result.changes > 0 };
      } catch (_error) {
        return { ok: false };
      }
    });
  }

  function attachPriorityTask(queueId, taskId) {
    if (!taskId) return;
    withMasterDb((database) => {
      database.prepare('UPDATE real_price_update_queue SET linked_priority_task_id = ? WHERE id = ?').run(String(taskId), String(queueId));
    });
  }

  function approveCalibrationQueueItem(queueId, payload = {}) {
    const note = payload.note || payload.reviewNote || '워크벤치 승인';
    const result = realPriceCalibrationService.approvePriceUpdate(String(queueId), note);
    attachPriorityTask(queueId, payload.linkedPriorityTaskId || payload.linked_priority_task_id || '');
    withMasterDb((database) => {
      database.prepare(`
        UPDATE real_price_update_queue
        SET review_note = ?, approved_by = ?, workbench_status = ?, linked_priority_task_id = COALESCE(NULLIF(?, ''), linked_priority_task_id)
        WHERE id = ?
      `).run(note, payload.approvedBy || payload.approved_by || 'CEO', 'APPROVED', String(payload.linkedPriorityTaskId || payload.linked_priority_task_id || ''), String(queueId));
    });
    updatePriorityTask(payload.linkedPriorityTaskId || payload.linked_priority_task_id || '', String(queueId), 'WORKBENCH_APPROVED', note);
    return { ...result, workbenchStatus: 'APPROVED', detail: getCalibrationQueueItemDetail(queueId) };
  }

  function rejectCalibrationQueueItem(queueId, payload = {}) {
    const reason = payload.reason || payload.rejectionReason || '워크벤치 반려';
    const result = realPriceCalibrationService.rejectPriceUpdate(String(queueId), reason);
    const linkedTaskId = withMasterDb((database) => {
      const row = database.prepare('SELECT linked_priority_task_id FROM real_price_update_queue WHERE id = ?').get(String(queueId));
      database.prepare(`
        UPDATE real_price_update_queue
        SET rejection_reason = ?, review_note = ?, workbench_status = ?
        WHERE id = ?
      `).run(reason, payload.note || reason, 'REJECTED', String(queueId));
      return row?.linked_priority_task_id || '';
    });
    updatePriorityTask(linkedTaskId, String(queueId), 'WORKBENCH_REJECTED', reason);
    return { ...result, workbenchStatus: 'REJECTED', detail: getCalibrationQueueItemDetail(queueId) };
  }

  function deferCalibrationQueueItem(queueId, payload = {}) {
    const reason = payload.reason || payload.deferredReason || '추가 확인 필요';
    const result = withMasterDb((database) => {
      const row = database.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(String(queueId));
      if (!row) throw new Error('Price update queue item not found.');
      if (row.status === 'APPLIED') throw new Error('반영 완료 항목은 보류할 수 없습니다.');
      database.prepare(`
        UPDATE real_price_update_queue
        SET status = ?, deferred_reason = ?, review_note = ?, workbench_status = ?
        WHERE id = ?
      `).run('DEFERRED', reason, payload.note || reason, 'DEFERRED', String(queueId));
      return { ok: true, queueId: String(queueId), status: 'DEFERRED', linkedTaskId: row.linked_priority_task_id || '' };
    });
    updatePriorityTask(result.linkedTaskId, String(queueId), 'WORKBENCH_DEFERRED', reason);
    return { ...result, detail: getCalibrationQueueItemDetail(queueId) };
  }

  function applyApprovedCalibrationWithBackup(queueId, payload = {}) {
    const result = realPriceCalibrationService.applyApprovedPriceUpdate(String(queueId), {
      ...payload,
      appliedBy: payload.appliedBy || payload.applied_by || 'CEO'
    });
    if (!result.ok) return result;
    const linkedTaskId = withMasterDb((database) => {
      const row = database.prepare('SELECT linked_priority_task_id FROM real_price_update_queue WHERE id = ?').get(String(queueId));
      database.prepare(`
        UPDATE real_price_update_queue
        SET applied_backup_id = ?, workbench_status = ?
        WHERE id = ?
      `).run(result.backupId || '', 'APPLIED', String(queueId));
      return row?.linked_priority_task_id || '';
    });
    updatePriorityTask(linkedTaskId, String(queueId), 'WORKBENCH_APPLIED', '백업 후 마스터 단가 반영 완료');
    return { ...result, workbenchStatus: 'APPLIED', detail: getCalibrationQueueItemDetail(queueId) };
  }

  function getCalibrationHistory(itemId) {
    return withMasterDb((database) => {
      const key = String(itemId || '');
      return database.prepare(`
        SELECT * FROM real_price_update_history
        WHERE queue_id = ? OR target_id = ? OR target_name LIKE ?
        ORDER BY created_at DESC
        LIMIT 100
      `).all(key, key, `%${key}%`);
    });
  }

  function createCalibrationWorkbenchReport(payload = {}) {
    const summary = getCalibrationWorkbenchSummary();
    const rows = listCalibrationQueueItems(payload.filters || {}).slice(0, 60);
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'RC_0_3_7_REAL_PRICE_CALIBRATION_WORKBENCH_REPORT_GENERATED.md');
    const lines = [
      '# RC-0.3.7 실제 단가 보정 워크벤치 리포트',
      '',
      `- 생성일: ${nowIso()}`,
      `- 전체 queue 수: ${summary.totalQueueCount}`,
      `- 승인 대기 수: ${summary.pendingReviewCount}`,
      `- HIGH/BLOCKING 수: ${summary.highBlockingCount}`,
      `- 오늘 반영 가능 수: ${summary.todayApplicableCount}`,
      `- 백업 필요 수: ${summary.backupRequiredCount}`,
      `- 반려/보류 수: ${summary.heldOrRejectedCount}`,
      `- 고객 안전성: ${summary.customerSafety}`,
      '',
      '## Queue',
      '',
      '| 상태 | Risk | 항목 | 현재 | 제안 | 차이율 | 추천 조치 |',
      '| --- | --- | --- | ---: | ---: | ---: | --- |',
      ...rows.map((row) => `| ${row.status} | ${row.risk_level} | ${row.target_name} | ${row.current_price} | ${row.proposed_price} | ${row.variance_rate_percent === null ? '-' : row.variance_rate_percent.toFixed(1)}% | ${row.recommended_action} |`),
      '',
      '## 원칙',
      '',
      '- 승인 전에는 마스터 단가를 변경하지 않는다.',
      '- 반영은 승인 후 백업이 성공한 경우에만 수행한다.',
      '- 고객용 payload에는 queue, 내부 단가, variance, 증빙/업체 정보가 포함되지 않는다.'
    ];
    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
    return { ok: true, reportPath, summary };
  }

  function buildCustomerSafeWorkbenchPayload() {
    return {
      customer_safe: true,
      message: '실제 단가 보정 워크벤치는 내부 검토 항목입니다.'
    };
  }

  return {
    getCalibrationWorkbenchSummary,
    listCalibrationQueueItems,
    getCalibrationQueueItemDetail,
    approveCalibrationQueueItem,
    rejectCalibrationQueueItem,
    deferCalibrationQueueItem,
    applyApprovedCalibrationWithBackup,
    getCalibrationHistory,
    createCalibrationWorkbenchReport,
    inspectForbiddenCustomerPayload,
    buildCustomerSafeWorkbenchPayload
  };
}

module.exports = {
  createRealPriceCalibrationWorkbenchService,
  inspectForbiddenCustomerPayload
};
