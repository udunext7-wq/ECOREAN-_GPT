function buildChangeOrderPayload({ titleKo = '추가공사', reasonKo = '현장 조건 변경', additionalAmount = 0, additionalCost = 0, scheduleImpactDays = 0, customerApprovalStatus = 'PENDING' }) {
  const revenue = Math.max(0, Math.round(Number(additionalAmount || 0)));
  const cost = Math.max(0, Math.round(Number(additionalCost || 0)));
  const margin = revenue - cost;
  const marginRate = revenue > 0 ? Number((margin / revenue).toFixed(4)) : 0;
  return {
    titleKo,
    reasonKo,
    additionalAmount: revenue,
    additionalCost: cost,
    additionalMargin: margin,
    additionalMarginRate: marginRate,
    scheduleImpactDays: Math.max(0, Math.round(Number(scheduleImpactDays || 0))),
    customerApprovalStatus,
    internalApprovalStatus: 'PENDING_CEO_APPROVAL'
  };
}

module.exports = {
  buildChangeOrderPayload
};
