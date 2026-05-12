const COST_LEAK_LABELS_KO = {
  MATERIAL_PRICE_INCREASE: '자재 단가 상승',
  LABOR_OVERRUN: '노무 증가',
  MISSING_CHANGE_ORDER: '추가공사 누락',
  SITE_ERROR: '현장 실수',
  REWORK: '재시공',
  DEFECT_COST: '하자 비용',
  SCHEDULE_DELAY: '일정 지연',
  PROCUREMENT_ERROR: '발주 오류',
  WASTE_INCREASE: '폐기물 증가',
  ESTIMATE_MISSING_ITEM: '누락 견적',
  CLIENT_CHANGE_REQUEST: '고객 변경 요청',
  MATERIAL_COST_OVER: '자재비 초과',
  LABOR_COST_OVER: '노무비 초과',
  SUBCONTRACT_COST_OVER: '외주비 초과',
  UNKNOWN: '원인 확인 필요'
};

function toNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function variance(expected, actual) {
  const expectedAmount = Math.round(toNumber(expected));
  const actualAmount = Math.round(toNumber(actual));
  const varianceAmount = actualAmount - expectedAmount;
  return {
    expectedAmount,
    actualAmount,
    varianceAmount,
    varianceRate: expectedAmount > 0 ? varianceAmount / expectedAmount : actualAmount > 0 ? 1 : 0
  };
}

function compareExpectedActual(snapshot = {}) {
  const revenue = variance(snapshot.estimated_revenue, snapshot.actual_received_revenue);
  const material = variance(snapshot.estimated_material_cost, snapshot.actual_material_cost);
  const labor = variance(snapshot.estimated_labor_cost, snapshot.actual_labor_cost);
  const subcontract = variance(
    toNumber(snapshot.estimated_cost) - toNumber(snapshot.estimated_material_cost) - toNumber(snapshot.estimated_labor_cost),
    toNumber(snapshot.actual_cost) - toNumber(snapshot.actual_material_cost) - toNumber(snapshot.actual_labor_cost)
  );
  const duration = variance(
    Math.max(0, toNumber(snapshot.planned_duration_days || snapshot.duration_days || 0)),
    Math.max(0, toNumber(snapshot.actual_duration_days || snapshot.schedule_variance_days || 0) + toNumber(snapshot.planned_duration_days || snapshot.duration_days || 0))
  );
  const margin = variance(snapshot.expected_margin, snapshot.actual_margin);
  const marginRateVariance = toNumber(snapshot.actual_margin_rate) - toNumber(snapshot.expected_margin_rate);
  const riskScore = Math.min(100, Math.round(
    Math.max(0, material.varianceRate) * 25 +
    Math.max(0, labor.varianceRate) * 25 +
    Math.max(0, subcontract.varianceRate) * 20 +
    Math.max(0, -marginRateVariance) * 200 +
    Math.max(0, toNumber(snapshot.schedule_variance_days)) * 4
  ));
  const calibrationPriority = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : riskScore > 0 ? 'LOW' : 'NONE';

  return {
    projectId: snapshot.project_id,
    estimateId: snapshot.estimate_id,
    contractId: snapshot.contract_id,
    expectedRevenue: toNumber(snapshot.estimated_revenue),
    actualRevenue: toNumber(snapshot.actual_received_revenue),
    expectedCost: toNumber(snapshot.estimated_cost),
    actualCost: toNumber(snapshot.actual_cost),
    expectedMargin: toNumber(snapshot.expected_margin),
    actualMargin: toNumber(snapshot.actual_margin),
    expectedMarginRate: toNumber(snapshot.expected_margin_rate),
    actualMarginRate: toNumber(snapshot.actual_margin_rate),
    marginVariance: toNumber(snapshot.margin_variance),
    marginRateVariance,
    material,
    labor,
    subcontract,
    duration,
    revenue,
    riskScore,
    calibrationPriority
  };
}

function classifyLeak({ category, expectedAmount, actualAmount, varianceAmount, rootCause }) {
  const key = String(category || rootCause || '').toUpperCase();
  if (key.includes('MATERIAL')) return 'MATERIAL_PRICE_INCREASE';
  if (key.includes('LABOR')) return 'LABOR_OVERRUN';
  if (key.includes('DEFECT')) return 'DEFECT_COST';
  if (key.includes('SCHEDULE')) return 'SCHEDULE_DELAY';
  if (key.includes('CHANGE_ORDER')) return 'MISSING_CHANGE_ORDER';
  if (key.includes('WASTE')) return 'WASTE_INCREASE';
  if (key.includes('PROCUREMENT')) return 'PROCUREMENT_ERROR';
  if (key.includes('MISSING')) return 'ESTIMATE_MISSING_ITEM';
  if (varianceAmount > 0 && expectedAmount === 0 && actualAmount > 0) return 'ESTIMATE_MISSING_ITEM';
  return 'UNKNOWN';
}

function severityForLeak(varianceRate, varianceAmount) {
  if (varianceAmount >= 1000000 || varianceRate >= 0.3) return 'RED';
  if (varianceAmount >= 300000 || varianceRate >= 0.15) return 'ORANGE';
  if (varianceAmount > 0) return 'YELLOW';
  return 'NORMAL';
}

