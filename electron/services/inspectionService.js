const bathroomInspectionItems = [
  ['철거 완료 확인', '철거 잔재 및 기존 상태 확인', false],
  ['배관 위치 확인', '급수/배수 위치와 간섭 여부 확인', true],
  ['방수 시공 확인', '방수층 손상/누락 없음', true],
  ['방수 양생 확인', '양생시간 확보', true],
  ['담수 테스트 확인', '누수 흔적 없음', true],
  ['타일 줄눈 확인', '줄눈 간격과 오염/들뜸 없음', false],
  ['도기 설치 확인', '수평/고정/배수 정상', true],
  ['수전 누수 확인', '냉온수 및 접합부 누수 없음', true],
  ['실리콘 마감 확인', '코너/접합부 마감 균일', false],
  ['최종 청소 확인', '잔재/오염 제거 완료', false],
  ['고객 인도 확인', '인도 전 고객 확인 가능', true]
].map(([itemNameKo, criterionKo, critical], index) => ({
  sortOrder: index + 1,
  processNameKo: itemNameKo.split(' ')[0],
  itemNameKo,
  criterionKo,
  critical
}));

function buildBathroomInspectionChecklist(processNameKo = '욕실 공정 검수') {
  return {
    checklistNameKo: `${processNameKo} 체크리스트`,
    items: bathroomInspectionItems
  };
}

function evaluateInspectionItems(items = []) {
  const failedItems = items.filter((item) => item.result === 'FAIL');
  const criticalFailedItems = failedItems.filter((item) => item.critical || /방수|담수|누수|배관|도기|수전|인도/.test(item.itemNameKo || ''));
  return {
    status: criticalFailedItems.length > 0 ? 'BLOCKED' : failedItems.length > 0 ? 'FAILED' : 'PASSED',
    hasFail: failedItems.length > 0,
    hasCriticalFail: criticalFailedItems.length > 0,
    redAlert: criticalFailedItems.length > 0,
    blockedProcessesKo: criticalFailedItems.length > 0 ? ['후속 의존 공정'] : [],
    failedItems,
    criticalFailedItems
  };
}

module.exports = {
  buildBathroomInspectionChecklist,
  evaluateInspectionItems
};
