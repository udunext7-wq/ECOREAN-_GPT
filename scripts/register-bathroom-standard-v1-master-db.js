const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  master: new DatabaseSync(path.join(productionDbDir, 'master.db')),
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  approval: new DatabaseSync(path.join(productionDbDir, 'approval.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const estimateDraftId = 'EST-DRAFT-PROD-BATH-0001';
const standardId = 'BATHROOM_REMODEL_STANDARD_V1';
const approvalId = 'APP-MDB-BATHROOM-STANDARD-V1';
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

const modules = [
  {
    moduleId: 'bathroom_demolition_method',
    displayNameKo: '철거/타일 시공 방식',
    moduleType: 'optionGroup',
    customerVisible: true,
    internalOnly: false,
    options: [
      {
        optionId: 'bond_installation',
        displayNameKo: '본드시공',
        customerTextKo: '기존 벽체 유지 + 본드 시공',
        internalTextKo: '기존 벽체 유지, 철거 범위 축소. 기존 벽체 상태 확인 필요.',
        priceAdjust: 0,
        priceDisplayKo: '기본 포함'
      },
      {
        optionId: 'floating_mortar_installation',
        displayNameKo: '떠붙임 시공',
        customerTextKo: '기존 타일 철거 + 떠붙임 시공',
        internalTextKo: '기존 타일 철거, 떠붙임. 추가 철거비 반영.',
        priceAdjust: 500000,
        priceDisplayKo: '+500,000원'
      }
    ]
  },
  {
    moduleId: 'bathroom_dome_ceiling',
    displayNameKo: '돔천장',
    moduleType: 'fixedModule',
    customerVisible: true,
    internalOnly: false,
    basePrice: 700000
  },
  {
    moduleId: 'bathroom_washbasin',
    displayNameKo: '세면대',
    moduleType: 'fixtureModule',
    customerVisible: true,
    internalOnly: false,
    basePrice: 350000
  },
  {
    moduleId: 'bathroom_one_piece_toilet',
    displayNameKo: '양변기 일체형',
    moduleType: 'fixtureModule',
    customerVisible: true,
    internalOnly: false,
    basePrice: 700000
  },
  {
    moduleId: 'bathroom_shower_accessory',
    displayNameKo: '샤워기 + 악세서리',
    moduleType: 'fixtureModule',
    customerVisible: true,
    internalOnly: false,
    basePrice: 300000
  },
  {
    moduleId: 'bathroom_shower_partition',
    displayNameKo: '샤워부스 / 파티션',
    moduleType: 'optionGroup',
    customerVisible: true,
    internalOnly: false,
    options: [
      { optionId: 'none', displayNameKo: '미시공', priceAdjust: 0, customerTextKo: '샤워부스/파티션 제외' },
      { optionId: 'shower_booth', displayNameKo: '샤워부스', priceAdjust: 300000, customerTextKo: '샤워부스 시공', priceDisplayKo: '+300,000원' },
      { optionId: 'glass_partition', displayNameKo: '파티션', priceAdjust: 300000, customerTextKo: '유리 파티션 시공', priceDisplayKo: '+300,000원' }
    ]
  },
  {
    moduleId: 'bathroom_zendai_marble',
    displayNameKo: '젠다이 + 대리석 마감',
    moduleType: 'toggleModule',
    customerVisible: true,
    internalOnly: false,
    options: [
      { optionId: 'off', displayNameKo: '미시공', priceAdjust: 0 },
      { optionId: 'on', displayNameKo: '시공', priceAdjust: 350000, priceDisplayKo: '+350,000원' }
    ]
  },
  {
    moduleId: 'bathroom_ventilator',
    displayNameKo: '환풍기',
    moduleType: 'fixedModule',
    customerVisible: true,
    internalOnly: false,
    basePrice: 150000
  }
];

const brandGradeStructure = {
  moduleId: 'bathroom_fixture_brand_grade',
  displayNameKo: '도기류 브랜드 등급',
  moduleType: 'brandGrade',
  defaultGrade: 'standard_import',
  grades: [
    {
      gradeId: 'basic_domestic',
      displayNameKo: '국산 기본형',
      priceAdjustPolicy: 'NEEDS_RESEARCH',
      examplesKo: ['대림바스', '계림', '이누스']
    },
    {
      gradeId: 'standard_import',
      displayNameKo: '수입 표준형',
      defaultBrand: 'American Standard',
      displayBrandNameKo: '아메리칸스탠다드',
      priceAdjustPolicy: 'NEEDS_RESEARCH'
    },
    {
      gradeId: 'premium_import',
      displayNameKo: '수입 고급형',
      priceAdjustPolicy: 'NEEDS_RESEARCH',
      examplesKo: ['TOTO', 'Grohe', 'Hansgrohe']
    }
  ]
};

const selectedOptionsForProject = {
  demolitionMethod: 'bond_installation',
  showerPartition: 'shower_booth',
  zendai: 'on',
  fixtureBrandGrade: 'standard_import',
  fixtureBrand: 'American Standard',
  tileSpec: '600x600 polished tile'
};

const preliminaryEstimateReflection = {
  estimateType: 'PRELIMINARY',
  priceStatus: 'PARTIAL_STANDARD_VALUE_REGISTERED',
  sourceStandardId: standardId,
  selectedOptions: selectedOptionsForProject,
  customerSummaryKo: [
    { itemKo: '돔천장', amountKo: '700,000원' },
    { itemKo: '세면대', amountKo: '350,000원' },
    { itemKo: '양변기 일체형', amountKo: '700,000원' },
    { itemKo: '샤워기 + 악세서리', amountKo: '300,000원' },
    { itemKo: '샤워부스', amountKo: '+300,000원' },
    { itemKo: '젠다이 + 대리석 마감', amountKo: '+350,000원' },
    { itemKo: '환풍기', amountKo: '150,000원' }
  ],
  internalSummaryKo: [
    { itemKo: '본드시공', amountKo: '기본 포함', noteKo: '기존 벽체 유지 + 본드 시공' },
    { itemKo: '떠붙임 선택 시', amountKo: '+500,000원', noteKo: '기존 타일 철거 + 떠붙임' },
    { itemKo: '도기류 브랜드', amountKo: 'NEEDS_RESEARCH', noteKo: '아메리칸스탠다드 모델/공급가 확인 필요' },
    { itemKo: '600각 폴리싱 타일', amountKo: 'NEEDS_RESEARCH', noteKo: '타일/부자재/품수/손실률 확인 필요' }
  ],
  stillNeedsResearchKo: [
    '타일 주자재/부자재 단가',
    '아메리칸스탠다드 세부 모델 공급가',
    '샤워부스 유리/하드웨어 사양',
    '젠다이 대리석 상판 실제 공급가',
    '노무비/품수/폐기물/운반비'
  ]
};

function migrate() {
  db.master.exec(`
    CREATE TABLE IF NOT EXISTS master_db_values (
      item_id TEXT PRIMARY KEY,
      target_db TEXT NOT NULL,
      value_json TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      approval_id TEXT
    );

    CREATE TABLE IF NOT EXISTS bathroom_standard_modules (
      module_id TEXT PRIMARY KEY,
      standard_id TEXT NOT NULL,
      module_type TEXT NOT NULL,
      display_name_ko TEXT NOT NULL,
      customer_visible INTEGER NOT NULL,
      internal_only INTEGER NOT NULL,
      base_price INTEGER,
      options_json TEXT NOT NULL,
      value_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

function registerMasterStandard() {
  db.master.prepare('DELETE FROM bathroom_standard_modules WHERE standard_id = ?').run(standardId);

  const insertModule = db.master.prepare(`
    INSERT INTO bathroom_standard_modules (
      module_id, standard_id, module_type, display_name_ko, customer_visible,
      internal_only, base_price, options_json, value_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  modules.forEach((module) => {
    insertModule.run(
      module.moduleId,
      standardId,
      module.moduleType,
      module.displayNameKo,
      module.customerVisible ? 1 : 0,
      module.internalOnly ? 1 : 0,
      module.basePrice ?? null,
      toJson(module.options || []),
      toJson(module),
      'ACTIVE_BY_CEO_INPUT',
      createdAt,
      createdAt
    );
  });

  insertModule.run(
    brandGradeStructure.moduleId,
    standardId,
    brandGradeStructure.moduleType,
    brandGradeStructure.displayNameKo,
    1,
    0,
    null,
    toJson(brandGradeStructure.grades),
    toJson(brandGradeStructure),
    'ACTIVE_BY_CEO_INPUT',
    createdAt,
    createdAt
  );

  const standardValue = {
    standardId,
    displayNameKo: '욕실 리모델링 실무 기준값 v1',
    version: 'v1',
    modules,
    brandGradeStructure,
    customerOutputPolicy: 'show_selected_modules_and_option_adders',
    internalOutputPolicy: 'show_module_basis_option_delta_and_research_gaps',
    priceStatus: 'CEO_STANDARD_VALUE_WITH_RESEARCH_GAPS'
  };

  db.master.prepare(`
    INSERT OR REPLACE INTO master_db_values (
      item_id, target_db, value_json, version, updated_by, updated_at, approval_id
    ) VALUES (?, ?, ?, COALESCE((SELECT version + 1 FROM master_db_values WHERE item_id = ?), 1), ?, ?, ?)
  `).run(
    standardId,
    'bathroom-standard-modules',
    toJson(standardValue),
    standardId,
    'CEO',
    createdAt,
    approvalId
  );
}

function updateProjectDraft() {
  const draft = db.project.prepare('SELECT preliminary_estimate_json FROM estimate_drafts WHERE estimate_draft_id = ?').get(estimateDraftId);
  if (!draft) return;

  const payload = {
    ...fromJson(draft.preliminary_estimate_json, {}),
    bathroomStandardV1: preliminaryEstimateReflection
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
    'PRELIMINARY / 기준값 일부 반영 / 세부 단가 NEEDS_RESEARCH',
    toJson({ bathroomStandardV1: preliminaryEstimateReflection }),
    estimateDraftId,
    projectId
  );

  const docRows = db.project.prepare('SELECT document_record_id, document_id, payload_json FROM estimate_draft_documents WHERE project_id = ?').all(projectId);
  const updateDoc = db.project.prepare('UPDATE estimate_draft_documents SET payload_json = ?, status_ko = ? WHERE document_record_id = ?');
  docRows.forEach((doc) => {
    const docPayload = {
      ...fromJson(doc.payload_json, {}),
      bathroomStandardV1: doc.document_id.includes('internal') || doc.document_id.includes('cost')
        ? preliminaryEstimateReflection.internalSummaryKo
        : preliminaryEstimateReflection.customerSummaryKo
    };
    updateDoc.run(
      toJson(docPayload),
      doc.document_id.includes('internal') || doc.document_id.includes('cost')
        ? '욕실 기준값 v1 반영 / 내부 단가 조사 필요'
        : '욕실 기준값 v1 반영 / 예비 견적',
      doc.document_record_id
    );
  });
}

function connectApprovalCenter() {
  db.approval.prepare('DELETE FROM approvals WHERE approval_id = ?').run(approvalId);
  db.approval.prepare(`
    INSERT INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at, decided_by, decided_at, decision_reason_ko
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approvalId,
    projectId,
    'MasterDbBaselineRegistration',
    '욕실 리모델링 실무 기준값 v1 등록',
    '대표 지정 기준값을 Master DB 기준 모듈로 등록하고 PRJ-PROD-BATH-0001 예비 견적에 반영했습니다.',
    'APPROVED_BY_CEO_INPUT',
    1,
    'SNAPSHOT_REQUIRED_FOR_FUTURE_CHANGE',
    '향후 기준값 변경은 Approval Center 승인 없이는 반영 금지',
    'CEO',
    createdAt,
    createdAt,
    'CEO',
    createdAt,
    '대표 직접 지시 기준값 등록'
  );
}

function logChange() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `LOG-${standardId}`,
    timeLabel,
    'INFO',
    '욕실 리모델링 실무 기준값 v1 Master DB 등록 및 예비 견적 반영',
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
    `ACTLOG-${standardId}`,
    'REGISTER_MASTER_DB_BATHROOM_STANDARD_V1',
    'CEO',
    projectId,
    approvalId,
    toJson({ standardId, modules, brandGradeStructure, preliminaryEstimateReflection }),
    '욕실 리모델링 실무 기준값 v1 등록',
    createdAt
  );
}

migrate();
registerMasterStandard();
updateProjectDraft();
connectApprovalCenter();
logChange();

console.log(JSON.stringify({
  standardId,
  projectId,
  moduleCount: modules.length,
  brandGradeModule: brandGradeStructure.moduleId,
  approvalId,
  preliminaryEstimateReflected: true,
  priceStatus: 'UNKNOWN / NEEDS_RESEARCH preserved'
}, null, 2));
