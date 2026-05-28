'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const INITIAL_SOURCE_MARKER = 'INITIAL_RC_0_3_0';

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function openDatabase(filePath) {
  return new DatabaseSync(filePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureColumn(database, tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
  if (!columns.includes(columnName)) database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
}

function tableCount(database, tableName, where = '1 = 1') {
  return Number(database.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE ${where}`).get().count || 0);
}

function calculatePriceVariance(currentPrice, proposedPrice) {
  const current = toNumber(currentPrice);
  const proposed = toNumber(proposedPrice);
  const varianceAmount = proposed - current;
  const varianceRate = current > 0 ? varianceAmount / current : null;
  let labelKo = '동일';
  let attention = 'LOW';
  if (current <= 0) {
    labelKo = '신규 입력';
    attention = 'MEDIUM';
  } else if (varianceRate > 0.15) {
    labelKo = '상승';
    attention = 'HIGH';
  } else if (varianceRate > 0.05) {
    labelKo = '상승';
    attention = 'MEDIUM';
  } else if (varianceRate < -0.05) {
    labelKo = '하락';
    attention = 'LOW';
  }
  return { varianceAmount, varianceRate, labelKo, attention };
}

const HIGH_KEYWORDS = ['욕실 타일', '벽타일', '바닥타일', '타일 부자재', '방수', '도기', '양변기', '세면기', '수전', '주방 가구', '상판', '바닥재', '강마루', '도배', '목공', '전기', '노무', '철거', '폐기물'];
const MEDIUM_KEYWORDS = ['조명', '환풍기', '실리콘', '필름', '몰딩', '걸레받이', '욕실장', '싱크볼', '후드'];

function classifyPriority(item) {
  const text = [item.targetName, item.target_name, item.material_name, item.role, item.item_name, item.process, item.material_category, item.target_type].filter(Boolean).join(' ');
  if (item.is_mandatory || item.target_type === 'LABOR') return 'HIGH';
  if (HIGH_KEYWORDS.some((keyword) => text.includes(keyword))) return 'HIGH';
  if (MEDIUM_KEYWORDS.some((keyword) => text.includes(keyword))) return 'MEDIUM';
  if (item.target_type === 'EQUIPMENT') return 'LOW';
  return 'MEDIUM';
}

function createRealPriceCalibrationService({ sqliteService, backupRestoreService = null, docsDir = null }) {
  const masterDbPath = sqliteService.dbPaths.master;
  const reportDir = docsDir || path.resolve(__dirname, '..', '..', 'docs');

  function withDb(callback) {
    const database = openDatabase(masterDbPath);
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
    ensureColumn(database, 'material_master', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'material_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'labor_master', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'labor_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'equipment_master', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'equipment_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'standard_estimate_items', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'standard_estimate_items', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
  }

  function normalizeNeedsUpdateRow(row, targetType) {
    if (targetType === 'MATERIAL') {
      return {
        targetType,
        targetId: row.id,
        targetName: row.material_name,
        currentPrice: Number(row.latest_unit_price || row.default_unit_price || 0),
        unit: row.unit,
        appliedProcess: row.applied_process,
        estimateType: '',
        priceStatus: row.price_status,
        priority: classifyPriority({ ...row, target_type: targetType })
      };
    }
    if (targetType === 'LABOR') {
      return {
        targetType,
        targetId: row.id,
        targetName: row.role,
        currentPrice: Number(row.default_daily_wage || 0),
        unit: '일',
        appliedProcess: row.process,
        estimateType: '',
        priceStatus: row.price_status,
        priority: classifyPriority({ ...row, target_type: targetType })
      };
    }
    if (targetType === 'EQUIPMENT') {
      return {
        targetType,
        targetId: row.id,
        targetName: row.equipment_name,
        currentPrice: Number(row.default_unit_price || 0),
        unit: row.unit,
        appliedProcess: row.applied_process,
        estimateType: '',
        priceStatus: row.price_status,
        priority: classifyPriority({ ...row, target_type: targetType })
      };
    }
    return {
      targetType,
      targetId: row.id,
      targetName: row.item_name,
      currentPrice: Number(row.default_customer_unit_price || 0),
      unit: row.default_unit,
      appliedProcess: row.process,
      estimateType: row.estimate_type,
      priceStatus: row.price_status,
      priority: classifyPriority({ ...row, target_type: targetType })
    };
  }

  function getNeedsUpdatePriceItems() {
    return withDb((database) => {
      const material = database.prepare("SELECT * FROM material_master WHERE price_status = 'NEEDS_UPDATE' OR source_marker = ? OR default_unit_price <= 0 OR latest_unit_price <= 0 ORDER BY material_category, material_name").all(INITIAL_SOURCE_MARKER).map((row) => normalizeNeedsUpdateRow(row, 'MATERIAL'));
      const labor = database.prepare("SELECT * FROM labor_master WHERE price_status = 'NEEDS_UPDATE' OR source_marker = ? OR default_daily_wage <= 0 ORDER BY process, role").all(INITIAL_SOURCE_MARKER).map((row) => normalizeNeedsUpdateRow(row, 'LABOR'));
      const equipment = database.prepare("SELECT * FROM equipment_master WHERE price_status = 'NEEDS_UPDATE' OR source_marker = ? OR default_unit_price <= 0 ORDER BY equipment_type, equipment_name").all(INITIAL_SOURCE_MARKER).map((row) => normalizeNeedsUpdateRow(row, 'EQUIPMENT'));
      const standardItems = database.prepare("SELECT * FROM standard_estimate_items WHERE price_status = 'NEEDS_UPDATE' OR source_marker = ? OR default_customer_unit_price <= 0 ORDER BY estimate_type, process, item_name").all(INITIAL_SOURCE_MARKER).map((row) => normalizeNeedsUpdateRow(row, 'STANDARD_ITEM'));
      const grouped = { material, labor, equipment, standardItems, packages: [] };
      const items = [...material, ...labor, ...equipment, ...standardItems];
      return { items, grouped, count: items.length };
    });
  }

  function getPriceUpdatePriorityList() {
    const items = getNeedsUpdatePriceItems().items.map((item) => ({ ...item, priority: classifyPriority({ targetName: item.targetName, target_type: item.targetType, is_mandatory: item.isMandatory }) }));
    return {
      high: items.filter((item) => item.priority === 'HIGH'),
      medium: items.filter((item) => item.priority === 'MEDIUM'),
      low: items.filter((item) => item.priority === 'LOW'),
      items: items.sort((a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority]))
    };
  }

  function findTarget(database, targetType, targetId, targetName = '') {
    if (targetType === 'MATERIAL') {
      return database.prepare('SELECT id, material_name AS target_name, latest_unit_price AS current_price, unit FROM material_master WHERE id = ? OR material_name = ? ORDER BY id LIMIT 1').get(targetId, targetName);
    }
    if (targetType === 'LABOR') {
      return database.prepare('SELECT id, role AS target_name, default_daily_wage AS current_price, ? AS unit FROM labor_master WHERE id = ? OR role = ? ORDER BY id LIMIT 1').get('일', targetId, targetName);
    }
    if (targetType === 'EQUIPMENT') {
      return database.prepare('SELECT id, equipment_name AS target_name, default_unit_price AS current_price, unit FROM equipment_master WHERE id = ? OR equipment_name = ? ORDER BY id LIMIT 1').get(targetId, targetName);
    }
    if (targetType === 'STANDARD_ITEM') {
      return database.prepare('SELECT id, item_name AS target_name, default_customer_unit_price AS current_price, default_unit AS unit FROM standard_estimate_items WHERE id = ? OR item_name = ? ORDER BY id LIMIT 1').get(targetId, targetName);
    }
    if (targetType === 'PACKAGE') {
      return database.prepare('SELECT id, package_name AS target_name, margin_target AS current_price, ? AS unit FROM estimate_default_packages WHERE id = ? OR package_name = ? ORDER BY id LIMIT 1').get('rate', targetId, targetName);
    }
    throw new Error(`Unsupported target type: ${targetType}`);
  }

  function createQueueItem(payload, priceSource) {
    return withDb((database) => {
      const targetType = payload.targetType || payload.target_type || (priceSource === 'LABOR_RATE' ? 'LABOR' : 'MATERIAL');
      const target = findTarget(database, targetType, payload.targetId || payload.target_id || '', payload.targetName || payload.target_name || payload.itemName || payload.item_name || payload.materialName || payload.role || '');
      if (!target) throw new Error('Price update target not found.');
      const proposedPrice = toNumber(payload.proposedPrice ?? payload.proposed_price ?? payload.quotedUnitPrice ?? payload.actualPurchasePrice ?? payload.actualUnitPrice ?? payload.proposedDailyWage);
      const variance = calculatePriceVariance(target.current_price, proposedPrice);
      const queueId = id('RPUQ');
      const priority = payload.priority || classifyPriority({ targetName: target.target_name, target_type: targetType });
      database.prepare(`
        INSERT INTO real_price_update_queue (
          id, target_type, target_id, target_name, current_price, proposed_price,
          unit, price_source, vendor_id, vendor_name, evidence_note, evidence_file_path,
          variance_amount, variance_rate, priority, status, approval_note, backup_id,
          created_at, approved_at, applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        queueId,
        targetType,
        target.id,
        target.target_name,
        toNumber(target.current_price),
        proposedPrice,
        payload.unit || target.unit || '',
        priceSource,
        payload.vendorId || payload.vendor_id || null,
        payload.vendorName || payload.vendor_name || '',
        payload.evidenceNote || payload.evidence_note || payload.notes || '',
        payload.evidenceFilePath || payload.evidence_file_path || '',
        variance.varianceAmount,
        variance.varianceRate,
        priority,
        'PENDING_REVIEW',
        '',
        '',
        nowIso(),
        null,
        null
      );
      if (targetType === 'MATERIAL' && (priceSource === 'VENDOR_QUOTE' || priceSource === 'ACTUAL_PURCHASE')) {
        insertMaterialPriceHistory(database, {
          target,
          payload,
          proposedPrice,
          priceSource
        });
      }
      return { queueId, queueItem: getQueueItem(database, queueId), variance };
    });
  }

  function insertMaterialPriceHistory(database, { target, payload, proposedPrice, priceSource }) {
    const material = database.prepare('SELECT * FROM material_master WHERE id = ?').get(target.id);
    database.prepare(`
      INSERT INTO material_price_history (
        id, material_category, material_name, specification, brand,
        vendor_id, vendor_name, quoted_unit_price, actual_unit_price, unit,
        source_type, related_purchase_order_id, recorded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id('MPH-RPC'),
      material?.material_category || '',
      material?.material_name || target.target_name,
      material?.specification || 'UNKNOWN',
      material?.brand || 'UNKNOWN',
      payload.vendorId || null,
      payload.vendorName || payload.vendor_name || '',
      toNumber(payload.quotedUnitPrice ?? proposedPrice),
      toNumber(payload.actualPurchasePrice ?? payload.actualUnitPrice ?? proposedPrice),
      payload.unit || target.unit || material?.unit || '',
      priceSource,
      payload.relatedPurchaseOrderId || payload.related_purchase_order_id || null,
      payload.recordedAt || payload.appliedDate || nowIso(),
      nowIso()
    );
  }

  function getQueueItem(database, queueId) {
    return database.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(queueId);
  }

  function createVendorQuotePriceUpdate(payload) {
    return createQueueItem(payload, 'VENDOR_QUOTE');
  }

  function createActualPurchasePriceUpdate(payload) {
    return createQueueItem(payload, 'ACTUAL_PURCHASE');
  }

  function createLaborRateUpdate(payload) {
    return createQueueItem({ ...payload, targetType: 'LABOR', proposedPrice: payload.proposedDailyWage ?? payload.proposedPrice }, 'LABOR_RATE');
  }

  function approvePriceUpdate(queueId, note = '') {
    return withDb((database) => {
      const row = getQueueItem(database, queueId);
      if (!row) throw new Error('Price update queue item not found.');
      if (row.status === 'REJECTED' || row.status === 'APPLIED') throw new Error(`Cannot approve ${row.status} item.`);
      database.prepare("UPDATE real_price_update_queue SET status = 'APPROVED', approval_note = ?, approved_at = ? WHERE id = ?").run(note, nowIso(), queueId);
      return { queueId, status: 'APPROVED', queueItem: getQueueItem(database, queueId) };
    });
  }

  function rejectPriceUpdate(queueId, reason = '') {
    return withDb((database) => {
      const row = getQueueItem(database, queueId);
      if (!row) throw new Error('Price update queue item not found.');
      if (row.status === 'APPLIED') throw new Error('Applied item cannot be rejected.');
      database.prepare("UPDATE real_price_update_queue SET status = 'REJECTED', approval_note = ?, approved_at = ? WHERE id = ?").run(reason, nowIso(), queueId);
      return { queueId, status: 'REJECTED', queueItem: getQueueItem(database, queueId) };
    });
  }

  function backupBeforePriceApply() {
    if (!backupRestoreService || typeof backupRestoreService.createPreUpdateBackup !== 'function') {
      throw new Error('Backup service is not available.');
    }
    const backup = backupRestoreService.createPreUpdateBackup({ notes: '실제 단가 반영 전 자동 백업' });
    return backup.backupId || backup.manifest?.backup_id || backup.backupPath || '';
  }

  function applyApprovedPriceUpdate(queueId, options = {}) {
    return withDb((database) => {
      const row = getQueueItem(database, queueId);
      if (!row) throw new Error('Price update queue item not found.');
      if (row.status !== 'APPROVED') throw new Error('승인되지 않은 단가는 반영할 수 없습니다.');
      let backupId = '';
      try {
        backupId = backupBeforePriceApply();
      } catch (error) {
        if (!options.continueWithoutBackup) {
          return { ok: false, status: 'BACKUP_FAILED', messageKo: '백업 실패로 단가 반영을 중단했습니다.', error: error.message };
        }
      }
      applyMasterPrice(database, row);
      database.prepare(`
        INSERT INTO real_price_update_history (
          id, queue_id, target_type, target_id, target_name, old_price,
          new_price, unit, source, applied_by, backup_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id('RPUH'), row.id, row.target_type, row.target_id, row.target_name, row.current_price, row.proposed_price, row.unit, row.price_source, options.appliedBy || 'CEO', backupId, nowIso());
      database.prepare("UPDATE real_price_update_queue SET status = 'APPLIED', backup_id = ?, applied_at = ? WHERE id = ?").run(backupId, nowIso(), queueId);
      return { ok: true, queueId, status: 'APPLIED', backupId, queueItem: getQueueItem(database, queueId) };
    });
  }

  function applyMasterPrice(database, row) {
    if (row.target_type === 'MATERIAL') {
      database.prepare("UPDATE material_master SET default_unit_price = ?, latest_unit_price = ?, price_status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(row.proposed_price, row.proposed_price, nowIso(), row.target_id);
      return;
    }
    if (row.target_type === 'LABOR') {
      database.prepare("UPDATE labor_master SET default_daily_wage = ?, price_status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(row.proposed_price, nowIso(), row.target_id);
      updateStandardLaborBasis(database, row);
      return;
    }
    if (row.target_type === 'EQUIPMENT') {
      database.prepare("UPDATE equipment_master SET default_unit_price = ?, price_status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(row.proposed_price, nowIso(), row.target_id);
      return;
    }
    if (row.target_type === 'STANDARD_ITEM') {
      database.prepare("UPDATE standard_estimate_items SET default_customer_unit_price = ?, price_status = 'CONFIRMED', updated_at = ? WHERE id = ?").run(row.proposed_price, nowIso(), row.target_id);
      return;
    }
    if (row.target_type === 'PACKAGE') {
      database.prepare("UPDATE estimate_default_packages SET margin_target = ?, updated_at = ? WHERE id = ?").run(row.proposed_price, nowIso(), row.target_id);
    }
  }

  function updateStandardLaborBasis(database, row) {
    const labor = database.prepare('SELECT * FROM labor_master WHERE id = ?').get(row.target_id);
    if (!labor?.process) return;
    database.prepare(`
      UPDATE standard_estimate_items
      SET default_labor_cost = CASE WHEN default_labor_cost <= 0 THEN ? ELSE default_labor_cost END,
          updated_at = ?
      WHERE process LIKE ?
    `).run(Math.round(row.proposed_price * 0.25), nowIso(), `%${labor.process}%`);
  }

  function applyApprovedPriceUpdates(queueIds = []) {
    return { results: queueIds.map((queueId) => applyApprovedPriceUpdate(queueId)) };
  }

  function getPriceUpdateHistory() {
    return withDb((database) => database.prepare('SELECT * FROM real_price_update_history ORDER BY created_at DESC LIMIT 100').all());
  }

  function getQueueItems() {
    return withDb((database) => database.prepare('SELECT * FROM real_price_update_queue ORDER BY CASE status WHEN "PENDING_REVIEW" THEN 0 WHEN "APPROVED" THEN 1 WHEN "APPLIED" THEN 2 ELSE 3 END, created_at DESC LIMIT 200').all());
  }

  function getRealPriceCalibrationSummary() {
    return withDb((database) => {
      const needsUpdate = getNeedsUpdatePriceItems();
      const queueRows = database.prepare('SELECT status, COUNT(*) AS count FROM real_price_update_queue GROUP BY status').all();
      const appliedCount = Number(queueRows.find((row) => row.status === 'APPLIED')?.count || 0);
      const pendingCount = Number(queueRows.find((row) => row.status === 'PENDING_REVIEW')?.count || 0);
      const approvedCount = Number(queueRows.find((row) => row.status === 'APPROVED')?.count || 0);
      const rejectedCount = Number(queueRows.find((row) => row.status === 'REJECTED')?.count || 0);
      const avg = database.prepare("SELECT AVG(variance_rate) AS value FROM real_price_update_queue WHERE variance_rate IS NOT NULL").get().value;
      const priorities = getPriceUpdatePriorityList();
      return {
        needsUpdateCount: needsUpdate.count,
        highPriorityCount: priorities.high.length,
        pendingCount,
        approvedCount,
        rejectedCount,
        appliedCount,
        averageVarianceRate: Number(avg || 0),
        backupStatus: backupRestoreService ? 'AVAILABLE' : 'UNAVAILABLE',
        statusKo: needsUpdate.count > 0 ? '실제 단가 보정 필요' : '실제 단가 보정 완료'
      };
    });
  }

  function createPriceCalibrationReport() {
    const summary = getRealPriceCalibrationSummary();
    const priority = getPriceUpdatePriorityList();
    const history = getPriceUpdateHistory();
    ensureDir(reportDir);
    const reportPath = path.join(reportDir, 'RC_0_3_0_REAL_PRICE_CALIBRATION_REPORT.md');
    const body = [
      '# RC-0.3.0 실제 단가 보정 리포트',
      '',
      `- 생성일: ${nowIso()}`,
      `- 수정 필요 단가: ${summary.needsUpdateCount}`,
      `- 우선 보정 항목: ${summary.highPriorityCount}`,
      `- 승인 대기: ${summary.pendingCount}`,
      `- 승인 후 미반영: ${summary.approvedCount}`,
      `- 반영 완료: ${summary.appliedCount}`,
      `- 반려: ${summary.rejectedCount}`,
      `- 평균 변동률: ${(summary.averageVarianceRate * 100).toFixed(1)}%`,
      '',
      '## 남은 우선 입력 항목',
      ...priority.items.slice(0, 30).map((item) => `- [${item.priority}] ${item.targetType} / ${item.targetName} / 현재 ${item.currentPrice}${item.unit}`),
      '',
      '## 반영 이력',
      ...(history.length ? history.slice(0, 20).map((item) => `- ${item.target_name}: ${item.old_price} -> ${item.new_price} (${item.source})`) : ['- 아직 반영 이력이 없습니다.']),
      '',
      '## 주의',
      '',
      '이 리포트의 가격은 사용자가 입력한 견적/매입/노무 단가를 기준으로 한다. 외부 시장 단가로 자동 검증된 값이 아니다.'
    ].join('\n');
    fs.writeFileSync(reportPath, body, 'utf8');
    return { reportPath, summary };
  }

  return {
    getNeedsUpdatePriceItems,
    getPriceUpdatePriorityList,
    createVendorQuotePriceUpdate,
    createActualPurchasePriceUpdate,
    createLaborRateUpdate,
    calculatePriceVariance,
    approvePriceUpdate,
    rejectPriceUpdate,
    applyApprovedPriceUpdate,
    applyApprovedPriceUpdates,
    getPriceUpdateHistory,
    getQueueItems,
    getRealPriceCalibrationSummary,
    createPriceCalibrationReport,
    backupBeforePriceApply
  };
}

module.exports = {
  createRealPriceCalibrationService,
  calculatePriceVariance,
  classifyPriority
};
