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

const resolvedValues = [
  ['NC-WATERPROOF-LAYER', '기존 방수층 상태', '정상 / 살아있음'],
  ['NC-PLUMBING-MODIFICATION', '배관 수정 필요 여부', '없음'],
  ['NC-LEAK-HISTORY', '기존 누수 흔적', '없음'],
  ['NC-INTERFLOOR-WATERPROOF', '아래층 누수 민원', '없음'],
  ['NC-SHOWER-BOOTH', '샤워부스 시공', '있음'],
  ['NC-ZENDAI', '젠다이 시공', '있음'],
  ['NC-FIXTURE-BRAND', '도기 브랜드', '아메리칸스탠다드'],
  ['NC-TILE-TYPE', '타일 종류', '600각 폴리싱 타일']
];

function updateConfirmationStatuses() {
  const updateConfirmation = db.project.prepare(`
    UPDATE estimate_draft_confirmations
    SET status = ?
    WHERE project_id = ? AND confirmation_id LIKE ?
  `);

  const updateApproval = db.approval.prepare(`
    UPDATE approvals
    SET status = ?, decided_by = ?, decided_at = ?, decision_reason_ko = ?, updated_at = ?
    WHERE project_id = ? AND approval_id LIKE ?
  `);

  resolvedValues.forEach(([itemId, labelKo, valueKo], index) => {
    updateConfirmation.run('RESOLVED', projectId, `%${itemId}`);
    updateApproval.run(
      'RESOLVED',
      'CEO',
      createdAt,
      `${labelKo} = ${valueKo}`,
      createdAt,
      projectId,
      `%NC-${String(index + 1).padStart(2, '0')}`
    );
  });
}

function updateProcess(processId, changes) {
  const row = db.project.prepare(`
    SELECT * FROM estimate_draft_processes
    WHERE project_id = ? AND process_id = ?
  `).get(projectId, processId);

  if (!row) return false;

  const payload = {
    ...fromJson(row.payload_json, {}),
    ...changes.payload
  };

  db.project.prepare(`
    UPDATE estimate_draft_processes
    SET reason_ko = ?, status = ?, payload_json = ?
    WHERE project_id = ? AND process_id = ?
  `).run(
    changes.reasonKo ?? row.reason_ko,
    changes.status ?? row.status,
    toJson(payload),
    projectId,
    processId
  );

  return true;
}

