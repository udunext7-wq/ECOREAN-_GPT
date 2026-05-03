const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const siteOperationId = 'SITE-PRJ-PROD-BATH-0001';
const inspectionId = 'INS-TILE-MID-DAY-002';
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

const checklist = [
  {
    itemId: 'tile_hollow_sound',
    itemNameKo: '타일 들뜸 여부',
    resultStatus: 'PENDING',
    warningConditionKo: '부분 들뜸 의심 또는 추가 타진 필요',
    failConditionKo: '들뜸 다수 발생',
    failActionKo: '재시공 검토 및 후속 공정 차단'
  },
  {
    itemId: 'tile_level',
    itemNameKo: '수평 확인',
    resultStatus: 'PENDING',
    warningConditionKo: '부분 단차 또는 수평 보완 필요',
    failConditionKo: '사용/배수/마감에 영향 있는 수평 불량',
    failActionKo: '보정 작업 전 후속 공정 차단'
  },
  {
    itemId: 'grout_spacing',
    itemNameKo: '줄눈 간격 균일성',
    resultStatus: 'PENDING',
    warningConditionKo: '줄눈 간격 일부 불균일',
    failConditionKo: '눈에 띄는 줄눈 불량 다수',
    failActionKo: '보완 또는 부분 재시공 검토'
  },
  {
    itemId: 'tile_damage',
    itemNameKo: '파손 여부',
    resultStatus: 'PENDING',
    warningConditionKo: '미세 파손 또는 교체 후보 발생',
    failConditionKo: '파손 다수 발생',
    failActionKo: '재시공 검토 및 자재 손실률 재계산'
  },
  {
    itemId: 'corner_finish',
    itemNameKo: '코너 마감 상태',
    resultStatus: 'PENDING',
    warningConditionKo: '코너 마감 보완 필요',
    failConditionKo: '코너 박리/마감 불량 다수',
    failActionKo: '코너 보완 후 후속 마감 진행'
  },
  {
    itemId: 'drain_slope',
    itemNameKo: '배수구 경사',
    resultStatus: 'PENDING',
    warningConditionKo: '배수 경사 재확인 필요',
    failConditionKo: '배수구 역구배',
    failActionKo: 'RED ALERT 및 후속 공정 차단'
  },
  {
    itemId: 'zendai_connection_finish',
    itemNameKo: '젠다이 연결부 마감',
    resultStatus: 'PENDING',
    warningConditionKo: '젠다이 연결부 마감 보완 필요',
    failConditionKo: '젠다이 연결부 누수/박리 가능성',
    failActionKo: '보완 전 샤워부스/도기 후속 공정 차단'
  }
];

function updateInspectionChecklist() {
  const blockingProcesses = [
    'grout',
    'fixture_installation',
    'shower_booth',
    'silicone_finish'
  ];

  db.project.prepare(`
    UPDATE inspection_results
    SET result_status = ?, blocking_processes_json = ?, notes_ko = ?, created_at = ?
    WHERE inspection_result_id = ?
  `).run(
    'PENDING_ITEM_RESULTS',
    toJson(blockingProcesses),
    '타일 중간 검수는 7개 항목별 PASS/WARNING/FAIL 판정 필요. FAIL 항목 발생 시 후속 공정 차단.',
    createdAt,
    inspectionId
  );

  db.project.prepare(`
    INSERT OR REPLACE INTO inspection_checklists (
      checklist_id, execution_project_id, project_id, checklist_type,
      checklist_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CHECK-TILE-MID-PRJ-PROD-BATH-0001',
    'EXEC-PRJ-PROD-BATH-0001',
    projectId,
    'TILE_MID_INSPECTION',
    toJson({
      inspectionId,
      checklist,
      resultOptions: ['PASS', 'WARNING', 'FAIL'],
      failRuleKo: 'FAIL 발생 시 후속 공정 일시 차단',
      redAlertRuleKo: '배수구 역구배 발생 시 RED ALERT',
      reworkRuleKo: '들뜸/파손 다수 발생 시 재시공 검토'
    }),
    'PENDING_ITEM_RESULTS',
    createdAt
  );
}

function updateRiskDashboard() {
  db.project.prepare(`
    INSERT INTO site_risk_logs (
      risk_log_id, site_operation_id, project_id, risk_type, severity,
      description_ko, linked_issue_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RISK-TILE-MID-INSPECTION-CHECKLIST',
    siteOperationId,
    projectId,
    'TILE_MID_INSPECTION_PENDING',
    'MEDIUM',
    '타일 중간 검수 7개 항목별 판정 필요. FAIL 발생 시 후속 공정 차단.',
    null,
    createdAt
  );

  db.project.prepare(`
    UPDATE site_operations
    SET current_process_ko = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    '타일 중간 검수 항목별 판정 대기',
    toJson([
      {
        riskType: 'TILE_MID_INSPECTION_PENDING',
        severity: 'MEDIUM',
        descriptionKo: '들뜸/수평/줄눈/파손/코너/배수구/젠다이 연결부 항목별 판정 필요'
      }
    ]),
    createdAt,
    siteOperationId
  );

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'TILE_MID_INSPECTION 항목별 검수 대기',
    '7개 검수 항목별 PASS/WARNING/FAIL 입력',
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
    'LOG-PRJ-PROD-BATH-0001-TILE-MID-CHECKLIST',
    timeLabel,
    'WARNING',
    '타일 중간 검수 항목별 체크리스트 생성 / 결과 입력 대기',
    projectId,
    '검수',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-TILE-MID-CHECKLIST',
    'CREATE_TILE_MID_INSPECTION_CHECKLIST',
    'CEO',
    projectId,
    null,
    toJson({ inspectionId, checklist }),
    '타일 중간 검수를 항목별 판정 구조로 변경',
    createdAt
  );
}

updateInspectionChecklist();
updateRiskDashboard();
writeLogs();

console.log(JSON.stringify({
  projectId,
  inspectionId,
  status: 'PENDING_ITEM_RESULTS',
  checklistItemCount: checklist.length,
  resultOptions: ['PASS', 'WARNING', 'FAIL'],
  failRule: 'FAIL 발생 시 후속 공정 차단',
  redAlertRule: '배수구 역구배 발생 시 RED ALERT'
}, null, 2));
