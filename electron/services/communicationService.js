const MESSAGE_TEMPLATES = [
  {
    templateType: 'CLIENT_ESTIMATE_NOTICE',
    title: '견적 안내',
    bodyTemplate: '{{customerName}} 고객님, 안녕하세요. ECOREAN입니다.\n\n{{siteName}} 현장 견적서가 준비되었습니다.\n총 견적금액은 {{amountKo}}이며, 세부 공사 범위는 견적서에서 확인하실 수 있습니다.\n\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_CONTRACT_NOTICE',
    title: '계약 안내',
    bodyTemplate: '{{customerName}} 고객님, 안녕하세요. ECOREAN입니다.\n\n{{siteName}} 현장 계약서가 준비되었습니다.\n계약금액: {{amountKo}}\n계약금/중도금/잔금: {{paymentTerms}}\n공사 예정 기간: {{scheduleKo}}\n\n확인 후 서명 및 계약금 입금을 부탁드립니다.\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_SCHEDULE_NOTICE',
    title: '공사 일정 안내',
    bodyTemplate: '{{customerName}} 고객님, {{siteName}} 현장 공사 일정 안내드립니다.\n\n공사 기간: {{scheduleKo}}\n주요 공정: {{processSummaryKo}}\n\n일정 변경이 필요한 경우 사전에 안내드리겠습니다.\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_PAYMENT_REQUEST',
    title: '결제 요청',
    bodyTemplate: '{{customerName}} 고객님, {{siteName}} 현장 결제 안내드립니다.\n\n요청 금액: {{amountKo}}\n결제 기한: {{dueDate}}\n내용: {{notesKo}}\n\n입금 확인 후 다음 단계로 진행하겠습니다.\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_CHANGE_ORDER_APPROVAL',
    title: '추가공사 승인 요청',
    bodyTemplate: '{{customerName}} 고객님, {{siteName}} 현장 추가공사 승인 요청드립니다.\n\n변경 내용: {{changeContentKo}}\n변경 사유: {{changeReasonKo}}\n추가 금액: {{amountKo}}\n일정 영향: {{scheduleImpactKo}}\n\n승인 후 공정/수금 계획에 반영됩니다.\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_INSPECTION_RESULT',
    title: '검수 결과 공유',
    bodyTemplate: '{{customerName}} 고객님, {{siteName}} 현장 검수 결과 공유드립니다.\n\n검수 결과: {{inspectionResultKo}}\n주요 내용: {{notesKo}}\n후속 조치: {{nextActionKo}}\n\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_DEFECT_RECEIVED',
    title: '하자 접수 안내',
    bodyTemplate: '{{customerName}} 고객님, {{siteName}} 현장 하자 접수 확인드립니다.\n\n하자 위치: {{defectLocationKo}}\n하자 유형: {{defectTypeKo}}\n예상 조치: {{nextActionKo}}\n\n확인 후 처리 일정을 안내드리겠습니다.\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'CLIENT_DEFECT_COMPLETED',
    title: '하자 처리 완료 안내',
    bodyTemplate: '{{customerName}} 고객님, {{siteName}} 현장 하자 처리가 완료되었습니다.\n\n처리 항목: {{defectTypeKo}}\n완료일: {{completedAt}}\n고객 확인 요청: {{nextActionKo}}\n\n담당자 연락처: {{managerContact}}'
  },
  {
    templateType: 'VENDOR_PURCHASE_ORDER',
    title: '발주 요청',
    bodyTemplate: '{{vendorName}} 담당자님, ECOREAN 발주 요청드립니다.\n\n발주번호: {{purchaseOrderId}}\n현장명: {{siteName}}\n필요일: {{requiredDate}}\n품목: {{itemSummaryKo}}\n납품 장소: {{deliveryPlaceKo}}\n비고: {{notesKo}}\n\n확인 후 공급가/납기 회신 부탁드립니다.'
  },
  {
    templateType: 'VENDOR_DELIVERY_REQUEST',
    title: '납품 요청',
    bodyTemplate: '{{vendorName}} 담당자님, 납품 일정 확인 요청드립니다.\n\n발주번호: {{purchaseOrderId}}\n현장명: {{siteName}}\n필요일: {{requiredDate}}\n품목: {{itemSummaryKo}}\n납품 장소: {{deliveryPlaceKo}}\n비고: {{notesKo}}'
  },
  {
    templateType: 'VENDOR_SHORTAGE_NOTICE',
    title: '입고 부족 알림',
    bodyTemplate: '{{vendorName}} 담당자님, {{siteName}} 현장 입고 부족 건 확인 요청드립니다.\n\n발주번호: {{purchaseOrderId}}\n부족 품목: {{itemSummaryKo}}\n필요 조치: 재납품 또는 부족 수량 확인\n비고: {{notesKo}}'
  },
  {
    templateType: 'INTERNAL_APPROVAL_NOTICE',
    title: '내부 승인 요청',
    bodyTemplate: '대표님, 승인 요청이 생성되었습니다.\n\n모듈: {{sourceModuleKo}}\n현장명: {{siteName}}\n금액 영향: {{amountKo}}\n요청 사유: {{notesKo}}\n필요 조치: {{nextActionKo}}'
  }
];

function defaultCommunicationTemplates() {
  return MESSAGE_TEMPLATES.map((template) => ({ ...template }));
}

function valueAtPath(data, path) {
  return path.split('.').reduce((value, key) => {
    if (value == null) return undefined;
    return value[key];
  }, data);
}

function renderTemplate(template, data = {}) {
  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
    const value = valueAtPath(data, key);
    return value == null || value === '' ? '확인 필요' : String(value);
  });
}

function buildCommunicationMessage({
  messageType,
  template,
  data = {},
  targetType = 'CLIENT',
  targetName,
  targetContact,
  relatedEntityType = 'UNKNOWN',
  relatedEntityId = 'UNKNOWN',
  status = 'DRAFT'
}) {
  const selectedTemplate = template || MESSAGE_TEMPLATES.find((item) => item.templateType === messageType);
  if (!selectedTemplate) {
    throw new Error(`Communication template not found: ${messageType}`);
  }

  return {
    messageType,
    targetType,
    targetName: targetName || data.customerName || data.vendorName || '확인 필요',
    targetContact: targetContact || data.targetContact || 'UNKNOWN',
    relatedEntityType,
    relatedEntityId,
    title: selectedTemplate.title,
    body: renderTemplate(selectedTemplate.bodyTemplate, {
      managerContact: '담당자 연락처 입력 필요',
      deliveryPlaceKo: data.siteName || '현장 주소 확인 필요',
      ...data
    }),
    status
  };
}

module.exports = {
  buildCommunicationMessage,
  defaultCommunicationTemplates,
  renderTemplate
};
