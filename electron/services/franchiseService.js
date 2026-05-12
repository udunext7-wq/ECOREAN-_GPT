function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function rowBranchId(row) {
  return row?.branch_id || row?.branchId || 'HEADQUARTERS';
}

function rowReceivedAmount(row) {
  return toInteger(row?.actual_received_amount || row?.actual_amount || row?.received_amount);
}

function rowPaidAmount(row) {
  return toInteger(row?.actual_paid_amount || row?.actual_amount || row?.paid_amount);
}

function calculateBranchMetrics({
  branch,
  estimates = [],
  contracts = [],
  profitDecisions = [],
  closings = [],
  receivables = [],
  payables = [],
  templates = []
} = {}) {
  const branchId = branch?.id || 'HEADQUARTERS';
  const branchEstimates = estimates.filter((row) => rowBranchId(row) === branchId);
  const branchContracts = contracts.filter((row) => rowBranchId(row) === branchId);
  const branchDecisions = profitDecisions.filter((row) => rowBranchId(row) === branchId);
  const branchClosings = closings.filter((row) => rowBranchId(row) === branchId);
  const branchReceivables = receivables.filter((row) => rowBranchId(row) === branchId);
  const branchPayables = payables.filter((row) => rowBranchId(row) === branchId);

  const revenue = branchClosings.reduce((sum, row) => sum + toInteger(row.actual_received_revenue || row.estimated_revenue), 0);
  const cost = branchClosings.reduce((sum, row) => sum + toInteger(row.actual_cost || row.estimated_cost), 0);
  const marginRates = branchClosings
    .map((row) => toNumber(row.actual_margin_rate || row.expected_margin_rate))
    .filter((rate) => rate > 0);
  const averageMarginRate = marginRates.length
    ? Number((marginRates.reduce((sum, rate) => sum + rate, 0) / marginRates.length).toFixed(4))
    : 0;
  const contractConversionRate = branchEstimates.length ? Number((branchContracts.length / branchEstimates.length).toFixed(4)) : 0;

  return {
    branchId,
    branchName: branch?.branch_name || '본사',
    estimateCount: branchEstimates.length,
    contractCount: branchContracts.length,
    contractConversionRate,
    totalRevenue: revenue,
    totalCost: cost,
    averageMarginRate,
    lowMarginProjectCount: branchClosings.filter((row) => toNumber(row.actual_margin_rate || row.expected_margin_rate) < 0.25).length,
    pceBlockCount: branchDecisions.filter((row) => row.decision === 'BLOCK').length,
    defectCount: branchClosings.filter((row) => toInteger(row.defect_cost) > 0).length,
    receivableAmount: branchReceivables.reduce((sum, row) => sum + Math.max(0, toInteger(row.scheduled_amount) - rowReceivedAmount(row)), 0),
    payableAmount: branchPayables.reduce((sum, row) => sum + Math.max(0, toInteger(row.scheduled_amount) - rowPaidAmount(row)), 0),
    cashflow: branchReceivables.reduce((sum, row) => sum + rowReceivedAmount(row), 0) - branchPayables.reduce((sum, row) => sum + rowPaidAmount(row), 0),
    highMarginTemplateCount: templates.filter((row) => toNumber(row.margin || row.final_margin_rate) >= 0.35).length
  };
}

function calculateFranchiseFee({ rule, branchRevenue = 0 } = {}) {
  const revenue = toInteger(branchRevenue);
  if (!rule) return 0;
  const type = rule.fee_type || rule.feeType;
  const revenueFee = Math.round(revenue * toNumber(rule.revenue_percent || rule.revenuePercent));
  const fixedFee = toInteger(rule.fixed_monthly_amount || rule.fixedMonthlyAmount);
  if (type === 'REVENUE_PERCENT') return revenueFee;
  if (type === 'FIXED_MONTHLY') return fixedFee;
  if (type === 'MIXED') return revenueFee + fixedFee;
  return 0;
}

function shouldCreateBranchRiskAlert(metrics) {
  if (metrics.averageMarginRate > 0 && metrics.averageMarginRate < 0.25) {
    return {
      alertType: 'LOW_BRANCH_MARGIN',
      severity: 'RED',
      title: '지점 평균 마진 25% 미만',
      description: `${metrics.branchName} 평균 마진율이 ${(metrics.averageMarginRate * 100).toFixed(1)}%입니다.`
    };
  }
  if (metrics.pceBlockCount >= 3) {
    return {
      alertType: 'REPEATED_PCE_BLOCK',
      severity: 'ORANGE',
      title: 'PCE BLOCK 반복',
      description: `${metrics.branchName}에서 수익성 차단이 반복되고 있습니다.`
    };
  }
  if (metrics.receivableAmount > 0 && metrics.cashflow < 0) {
    return {
      alertType: 'CASHFLOW_RISK',
      severity: 'RED',
      title: '현금흐름 악화',
      description: `${metrics.branchName} 미수금과 순현금흐름 위험이 있습니다.`
    };
  }
  return null;
}

module.exports = {
  calculateBranchMetrics,
  calculateFranchiseFee,
  shouldCreateBranchRiskAlert
};