function insertProcessIfMissing({ processId, processNameKo, processType, triggerType, reasonKo, status, payload }) {
  const existing = db.project.prepare(`
    SELECT process_record_id FROM estimate_draft_processes
    WHERE project_id = ? AND process_id = ?
  `).get(projectId, processId);

  if (existing) return false;

  const count = db.project.prepare(`
    SELECT COUNT(*) AS count FROM estimate_draft_processes
    WHERE project_id = ?
  `).get(projectId).count;

  db.project.prepare(`
    INSERT INTO estimate_draft_processes (
      process_record_id, estimate_draft_id, project_id, process_id,
      process_name_ko, process_type, trigger_type, reason_ko, status,
      payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `${estimateDraftId}-PROC-${String(count + 1).padStart(2, '0')}`,
    estimateDraftId,
    projectId,
    processId,
    processNameKo,
    processType,
    triggerType,
    reasonKo,
    status,
    toJson(payload),
    createdAt
  );

  return true;
}

function updateProcessesAndSpecs() {
  updateProcess('waterproofing_decision', {
    status: 'RESOLVED_LIMITED_SCOPE',
    reasonKo: '기존 방수층 정상, 누수 흔적 없음, 아래층 민원 없음. 전체 재방수 제외, 상태 확인 및 필요 부위 보강 판단으로 변경.',
    payload: {
      waterproofScopeType: 'inspection_and_spot_reinforcement_if_needed',
      fullWaterproofingRequired: false,
      leakHistoryFlag: false,
      interfloorLeakComplaintFlag: false,
      customerExplanation: '기존 방수층이 살아 있고 누수 이력이 없어 전체 재방수 대신 상태 확인 후 필요한 부위만 보강 판단합니다.',
      priceStatus: 'NEEDS_RESEARCH'
    }
  });

  updateProcess('plumbing_inspection', {
    status: 'RESOLVED_NO_MODIFICATION',
    reasonKo: '배관 수정 필요 없음. 배관 수정 공정 제외, 기본 점검 기록만 유지.',
    payload: {
      plumbingModificationRequired: false,
      excludedProcess: 'plumbing_modification',
      customerExplanation: '배관 수정이 필요하지 않아 별도 배관 수정 공정은 제외합니다.'
    }
  });

  updateProcess('wall_tile_replacement', {
    reasonKo: '타일 종류가 600각 폴리싱 타일로 확정되어 시공 난이도와 손실률을 600각 기준으로 반영.',
    payload: {
      defaultSpec: {
        tileType: 'polished_tile',
        tileSize: '600x600',
        displayNameKo: '600각 폴리싱 타일',
        applicationArea: 'bathroom_wall'
      },
      difficultyAdjust: '600각 기준 시공 난이도 반영 필요',
      wasteRate: 'NEEDS_RESEARCH_600_POLISHED_TILE',
      priceStatus: 'NEEDS_RESEARCH'
    }
  });

  updateProcess('floor_tile_replacement', {
    reasonKo: '타일 종류가 600각 폴리싱 타일로 확정되어 시공 난이도와 손실률을 600각 기준으로 반영.',
    payload: {
      defaultSpec: {
        tileType: 'polished_tile',
        tileSize: '600x600',
        displayNameKo: '600각 폴리싱 타일',
        applicationArea: 'bathroom_floor'
      },
      difficultyAdjust: '600각 기준 시공 난이도 반영 필요',
      wasteRate: 'NEEDS_RESEARCH_600_POLISHED_TILE',
      priceStatus: 'NEEDS_RESEARCH'
    }
  });

  updateProcess('fixture_replacement', {
    reasonKo: '도기 브랜드가 아메리칸스탠다드 기준으로 확정됨. 실제 공급가와 모델은 NEEDS_RESEARCH 유지.',
    payload: {
      defaultSpec: {
        brandName: 'American Standard',
        displayBrandNameKo: '아메리칸스탠다드',
        fixtureScope: 'toilet_washbasin_faucet_shower_fixture',
        modelName: 'NEEDS_RESEARCH',
        supplierPrice: 'NEEDS_RESEARCH',
        internalPrice: 'NEEDS_RESEARCH'
      },
      priceStatus: 'NEEDS_RESEARCH'
    }
  });

  insertProcessIfMissing({
    processId: 'bathroom_zendai',
    processNameKo: '젠다이 시공',
    processType: 'GENERATED',
    triggerType: 'SELECT',
    reasonKo: '대표 확인값: 젠다이 시공 있음.',
    status: 'PRELIMINARY',
    payload: {
      defaultSpec: {
        displayNameKo: '욕실 젠다이',
        waterproofRelation: 'spot_reinforcement_check_required',
        tileRelation: '600_polished_tile_finish',
        priceStatus: 'NEEDS_RESEARCH'
      }
    }
  });

  insertProcessIfMissing({
    processId: 'shower_booth',
    processNameKo: '샤워부스 시공',
    processType: 'GENERATED',
    triggerType: 'SELECT',
    reasonKo: '대표 확인값: 샤워부스 시공 있음.',
    status: 'PRELIMINARY',
    payload: {
      defaultSpec: {
        displayNameKo: '욕실 샤워부스',
        glassSpec: 'NEEDS_RESEARCH',
        hardwareSpec: 'NEEDS_RESEARCH',
        siliconeRelation: 'required',
        priceStatus: 'NEEDS_RESEARCH'
      }
    }
  });
}

function updateEstimateAndFinalApproval() {
  const draftRow = db.project.prepare(`
    SELECT preliminary_estimate_json, missing_price_warnings_json
    FROM estimate_drafts
    WHERE estimate_draft_id = ?
  `).get(estimateDraftId);

  const estimatePayload = {
    ...fromJson(draftRow?.preliminary_estimate_json, {}),
    confirmationStatus: 'RESOLVED',
    finalEstimateReadiness: 'BLOCKED_BY_PRICE_RESEARCH_AND_CEO_FINAL_APPROVAL',
    resolvedValues: Object.fromEntries(resolvedValues.map(([id, , value]) => [id, value])),
    excludedProcesses: ['plumbing_modification', 'full_waterproofing'],
    addedProcesses: ['bathroom_zendai', 'shower_booth'],
    defaultSpecUpdates: {
      fixtureBrand: 'American Standard',
      tileSpec: '600x600 polished tile',
      waterproofScope: 'inspection_and_spot_reinforcement_if_needed'
    }
  };

  const warnings = [
    '실제 단가가 입력되지 않아 FINAL ESTIMATE 전환 전 단가 조사가 필요합니다.',
    '아메리칸스탠다드 도기 모델명과 공급가가 NEEDS_RESEARCH 상태입니다.',
    '600각 폴리싱 타일 공급가, 시공 난이도, 손실률이 NEEDS_RESEARCH 상태입니다.',
    '샤워부스 유리 사양과 하드웨어 공급가가 NEEDS_RESEARCH 상태입니다.',
    '젠다이 상판/타일/방수 보강 범위 단가가 NEEDS_RESEARCH 상태입니다.'
  ];

  db.project.prepare(`
    UPDATE estimate_drafts
    SET preliminary_estimate_json = ?, missing_price_warnings_json = ?, updated_at = ?
    WHERE estimate_draft_id = ?
  `).run(toJson(estimatePayload), toJson(warnings), createdAt, estimateDraftId);

  db.project.prepare('DELETE FROM estimate_draft_warnings WHERE project_id = ?').run(projectId);
  const insertWarning = db.project.prepare(`
    INSERT INTO estimate_draft_warnings (
      warning_id, estimate_draft_id, project_id, warning_ko, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  warnings.forEach((warningKo, index) => {
    insertWarning.run(`${estimateDraftId}-POSTRESOLVE-WARN-${index + 1}`, estimateDraftId, projectId, warningKo, 'OPEN', createdAt);
  });

  db.approval.prepare(`
    UPDATE approvals
    SET reason_ko = ?, blocking_impact_ko = ?, updated_at = ?
    WHERE project_id = ? AND approval_type = 'EstimateApproval'
  `).run(
    'NEEDS_CONFIRMATION은 모두 해결됨. 다만 실제 단가/모델/공급가가 NEEDS_RESEARCH 상태이므로 FINAL ESTIMATE 전환 전 단가 조사와 대표 최종 승인이 필요합니다.',
    '단가 조사 및 대표 최종 승인 전 FINAL ESTIMATE 생성 금지',
    createdAt,
    projectId
  );
}

function updateProjectSummary() {
  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, risk_score = ?, risk_level = ?,
        defect_risk_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'NEEDS_CONFIRMATION 해결 / 단가 조사 대기',
    toJson(['아메리칸스탠다드 도기 모델 확인', '600각 폴리싱 타일 단가 확인', '샤워부스 사양 확인', '젠다이 상세 범위 확인']),
    64,
    'MEDIUM',
    '전체 방수 제외, 필요 부위 보강 판단',
    '단가 조사 후 FINAL ESTIMATE 대표 승인 검토',
    createdAt,
    projectId
  );

  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `LOG-${projectId}-CONFIRMATIONS-RESOLVED`,
    timeLabel,
    'WARNING',
    '욕실 1호 확인 항목 해결: 단가 조사 후 FINAL ESTIMATE 검토',
    projectId,
    '확인',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `ACTLOG-${projectId}-CONFIRMATIONS-RESOLVED`,
    'RESOLVE_NEEDS_CONFIRMATION',
    'CEO',
    projectId,
    null,
    toJson({
      resolvedValues,
      excludedProcesses: ['plumbing_modification', 'full_waterproofing'],
      addedProcesses: ['bathroom_zendai', 'shower_booth'],
      finalEstimateReadiness: 'BLOCKED_BY_PRICE_RESEARCH_AND_CEO_FINAL_APPROVAL'
    }),
    '대표 확인값에 따라 욕실 1호 NEEDS_CONFIRMATION 해결',
    createdAt
  );
}

updateConfirmationStatuses();
updateProcessesAndSpecs();
updateEstimateAndFinalApproval();
updateProjectSummary();

const summary = {
  projectId,
  resolvedCount: resolvedValues.length,
  excludedProcesses: ['plumbing_modification', 'full_waterproofing'],
  addedProcesses: ['bathroom_zendai', 'shower_booth'],
  defaultSpecUpdates: {
    fixtureBrand: 'American Standard / 아메리칸스탠다드',
    tileSpec: '600x600 polished tile / 600각 폴리싱 타일',
    waterproofScope: 'inspection_and_spot_reinforcement_if_needed'
  },
  finalEstimateReadiness: 'BLOCKED_BY_PRICE_RESEARCH_AND_CEO_FINAL_APPROVAL'
};

console.log(JSON.stringify(summary, null, 2));
