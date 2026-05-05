const { assertExecutableEstimate } = require('./contractService');

function addDays(dateText, days) {
  const date = dateText ? new Date(dateText) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function hasItem(items, keyword) {
  return items.some((item) => String(item.itemName || '').includes(keyword) || String(item.category || '').includes(keyword));
}

function buildScheduleFromEstimate({ estimate, items, contractId = null, startDate }) {
  assertExecutableEstimate(estimate);
  const start = startDate || new Date().toISOString().slice(0, 10);
  const hasOptionInstall = estimate.options?.showerBooth || estimate.options?.zenda || estimate.options?.bathtub || estimate.options?.slidingCabinet;
  const processes = [
    ['철거', 1, '', '현장팀'],
    ['폐기물 처리', 1, '철거', '현장팀'],
    ['설비', hasItem(items, '배수') ? 1 : 0, '폐기물 처리', '설비팀'],
    ['방수', 1, '설비', '방수팀'],
    ['타일', estimate.tileWallType === 'large_tile' || estimate.tileFloorType === 'large_tile' ? 3 : 2, '방수', '타일팀'],
    ['천장', 1, '타일', '천장팀'],
    ['도기 설치', 1, '천장', '설비팀'],
    ['옵션 설치', hasOptionInstall ? 1 : 0, '도기 설치', '전문시공팀'],
    ['실리콘', 1, hasOptionInstall ? '옵션 설치' : '도기 설치', '마감팀'],
    ['청소', 1, '실리콘', '청소팀'],
    ['검수', 1, '청소', '현장관리자'],
    ['인도', 1, '검수', '대표/현장관리자']
  ].filter(([, duration]) => Number(duration) > 0);

  let cursor = start;
  const itemsOut = processes.map(([processName, durationDays, dependency, assignee], index) => {
    const itemStart = cursor;
    const itemEnd = addDays(itemStart, Number(durationDays) - 1);
    cursor = addDays(itemEnd, 1);
    return {
      processName,
      startDate: itemStart,
      endDate: itemEnd,
      durationDays: Number(durationDays),
      dependency,
      assignee,
      status: 'PLANNED',
      sortOrder: index + 1
    };
  });

  return {
    scheduleName: '욕실 리모델링 공정표',
    estimateId: estimate.id,
    contractId,
    startDate: start,
    endDate: itemsOut[itemsOut.length - 1]?.endDate || start,
    durationDays: itemsOut.reduce((sum, item) => sum + item.durationDays, 0),
    status: 'DRAFT',
    items: itemsOut
  };
}

module.exports = {
  buildScheduleFromEstimate
};
