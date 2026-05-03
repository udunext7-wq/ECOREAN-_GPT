const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  approval: new DatabaseSync(path.join(productionDbDir, 'approval.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const estimateDraftId = 'EST-DRAFT-PROD-BATH-0001';
const finalApprovalId = 'APP-PRJ-PROD-BATH-0001-FINAL';
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);
const fromJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const customerPrice = 5490000;
const paymentPlan = {
  contractDeposit: { rate: 0.3, amount: 1647000, displayKo: '계약금 30% / 1,647,000원' },
  progressPayment: { rate: 0.4, amount: 2196000, displayKo: '중도금 40% / 2,196,000원' },
  finalPayment: { rate: 0.3, amount: 1647000, displayKo: '잔금 30% / 1,647,000원' },
  changeOrderPolicyKo: '추가공사는 별도 견적, 고객 승인, 대표 승인 후 반영'
};

const customerEstimate = {
  estimateStatus: 'PRELIMINARY_CUSTOMER_PROPOSAL',
  replacedPreviousBasisKo: '기존 8,400,000원 기준 폐기',
  customerProposalAmount: customerPrice,
  customerProposalAmountKo: '5,490,000원',
  basePackageKo: '고객 제안 기본 견적',
  includedItemsKo: [
    '본드시공',
    '600각 폴리싱 타일',
    '샤워부스 포함',
    '젠다이 포함',
    '돔천장',
    '환풍기 포함',
    '준공청소 포함',
    '아메리칸스탠다드 기본형 패키지 기준'
  ],
  paymentPlan,
  customerVisibleNotesKo: [
    '추가공사는 별도 승인 후 반영됩니다.',
    '브랜드/모델 상향 선택 시 금액이 변경될 수 있습니다.'
  ]
};

const internalCostReview = {
  customerProposalAmount: customerPrice,
  customerProposalAmountKo: '5,490,000원',
  internalCostStatus: 'NEEDS_RESEARCH',
  marginStatus: 'PENDING_INTERNAL_COST_CONFIRMATION',
  knownCustomerPrice: customerPrice,
  requiredCostInputsKo: [
    '타일 주자재 + 부자재 + 손실률',
    '타일공/설비/철거/마감 노무비',
    '아메리칸스탠다드 기본형 패키지 실제 공급가',
    '샤워부스 유리/하드웨어 공급가',
    '젠다이 대리석 상판 및 시공비',
    '폐기물/운반/양중비',
    '현장관리/경비/VAT 처리 기준'
  ],
  marginRangeKo: '내부 원가 미확정으로 확정 마진 산출 불가',
  marginGuardrailKo: '내부 총원가 확정 후 목표 마진 미달 시 업셀 또는 사양 조정 필요',
  approvalRequiredKo: 'FINAL_ESTIMATE 전환 전 대표 최종 승인 필요'
};

const upsellOptions = [
  { optionId: 'floating_mortar_installation', displayNameKo: '떠붙임 시공 전환', addPriceKo: '+500,000원', reasonKo: '기존 타일 철거 + 떠붙임 시공' },
  { optionId: 'fixture_brand_upgrade', displayNameKo: '도기류 브랜드/모델 상향', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '아메리칸스탠다드 고급형 또는 TOTO/Grohe/Hansgrohe 전환' },
  { optionId: 'epoxy_grout', displayNameKo: '에폭시 줄눈', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '오염/곰팡이 리스크 감소' },
  { optionId: 'jolly_cut', displayNameKo: '졸리컷 마감', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '고급 마감, 시공 난이도 증가' },
  { optionId: 'premium_shower_booth_hardware', displayNameKo: '샤워부스 하드웨어 상향', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '유리 두께/하드웨어/코팅 옵션' },
  { optionId: 'mirror_cabinet_upgrade', displayNameKo: '거울장/욕실장 상향', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '수납력 및 고객 체감 가치 상승' },
  { optionId: 'premium_ventilator', displayNameKo: '고급 환풍기', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '습기/냄새/하자 리스크 감소' },
  { optionId: 'spot_waterproof_reinforcement', displayNameKo: '방수 보강 옵션', addPriceKo: 'NEEDS_RESEARCH', reasonKo: '배수구/코너/젠다이 주변 리스크 보강' }
];

function updateEstimateDraft() {
  const draft = db.project.prepare('SELECT preliminary_estimate_json FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId);
  if (!draft) throw new Error(`Estimate draft not found: ${estimateDraftId}`);

  const payload = {
    ...fromJson(draft.preliminary_estimate_json, {}),
    customerEstimate,
    internalCostReview,
    upsellOptions,
    finalEstimateReadiness: 'READY_FOR_CEO_REVIEW_AFTER_INTERNAL_COST_INPUT',
    approvalRequestedAt: createdAt
  };

  db.project.prepare(`
    UPDATE estimate_drafts
    SET preliminary_estimate_json = ?, updated_at = ?
    WHERE estimate_draft_id = ?
  `).run(toJson(payload), createdAt, estimateDraftId);

  db.project.prepare(`
    UPDATE estimates
    SET amount_text = ?, payload_json = ?
    WHERE estimate_id = ? AND project_id = ?
  `).run(
    '5,490,000원 / 고객 제안 기본 견적',
    toJson({ customerEstimate, internalCostReview, upsellOptions }),
    estimateDraftId,
    projectId
  );
}

function updateDocuments() {
  const rows = db.project.prepare('SELECT document_record_id, document_id, audience_ko, payload_json FROM estimate_draft_documents WHERE project_id = ?').all(projectId);
  const update = db.project.prepare('UPDATE estimate_draft_documents SET payload_json = ?, status_ko = ? WHERE document_record_id = ?');

  rows.forEach((row) => {
    const isInternal = row.audience_ko.includes('내부') || row.document_id.includes('internal') || row.document_id.includes('cost');
    const isPayment = row.document_id.includes('payment');
    const docPayload = {
      ...fromJson(row.payload_json, {}),
      customerEstimate: isInternal ? undefined : customerEstimate,
      internalCostReview: isInternal ? internalCostReview : undefined,
      paymentPlan: isPayment ? paymentPlan : undefined,
      upsellOptions,
      displaySeparationKo: isInternal ? '내부 원가표 전용' : '고객 제출용'
    };

    update.run(
      toJson(docPayload),
      isInternal
        ? '5,490,000원 고객가 반영 / 내부 원가 미확정'
        : '5,490,000원 고객 제출 기준 반영',
      row.document_record_id
    );
  });
}

function updateApprovalCenter() {
  db.approval.prepare(`
    UPDATE approvals
    SET status = ?, reason_ko = ?, blocking_impact_ko = ?, updated_at = ?
    WHERE approval_id = ?
  `).run(
    'PENDING_CEO_APPROVAL',
    '고객 제출 기준 견적 5,490,000원으로 수정됨. 내부 원가 미확정 항목 확인 후 FINAL_ESTIMATE 승인 필요.',
    '내부 원가/마진 검토 전 FINAL_ESTIMATE 생성 금지',
    createdAt,
    finalApprovalId
  );

  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'APP-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION',
    projectId,
    'EstimateRevision',
    '고객 제출 기준 견적 5,490,000원 수정 승인',
    '기존 8,400,000원 기준 폐기, 고객 제안 기본 견적 5,490,000원으로 수정되었습니다.',
    'PENDING_CEO_APPROVAL',
    1,
    'READY',
    '승인 전 고객 제출 확정본 생성 금지',
    'BOC',
    createdAt,
    createdAt
  );
}

function updateProjectDashboard() {
  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, profit_rate = ?,
        receivable_amount = ?, receivable_status_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    '고객 제출 견적 수정 / FINAL 승인 대기',
    toJson(['내부 원가 입력', '마진 검토', 'FINAL_ESTIMATE 승인', '계약금 30% 수금 조건 확인']),
    '마진 검토',
    '계약금 1,647,000원 예정',
    '계약금 30% / 중도금 40% / 잔금 30%',
    '내부 원가 확인 후 FINAL_ESTIMATE 승인',
    createdAt,
    projectId
  );
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION',
    timeLabel,
    'WARNING',
    '고객 제출 견적 5,490,000원 수정 / FINAL 승인 재요청',
    projectId,
    '승인',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION',
    'UPDATE_CUSTOMER_ESTIMATE_PRICE',
    'CEO',
    projectId,
    'APP-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION',
    toJson({ customerEstimate, internalCostReview, upsellOptions }),
    '고객 제출 기준 견적 수정',
    createdAt
  );
}

updateEstimateDraft();
updateDocuments();
updateApprovalCenter();
updateProjectDashboard();
writeLogs();

console.log(JSON.stringify({
  projectId,
  customerProposalAmountKo: customerEstimate.customerProposalAmountKo,
  paymentPlan,
  marginStatus: internalCostReview.marginStatus,
  finalEstimateApproval: 'PENDING_CEO_APPROVAL',
  upsellOptionCount: upsellOptions.length
}, null, 2));
