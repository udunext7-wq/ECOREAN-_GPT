function buildDailySiteReport({ projectId, scheduleItems = [], reportDate, weatherKo = '맑음', managerKo = '현장관리자', issueSummaryKo = '특이사항 없음' }) {
  const today = reportDate || new Date().toISOString().slice(0, 10);
  const sortedItems = [...scheduleItems].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const todayItem = sortedItems.find((item) => {
    const start = item.start_date || today;
    const end = item.end_date || start;
    return start <= today && today <= end;
  }) || sortedItems[0] || null;
  const tomorrowItem = sortedItems.find((item) => Number(item.sort_order || 0) > Number(todayItem?.sort_order || 0)) || null;

  return {
    projectId,
    reportDate: today,
    weatherKo,
    todayProcessKo: todayItem?.process_name || '금일 예정 공정 없음',
    workDescriptionKo: todayItem ? `${todayItem.process_name} 진행` : '현장 공정 확인 필요',
    tomorrowProcessKo: tomorrowItem?.process_name || '다음 예정 공정 확인',
    delayReasonKo: '',
    issueSummaryKo,
    managerKo,
    approvalStatus: 'DRAFT',
    photoStatus: 'PHOTO_PLACEHOLDER'
  };
}

module.exports = {
  buildDailySiteReport
};
