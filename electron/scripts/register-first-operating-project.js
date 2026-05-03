const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createSqliteService } = require('../services/sqliteService');

createSqliteService({ app: null });

const rootDir = path.join(__dirname, '..', '..');
const databaseDir = path.join(rootDir, 'storage', 'sqlite');
const projectDb = new DatabaseSync(path.join(databaseDir, 'project.db'));
const approvalDb = new DatabaseSync(path.join(databaseDir, 'approval.db'));
const logsDb = new DatabaseSync(path.join(databaseDir, 'logs.db'));

const projectId = 'PRJ-REAL-APT-0001';
const createdAt = new Date().toISOString();
const deadline = '2026-07-24';

function toJson(value) {
  return JSON.stringify(value);
}

function clearProjectData() {
  [
    'projects',
    'estimates',
    'project_inputs',
    'preset_results',
    'generated_processes',
    'needs_confirmations',
    'payment_plans',
    'purchase_requirements',
    'schedule_drafts',
    'estimate_vs_actual',
    'repeated_defects',
    'repeated_loss_processes'
  ].forEach((tableName) => {
    projectDb.prepare(`DELETE FROM ${tableName} WHERE project_id = ?`).run(projectId);
  });

  approvalDb.prepare('DELETE FROM approvals WHERE project_id = ?').run(projectId);
  approvalDb.prepare(`
    DELETE FROM approval_actions
    WHERE approval_id IN (
      'APP-REAL-001',
      'APP-REAL-002',
      'APP-REAL-003',
      'APP-REAL-004',
      'APP-REAL-005'
    )
  `).run();
  logsDb.prepare('DELETE FROM notification_logs WHERE related_project_id = ?').run(projectId);
  logsDb.prepare('DELETE FROM action_logs WHERE project_id = ?').run(projectId);
}

