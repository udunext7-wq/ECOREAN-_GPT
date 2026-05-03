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
const finalEstimateId = 'FINAL-EST-PRJ-PROD-BATH-0001';
const approvalsToApprove = [
  'APP-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION',
  'APP-PRJ-PROD-BATH-0001-FINAL'
];
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

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS estimate_approval_logs (
      approval_log_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      approval_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      before_status TEXT NOT NULL,
      after_status TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      blocking_reasons_json TEXT NOT NULL,
      actor TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS final_estimates (
      final_estimate_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      final_status TEXT NOT NULL,
      final_estimate_json TEXT NOT NULL,
      created_from_approval_id TEXT NOT NULL,
      rollback_data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS final_estimate_documents (
      final_document_id TEXT PRIMARY KEY,
      final_estimate_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      display_name_ko TEXT NOT NULL,
      audience_ko TEXT NOT NULL,
      document_status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      purchase_order_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      item_name_ko TEXT NOT NULL,
      order_status TEXT NOT NULL,
      warning_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_milestones (
      milestone_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      milestone_name_ko TEXT NOT NULL,
      amount_text TEXT NOT NULL,
      trigger_condition_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function approveApprovalCenterItems() {
  const update = db.approval.prepare(`
    UPDATE approvals
    SET status = ?, decided_by = ?, decided_at = ?, decision_reason_ko = ?, updated_at = ?
    WHERE approval_id = ?
  `);

  const rows = approvalsToApprove.map((approvalId) => {
    const before = db.approval.prepare('SELECT * FROM approvals WHERE approval_id = ?').get(approvalId);
    if (!before) throw new Error(`Approval not found: ${approvalId}`);
    update.run('APPROVED', 'CEO', createdAt, '대표 최종 승인', createdAt, approvalId);
    return before;
  });

  const insertLog = db.project.prepare(`
    INSERT INTO estimate_approval_logs (
      approval_log_id, estimate_draft_id, project_id, approval_id, action_type,
      before_status, after_status, checklist_json, blocking_reasons_json,
      actor, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  rows.forEach((row, index) => {
    insertLog.run(
      `EAPPLOG-${projectId}-${index + 1}`,
      estimateDraftId,
      projectId,
      row.approval_id,
      'APPROVED',
      row.status,
      'APPROVED',
      toJson({
        customerPrice: '5,490,000원',
        paymentPlan: '30/40/30',
        customerEstimateRevisionApproved: true,
        finalEstimateApproved: true,
        changeOrderSeparateApproval: true
      }),
      toJson([]),
      'CEO',
      '고객 제출가 5,490,000원 및 FINAL_ESTIMATE 전환 승인',
      createdAt
    );
  });
}

function createFinalEstimate() {
  const draft = db.project.prepare('SELECT * FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId);
  if (!draft) throw new Error(`Draft not found: ${estimateDraftId}`);
  const draftPayload = fromJson(draft.preliminary_estimate_json, {});
  const rollbackData = {
    beforeDraftStatus: draft.draft_status,
    beforeProjectStatus: 'PRELIMINARY',
    estimateDraftId,
    projectId,
    rollbackAvailable: true
  };

  const finalPayload = {
    projectId,
    finalEstimateId,
    status: 'FINAL_ESTIMATE',
    customerProposalAmount: 5490000,
    customerProposalAmountKo: '5,490,000원',
    paymentPlan: {
      contractDeposit: { rate: 0.3, amount: 1647000, displayKo: '계약금 30% / 1,647,000원' },
      progressPayment: { rate: 0.4, amount: 2196000, displayKo: '중도금 40% / 2,196,000원' },
      finalPayment: { rate: 0.3, amount: 1647000, displayKo: '잔금 30% / 1,647,000원' }
    },
    includedItemsKo: draftPayload.customerEstimate?.includedItemsKo || [],
    changeOrderPolicyKo: '추가공사는 별도 견적, 고객 승인, 대표 승인 후 반영',
    purchaseReadiness: {
      status: 'READY_WITH_RESEARCH_WARNINGS',
      requiredBeforeOrderKo: [
        '아메리칸스탠다드 기본형 패키지 모델 확정',
        '600각 폴리싱 타일 품번/수량 확정',
        '샤워부스 유리/하드웨어 사양 확정',
        '젠다이 대리석 마감 자재 확정',
        '현장 실측 최종 확인'
      ]
    },
    internalCostStatus: 'NEEDS_RESEARCH',
    executionReadyButtonEnabled: true,
    sourceDraft: draftPayload
  };

  db.project.prepare('DELETE FROM final_estimates WHERE final_estimate_id = ?').run(finalEstimateId);
  db.project.prepare(`
    INSERT INTO final_estimates (
      final_estimate_id, estimate_draft_id, project_id, final_status,
      final_estimate_json, created_from_approval_id, rollback_data_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finalEstimateId,
    estimateDraftId,
    projectId,
    'FINAL_ESTIMATE',
    toJson(finalPayload),
    'APP-PRJ-PROD-BATH-0001-FINAL',
    toJson(rollbackData),
    createdAt,
    createdAt
  );

  db.project.prepare('UPDATE estimate_drafts SET draft_status = ?, updated_at = ? WHERE estimate_draft_id = ?')
    .run('FINAL_ESTIMATE', createdAt, estimateDraftId);

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, progress_rate = ?,
        receivable_amount = ?, receivable_status_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'FINAL_ESTIMATE 승인 완료 / 실행 전환 가능',
    toJson(['계약금 30% 청구', '발주 전 사양 최종 확인', 'Execution Ready 전환']),
    '견적 확정',
    '계약금 1,647,000원 청구 가능',
    '계약금 30% / 중도금 40% / 잔금 30%',
    'Execution Ready 전환 가능',
    createdAt,
    projectId
  );
}

function createFinalDocumentsAndPreparation() {
  db.project.prepare('DELETE FROM final_estimate_documents WHERE final_estimate_id = ?').run(finalEstimateId);
  const insertDoc = db.project.prepare(`
    INSERT INTO final_estimate_documents (
      final_document_id, final_estimate_id, project_id, document_type,
      display_name_ko, audience_ko, document_status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['CUSTOMER-FINAL', 'customer_final_estimate', '고객용 확정 견적서', '고객용', { amountKo: '5,490,000원', payment: '30/40/30' }],
    ['INTERNAL-FINAL', 'internal_final_cost', '내부 원가표 확정본', '내부용', { customerPriceKo: '5,490,000원', internalCostStatus: 'NEEDS_RESEARCH' }],
    ['PURCHASE-READY', 'purchase_ready', '발주 준비표', '내부용', { status: 'READY_WITH_RESEARCH_WARNINGS' }],
    ['PAYMENT-FINAL', 'payment_final', '수금 계획 확정본', '대표 검토용', { contractDeposit: '1,647,000원', progressPayment: '2,196,000원', finalPayment: '1,647,000원' }]
  ].forEach(([suffix, type, nameKo, audienceKo, payload]) => {
    insertDoc.run(
      `${finalEstimateId}-${suffix}`,
      finalEstimateId,
      projectId,
      type,
      nameKo,
      audienceKo,
      'FINAL',
      toJson(payload),
      createdAt
    );
  });

  db.project.prepare('DELETE FROM purchase_orders WHERE project_id = ? AND execution_project_id = ?').run(projectId, 'PENDING_EXECUTION_READY');
  const insertPo = db.project.prepare(`
    INSERT INTO purchase_orders (
      purchase_order_id, execution_project_id, project_id, item_name_ko,
      order_status, warning_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  [
    '아메리칸스탠다드 기본형 패키지',
    '600각 폴리싱 타일',
    '샤워부스 유리/하드웨어',
    '젠다이 대리석 마감재',
    '돔천장',
    '환풍기'
  ].forEach((itemNameKo, index) => {
    insertPo.run(
      `PO-PREP-${projectId}-${index + 1}`,
      'PENDING_EXECUTION_READY',
      projectId,
      itemNameKo,
      'READY_TO_CONFIRM_SPEC',
      toJson(['발주 전 모델/수량/납기 확인 필요']),
      createdAt
    );
  });

  db.project.prepare('DELETE FROM payment_milestones WHERE project_id = ? AND execution_project_id = ?').run(projectId, 'PENDING_EXECUTION_READY');
  const insertPayment = db.project.prepare(`
    INSERT INTO payment_milestones (
      milestone_id, execution_project_id, project_id, milestone_name_ko,
      amount_text, trigger_condition_ko, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['CONTRACT', '계약금', '1,647,000원', '계약 체결 시', 'READY_TO_CLAIM'],
    ['PROGRESS', '중도금', '2,196,000원', '철거/자재 발주 또는 지정 공정 착수 전', 'PLANNED'],
    ['FINAL', '잔금', '1,647,000원', '준공검수 및 고객 인도 시', 'PLANNED']
  ].forEach(([id, name, amount, trigger, status]) => {
    insertPayment.run(`PAY-${projectId}-${id}`, 'PENDING_EXECUTION_READY', projectId, name, amount, trigger, status, createdAt);
  });
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `LOG-${projectId}-FINAL-APPROVED`,
    timeLabel,
    'INFO',
    'FINAL_ESTIMATE 승인 완료 / Execution Ready 전환 가능',
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
    `ACTLOG-${projectId}-FINAL-APPROVED`,
    'APPROVE_FINAL_ESTIMATE',
    'CEO',
    projectId,
    'APP-PRJ-PROD-BATH-0001-FINAL',
    toJson({ finalEstimateId, customerPriceKo: '5,490,000원', executionReadyButtonEnabled: true }),
    '고객 제출 기준 견적 및 FINAL_ESTIMATE 승인',
    createdAt
  );
}

migrate();
approveApprovalCenterItems();
createFinalEstimate();
createFinalDocumentsAndPreparation();
writeLogs();

console.log(JSON.stringify({
  projectId,
  finalEstimateId,
  finalStatus: 'FINAL_ESTIMATE',
  approvedApprovals: approvalsToApprove,
  purchasePreparation: 'READY_WITH_RESEARCH_WARNINGS',
  executionReadyButtonEnabled: true
}, null, 2));
