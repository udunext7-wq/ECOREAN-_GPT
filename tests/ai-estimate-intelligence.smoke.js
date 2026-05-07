const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');

const { service } = createTestService('boc-ai-estimate-intelligence');
const db = new DatabaseSync(service.dbPaths.project);
const now = new Date().toISOString();

db.prepare(`
  INSERT INTO profit_templates (
    id, project_type, area_range, cost_structure_json, crew_structure_json,
    duration, margin, created_at, location_ko, estimate_structure_json,
    schedule_structure_json, root_cause_summary_json, prevention_rules_applied_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'TPL-AI-BATH-HIGH',
  'bathroom_remodel',
  '0-10',
  JSON.stringify({ materialCost: 1800000, laborCost: 1200000, totalCost: 3300000 }),
  JSON.stringify({ tileCrew: 1, plumber: 1 }),
  6,
  0.38,
  now,
  'UNKNOWN',
  JSON.stringify({ package: 'standard-profitable' }),
  JSON.stringify({ durationDays: 6 }),
  JSON.stringify([]),
  JSON.stringify([])
);

db.prepare(`
  INSERT INTO project_closing_cost_leaks (
    leak_id, closing_snapshot_id, project_id, category, estimated_amount,
    actual_amount, variance_amount, variance_rate, root_cause,
    recommended_prevention, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'PCL-AI-LABOR',
  'PCS-AI',
  'PRJ-AI',
  'LABOR_COST_OVER',
  1000000,
  1200000,
  200000,
  0.2,
  'LABOR_OVERRUN',
  '욕실 타일 노무비 보정계수 +10% 적용 권장',
  now
);

db.prepare(`
  INSERT INTO estimate_calibration_rules (
    id, source_project_id, source_category, rule_type, adjustment_target,
    adjustment_value, reason, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'ECR-AI-LABOR',
  'PRJ-AI',
  'LABOR_COST_OVER',
  'LABOR_FACTOR_ADJUSTMENT',
  'tile_labor',
  0.1,
  '욕실 타일 노무비 보정계수 +10% 적용 권장',
  'ACTIVE',
  now
);

db.prepare(`
  INSERT INTO prevention_rules (
    rule_id, source_pattern_id, root_cause_type, mapped_action, project_type,
    item_id, item_name_ko, enforcement_level, display_severity,
    occurrence_count, approval_required_on_remove, status, reason_ko,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'PREV-AI-WASTE',
  'RCP-AI',
  'estimate_missing',
  'MANDATORY_INCLUDE',
  'bathroom_remodel',
  'waste_disposal_cost',
  '폐기물 반출비',
  'MANDATORY',
  'RED',
  3,
  1,
  'ACTIVE',
  '반복 누락된 폐기물 비용을 다음 견적에서 강제합니다.',
  now,
  now
);

db.close();

const input = {
  customerName: 'AI Smoke Client',
  siteName: 'AI Smoke Site',
  constructionType: 'bathroom_remodel',
  bathroomCount: 1,
  bathroomAreaM2: 4.5,
  ceilingHeightMm: 2200,
  demolitionIncluded: true,
  constructionMethod: 'full_demolition',
  tileWallType: 'porcelain_600',
  tileFloorType: 'porcelain_600',
  fixtureGrade: 'basic',
  options: {
    showerBooth: true,
    zenda: true,
    bathtub: false,
    slidingCabinet: false,
    ventilationFanReplace: true,
    lightingReplace: false,
    faucetReplace: true
  },
  customerPriceMultiplier: 0.7
};

const result = service.getAiEstimateIntelligence({ estimateId: 'AI-SMOKE-001', input, persist: true });

assert.ok(result.recommendations.length > 0, 'new bathroom estimate returns recommendations');
assert.ok(result.warnings.some((warning) => String(warning.titleKo).includes('방수')), 'missing waterproofing warning is generated');
assert.ok(result.warnings.some((warning) => String(warning.titleKo).includes('샤워부스')), 'shower booth creates silicone/leak warning');
assert.ok(result.suggestedTemplate, 'high-margin template is recommended');
assert.ok(result.riskScore.costLeakRisk.recommendations.some((item) => String(item).includes('노무비')), 'repeated labor overrun creates labor factor recommendation');
assert.ok(['HIGH', 'CRITICAL'].includes(result.riskScore.marginRisk.level), 'margin risk below 25 percent returns high or critical');
assert.ok(result.riskScore.defectRisk.checklist.length > 0, 'defect risk creates inspection checklist suggestions');
assert.ok(result.suggestedSchedule.displayKo, 'schedule duration is suggested');
assert.ok(result.appliedCalibrationRules.some((rule) => rule.id === 'ECR-AI-LABOR'), 'calibration rule is suggested but not silently applied');

const action = service.decideAiRecommendationAction({
  estimateId: 'AI-SMOKE-001',
  recommendationId: 'AIW-AI-SMOKE-001-001',
  actionType: 'IGNORE',
  actor: 'CEO',
  reasonKo: 'smoke ignore'
});
assert.ok(action.actionLog.length > 0, 'applied or ignored recommendation action is logged');

console.log('ai-estimate-intelligence smoke passed');