function insertProjectSummary() {
  projectDb.prepare(`
    INSERT INTO projects (
      project_id, project_name_ko, current_process_ko, today_tasks_json,
      deadline, risk_score, risk_level, profit_rate, receivable_amount,
      progress_rate, remaining_days, receivable_status_ko, defect_risk_ko,
      next_action_ko, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projectId,
    '24평 구축 아파트 전체 리모델링',
    '초기 견적 구조 등록',
    toJson(['욕실 방수 범위 확인', '창호 부분 교체 범위 확인', '타일/욕실 자재 단가 조사']),
    deadline,
    83,
    'HIGH',
    'NEEDS_RESEARCH',
    'UNKNOWN',
    '0%',
    90,
    '수금 계획 초안 필요',
    '결로 일부 확인 필요',
    '대표 확인 항목 승인 후 단가 조사 진행',
    createdAt,
    createdAt
  );
}

function insertMinimumInput() {
  const minimumInput = {
    projectType: 'apartment_full_remodeling',
    buildingType: 'old_apartment',
    areaM2: 'NEEDS_CONFIRMATION',
    areaPyeong: 24,
    constructionScope: 'full_remodeling',
    spaceComposition: {
      bathroomCount: 1,
      kitchenCount: 1,
      roomCount: 2,
      balconyCount: 1
    },
    demolitionScope: 'full_interior_demolition_assumed_needs_confirmation',
    finishGrade: 'mid_to_mid_high',
    budgetLevel: '60,000,000 KRW',
    occupancyDeadline: deadline,
    bathroomCount: 1,
    kitchenType: 'standard_apartment_kitchen_needs_confirmation',
    roomCount: 2,
    balconyCount: 1,
    windowReplacementScope: 'partial',
    plumbingModificationScope: 'partial',
    electricalUpgradeScope: 'partial',
    knownDefects: {
      leakage: false,
      condensation: true
    },
    siteConstraints: {
      elevatorUse: 'NEEDS_CONFIRMATION',
      parking: 'NEEDS_CONFIRMATION',
      workingHourRestriction: 'NEEDS_CONFIRMATION',
      wasteCarryRoute: 'NEEDS_CONFIRMATION'
    },
    clientPriority: ['예산 6,000만 원 내 통제', '입주 전 90일 내 완료', '하자 리스크 최소화']
  };

  projectDb.prepare(`
    INSERT INTO project_inputs (project_id, minimum_input_json, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(projectId, toJson(minimumInput), createdAt, createdAt);
}

function insertPresetResult() {
  const defaultSpecs = {
    finishGrade: 'mid_to_mid_high',
    bathroom: 'standard_plus_needs_brand_selection',
    kitchen: 'mid_grade_needs_layout_confirmation',
    tile: 'standard_wall_floor_tile_needs_brand_and_size',
    flooring: 'mid_grade_flooring_needs_material_selection',
    wallpaper: 'standard_silk_wallpaper_needs_brand_selection',
    lighting: 'standard_led_plan_needs_count_confirmation',
    windows: 'partial_replacement_needs_size_confirmation'
  };

  projectDb.prepare(`
    INSERT INTO preset_results (
      preset_result_id, project_id, preset_id, preset_name_ko,
      applied_rules_json, default_specs_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'PRESET-RESULT-REAL-0001',
    projectId,
    'apartment-full-remodeling',
    '구축 아파트 전체 리모델링 프리셋',
    toJson([
      '전체 리모델링 기본 공정 세트 적용',
      '방수/배관/전기/창호/결로는 조건부 판단',
      '단가 미확정 항목은 NEEDS_RESEARCH 유지',
      '고객용 금액과 내부 원가 분리'
    ]),
    toJson(defaultSpecs),
    createdAt
  );
}

function insertProcesses() {
  const processes = [
    ['demolition', '철거', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '전체 리모델링이지만 철거 범위 상세 확인 필요'],
    ['waste_disposal', '폐기물 반출', 'CONDITIONAL', 'GENERATED', '철거 공정과 연동되어 생성'],
    ['temporary_protection', '보양/가설', 'AUTO', 'GENERATED', '입주 전 전체 리모델링 기본 보호 공정'],
    ['plumbing_inspection', '설비 배관 점검', 'CONDITIONAL', 'GENERATED', '배관 부분 수정 입력값으로 생성'],
    ['plumbing_modification', '배수/급수 부분 수정', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '수정 범위와 위치 확인 필요'],
    ['electrical_inspection', '전기 점검', 'CONDITIONAL', 'GENERATED', '전기 일부 증설 입력값으로 생성'],
    ['electrical_upgrade', '전기 일부 증설', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '분전반/회로/콘센트 수 확인 필요'],
    ['waterproofing', '방수 여부 판단', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '욕실 철거 범위와 기존 방수층 상태 확인 전 자동 확정 금지'],
    ['tile', '타일', 'QTY', 'GENERATED', '욕실/주방/현관/발코니 적용 가능 공정으로 통합 계산 대상'],
    ['carpentry', '목공', 'CONDITIONAL', 'GENERATED', '전체 리모델링 기본 마감 기반 공정'],
    ['wallpaper', '도배', 'QTY', 'GENERATED', '방 2개 및 공용부 마감 기본 공정'],
    ['film', '필름', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '문틀/창틀/가구 필름 범위 확인 필요'],
    ['flooring', '바닥재', 'QTY', 'GENERATED', '24평 전체 마감 기준 적용'],
    ['lighting', '조명', 'QTY', 'GENERATED', '전기 일부 증설과 연동'],
    ['bathroom', '욕실 리모델링', 'SELECT', 'GENERATED', '욕실 1개 입력값으로 생성'],
    ['kitchen', '주방 리모델링', 'SELECT', 'GENERATED', '주방 1개 입력값으로 생성'],
    ['window_partial_replacement', '창호 부분 교체', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '교체 위치/규격/유리 사양 확인 필요'],
    ['condensation_repair', '결로 보수/단열 보강 판단', 'CONDITIONAL', 'NEEDS_CONFIRMATION', '결로 일부 있음 입력값으로 진단 필요'],
    ['final_cleaning', '준공청소', 'AUTO', 'GENERATED', '준공 전 고객 인도 기본 공정']
  ];

  const insert = projectDb.prepare(`
    INSERT INTO generated_processes (
      process_record_id, project_id, process_id, process_name_ko,
      trigger_type, decision_status, reason_ko, price_status,
      source_status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  processes.forEach(([processId, processNameKo, triggerType, decisionStatus, reasonKo], index) => {
    insert.run(
      `PROC-REAL-${String(index + 1).padStart(3, '0')}`,
      projectId,
      processId,
      processNameKo,
      triggerType,
      decisionStatus,
      reasonKo,
      'NEEDS_RESEARCH',
      'minimum_input_and_preset',
      toJson({
        basePrice: 'UNKNOWN',
        laborCost: 'NEEDS_RESEARCH',
        materialCost: 'NEEDS_RESEARCH',
        accessoryCost: 'NEEDS_RESEARCH',
        equipmentCost: 'NEEDS_RESEARCH',
        wasteRate: 'NEEDS_RESEARCH'
      }),
      createdAt
    );
  });
}

function insertNeedsConfirmations() {
  const confirmations = [
    ['NC-REAL-001', '욕실 방수층 상태 확인', '바닥 철거 여부와 기존 방수층 손상 여부 확인 전 방수 자동 확정 금지', 'site_manager', 'BLOCKING', 'waterproofing'],
    ['NC-REAL-002', '창호 부분 교체 범위 확인', '위치, 규격, 유리 사양, 철거 여부가 필요함', 'CEO', 'HIGH', 'window_partial_replacement'],
    ['NC-REAL-003', '배관 수정 위치 확인', '욕실/주방/발코니 중 어느 배관을 수정하는지 확인 필요', 'site_manager', 'HIGH', 'plumbing_modification'],
    ['NC-REAL-004', '전기 증설 범위 확인', '분전반 증설 여부와 회로 수 확인 필요', 'site_manager', 'HIGH', 'electrical_upgrade'],
    ['NC-REAL-005', '결로 원인 확인', '단열 보강인지 환기 개선인지 원인 진단 필요', 'site_manager', 'HIGH', 'condensation_repair'],
    ['NC-REAL-006', '주방 가구 전체 교체 여부', '주방 리모델링 범위가 싱크/상판/후드/빌트인 전체인지 확인 필요', 'CEO', 'MEDIUM', 'kitchen'],
    ['NC-REAL-007', '발코니 확장 여부', '확장 여부에 따라 단열, 창호, 바닥, 결로 리스크가 달라짐', 'CEO', 'HIGH', 'condensation_repair']
  ];

  const insert = projectDb.prepare(`
    INSERT INTO needs_confirmations (
      confirmation_id, project_id, title_ko, reason_ko,
      required_by, blocking_level, related_process_id, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  confirmations.forEach((row) => insert.run(...row.slice(0, 1), projectId, ...row.slice(1), 'PENDING', createdAt));
}

function insertPaymentPlan() {
  const payments = [
    ['PAY-REAL-001', 'contract_deposit', '계약금', 'UNKNOWN', '계약 체결 후 청구', 'NEEDS_CONFIRMATION', 'DRAFT'],
    ['PAY-REAL-002', 'mid_payment', '중도금', 'UNKNOWN', '철거 완료 + 주요 자재 발주 전 또는 방수 검수 통과 후 청구 가능', 'NEEDS_CONFIRMATION', 'DRAFT'],
    ['PAY-REAL-003', 'final_payment', '잔금', 'UNKNOWN', '준공검수 + 고객 인도 체크리스트 완료 후 청구', 'NEEDS_CONFIRMATION', 'DRAFT'],
    ['PAY-REAL-004', 'change_order_payment', '추가공사비', 'UNKNOWN', '추가공사 승인서 승인 후 별도 청구', 'NEEDS_CONFIRMATION', 'DRAFT']
  ];

  const insert = projectDb.prepare(`
    INSERT INTO payment_plans (
      payment_id, project_id, milestone_type, title_ko, amount_status,
      trigger_condition_ko, expected_date, status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  payments.forEach(([paymentId, type, title, amountStatus, trigger, expectedDate, status]) => {
    insert.run(paymentId, projectId, type, title, amountStatus, trigger, expectedDate, status, toJson({ priceBasis: 'UNKNOWN' }), createdAt);
  });
}

function insertPurchaseRequirements() {
  const purchases = [
    ['PUR-REAL-001', '욕실 타일', 'Material', '타일', '공정 시작 전 규격/수량 확정 후 발주'],
    ['PUR-REAL-002', '타일 접착재/줄눈/부자재', 'AccessoryMaterial', '타일', '타일 수량 확정 후 통합 발주'],
    ['PUR-REAL-003', '방수재/프라이머', 'Material', '방수', '방수 범위 확정 후 발주'],
    ['PUR-REAL-004', '양변기/세면기/수전/샤워기', 'BrandMaterial', '욕실 리모델링', '브랜드 승인 후 발주'],
    ['PUR-REAL-005', '주방 싱크/상판/후드', 'BrandMaterial', '주방 리모델링', '주방 범위 승인 후 발주'],
    ['PUR-REAL-006', '바닥재', 'Material', '바닥재', '마감재 선택 후 발주'],
    ['PUR-REAL-007', '도배지/부자재', 'Material', '도배', '도배 면적 산출 후 발주'],
    ['PUR-REAL-008', '창호/유리/하드웨어', 'BrandMaterial', '창호 부분 교체', '실측 규격 확정 후 발주'],
    ['PUR-REAL-009', '조명/배선기구', 'Material', '조명/전기', '전기 증설 범위 확정 후 발주'],
    ['PUR-REAL-010', '폐기물 마대/운반', 'Service', '폐기물 반출', '철거 일정 확정 후 예약']
  ];

  const insert = projectDb.prepare(`
    INSERT INTO purchase_requirements (
      purchase_id, project_id, item_name_ko, item_type,
      required_for_process_ko, price_status, lead_time_status,
      order_timing_rule_ko, status, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  purchases.forEach(([purchaseId, itemName, itemType, processName, timingRule]) => {
    insert.run(
      purchaseId,
      projectId,
      itemName,
      itemType,
      processName,
      'NEEDS_RESEARCH',
      'NEEDS_RESEARCH',
      timingRule,
      'DRAFT',
      toJson({ supplierPrice: 'NEEDS_RESEARCH', internalPrice: 'NEEDS_RESEARCH' }),
      createdAt
    );
  });
}

function insertScheduleDraft() {
  const scheduleItems = [
    ['demolition', '철거', 1, '현장 실측 및 철거 범위 승인 후 시작', [], ['dust', 'noise', 'waste_volume_unknown']],
    ['waste_disposal', '폐기물 반출', 2, '철거와 동시 또는 직후 진행', ['demolition'], ['transport_cost_unknown']],
    ['plumbing_inspection', '설비 배관 점검', 3, '철거 후 배관 노출 상태에서 진행', ['demolition'], ['hidden_defect']],
    ['plumbing_modification', '배수/급수 부분 수정', 4, '배관 수정 범위 확인 후 진행', ['plumbing_inspection'], ['needs_confirmation']],
    ['electrical_inspection', '전기 점검', 5, '철거 후 배선 상태 확인', ['demolition'], ['capacity_unknown']],
    ['electrical_upgrade', '전기 일부 증설', 6, '증설 범위 승인 후 진행', ['electrical_inspection'], ['needs_confirmation']],
    ['waterproofing', '방수', 7, '욕실 철거 범위 및 기존 방수층 상태 확인 후 조건부 진행', ['plumbing_modification'], ['blocking_until_inspection']],
    ['tile', '타일', 8, '방수 검수 통과 후 진행', ['waterproofing'], ['blocked_if_waterproof_failed']],
    ['carpentry', '목공', 9, '설비/전기 매립 작업 후 진행', ['plumbing_modification', 'electrical_upgrade'], ['scope_unknown']],
    ['flooring', '바닥재', 10, '습식/목공 주요 공정 후 진행', ['carpentry'], ['material_selection_unknown']],
    ['wallpaper', '도배', 11, '목공/필름/바닥 주요 공정 후 진행', ['carpentry', 'flooring'], ['humidity_control']],
    ['lighting', '조명', 12, '천장/전기 배선 완료 후 설치', ['electrical_upgrade'], ['fixture_count_unknown']],
    ['final_cleaning', '준공청소', 13, '전체 공정 완료 후 진행', ['wallpaper', 'lighting'], ['handover_quality']]
  ];

  const insert = projectDb.prepare(`
    INSERT INTO schedule_drafts (
      schedule_item_id, project_id, process_id, process_name_ko,
      sequence_no, start_rule_ko, duration_status, dependencies_json,
      risk_flags_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  scheduleItems.forEach(([processId, processName, sequenceNo, startRule, dependencies, riskFlags]) => {
    insert.run(
      `SCH-REAL-${String(sequenceNo).padStart(3, '0')}`,
      projectId,
      processId,
      processName,
      sequenceNo,
      startRule,
      'NEEDS_RESEARCH',
      toJson(dependencies),
      toJson(riskFlags),
      'DRAFT',
      createdAt
    );
  });
}

function insertEstimateShell() {
  projectDb.prepare(`
    INSERT INTO estimates (estimate_id, project_id, estimate_type, amount_text, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'EST-REAL-APT-0001',
    projectId,
    'initialOperatingEstimateShell',
    'UNKNOWN',
    toJson({
      targetBudget: '60,000,000 KRW',
      priceStatus: 'NEEDS_RESEARCH',
      officialPrice: 'NEEDS_RESEARCH',
      marketPrice: 'NEEDS_RESEARCH',
      supplierPrice: 'NEEDS_RESEARCH',
      internalPrice: 'NEEDS_RESEARCH',
      vat: 'UNKNOWN',
      margin: 'UNKNOWN'
    }),
    createdAt
  );
}

function insertApprovals() {
  const approvals = [
    ['APP-REAL-001', 'Exception', '욕실 방수 자동 확정 보류', '방수는 조건부 공정이므로 방수층 상태 확인 전 자동 확정하지 않습니다.', 0, 'NOT_REQUIRED', '방수 판단 전 타일 공정 확정 차단'],
    ['APP-REAL-002', 'Exception', '창호 부분 교체 범위 확인', '부분 교체 위치와 규격 확인 없이는 발주/견적 확정이 불가합니다.', 0, 'NOT_REQUIRED', '창호 발주 보류'],
    ['APP-REAL-003', 'Exception', '결로 보수/단열 보강 판단', '결로 일부 있음 입력값에 따라 원인 진단과 보수 범위 확인이 필요합니다.', 0, 'NOT_REQUIRED', '단열/창호/환기 공정 확정 보류'],
    ['APP-REAL-004', 'MasterDbUpdateRequest', '실제 단가 조사 승인', '타일, 방수, 욕실 도기, 주방, 창호, 전기 자재 단가 조사를 시작합니다.', 1, 'READY', '단가 확정 전 견적 금액 확정 금지'],
    ['APP-REAL-005', 'ChangeOrder', '수금 계획 초안 확인', '계약금/중도금/잔금 조건을 대표 기준으로 확정해야 합니다.', 0, 'NOT_REQUIRED', '청구 일정 확정 보류']
  ];

  const insert = approvalDb.prepare(`
    INSERT INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko,
      status, rollback_required, rollback_status, blocking_impact_ko,
      requested_by, requested_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  approvals.forEach(([approvalId, type, title, reason, rollbackRequired, rollbackStatus, impact]) => {
    insert.run(
      approvalId,
      projectId,
      type,
      title,
      reason,
      'PENDING_CEO_APPROVAL',
      rollbackRequired,
      rollbackStatus,
      impact,
      'BOC',
      createdAt,
      createdAt
    );
  });
}

function insertLogs() {
  const logs = [
    ['LOG-REAL-001', '09:00', 'INFO', '첫 실제 운영 프로젝트 등록 완료', '등록'],
    ['LOG-REAL-002', '09:03', 'WARNING', '방수/창호/결로 항목 NEEDS_CONFIRMATION 생성', '확인'],
    ['LOG-REAL-003', '09:05', 'WARNING', '실제 단가 조사 승인 요청 생성', '승인'],
    ['LOG-REAL-004', '09:07', 'INFO', '공정표 초안 및 발주 필요 항목 생성', '검토']
  ];

  const insert = logsDb.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko,
      related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  logs.forEach(([logId, time, level, message, action]) => {
    insert.run(logId, time, level, message, projectId, action, createdAt);
  });
}

clearProjectData();
insertProjectSummary();
insertMinimumInput();
insertPresetResult();
insertProcesses();
insertNeedsConfirmations();
insertPaymentPlan();
insertPurchaseRequirements();
insertScheduleDraft();
insertEstimateShell();
insertApprovals();
insertLogs();

const statsService = createSqliteService({ app: null });
console.log(JSON.stringify({
  registeredProjectId: projectId,
  projectNameKo: '24평 구축 아파트 전체 리모델링',
  databaseDir,
  stats: statsService.getDbStats()
}, null, 2));
