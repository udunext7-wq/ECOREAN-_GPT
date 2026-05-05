async function invokeAndRefresh<T>(promise: Promise<Record<string, unknown>>): Promise<T> {
  const result = await promise;
  if (result.dashboardData) {
    window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
  }
  return result as T;
}

export async function createDailySiteReportFromSchedule(projectId: string) {
  if (!window.ecorean?.bocDb?.createDailySiteReportFromSchedule) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createDailySiteReportFromSchedule({
    projectId,
    weatherKo: '맑음',
    issueSummaryKo: '특이사항 없음',
    managerKo: '현장관리자',
    actor: 'CEO'
  }));
}

export async function createCrewAttendanceReport(projectId: string) {
  if (!window.ecorean?.bocDb?.createCrewAttendanceReport) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createCrewAttendanceReport({
    projectId,
    siteNameKo: '욕실 리모델링 현장',
    workers: [
      { workerNameKo: '타일 기공', roleKo: '기공', affiliationKo: '직영/외주', checkInTime: '08:00', checkOutTime: '17:00', dailyWage: 280000 },
      { workerNameKo: '조공', roleKo: '조공', affiliationKo: '직영/외주', checkInTime: '08:00', checkOutTime: '17:00', dailyWage: 180000 }
    ],
    actor: 'CEO'
  }));
}

export async function createMaterialReceivingLog(projectId: string) {
  if (!window.ecorean?.bocDb?.createMaterialReceivingLog) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createMaterialReceivingLog({
    projectId,
    purchaseOrderId: `PO-${projectId}`,
    receivedItems: [
      { itemNameKo: '600각 폴리싱 타일', specificationKo: '600x600', orderedQuantity: 10, receivedQuantity: 10, unit: 'BOX', supplierNameKo: 'NEEDS_RESEARCH' },
      { itemNameKo: '타일 부자재', specificationKo: '접착/줄눈/스페이서', orderedQuantity: 1, receivedQuantity: 1, unit: 'SET', supplierNameKo: 'NEEDS_RESEARCH' }
    ],
    actor: 'CEO'
  }));
}

export async function createInspectionChecklist(projectId: string) {
  if (!window.ecorean?.bocDb?.createInspectionChecklistFromSchedule) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createInspectionChecklistFromSchedule({
    projectId,
    processNameKo: '욕실 리모델링',
    actor: 'CEO'
  }));
}

export async function saveInspectionChecklistPass(projectId: string, checklistId: string) {
  if (!window.ecorean?.bocDb?.saveInspectionChecklistResults) return null;
  return invokeAndRefresh(window.ecorean.bocDb.saveInspectionChecklistResults({
    projectId,
    checklistId,
    results: [],
    actor: 'CEO'
  }));
}

export async function createExecutionChangeOrder(projectId: string) {
  if (!window.ecorean?.bocDb?.createExecutionChangeOrder) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createExecutionChangeOrder({
    projectId,
    siteNameKo: '욕실 리모델링 현장',
    requestedByKo: '고객',
    titleKo: '현장 추가공사',
    changeContentKo: '현장 조건에 따른 추가 작업',
    changeReasonKo: '고객 요청 또는 현장 변수',
    additionalAmount: 500000,
    additionalCost: 300000,
    scheduleImpactDays: 1,
    customerApprovalStatus: 'PENDING',
    actor: 'CEO'
  }));
}

export async function createDefectReport(projectId: string) {
  if (!window.ecorean?.bocDb?.createDefectReport) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createDefectReport({
    projectId,
    siteNameKo: '욕실 리모델링 현장',
    defectLocationKo: '샤워부스 하부',
    defectTypeKo: '실리콘 보완',
    severity: 'MEDIUM',
    rootCauseKo: '마감 보완 필요',
    estimatedCost: 50000,
    managerKo: '현장관리자',
    actor: 'CEO'
  }));
}
