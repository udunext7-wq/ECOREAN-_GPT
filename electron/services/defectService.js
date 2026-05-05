function buildDefectPayload({ siteNameKo = '현장', defectLocationKo = '욕실', defectTypeKo = '하자', severity = 'MEDIUM', rootCauseKo = '원인 확인 필요', estimatedCost = 0, managerKo = '현장관리자' }) {
  const cost = Math.max(0, Math.round(Number(estimatedCost || 0)));
  return {
    siteNameKo,
    defectLocationKo,
    defectTypeKo,
    severity,
    rootCauseKo,
    managerKo,
    estimatedCost: cost,
    status: 'OPEN',
    customerConfirmed: false,
    redAlert: severity === 'CRITICAL' || severity === 'HIGH'
  };
}

module.exports = {
  buildDefectPayload
};
