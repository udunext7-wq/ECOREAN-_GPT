const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');
fs.mkdirSync(productionDbDir, { recursive: true });

const dbPaths = {
  project: path.join(productionDbDir, 'project.db'),
  approval: path.join(productionDbDir, 'approval.db'),
  logs: path.join(productionDbDir, 'logs.db')
};

const db = {
  project: new DatabaseSync(dbPaths.project),
  approval: new DatabaseSync(dbPaths.approval),
  logs: new DatabaseSync(dbPaths.logs)
};

const now = new Date();
const createdAt = now.toISOString();
const timeLabel = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

const projectId = 'PRJ-PROD-BATH-0001';
const estimateDraftId = 'EST-DRAFT-PROD-BATH-0001';
const projectNameKo = '구축 아파트 욕실 단독 리모델링';

const toJson = (value) => JSON.stringify(value ?? null);

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      project_name_ko TEXT NOT NULL,
      current_process_ko TEXT NOT NULL,
      today_tasks_json TEXT NOT NULL,
      deadline TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      profit_rate TEXT NOT NULL,
      receivable_amount TEXT NOT NULL,
      progress_rate TEXT NOT NULL,
      remaining_days INTEGER NOT NULL,
      receivable_status_ko TEXT NOT NULL,
      defect_risk_ko TEXT NOT NULL,
      next_action_ko TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimates (
      estimate_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      estimate_type TEXT NOT NULL,
      amount_text TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_drafts (
      estimate_draft_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      project_name_ko TEXT NOT NULL,
      draft_status TEXT NOT NULL,
      preliminary_estimate_json TEXT NOT NULL,
      missing_price_warnings_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_draft_inputs (
      estimate_draft_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      minimum_input_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_draft_processes (
      process_record_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      process_id TEXT NOT NULL,
      process_name_ko TEXT NOT NULL,
      process_type TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_draft_confirmations (
      confirmation_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      question_ko TEXT NOT NULL,
      impact_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_draft_documents (
      document_record_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      display_name_ko TEXT NOT NULL,
      audience_ko TEXT NOT NULL,
      status_ko TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_draft_warnings (
      warning_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      warning_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.approval.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      approval_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      approval_type TEXT NOT NULL,
      title_ko TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      rollback_required INTEGER NOT NULL,
      rollback_status TEXT NOT NULL,
      blocking_impact_ko TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      decided_by TEXT,
      decided_at TEXT,
      decision_reason_ko TEXT
    );
  `);

  db.logs.exec(`
    CREATE TABLE IF NOT EXISTS action_logs (
      action_log_id TEXT PRIMARY KEY,
      action_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      project_id TEXT NOT NULL,
      approval_id TEXT,
      payload_json TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_logs (
      log_id TEXT PRIMARY KEY,
      time_label TEXT NOT NULL,
      level TEXT NOT NULL,
      message_ko TEXT NOT NULL,
      related_project_id TEXT NOT NULL,
      action_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function clearExistingProject() {
  db.project.prepare('DELETE FROM projects WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimates WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimate_drafts WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimate_draft_inputs WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimate_draft_processes WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimate_draft_confirmations WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimate_draft_documents WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM estimate_draft_warnings WHERE project_id = ?').run(projectId);
  db.approval.prepare('DELETE FROM approvals WHERE project_id = ?').run(projectId);
  db.logs.prepare('DELETE FROM action_logs WHERE project_id = ?').run(projectId);
  db.logs.prepare('DELETE FROM notification_logs WHERE related_project_id = ?').run(projectId);
}

const minimumInput = {
  projectType: 'bathroom_single_remodeling',
  displayProjectTypeKo: '욕실 단독 리모델링',
  buildingType: 'old_apartment',
  displayBuildingTypeKo: '구축 아파트',
  bathroomCount: 1,
  budgetRangeKo: '700~900만원',
  constructionScope: 'bathroom_only',
  demolitionScope: 'included',
  waterproofingNeed: 'NEEDS_CONFIRMATION',
  tileScope: 'full_replacement',
  fixtureScope: 'full_replacement',
  ceilingScope: 'replacement',
  lightingScope: 'replacement',
  ventilationScope: 'replacement',
  bathroomCabinetAndMirror: 'included',
  siliconeFinish: 'included',
  finalCleaning: 'included',
  priceStatus: 'NEEDS_RESEARCH',
  masterDbUpdateAllowed: false
};

const generatedProcesses = [
  ['bathroom_demolition', '기존 욕실 철거', 'GENERATED', 'CONDITIONAL', '철거 포함 조건으로 예비 생성', 'PRELIMINARY'],
  ['waste_carry_out', '폐기물 반출', 'GENERATED', 'CONDITIONAL', '철거 포함에 따라 폐기물 반출 필요', 'PRELIMINARY'],
  ['plumbing_inspection', '설비 배관 점검', 'GENERATED', 'CONDITIONAL', '배관 수정 필요 여부 확인 전 점검 공정 생성', 'PRELIMINARY'],
  ['waterproofing_decision', '방수 여부 판단', 'CONDITIONAL', 'CONDITIONAL', '기존 방수층 상태와 누수 이력 확인 전 자동 확정 금지', 'NEEDS_CONFIRMATION'],
  ['wall_tile_replacement', '벽 타일 전체 교체', 'GENERATED', 'QTY', '타일 전체 교체 조건으로 생성', 'PRELIMINARY'],
  ['floor_tile_replacement', '바닥 타일 전체 교체', 'GENERATED', 'QTY', '타일 전체 교체 조건으로 생성', 'PRELIMINARY'],
  ['grout', '줄눈', 'GENERATED', 'QTY', '타일 후행 마감 공정', 'PRELIMINARY'],
  ['fixture_replacement', '도기 전체 교체', 'GENERATED', 'SELECT', '도기 전체 교체 조건으로 생성', 'PRELIMINARY'],
  ['bathroom_ceiling', '욕실 천장 교체', 'GENERATED', 'SELECT', '천장 교체 조건으로 생성', 'PRELIMINARY'],
  ['bathroom_lighting', '욕실 조명 교체', 'GENERATED', 'SELECT', '조명 교체 조건으로 생성', 'PRELIMINARY'],
  ['bathroom_ventilation', '환풍기 교체', 'GENERATED', 'SELECT', '환풍기 교체 조건으로 생성', 'PRELIMINARY'],
  ['bathroom_cabinet_mirror', '욕실장 및 거울 설치', 'GENERATED', 'SELECT', '욕실장 + 거울 포함 조건으로 생성', 'PRELIMINARY'],
  ['silicone_finish', '실리콘 마감', 'GENERATED', 'AUTO', '욕실 마감 후 필수 실링 공정', 'PRELIMINARY'],
  ['final_cleaning', '준공청소', 'GENERATED', 'AUTO', '고객 인도 전 필수 정리 공정', 'PRELIMINARY']
];

const needsConfirmations = [
  ['NC-WATERPROOF-LAYER', '기존 방수층 상태가 양호한가?', '방수 전체 재시공 여부와 타일 착수 가능 조건에 영향'],
  ['NC-PLUMBING-MODIFICATION', '배관 수정이 필요한가?', '설비 비용, 방수 범위, 공정 기간에 영향'],
  ['NC-LEAK-HISTORY', '기존 누수 또는 현재 누수 징후가 있는가?', '방수 범위, 하자 리스크, 고객 설명에 영향'],
  ['NC-INTERFLOOR-WATERPROOF', '층간 방수 이슈 또는 아래층 민원 이력이 있는가?', '방수 검수 강도와 후속 공정 차단 조건에 영향'],
  ['NC-SHOWER-BOOTH', '샤워부스를 설치할 것인가?', '유리/하드웨어 발주, 실리콘, 수금 계획에 영향'],
  ['NC-ZENDAI', '젠다이 시공이 필요한가?', '조적/방수/타일/상판 공정과 공기 증가에 영향'],
  ['NC-FIXTURE-BRAND', '도기 브랜드를 무엇으로 선택할 것인가?', '도기 공급가, A/S, 고객 선호도, 마진에 영향'],
  ['NC-TILE-TYPE', '타일 종류는 600각, 포세린, 대형타일 중 무엇인가?', '타일 단가, 시공 난이도, 졸리컷/레벨링 필요 여부에 영향']
];

const documents = [
  ['DOC-CUSTOMER-ESTIMATE', 'customer_estimate_draft', '고객용 예비 견적서 초안', '고객용', '예비 견적 - 단가 확인 전'],
  ['DOC-INTERNAL-COST', 'internal_cost_draft', '내부 원가표 초안', '내부용', 'UNKNOWN / NEEDS_RESEARCH 포함'],
  ['DOC-SCHEDULE-DRAFT', 'schedule_draft', '공정표 초안', '현장관리자용', '방수 확인 전 임시 일정'],
  ['DOC-PURCHASE-DRAFT', 'purchase_order_draft', '발주서 초안', '내부용', '브랜드/규격 확인 전'],
  ['DOC-PAYMENT-DRAFT', 'payment_plan_draft', '수금 계획 초안', '대표 검토용', '계약금/잔금 조건 검토 필요']
];

const warnings = [
  '실제 단가가 입력되지 않아 예비 견적으로 표시됩니다.',
  '방수 여부는 자동 확정하지 않고 NEEDS_CONFIRMATION으로 보류되었습니다.',
  '도기 브랜드와 타일 종류 미확정으로 고객용 금액 확정이 불가합니다.',
  '배관 수정 여부 확인 전 FINAL ESTIMATE 전환이 차단됩니다.'
];

function insertProject() {
  db.project.prepare(`
    INSERT INTO projects (
      project_id, project_name_ko, current_process_ko, today_tasks_json,
      deadline, risk_score, risk_level, profit_rate, receivable_amount,
      progress_rate, remaining_days, receivable_status_ko, defect_risk_ko,
      next_action_ko, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    projectNameKo,
    'PRELIMINARY 예비 견적',
    toJson(['기존 방수층 상태 확인', '배관 수정 여부 확인', '타일/도기 브랜드 선택']),
    '미정',
    82,
    'HIGH',
    '예비',
    'UNKNOWN',
    '0%',
    0,
    '수금 계획 초안',
    '방수/누수 확인 필요',
    'NEEDS_CONFIRMATION 8개 확인 후 FINAL ESTIMATE 승인 검토',
    createdAt,
    createdAt
  );

  db.project.prepare(`
    INSERT INTO estimate_drafts (
      estimate_draft_id, project_id, project_name_ko, draft_status,
      preliminary_estimate_json, missing_price_warnings_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    estimateDraftId,
    projectId,
    projectNameKo,
    'PRELIMINARY',
    toJson({
      status: 'PRELIMINARY',
      projectType: 'bathroom_single_remodeling',
      amountStatusKo: '예비 견적',
      budgetRangeKo: '700~900만원',
      priceStatus: 'UNKNOWN_PRICE_INCLUDED',
      officialPrice: 'NEEDS_RESEARCH',
      marketPrice: 'NEEDS_RESEARCH',
      supplierPrice: 'NEEDS_RESEARCH',
      internalPrice: 'NEEDS_RESEARCH',
      finalEstimateBlocked: true,
      blockedUntilKo: 'NEEDS_CONFIRMATION 완료 및 대표 승인'
    }),
    toJson(warnings),
    createdAt,
    createdAt
  );

  db.project.prepare(`
    INSERT INTO estimate_draft_inputs (
      estimate_draft_id, project_id, minimum_input_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(estimateDraftId, projectId, toJson(minimumInput), createdAt, createdAt);

  const insertProcess = db.project.prepare(`
    INSERT INTO estimate_draft_processes (
      process_record_id, estimate_draft_id, project_id, process_id,
      process_name_ko, process_type, trigger_type, reason_ko, status,
      payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  generatedProcesses.forEach(([processId, processNameKo, processType, triggerType, reasonKo, status], index) => {
    insertProcess.run(
      `${estimateDraftId}-PROC-${String(index + 1).padStart(2, '0')}`,
      estimateDraftId,
      projectId,
      processId,
      processNameKo,
      processType,
      triggerType,
      reasonKo,
      status,
      toJson({ processId, processNameKo, processType, triggerType, reasonKo, status, priceStatus: 'NEEDS_RESEARCH' }),
      createdAt
    );
  });

  const insertConfirmation = db.project.prepare(`
    INSERT INTO estimate_draft_confirmations (
      confirmation_id, estimate_draft_id, project_id, question_ko,
      impact_ko, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertApproval = db.approval.prepare(`
    INSERT INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  needsConfirmations.forEach(([itemId, questionKo, impactKo], index) => {
    const confirmationId = `${estimateDraftId}-${itemId}`;
    insertConfirmation.run(confirmationId, estimateDraftId, projectId, questionKo, impactKo, 'NEEDS_CONFIRMATION', createdAt);
    insertApproval.run(
      `APP-${projectId}-NC-${String(index + 1).padStart(2, '0')}`,
      projectId,
      'NeedsConfirmation',
      `확인 필요: ${questionKo}`,
      impactKo,
      'PENDING_CEO_APPROVAL',
      0,
      'NOT_REQUIRED',
      '확인 전 FINAL ESTIMATE 전환 금지',
      'BOC',
      createdAt,
      createdAt
    );
  });

  insertApproval.run(
    `APP-${projectId}-FINAL`,
    projectId,
    'EstimateApproval',
    'FINAL ESTIMATE 전환 승인 검토',
    'NEEDS_CONFIRMATION, 필수 단가 누락, 방수/누수 리스크, 예산 범위를 확인해야 합니다.',
    'PENDING_CEO_APPROVAL',
    1,
    'READY',
    '대표 승인 전 FINAL ESTIMATE 생성 금지',
    'BOC',
    createdAt,
    createdAt
  );

  const insertDocument = db.project.prepare(`
    INSERT INTO estimate_draft_documents (
      document_record_id, estimate_draft_id, project_id, document_id,
      display_name_ko, audience_ko, status_ko, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  documents.forEach(([documentRecordId, documentId, displayNameKo, audienceKo, statusKo]) => {
    insertDocument.run(
      `${estimateDraftId}-${documentRecordId}`,
      estimateDraftId,
      projectId,
      documentId,
      displayNameKo,
      audienceKo,
      statusKo,
      toJson({ documentId, displayNameKo, audienceKo, statusKo, projectId, priceStatus: 'NEEDS_RESEARCH' }),
      createdAt
    );
  });

  const insertWarning = db.project.prepare(`
    INSERT INTO estimate_draft_warnings (
      warning_id, estimate_draft_id, project_id, warning_ko, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  warnings.forEach((warningKo, index) => {
    insertWarning.run(`${estimateDraftId}-WARN-${String(index + 1).padStart(2, '0')}`, estimateDraftId, projectId, warningKo, 'OPEN', createdAt);
  });

  db.project.prepare(`
    INSERT INTO estimates (
      estimate_id, project_id, estimate_type, amount_text, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    estimateDraftId,
    projectId,
    'PRELIMINARY',
    'UNKNOWN / 예산 범위 700~900만원',
    toJson({ minimumInput, generatedProcesses, needsConfirmations, documents, warnings }),
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`LOG-${projectId}-REGISTER`, timeLabel, 'WARNING', '운영 프로젝트 1호 PRELIMINARY 등록: 방수/배관/타일 확인 필요', projectId, '확인', createdAt);

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `ACTLOG-${projectId}-REGISTER`,
    'REGISTER_PRODUCTION_PRELIMINARY_PROJECT',
    'CEO',
    projectId,
    null,
    toJson({ projectId, estimateDraftId, status: 'PRELIMINARY', priceStatus: 'NEEDS_RESEARCH' }),
    '첫 번째 실제 운영 프로젝트 등록',
    createdAt
  );
}

migrate();
clearExistingProject();
insertProject();

const summary = {
  projectId,
  estimateDraftId,
  productionDbDir,
  generatedProcessCount: generatedProcesses.length,
  needsConfirmationCount: needsConfirmations.length,
  documentDraftCount: documents.length,
  warningCount: warnings.length,
  status: 'PRELIMINARY'
};

console.log(JSON.stringify(summary, null, 2));
