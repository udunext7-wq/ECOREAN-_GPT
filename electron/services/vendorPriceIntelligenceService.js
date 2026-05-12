const PRICE_ALERT_THRESHOLDS = {
  MEDIUM: 0.08,
  HIGH: 0.12,
  CRITICAL: 0.2
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function calculateVarianceRate(previousPrice, currentPrice) {
  const previous = toNumber(previousPrice);
  const current = toNumber(currentPrice);
  if (previous <= 0 || current <= 0) return 0;
  return Number(((current - previous) / previous).toFixed(4));
}

function resolvePriceRiskLevel(varianceRate) {
  const rate = Math.abs(toNumber(varianceRate));
  if (rate >= PRICE_ALERT_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (rate >= PRICE_ALERT_THRESHOLDS.HIGH) return 'HIGH';
  if (rate >= PRICE_ALERT_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

function resolveVendorReliabilityLevel(score) {
  const safeScore = toNumber(score);
  if (safeScore >= 85) return '우수';
  if (safeScore >= 70) return '보통';
  if (safeScore >= 55) return '주의';
  return '위험';
}

function calculateVendorReliabilityScore({
  onTimeRate = 1,
  shortageCount = 0,
  defectCount = 0,
  priceVarianceRate = 0,
  paymentIssueCount = 0,
  repeatUsageCount = 0,
  manualRating = 80
} = {}) {
  const deliveryScore = Math.max(0, Math.min(100, toNumber(onTimeRate, 1) * 100));
  const manualScore = Math.max(0, Math.min(100, toNumber(manualRating, 80)));
  const repeatScore = Math.min(100, 55 + toNumber(repeatUsageCount) * 5);
  const penalty =
    toNumber(shortageCount) * 8 +
    toNumber(defectCount) * 10 +
    Math.abs(toNumber(priceVarianceRate)) * 100 * 0.35 +
    toNumber(paymentIssueCount) * 5;
  const score = Math.max(0, Math.min(100, deliveryScore * 0.35 + manualScore * 0.3 + repeatScore * 0.2 + 15 - penalty));
  return {
    vendorScore: Number(score.toFixed(2)),
    reliabilityLevel: resolveVendorReliabilityLevel(score)
  };
}

function compareVendorPrices(rows = []) {
  const prices = rows
    .map((row) => ({
      ...row,
      effectivePrice: toInteger(row.actual_unit_price ?? row.actualUnitPrice ?? row.quoted_unit_price ?? row.quotedUnitPrice)
    }))
    .filter((row) => row.effectivePrice > 0);

  if (!prices.length) {
    return {
      lowestPrice: 0,
      averagePrice: 0,
      latestPrice: 0,
      previousPrice: 0,
      varianceRate: 0,
      riskLevel: 'LOW',
      recommendedVendor: null,
      displayKo: '단가 데이터 없음'
    };
  }

  const sortedByDate = [...prices].sort((a, b) => String(b.recorded_at || b.recordedAt || '').localeCompare(String(a.recorded_at || a.recordedAt || '')));
  const latest = sortedByDate[0];
  const previous = sortedByDate[1] || null;
  const lowest = prices.reduce((best, row) => (row.effectivePrice < best.effectivePrice ? row : best), prices[0]);
  const total = prices.reduce((sum, row) => sum + row.effectivePrice, 0);
  const averagePrice = Math.round(total / prices.length);
  const varianceRate = previous ? calculateVarianceRate(previous.effectivePrice, latest.effectivePrice) : 0;

  return {
    lowestPrice: lowest.effectivePrice,
    averagePrice,
    latestPrice: latest.effectivePrice,
    previousPrice: previous?.effectivePrice || 0,
    varianceRate,
    riskLevel: resolvePriceRiskLevel(varianceRate),
    recommendedVendor: {
      vendorId: lowest.vendor_id || lowest.vendorId || null,
      vendorName: lowest.vendor_name || lowest.vendorName || lowest.vendor_name_ko || lowest.vendorNameKo || 'UNKNOWN',
      materialName: lowest.material_name || lowest.materialName || lowest.material_name_ko || lowest.materialNameKo || 'UNKNOWN',
      unitPrice: lowest.effectivePrice,
      reasonKo: '최근 확보 단가 중 최저 단가 기준입니다. 신뢰도 점수와 함께 최종 확인이 필요합니다.'
    },
    displayKo: '단가 비교 가능'
  };
}

function buildPriceAlert({
  alertType = 'PRICE_INCREASE',
  materialName = 'UNKNOWN',
  vendorName = 'UNKNOWN',
  previousPrice = 0,
  currentPrice = 0,
  reason = ''
} = {}) {
  const varianceRate = calculateVarianceRate(previousPrice, currentPrice);
  const severity = resolvePriceRiskLevel(varianceRate);
  return {
    alertType,
    materialName,
    vendorName,
    severity,
    previousPrice: toInteger(previousPrice),
    currentPrice: toInteger(currentPrice),
    varianceRate,
    reason: reason || (
      varianceRate > 0
        ? `${materialName} 단가가 이전 대비 ${(varianceRate * 100).toFixed(1)}% 상승했습니다.`
        : `${materialName} 단가 변동 확인이 필요합니다.`
    )
  };
}

function buildEstimatePriceRecommendation({
  recommendationType = 'MATERIAL_BUFFER',
  targetEstimateType = 'bathroom_remodel',
  targetProcess = 'material',
  materialName = 'UNKNOWN',
  vendorName = 'UNKNOWN',
  varianceRate = 0,
  reliabilityLevel = '보통'
} = {}) {
  const adjustmentValue = Math.max(0.03, Math.min(0.25, Math.abs(toNumber(varianceRate)) || 0.05));
  const isVendorRisk = ['주의', '위험'].includes(reliabilityLevel);
  return {
    recommendationType,
    targetEstimateType,
    targetProcess,
    materialName,
    vendorName,
    adjustmentType: isVendorRisk ? 'RISK_BUFFER_RATE' : 'MATERIAL_COST_RATE',
    adjustmentValue: Number(adjustmentValue.toFixed(4)),
    reason: isVendorRisk
      ? `${vendorName} 신뢰도 ${reliabilityLevel} 상태입니다. 견적 리스크 버퍼 반영을 권장합니다.`
      : `${materialName} 단가 변동 ${(toNumber(varianceRate) * 100).toFixed(1)}% 감지로 다음 견적 자재비 보정을 권장합니다.`
  };
}

function recommendVendor(candidates = []) {
  const normalized = candidates.map((candidate) => {
    const price = toInteger(candidate.actualUnitPrice ?? candidate.actual_unit_price ?? candidate.quotedUnitPrice ?? candidate.quoted_unit_price);
    const reliabilityScore = toNumber(candidate.vendorScore ?? candidate.vendor_score, 70);
    const leadTimeDays = toNumber(candidate.leadTimeDays ?? candidate.lead_time_days, 7);
    const defectCount = toNumber(candidate.defectCount ?? candidate.defect_count);
    const shortageCount = toNumber(candidate.shortageCount ?? candidate.shortage_count);
    const priceScore = price > 0 ? Math.max(0, 100 - price / 10000) : 45;
    const deliveryScore = Math.max(0, 100 - leadTimeDays * 5);
    const riskPenalty = defectCount * 8 + shortageCount * 7;
    const totalScore = priceScore * 0.35 + reliabilityScore * 0.4 + deliveryScore * 0.2 - riskPenalty;
    return {
      ...candidate,
      unitPrice: price,
      vendorScore: reliabilityScore,
      selectionScore: Number(totalScore.toFixed(2)),
      riskWarningKo: riskPenalty > 0 ? '불량/누락 이력이 있어 발주 전 확인이 필요합니다.' : '특이 위험 이력 없음'
    };
  });

  normalized.sort((a, b) => b.selectionScore - a.selectionScore);
  const best = normalized[0] || null;
  return {
    recommendedVendor: best ? {
      vendorId: best.vendorId || best.vendor_id || null,
      vendorName: best.vendorName || best.vendor_name || best.vendorNameKo || best.vendor_name_ko || 'UNKNOWN',
      unitPrice: best.unitPrice,
      selectionScore: best.selectionScore,
      reasonKo: '단가, 납기 신뢰도, 불량/누락 이력을 종합한 추천입니다.',
      riskWarningKo: best.riskWarningKo
    } : null,
    candidates: normalized
  };
}

function parseVendorPriceCsv(csvText = '') {
  const lines = String(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const row = {};
    headers.forEach((header, columnIndex) => {
      row[header] = values[columnIndex] ?? '';
    });
    return {
      rowNumber: index + 2,
      materialName: row.material_name || row.materialName || row['자재명'] || '',
      specification: row.specification || row['규격'] || '',
      brand: row.brand || row['브랜드'] || '',
      vendorName: row.vendor_name || row.vendorName || row['업체명'] || '',
      quotedUnitPrice: toInteger(row.quoted_unit_price || row.quotedUnitPrice || row['견적 단가']),
      actualUnitPrice: toInteger(row.actual_unit_price || row.actualUnitPrice || row['실제 매입 단가']),
      unit: row.unit || row['단위'] || 'EA',
      recordedAt: row.recorded_at || row.recordedAt || row['날짜'] || new Date().toISOString()
    };
  }).filter((row) => row.materialName && row.vendorName);
}

module.exports = {
  PRICE_ALERT_THRESHOLDS,
  calculateVarianceRate,
  resolvePriceRiskLevel,
  calculateVendorReliabilityScore,
  compareVendorPrices,
  buildPriceAlert,
  buildEstimatePriceRecommendation,
  recommendVendor,
  parseVendorPriceCsv
};