function preventionForCategory(categoryKo, category) {
  const code = String(category || '').toUpperCase();
  if (code === 'MATERIAL_PRICE_INCREASE') return `${categoryKo} 반복 초과를 다음 견적의 자재 버퍼에 반영`;
  if (code === 'LABOR_OVERRUN') return `${categoryKo} 반복 초과를 다음 견적의 노무비 보정계수에 반영`;
  if (code === 'SCHEDULE_DELAY') return `${categoryKo} 리스크를 공기와 PCE 일정 리스크에 반영`;
  if (code === 'DEFECT_COST') return `${categoryKo} 발생 공정에 검수 체크리스트와 하자 버퍼 추가`;
  if (code === 'ESTIMATE_MISSING_ITEM') return `${categoryKo} 항목을 다음 견적 필수 체크리스트로 추가`;
  return `${categoryKo} 원인을 다음 견적 검토 항목으로 추가`;
}

function buildProjectCostLeak({ projectId, sourceLeak, comparison, createdAt }) {
  const expectedAmount = toNumber(sourceLeak?.estimated_amount ?? sourceLeak?.estimatedAmount);
  const actualAmount = toNumber(sourceLeak?.actual_amount ?? sourceLeak?.actualAmount);
  const varianceAmount = toNumber(sourceLeak?.variance_amount ?? sourceLeak?.varianceAmount ?? actualAmount - expectedAmount);
  const varianceRate = toNumber(sourceLeak?.variance_rate ?? sourceLeak?.varianceRate ?? (expectedAmount > 0 ? varianceAmount / expectedAmount : 1));
  const category = classifyLeak({
    category: sourceLeak?.category,
    expectedAmount,
    actualAmount,
    varianceAmount,
    rootCause: sourceLeak?.root_cause ?? sourceLeak?.rootCause
  });
  const categoryKo = COST_LEAK_LABELS_KO[category] || COST_LEAK_LABELS_KO.UNKNOWN;
  return {
    id: `PCL-REAL-${projectId}-${category}-${Math.abs(Math.round(varianceAmount))}`,
    projectId,
    category,
    categoryKo,
    expectedAmount,
    actualAmount,
    varianceAmount,
    varianceRate,
    rootCause: sourceLeak?.root_cause || sourceLeak?.rootCause || categoryKo,
    preventionRule: sourceLeak?.recommended_prevention || sourceLeak?.recommendedPrevention || preventionForCategory(categoryKo, category),
    severity: severityForLeak(varianceRate, varianceAmount),
    riskScore: comparison?.riskScore || 0,
    createdAt
  };
}

function buildCalibrationRule({ leak, occurrenceCount = 1, sourceProjectIds = [], createdAt }) {
  const adjustmentType = leak.category === 'LABOR_OVERRUN'
    ? 'LABOR_FACTOR'
    : leak.category === 'MATERIAL_PRICE_INCREASE'
      ? 'MATERIAL_BUFFER'
      : leak.category === 'SCHEDULE_DELAY'
        ? 'DURATION_BUFFER'
        : leak.category === 'DEFECT_COST'
          ? 'DEFECT_RISK_BUFFER'
          : 'MANDATORY_ITEM';
  const adjustmentValue = Math.min(0.3, Math.max(0.05, Math.abs(toNumber(leak.varianceRate)) || 0.08));
  const confidenceScore = Math.min(0.95, 0.45 + occurrenceCount * 0.15);
  const processType = leak.category === 'LABOR_OVERRUN' ? 'labor'
    : leak.category === 'MATERIAL_PRICE_INCREASE' ? 'material'
      : leak.category === 'SCHEDULE_DELAY' ? 'schedule'
        : leak.category === 'DEFECT_COST' ? 'defect'
          : 'checklist';

  return {
    id: `CAL-${leak.category}-${Buffer.from(sourceProjectIds.join('|') || leak.projectId).toString('hex').slice(0, 12)}`,
    estimateType: 'bathroom_remodel',
    processType,
    conditionJson: JSON.stringify({ leakCategory: leak.category, occurrenceCount, severity: leak.severity }),
    adjustmentType,
    adjustmentValue,
    reason: leak.preventionRule,
    confidenceScore,
    sourceProjectIds,
    autoGenerated: true,
    requiresApproval: true,
    status: 'PENDING_APPROVAL',
    createdAt
  };
}

function buildRiskPattern({ category, rows = [], createdAt }) {
  const count = rows.length;
  const averageMarginLoss = count
    ? Math.round(rows.reduce((sum, row) => sum + Math.max(0, toNumber(row.variance_amount ?? row.varianceAmount)), 0) / count)
    : 0;
  const averageDelayDays = category === 'SCHEDULE_DELAY' ? Math.max(1, Math.round(count / 2)) : 0;
  const severity = count >= 3 || averageMarginLoss >= 1000000 ? 'RED' : count >= 2 ? 'ORANGE' : 'YELLOW';
  const categoryKo = COST_LEAK_LABELS_KO[category] || COST_LEAK_LABELS_KO.UNKNOWN;
  return {
    id: `RISK-PATTERN-${category}`,
    patternType: 'COST_LEAK',
    patternKey: category,
    occurrenceCount: count,
    averageMarginLoss,
    averageDelayDays,
    recommendation: `${categoryKo} 반복 발생: 다음 견적에서 보정 룰 적용 필요`,
    severity,
    createdAt
  };
}

module.exports = {
  COST_LEAK_LABELS_KO,
  compareExpectedActual,
  buildProjectCostLeak,
  buildCalibrationRule,
  buildRiskPattern
};
