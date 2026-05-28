'use strict';

const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService, SOURCE_MARKER } = require('../electron/services/initialMasterDataService');

const { service, root } = createTestService('boc-initial-master-data');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });

function openMasterDb() {
  return new DatabaseSync(service.dbPaths.master);
}

function countBySource(tableName) {
  const db = openMasterDb();
  try {
    return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE source_marker = ?`).get(SOURCE_MARKER).count || 0);
  } finally {
    db.close();
  }
}

function countRows(tableName) {
  const db = openMasterDb();
  try {
    return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count || 0);
  } finally {
    db.close();
  }
}

let status = initialService.getInitialMasterDataStatus();
assert.ok(status.summary, 'Initial setup status loads');

const processSeed = initialService.seedInitialProcessMaster();
assert.ok(processSeed.insertedCount >= 40, 'process master seed inserts records');
assert.ok(countBySource('process_master') >= processSeed.insertedCount, 'process seed source marker is stored');

const materialSeed = initialService.seedInitialMaterialMaster();
assert.ok(materialSeed.insertedCount >= 20, 'material master seed inserts records');
assert.ok(countBySource('material_master') >= materialSeed.insertedCount, 'material seed source marker is stored');

const laborSeed = initialService.seedInitialLaborMaster();
assert.ok(laborSeed.insertedCount >= 16, 'labor master seed inserts records');

const equipmentSeed = initialService.seedInitialEquipmentMaster();
assert.ok(equipmentSeed.insertedCount >= 8, 'equipment master seed inserts records');

const itemSeed = initialService.seedInitialStandardEstimateItems();
assert.ok(itemSeed.insertedCount >= 45, 'standard estimate items seed inserts records');

const bathroomPackage = initialService.seedBathroomDefaultPackage();
assert.strictEqual(bathroomPackage.insertedCount, 3, 'bathroom package seed works');

const kitchenPackage = initialService.seedKitchenDefaultPackage();
assert.strictEqual(kitchenPackage.insertedCount, 3, 'kitchen package seed works');

const fullPackage = initialService.seedFullRemodelingDefaultPackage();
assert.strictEqual(fullPackage.insertedCount, 3, 'full remodeling package seed works');

const countsBefore = {
  processes: countRows('process_master'),
  materials: countRows('material_master'),
  labor: countRows('labor_master'),
  equipment: countRows('equipment_master'),
  items: countRows('standard_estimate_items'),
  packages: countRows('estimate_default_packages')
};

const secondRun = initialService.runInitialMasterDataSetup();
const countsAfter = {
  processes: countRows('process_master'),
  materials: countRows('material_master'),
  labor: countRows('labor_master'),
  equipment: countRows('equipment_master'),
  items: countRows('standard_estimate_items'),
  packages: countRows('estimate_default_packages')
};
assert.deepStrictEqual(countsAfter, countsBefore, 'running seed twice does not duplicate records');
assert.ok(secondRun.backup?.backupId, 'backup-before-seed hook is called');

const validation = initialService.validateInitialMasterData();
assert.ok(['확인 필요', '사용 가능'].includes(validation.statusKo), 'validation returns safe Korean status');
assert.ok(validation.priceUpdateRequiredCount > 0, 'validation returns warning for NEEDS_UPDATE prices');
assert.ok(validation.warnings.some((warning) => warning.code === 'PRICE_UPDATE_REQUIRED'), 'NEEDS_UPDATE warning exists');

const logs = initialService.getSeedLogs();
assert.ok(logs.length >= 8, 'seed log records inserted/skipped counts');
assert.ok(logs.some((log) => Number(log.skipped_count || 0) > 0), 'idempotent second run records skipped counts');

const preview = service.calculateBathroomEstimatePreview({ estimateId: 'INIT-MASTER-DATA-PREVIEW' });
assert.ok(preview.masterData, 'estimate wizard can read seeded standard items');
assert.strictEqual(preview.masterData.sourceStatus, 'MASTER_DATA_ACTIVE', 'seeded standard items activate master data usage');
assert.ok(Number(preview.masterData.standardItemCount) >= 1, 'estimate preview reads active standard item count');

status = initialService.getInitialMasterDataStatus();
assert.strictEqual(status.status, 'COMPLETED', 'initial setup status becomes completed');
assert.ok(Number(status.summary.priceUpdateRequiredCount || 0) > 0, 'status reports price update required count');

const packageDb = openMasterDb();
try {
  const packageRows = packageDb.prepare('SELECT * FROM estimate_default_packages WHERE source_marker = ?').all(SOURCE_MARKER);
  assert.strictEqual(packageRows.length, 9, 'default package table has nine initial packages');
  assert.ok(packageRows.every((row) => String(row.notes).includes('반드시 수정')), 'package notes warn that defaults need editing');
} finally {
  packageDb.close();
}

console.log(JSON.stringify({
  ok: true,
  test: 'initial-master-data-setup.smoke',
  processInserted: processSeed.insertedCount,
  materialInserted: materialSeed.insertedCount,
  standardItemsInserted: itemSeed.insertedCount,
  packageCount: countsAfter.packages,
  validation: validation.statusKo,
  priceUpdateRequiredCount: validation.priceUpdateRequiredCount,
  backupId: secondRun.backup?.backupId
}, null, 2));
