const assert = require('assert');
const { createTestService, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-master-data-management');

let processResult = service.createMasterDataItem({
  type: 'process',
  payload: {
    id: 'PROC-SMOKE-TILE',
    majorCategory: '리모델링',
    middleCategory: '욕실',
    minorCategory: '타일',
    processName: '타일 시공',
    defaultUnit: '㎡',
    defaultLaborQty: 1.2,
    predecessorProcess: '방수',
    successorProcess: '도기 설치',
    riskLevel: 'HIGH',
    inspectionRequired: true
  }
});
assert.ok(processResult.id, 'Process master item can be created');

let materialResult = service.createMasterDataItem({
  type: 'material',
  payload: {
    id: 'MAT-SMOKE-PORCELAIN',
    materialCategory: 'tile',
    materialName: '600각 포세린 타일',
    specification: '600x600',
    brand: 'UNKNOWN',
    unit: '㎡',
    defaultUnitPrice: 0,
    latestUnitPrice: 0,
    recommendedVendor: '타일테스트',
    appliedProcess: '타일 시공'
  }
});
assert.ok(materialResult.id, 'Material master item can be created');

let vendorResult = service.createMasterDataItem({
  type: 'vendor',
  payload: {
    id: 'VEN-SMOKE-TILE',
    vendorName: '타일테스트',
    vendorType: 'tile_supplier',
    processScope: '타일',
    contact: 'UNKNOWN',
    region: '서울/경기',
    defaultPaymentTerms: '월말 정산',
    reliabilityScore: 82,
    notes: 'smoke vendor'
  }
});
assert.ok(vendorResult.id, 'Vendor master item can be created');

let laborResult = service.createMasterDataItem({
  type: 'labor',
  payload: {
    id: 'LAB-SMOKE-TILE',
    role: '타일 기공',
    process: '타일 시공',
    defaultDailyWage: 280000,
    defaultProductivity: 8,
    skillLevel: 'HIGH'
  }
});
assert.ok(laborResult.id, 'Labor master item can be created');

let standardResult = service.createMasterDataItem({
  type: 'standardItem',
  payload: {
    id: 'STD-SMOKE-TILE-ACCESSORY',
    itemName: '타일 부자재',
    process: '타일 시공',
    defaultUnit: '식',
    defaultCustomerUnitPrice: 250000,
    defaultMaterialCost: 130000,
    defaultLaborCost: 40000,
    defaultSubcontractCost: 0,
    defaultMarginRate: 0.32,
    estimateType: 'bathroom_remodel',
    isMandatory: true
  }
});
assert.ok(standardResult.id, 'Standard estimate item can be created');

service.createMasterDataItem({
  type: 'material',
  payload: {
    id: 'MAT-SMOKE-MISSING-UNIT',
    materialCategory: 'tile',
    materialName: '검증용 자재',
    specification: 'UNKNOWN',
    brand: 'UNKNOWN',
    unit: '',
    appliedProcess: '타일 시공'
  }
});

service.createMasterDataItem({
  type: 'standardItem',
  payload: {
    id: 'STD-SMOKE-DUP-1',
    itemName: '중복 표준 항목',
    process: '타일 시공',
    defaultUnit: '식',
    defaultMarginRate: 0.25,
    estimateType: 'bathroom_remodel'
  }
});
service.createMasterDataItem({
  type: 'standardItem',
  payload: {
    id: 'STD-SMOKE-DUP-2',
    itemName: '중복 표준 항목',
    process: '타일 시공',
    defaultUnit: '식',
    defaultMarginRate: 0.25,
    estimateType: 'bathroom_remodel'
  }
});

const warnings = service.runMasterDataValidation({ actor: 'CEO' });
assert.ok(warnings.some((warning) => warning.warningType === 'MISSING_UNIT'), 'Missing unit creates validation warning');
assert.ok(warnings.some((warning) => warning.warningType === 'DUPLICATE_ITEM'), 'Duplicate item creates validation warning');

const preview = service.calculateBathroomEstimatePreview({ estimateId: 'MASTER-DATA-PREVIEW', customerPriceMultiplier: 1.35 });
assert.ok(preview.masterData, 'Estimate wizard can read standard items');
assert.ok(Number(preview.masterData.standardItemCount) >= 1, 'Estimate preview has active standard item count');

const saved = service.saveBathroomEstimate({
  estimateId: 'MASTER-DATA-BATH-EST',
  customerName: 'Master Data Customer',
  siteName: 'Master Data Site',
  customerPriceMultiplier: 1.35,
  actor: 'CEO'
});
assert.ok(saved.estimateId, 'Bathroom estimate saved for purchase order test');
const generated = createScheduleAndPurchase(service, 'MASTER-DATA-BATH-EST');
assert.ok(generated.purchaseOrder.masterData, 'Purchase order can read material/vendor master');
assert.ok(Number(generated.purchaseOrder.masterData.materialCount) >= 1, 'Purchase order has material master summary');

const emptyContext = createTestService('boc-master-data-empty');
const fallbackPreview = emptyContext.service.calculateBathroomEstimatePreview({ estimateId: 'EMPTY-MASTER-FALLBACK' });
assert.strictEqual(fallbackPreview.masterData.sourceStatus, 'FALLBACK_ACTIVE', 'Empty master data uses fallback logic safely');

const csvResult = service.importMasterDataCsv({
  type: 'equipment',
  csvText: [
    'equipmentName,equipmentType,unit,defaultUnitPrice,appliedProcess',
    '집진기,tool,일,50000,철거'
  ].join('\n')
});
assert.strictEqual(csvResult.importedCount, 1, 'CSV import placeholder works');

const exported = service.exportMasterDataCsv({ type: 'standardItem' });
assert.ok(String(exported.csv).includes('STD-SMOKE-TILE-ACCESSORY'), 'CSV export placeholder works');

const data = service.getMasterDataCenterData({ runValidation: true });
assert.ok(data.summary.processCount >= 1, 'Master Data Center loads process count');
assert.ok(data.summary.standardItemCount >= 1, 'Master Data Center loads standard item count');

const stats = service.getDbStats();
assert.ok(stats.processMasterCount >= 1, 'process_master table has rows');
assert.ok(stats.materialMasterCount >= 1, 'material_master table has rows');
assert.ok(stats.vendorMasterCount >= 1, 'vendor_master table has rows');
assert.ok(stats.laborMasterCount >= 1, 'labor_master table has rows');
assert.ok(stats.standardEstimateItemCount >= 1, 'standard_estimate_items table has rows');
assert.ok(stats.masterDataValidationLogCount >= 1, 'master_data_validation_logs table has rows');

console.log('master-data-management smoke passed');
