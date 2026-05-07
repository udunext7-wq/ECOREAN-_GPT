function numberOr(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function areaRangeFor(areaM2) {
  const area = numberOr(areaM2, 0);
  if (area <= 10) return '0-10';
  if (area <= 30) return '10-30';
  if (area <= 60) return '30-60';
  return '60+';
}

function normalizeMarginRate(value) {
  const rate = numberOr(value, 0);
  return rate > 1 ? rate / 100 : rate;
}

function severityRank(severity) {
  return { RED: 4, ORANGE: 3, YELLOW: 2, INFO: 1 }[severity] || 0;
}

function statusFromMarginRisk(riskLevel) {
  if (riskLevel === 'CRITICAL') return 'RED';
  if (riskLevel === 'HIGH') return 'ORANGE';
  if (riskLevel === 'MEDIUM') return 'YELLOW';
  return 'INFO';
}

function hasLineItem(estimate, matcher) {
  return (estimate?.line_items || []).some((item) => matcher(String(item.category || ''), String(item.itemName || '')));
}

function buildMissingItemWarnings({ input, estimate }) {
  const warnings = [];
  const constructionMethod = String(input.constructionMethod || '');
  const options = input.options || {};

  if (input.demolitionIncluded && !hasLineItem(estimate, (_category, name) => name.includes('폐기') || name.includes('廢') || name.includes('먭린'))) {
    warnings.push({
      severity: 'RED',
      titleKo: '철거 포함인데 폐기물 비용이 누락될 위험',
      descriptionKo: '철거가 포함된 욕실 견적은 폐기물 반출/처리 비용을 반드시 분리해야 합니다.',
      suggestedActionKo: '폐기물 처리 항목을 필수 포함으로 유지하세요.'
    });
  }
  if (['full_demolition', 'floating'].includes(constructionMethod) && !input.waterproofMethod) {
    warnings.push({
      severity: 'RED',
      titleKo: '전체 철거/떠붙임인데 방수 방식 미선택',
      descriptionKo: '바닥 철거 또는 떠붙임 시공은 기존 방수층 손상 가능성이 있어 방수 검토가 필요합니다.',
      suggestedActionKo: '방수 방식과 방수 검수 항목을 확인하세요.'
    });
  }
  if (options.showerBooth) {
    warnings.push({
      severity: 'ORANGE',
      titleKo: '샤워부스 선택 시 실리콘/누수 검수 필요',
      descriptionKo: '샤워부스 하부와 유리 접합부는 누수 클레임 가능성이 높습니다.',
      suggestedActionKo: '실리콘 마감과 하부 누수 체크리스트를 추가하세요.'
    });
  }
  if (options.bathtub && !hasLineItem(estimate, (_category, name) => name.includes('배수') || name.includes('drain'))) {
    warnings.push({
      severity: 'ORANGE',
      titleKo: '욕조 선택 시 배수 부속 누락 위험',
      descriptionKo: '욕조 설치는 배수 트랩, 연결 부속, 누수 테스트가 필요합니다.',
      suggestedActionKo: '욕조 배수 부속과 누수 테스트를 확인하세요.'
    });
  }
  if (!hasLineItem(estimate, (_category, name) => name.includes('줄눈') || name.includes('부자재') || name.includes('遺'))) {
    warnings.push({
      severity: 'RED',
      titleKo: '타일 공정에 줄눈/부자재 누락 위험',
      descriptionKo: '타일은 주자재만으로 견적하면 압착시멘트, 본드, 줄눈, 스페이서 비용이 누락됩니다.',
      suggestedActionKo: '타일 부자재 패키지를 필수 포함하세요.'
    });
  }
  if (options.ventilationFanReplace && !options.lightingReplace) {
    warnings.push({
      severity: 'YELLOW',
      titleKo: '환풍기 교체 시 전기 확인 필요',
      descriptionKo: '환풍기 교체는 전원 연결, 스위치, 배기 상태 확인이 필요합니다.',
      suggestedActionKo: '전기 점검 또는 전기 공정 확인을 추가하세요.'
    });
  }
  if (options.zenda) {
    warnings.push({
      severity: 'YELLOW',
      titleKo: '젠다이 시공 시 조적/미장 연결 검토 필요',
      descriptionKo: '젠다이는 조적, 미장, 상판 마감, 실리콘 접합부 품질이 마진과 하자에 영향을 줍니다.',
      suggestedActionKo: '젠다이 조적/미장/상판 마감 항목을 확인하세요.'
    });
  }
  if (input.waterproofMethod && !hasLineItem(estimate, (_category, name) => name.includes('담수') || name.includes('검수') || name.includes('test'))) {
    warnings.push({
      severity: 'ORANGE',
      titleKo: '방수 선택 시 담수 테스트/검수 누락 위험',
      descriptionKo: '방수는 시공보다 검수 실패 시 후속 공정을 차단하는 구조가 중요합니다.',
      suggestedActionKo: '방수 양생 및 담수 테스트 검수 항목을 추가하세요.'
    });
  }
  return warnings;
}

function matchTemplate({ input, templates }) {
  const projectType = String(input.constructionType || 'bathroom_remodel');
  const areaRange = areaRangeFor(input.bathroomAreaM2);
  let best = null;
  templates.forEach((template) => {
    if (template.project_type !== projectType) return;
    let score = 0.45;
    if (template.area_range === areaRange) score += 0.3;
    score += Math.min(normalizeMarginRate(template.margin), 0.5) * 0.35;
    if (String(template.location_ko || 'UNKNOWN') !== 'UNKNOWN' && input.locationKo === template.location_ko) score += 0.1;
    const candidate = {
      templateId: template.id,
      templateNameKo: `고마진 템플릿 ${template.id}`,
      previousMarginRate: normalizeMarginRate(template.margin),
      expectedMarginRate: Math.min(0.45, normalizeMarginRate(template.margin) - 0.02),
      matchScore: Number(score.toFixed(4)),
      costStructure: template.costStructure || {},
      crewStructure: template.crewStructure || {},
      scheduleStructure: template.scheduleStructure || {},
      recommendationKo: '기존 고마진 프로젝트의 원가/인력/일정 구조를 참고할 수 있습니다.'
    };
    if (!best || candidate.matchScore > best.matchScore) best = candidate;
  });
  return best;
}

function predictMarginRisk({ estimate, calibrationRules, costLeaks }) {
  const marginRate = numberOr(estimate?.expected_margin_rate, 0);
  let penalty = 0;
  penalty += calibrationRules.length * 0.015;
  penalty += costLeaks.filter((leak) => Number(leak.variance_amount || 0) > 0).length * 0.01;
  const adjustedRate = marginRate - penalty;
  if (adjustedRate < 0.2) return { level: 'CRITICAL', adjustedRate, messageKo: '예상 마진 20% 미만까지 붕괴될 위험이 있습니다.' };
  if (adjustedRate < 0.25) return { level: 'HIGH', adjustedRate, messageKo: '예상 마진 25% 미만 위험이 있습니다.' };
  if (adjustedRate < 0.3) return { level: 'MEDIUM', adjustedRate, messageKo: '마진 방어 구간입니다. 원가 보정 검토가 필요합니다.' };
  return { level: 'LOW', adjustedRate, messageKo: '현재 입력 기준 마진 위험은 낮습니다.' };
}

function predictDefectRisk({ input }) {
  const checklist = [];
  const prevention = [];
  let score = 10;
  if (input.waterproofMethod) {
    score += 20;
    checklist.push('방수 시공 확인', '방수 양생 확인', '담수 테스트 확인');
    prevention.push('방수 검수 PASS 전 타일 착수 차단');
  }
  if (input.tileWallType || input.tileFloorType) {
    score += 18;
    checklist.push('타일 들뜸 확인', '수평/구배 확인', '줄눈 간격 확인');
    prevention.push('타일 중간 검수와 줄눈/코너 보완 기록');
  }
  if (input.options?.showerBooth) {
    score += 18;
    checklist.push('샤워부스 하부 누수 확인', '실리콘 접합부 확인');
    prevention.push('샤워부스 설치 후 누수 테스트');
  }
  if (input.constructionMethod === 'full_demolition' || input.constructionMethod === 'floating') {
    score += 12;
    checklist.push('배관 위치 확인', '바닥 상태 확인');
  }
  const level = score >= 65 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  return { level, score, checklist: [...new Set(checklist)], prevention: [...new Set(prevention)] };
}

function predictCostLeakRisk({ costLeaks, calibrationRules }) {
  const recommendations = [];
  const byCategory = new Map();
  costLeaks.forEach((leak) => byCategory.set(leak.category, (byCategory.get(leak.category) || 0) + 1));
  byCategory.forEach((count, category) => {
    if (String(category).includes('LABOR')) recommendations.push('욕실 타일 노무비 보정계수 +10% 적용 권장');
    if (String(category).includes('MATERIAL')) recommendations.push('자재 단가 버퍼 +5~10% 적용 권장');
    if (String(category).includes('ESTIMATE_MISSING')) recommendations.push('누락 비용 체크리스트 필수 적용 권장');
  });
  calibrationRules.forEach((rule) => recommendations.push(rule.reason || `${rule.source_category} 보정 룰 적용 검토`));
  const level = recommendations.length >= 3 ? 'HIGH' : recommendations.length >= 1 ? 'MEDIUM' : 'LOW';
  return { level, recommendations: [...new Set(recommendations)] };
}

function suggestSchedule(input) {
  let minDays = 3;
  let maxDays = 5;
  const reasons = ['욕실 단독 기본 공기 3~5일'];
  if (input.constructionMethod === 'floating' || input.constructionMethod === 'full_demolition') {
    minDays = 7;
    maxDays = 10;
    reasons.push('전체 철거/떠붙임은 방수 검수와 타일 공정 시간이 증가합니다.');
  } else if (input.demolitionIncluded) {
    minDays = 5;
    maxDays = 7;
    reasons.push('부분 철거 포함으로 폐기물/방수 상태 확인 시간이 필요합니다.');
  }
  const optionCount = Object.values(input.options || {}).filter(Boolean).length;
  if (optionCount >= 4) {
    minDays += 1;
    maxDays += 2;
    reasons.push('옵션 수가 많아 설치/검수 공정이 증가합니다.');
  }
  if (input.options?.showerBooth || input.options?.zenda || input.options?.bathtub) {
    maxDays += 1;
    reasons.push('샤워부스/젠다이/욕조는 후속 실리콘 및 누수 검수 시간이 필요합니다.');
  }
  return { minDays, maxDays, displayKo: `${minDays}~${maxDays}일`, reasons, riskProcesses: ['방수', '타일', '실리콘', '도기 설치'] };
}

function buildEstimateIntelligence({ estimateId, input = {}, estimate = {}, templates = [], calibrationRules = [], preventionRules = [], costLeaks = [], defectHistory = [] }) {
  const warnings = buildMissingItemWarnings({ input, estimate });
  const template = matchTemplate({ input, templates });
  const marginRisk = predictMarginRisk({ estimate, calibrationRules, costLeaks });
  const defectRisk = predictDefectRisk({ input, defectHistory });
  const costLeakRisk = predictCostLeakRisk({ costLeaks, calibrationRules });
  const schedule = suggestSchedule(input);
  const recommendations = [];

  recommendations.push({
    recommendationType: 'PROCESS',
    severity: 'ORANGE',
    titleKo: '방수/타일/실리콘 검수 흐름 추천',
    descriptionKo: '욕실 공정은 방수 검수 PASS 후 타일 착수, 타일 중간 검수 후 도기/샤워부스 착수 순서로 관리하는 것이 안전합니다.',
    suggestedActionKo: '검수 체크리스트를 공정표와 함께 생성하세요.'
  });
  recommendations.push({
    recommendationType: 'MATERIAL',
    severity: 'YELLOW',
    titleKo: '타일 부자재 패키지 확인',
    descriptionKo: '압착시멘트, 타일본드, 줄눈재, 스페이서, 실리콘은 누락되기 쉬운 비용입니다.',
    suggestedActionKo: '부자재 패키지를 내부 원가표에서 분리 확인하세요.'
  });
  if (template) {
    recommendations.push({
      recommendationType: 'TEMPLATE',
      severity: 'YELLOW',
      titleKo: '고마진 템플릿 추천',
      descriptionKo: `이전 최종 마진율 ${(template.previousMarginRate * 100).toFixed(1)}% 템플릿과 유사합니다.`,
      suggestedActionKo: '템플릿 원가/인력/일정 구조를 검토 후 적용하세요.',
      template
    });
  }
  calibrationRules.forEach((rule) => {
    recommendations.push({
      recommendationType: 'CALIBRATION_RULE',
      severity: 'ORANGE',
      titleKo: `${rule.source_category || rule.adjustment_target} 보정 권장`,
      descriptionKo: rule.reason || '마감 분석에서 생성된 보정 룰입니다.',
      suggestedActionKo: `적용 전 ${rule.adjustment_target || rule.source_category} 금액을 확인하고 보정값 ${rule.adjustment_value}를 검토하세요.`,
      calibrationRule: rule
    });
  });
  preventionRules.forEach((rule) => {
    recommendations.push({
      recommendationType: 'PREVENTION_RULE',
      severity: rule.enforcement_level === 'MANDATORY' ? 'RED' : 'ORANGE',
      titleKo: `${rule.item_name_ko || rule.item_id} 자동 포함 권장`,
      descriptionKo: rule.reason_ko || '반복 원가 누수 방지를 위한 예방 룰입니다.',
      suggestedActionKo: '사용자가 삭제하려면 대표 승인 대상으로 남기세요.',
      preventionRule: rule
    });
  });

  const topSeverity = [...warnings, ...recommendations].reduce((current, item) => (
    severityRank(item.severity) > severityRank(current) ? item.severity : current
  ), statusFromMarginRisk(marginRisk.level));

  return {
    estimateId: estimateId || `AI-PREVIEW-${Date.now()}`,
    recommendations,
    warnings,
    riskScore: {
      severity: topSeverity,
      marginRisk,
      defectRisk,
      costLeakRisk
    },
    suggestedSchedule: schedule,
    suggestedTemplate: template,
    appliedCalibrationRules: calibrationRules,
    recommendedProcesses: ['철거', '폐기물', '방수 검수', '타일', '줄눈', '실리콘', '도기 설치', '준공청소'],
    recommendedMaterials: ['타일', '타일 부자재', '방수재', '줄눈재', '실리콘', '도기류', '환풍기'],
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildEstimateIntelligence
};
