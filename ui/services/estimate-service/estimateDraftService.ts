export type ProjectType = 'bathroom_remodeling' | 'kitchen_remodeling' | 'apartment_full_remodeling' | 'partial_repair';
export type PackageCode = 'BASIC' | 'STANDARD' | 'PREMIUM';

export type EstimateInput = {
  projectType: ProjectType | string;
  buildingType: string;
  areaPyeong: string;
  bathroomPackage: PackageCode;
  kitchenPackage: PackageCode;
  customerOfferPrice: string;
  spaceComposition: string;
  constructionScope: string;
  finishGrade: string;
  budgetLevel: string;
  siteConstraints: string;
  clientPriority: string;
};

export type MarginSafetyStatus = 'BLOCKED' | 'CEO_APPROVAL_REQUIRED' | 'PASS' | 'PRIORITY';

export type MarginSafetyResult = {
  packageCode: PackageCode;
  estimatedCost: number;
  customerOfferPrice: number;
  estimatedMargin: number;
  estimatedMarginRate: number;
  marginSafetyStatus: MarginSafetyStatus;
  decisionKo: string;
  reasonKo: string;
  priceSourceSummary?: {
    costBasis: 'VENDOR_PRICE_VERIFIED' | 'FALLBACK_ESTIMATE' | string;
    displayStatusKo: string;
    actualPriceItemCount: number;
    mappedItemCount: number;
    missingPriceItemCount: number;
    estimatedFallbackShareRate: number;
    linkedItems: Array<{
      materialId: string;
      materialNameKo: string;
      priceBasis: string;
      vendorNameKo?: string | null;
      unitPrice?: number;
      warningKo: string;
    }>;
  } | null;
};

export type PreventionItem = {
  itemId: string;
  itemNameKo: string;
  enforcementLevel: 'AUTO_LOCKED' | 'MANDATORY' | 'RECOMMENDED' | string;
  status: 'INCLUDED' | 'MISSING' | 'REMOVED_PENDING_APPROVAL' | string;
  reasonKo: string;
};

export type EstimateDraft = {
  estimateId: string;
  status: 'PRELIMINARY';
  priceStatus: 'UNKNOWN_PRICE_INCLUDED';
  marginSafety: MarginSafetyResult;
  preventionItems: PreventionItem[];
  generatedProcesses: Array<{ processId: string; displayNameKo: string; triggerType: string; reasonKo: string }>;
  conditionalProcesses: Array<{ processId: string; displayNameKo: string; conditionKo: string; status: string }>;
  needsConfirmation: Array<{ itemId: string; questionKo: string; impactKo: string }>;
  missingPriceWarnings: string[];
  scheduleDraft: Array<{ order: number; processKo: string; dependencyKo: string; leadTimeKo: string; inspectionKo: string }>;
  documents: Array<{ documentId: string; displayNameKo: string; audienceKo: string; statusKo: string }>;
};

export type SaveEstimateDraftResult = {
  dashboardData: unknown;
  savedDraft: {
    estimateDraftId: string;
    projectId: string;
    projectNameKo: string;
    status: 'PRELIMINARY';
    needsConfirmationCount: number;
    missingPriceWarningCount: number;
  };
};

export type LoadedEstimateDraft = {
  estimateDraftId: string;
  projectId: string;
  projectNameKo: string;
  draftStatus: 'PRELIMINARY';
  minimumInput: EstimateInput;
  draft: EstimateDraft;
  createdAt: string;
  updatedAt: string;
};

type ProjectTypeConfig = {
  projectType: ProjectType;
  displayNameKo: string;
  packageField: 'bathroomPackage' | 'kitchenPackage';
  packages: Record<PackageCode, { costFloor: number; minimumAllowedPrice: number; recommendedPrice: number; targetMarginRate: number }>;
  mandatoryItems: PreventionItem[];
  generatedProcesses: EstimateDraft['generatedProcesses'];
  conditionalProcesses: EstimateDraft['conditionalProcesses'];
  needsConfirmation: EstimateDraft['needsConfirmation'];
  missingPriceWarnings: string[];
  scheduleDraft: EstimateDraft['scheduleDraft'];
  documentWarningKo: string;
};

export const defaultEstimateInput: EstimateInput = {
  projectType: 'bathroom_remodeling',
  buildingType: '구축 아파트',
  areaPyeong: '24',
  bathroomPackage: 'BASIC',
  kitchenPackage: 'BASIC',
  customerOfferPrice: '5900000',
  spaceComposition: '욕실 1개',
  constructionScope: '욕실 단독 리모델링',
  finishGrade: '중급',
  budgetLevel: '700~900만원',
  siteConstraints: '입주 전 공사, 관리사무소 협의 필요',
  clientPriority: '하자 리스크 최소화, 예산 통제, 일정 준수'
};

export const PROJECT_TYPE_CONFIGS: Record<string, ProjectTypeConfig> = {
  bathroom_remodeling: {
    projectType: 'bathroom_remodeling',
    displayNameKo: '욕실 리모델링',
    packageField: 'bathroomPackage',
    packages: {
      BASIC: { costFloor: 4420000, minimumAllowedPrice: 5530000, recommendedPrice: 5900000, targetMarginRate: 0.25 },
      STANDARD: { costFloor: 5070000, minimumAllowedPrice: 6760000, recommendedPrice: 6800000, targetMarginRate: 0.25 },
      PREMIUM: { costFloor: 5070000, minimumAllowedPrice: 7250000, recommendedPrice: 7300000, targetMarginRate: 0.3 }
    },
    mandatoryItems: [
      { itemId: 'demolition_cost', itemNameKo: '철거비', enforcementLevel: 'AUTO_LOCKED', status: 'INCLUDED', reasonKo: '견적 누락 원인이 반복되어 욕실 견적에 필수 포함합니다.' },
      { itemId: 'waste_disposal_cost', itemNameKo: '폐기물 반출비', enforcementLevel: 'AUTO_LOCKED', status: 'INCLUDED', reasonKo: '폐기물 비용 누락이 반복되어 자동 포함합니다.' },
      { itemId: 'transport_cost', itemNameKo: '운반비', enforcementLevel: 'AUTO_LOCKED', status: 'INCLUDED', reasonKo: '운반비 누락이 반복되어 자동 포함합니다.' },
      { itemId: 'misc_contingency_cost', itemNameKo: '기타 잡비 / contingency', enforcementLevel: 'AUTO_LOCKED', status: 'INCLUDED', reasonKo: '기타 잡비 누락으로 마진 붕괴가 발생해 자동 포함합니다.' },
      { itemId: 'tile_accessory_package', itemNameKo: '타일 부자재 패키지', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '타일 부자재 과소 산정 방지를 위해 필수 포함합니다.' }
    ],
    generatedProcesses: [
      { processId: 'demolition', displayNameKo: '철거', triggerType: 'CONDITIONAL', reasonKo: '욕실 리모델링 범위에 따라 철거 공정을 생성합니다.' },
      { processId: 'waste_disposal', displayNameKo: '폐기물 반출', triggerType: 'CONDITIONAL', reasonKo: '철거 범위와 연동하여 폐기물 반출을 생성합니다.' },
      { processId: 'transport', displayNameKo: '운반비', triggerType: 'CONDITIONAL', reasonKo: 'Root Cause Prevention에 따라 운반비를 자동 방어합니다.' },
      { processId: 'misc_contingency', displayNameKo: '기타 잡비 / contingency', triggerType: 'CONDITIONAL', reasonKo: '과거 견적 누락 방지를 위해 contingency를 자동 방어합니다.' },
      { processId: 'tile_accessory_package', displayNameKo: '타일 부자재 패키지', triggerType: 'CONDITIONAL', reasonKo: '타일 부자재 과소 산정 방지를 위해 필수 포함합니다.' },
      { processId: 'waterproof_inspection', displayNameKo: '방수 상태 확인', triggerType: 'CONDITIONAL', reasonKo: '욕실 습식공간이므로 기존 방수층 상태 확인이 필요합니다.' },
      { processId: 'tile', displayNameKo: '타일 공정', triggerType: 'QTY', reasonKo: '욕실 벽/바닥 마감 면적 기준으로 산출합니다.' },
      { processId: 'bathroom_fixtures', displayNameKo: '도기 설치', triggerType: 'SELECT', reasonKo: '양변기, 세면대, 수전 등 선택 사양과 연결합니다.' },
      { processId: 'ceiling', displayNameKo: '돔천장', triggerType: 'SELECT', reasonKo: '욕실 천장 교체 조건을 포함했습니다.' },
      { processId: 'ventilation', displayNameKo: '환풍기', triggerType: 'SELECT', reasonKo: '욕실 환기 성능 확보를 위해 포함합니다.' },
      { processId: 'silicone_finish', displayNameKo: '실리콘 마감', triggerType: 'AUTO', reasonKo: '욕실 마감 완료 후 필수 마감 공정입니다.' },
      { processId: 'final_cleaning', displayNameKo: '준공청소', triggerType: 'AUTO', reasonKo: '고객 인도 전 필수 운영 문서와 연결합니다.' }
    ],
    conditionalProcesses: [
      { processId: 'waterproofing', displayNameKo: '방수 보강', conditionKo: '기존 방수층 이상, 배수구 주변 이상, 코너 박리, 누수 이력 확인 시 생성', status: 'NEEDS_CONFIRMATION' },
      { processId: 'plumbing_modification', displayNameKo: '배관 수정', conditionKo: '배관 이동, 수전 위치 변경, 배수 불량 확인 시 생성', status: 'NEEDS_CONFIRMATION' },
      { processId: 'shower_booth', displayNameKo: '샤워부스', conditionKo: '고객 선택 및 현장 치수 확인 후 생성', status: 'NEEDS_CONFIRMATION' },
      { processId: 'jendai', displayNameKo: '젠다이', conditionKo: '젠다이 시공 선택 및 벽체 조건 확인 후 생성', status: 'NEEDS_CONFIRMATION' },
      { processId: 'large_tile', displayNameKo: '600각 타일', conditionKo: '타일 규격 선택 시 시공 난이도와 손실률을 보정합니다.', status: 'NEEDS_CONFIRMATION' }
    ],
    needsConfirmation: [
      { itemId: 'NC-001', questionKo: '기존 방수층 상태가 정상인가?', impactKo: '방수 보강 또는 재방수 공정 생성 여부에 영향을 줍니다.' },
      { itemId: 'NC-002', questionKo: '배관 수정이 필요한가?', impactKo: '설비 공정, 추가공사, 공정표에 영향을 줍니다.' },
      { itemId: 'NC-003', questionKo: '샤워부스 또는 파티션을 설치하는가?', impactKo: '고객가, 발주서, 유리/하드웨어 검수 항목에 영향을 줍니다.' },
      { itemId: 'NC-004', questionKo: '젠다이 시공을 포함하는가?', impactKo: '목공/석재/타일 마감 연결부와 원가에 영향을 줍니다.' },
      { itemId: 'NC-005', questionKo: '타일 종류는 600각, 포세린, 대형타일 중 무엇인가?', impactKo: '시공 난이도, 손실률, 발주 수량, 품수에 영향을 줍니다.' }
    ],
    missingPriceWarnings: [
      '실제 공급가가 VERIFIED 되기 전까지 예비 견적으로 표시합니다.',
      '욕실 도기/타일/방수재 공급가는 NEEDS_RESEARCH 상태입니다.',
      '대표 승인 없이 Master DB 단가에는 반영되지 않습니다.'
    ],
    scheduleDraft: [
      { order: 1, processKo: '철거/폐기물', dependencyKo: '계약금 입금 후 시작', leadTimeKo: '폐기물 반출 일정 확인', inspectionKo: '철거 범위 사진 기록' },
      { order: 2, processKo: '방수 상태 확인', dependencyKo: '철거 후 가능', leadTimeKo: '필요 시 방수재 발주', inspectionKo: '방수 검수 실패 시 타일 공정 차단' },
      { order: 3, processKo: '타일 시공', dependencyKo: '방수 확인 후 가능', leadTimeKo: '타일 부자재 발주 리드타임 확인', inspectionKo: '중간 검수 및 손실률 기록' },
      { order: 4, processKo: '도기/샤워부스/천장', dependencyKo: '타일 중간 검수 후 가능', leadTimeKo: '브랜드 및 모델 확정 필요', inspectionKo: '누수/수평/하드웨어 검수' },
      { order: 5, processKo: '실리콘/준공청소/인도', dependencyKo: '설치 검수 후 가능', leadTimeKo: '고객 인도 일정 배정', inspectionKo: '고객 인도 체크리스트' }
    ],
    documentWarningKo: 'NEEDS_RESEARCH 포함'
  },
  kitchen_remodeling: {
    projectType: 'kitchen_remodeling',
    displayNameKo: '주방 리모델링',
    packageField: 'kitchenPackage',
    packages: {
      BASIC: { costFloor: 5200000, minimumAllowedPrice: 6934000, recommendedPrice: 7200000, targetMarginRate: 0.25 },
      STANDARD: { costFloor: 7200000, minimumAllowedPrice: 9600000, recommendedPrice: 9900000, targetMarginRate: 0.25 },
      PREMIUM: { costFloor: 9800000, minimumAllowedPrice: 13067000, recommendedPrice: 13500000, targetMarginRate: 0.3 }
    },
    mandatoryItems: [
      { itemId: 'kitchen_demolition_cost', itemNameKo: '주방 철거비', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '주방 리모델링은 기존 싱크/상판/타일 철거 범위가 원가 누수로 이어지므로 필수 포함합니다.' },
      { itemId: 'kitchen_waste_disposal_cost', itemNameKo: '주방 폐기물 반출비', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '싱크대, 상판, 타일 철거 폐기물이 누락되지 않도록 필수 포함합니다.' },
      { itemId: 'kitchen_transport_cost', itemNameKo: '주방 운반비', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '싱크대, 상판, 후드, 타일 자재 운반비를 기본 원가로 방어합니다.' },
      { itemId: 'kitchen_sink_cabinet_package', itemNameKo: '싱크대 본체 패키지', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '하부장/상부장/기본 하드웨어가 견적에서 빠지지 않도록 필수 포함합니다.' },
      { itemId: 'kitchen_countertop_package', itemNameKo: '상판 패키지', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '상판 종류와 길이에 따라 원가 차이가 커서 별도 필수 항목으로 관리합니다.' },
      { itemId: 'kitchen_tile_accessory_package', itemNameKo: '주방 벽타일 및 부자재', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '주방 벽타일, 접착재, 줄눈, 실리콘 부자재 누락을 방지합니다.' },
      { itemId: 'kitchen_misc_contingency_cost', itemNameKo: '주방 기타 잡비 / contingency', enforcementLevel: 'MANDATORY', status: 'INCLUDED', reasonKo: '현장 치수 오차, 마감 보완, 소모품 비용을 원가 방어선에 포함합니다.' }
    ],
    generatedProcesses: [
      { processId: 'kitchen_demolition', displayNameKo: '주방 철거', triggerType: 'CONDITIONAL', reasonKo: '기존 싱크대, 상판, 주방 타일 철거 범위에 따라 생성합니다.' },
      { processId: 'kitchen_waste_disposal', displayNameKo: '주방 폐기물 반출', triggerType: 'CONDITIONAL', reasonKo: '철거 범위와 연동해 폐기물 반출비를 자동 방어합니다.' },
      { processId: 'kitchen_transport', displayNameKo: '주방 운반비', triggerType: 'CONDITIONAL', reasonKo: '싱크대, 상판, 후드, 타일 자재 운반비를 자동 포함합니다.' },
      { processId: 'sink_cabinet', displayNameKo: '싱크대 본체', triggerType: 'SELECT', reasonKo: '주방 패키지 기준으로 하부장/상부장 기본 구성을 생성합니다.' },
      { processId: 'countertop', displayNameKo: '상판', triggerType: 'SELECT', reasonKo: '상판 종류와 길이 확인 후 원가와 옵션을 분리합니다.' },
      { processId: 'hood', displayNameKo: '후드', triggerType: 'SELECT', reasonKo: '기본 후드는 포함하되 고급 후드는 업셀 옵션으로 분리합니다.' },
      { processId: 'faucet_sink_bowl', displayNameKo: '수전 / 싱크볼', triggerType: 'SELECT', reasonKo: '수전과 싱크볼 등급별 단가 차이를 별도 관리합니다.' },
      { processId: 'kitchen_wall_tile', displayNameKo: '주방 벽타일', triggerType: 'QTY', reasonKo: '벽타일 면적과 부자재를 분리 산출합니다.' },
      { processId: 'kitchen_lighting', displayNameKo: '주방 조명', triggerType: 'SELECT', reasonKo: '작업등, 간접등, 다운라이트 적용 여부를 확인합니다.' },
      { processId: 'kitchen_misc_contingency', displayNameKo: '주방 기타 잡비 / contingency', triggerType: 'CONDITIONAL', reasonKo: '치수 오차와 현장 보완비를 누락 방지 항목으로 포함합니다.' }
    ],
    conditionalProcesses: [
      { processId: 'built_in_appliances', displayNameKo: '빌트인 가전', conditionKo: '고객 선택, 브랜드, 전기 증설 여부 확인 후 생성', status: 'NEEDS_CONFIRMATION' },
      { processId: 'countertop_upgrade', displayNameKo: '상판 업그레이드', conditionKo: '인조대리석, 엔지니어드스톤, 세라믹 등 선택 시 원가 재계산', status: 'NEEDS_CONFIRMATION' },
      { processId: 'door_finish_upgrade', displayNameKo: '도어 마감 업그레이드', conditionKo: 'PET, 도장, 무늬목, 우레탄 마감 선택 시 생성', status: 'NEEDS_CONFIRMATION' },
      { processId: 'electrical_upgrade', displayNameKo: '주방 전기 증설', conditionKo: '인덕션, 식기세척기, 오븐 등 빌트인 가전 사용 시 확인', status: 'NEEDS_CONFIRMATION' },
      { processId: 'plumbing_modification', displayNameKo: '급배수 위치 수정', conditionKo: '싱크 위치 변경 또는 식기세척기 추가 시 생성', status: 'NEEDS_CONFIRMATION' }
    ],
    needsConfirmation: [
      { itemId: 'KNC-001', questionKo: '싱크대 길이와 ㄱ자/일자/ㄷ자 형태가 확정됐는가?', impactKo: '싱크 본체, 상판, 하드웨어 수량과 원가에 직접 영향을 줍니다.' },
      { itemId: 'KNC-002', questionKo: '상판 종류는 무엇인가?', impactKo: '인조대리석, 엔지니어드스톤, 세라믹에 따라 원가와 마진이 크게 달라집니다.' },
      { itemId: 'KNC-003', questionKo: '도어 마감 등급은 무엇인가?', impactKo: 'PET, 도장, 무늬목 등급별로 공급가와 하자 리스크가 달라집니다.' },
      { itemId: 'KNC-004', questionKo: '빌트인 가전이 포함되는가?', impactKo: '전기 증설, 가구 제작 치수, 발주 리드타임에 영향을 줍니다.' },
      { itemId: 'KNC-005', questionKo: '주방 벽타일 교체 범위가 확정됐는가?', impactKo: '타일 면적, 부자재, 철거, 폐기물 수량에 영향을 줍니다.' }
    ],
    missingPriceWarnings: [
      '주방 싱크대, 상판, 하드웨어, 후드, 수전, 싱크볼 공급가는 VERIFIED 전까지 예비 견적입니다.',
      '빌트인 가전 및 주방 벽타일 옵션은 NEEDS_RESEARCH 상태입니다.',
      '대표 승인 없이 Master DB 단가에는 반영되지 않습니다.'
    ],
    scheduleDraft: [
      { order: 1, processKo: '철거 / 폐기물', dependencyKo: '계약금 입금 후 시작', leadTimeKo: '폐기물 반출 일정 확인', inspectionKo: '철거 범위 및 벽체 상태 기록' },
      { order: 2, processKo: '실측 / 제작 확정', dependencyKo: '철거 후 실측 가능', leadTimeKo: '싱크대/상판 제작 리드타임 확인', inspectionKo: '도면, 치수, 가전 규격 확인' },
      { order: 3, processKo: '벽타일 / 전기 / 설비', dependencyKo: '실측 및 배관/전기 조건 확정 후 진행', leadTimeKo: '타일/부자재 발주 필요', inspectionKo: '수평, 줄눈, 콘센트 위치 확인' },
      { order: 4, processKo: '싱크대 / 상판 / 후드 설치', dependencyKo: '제작품 입고 후 가능', leadTimeKo: '상판 및 가구 납기 확인', inspectionKo: '문짝 간격, 수평, 상판 접합부, 후드 작동 확인' },
      { order: 5, processKo: '수전 / 싱크볼 / 실리콘 / 인도', dependencyKo: '본체 설치 후 가능', leadTimeKo: '고객 인도 일정 배정', inspectionKo: '누수, 배수, 실리콘, 청소 체크' }
    ],
    documentWarningKo: '싱크/상판/하드웨어 NEEDS_RESEARCH 포함'
  }
};

function getProjectConfig(input: EstimateInput) {
  return PROJECT_TYPE_CONFIGS[input.projectType] || PROJECT_TYPE_CONFIGS.bathroom_remodeling;
}

function parseWon(value: string) {
  const parsed = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateMarginSafety(input: EstimateInput): MarginSafetyResult {
  const config = getProjectConfig(input);
  const packageCode = input[config.packageField] || 'BASIC';
  const pricing = config.packages[packageCode] || config.packages.BASIC;
  const customerOfferPrice = parseWon(input.customerOfferPrice);
  const estimatedCost = pricing.costFloor;
  const estimatedMargin = customerOfferPrice - estimatedCost;
  const estimatedMarginRate = customerOfferPrice > 0 ? Number((estimatedMargin / customerOfferPrice).toFixed(4)) : 0;
  let marginSafetyStatus: MarginSafetyStatus = 'BLOCKED';

  if (customerOfferPrice < pricing.minimumAllowedPrice || estimatedMarginRate < 0.2) {
    marginSafetyStatus = 'BLOCKED';
  } else if (estimatedMarginRate < 0.25) {
    marginSafetyStatus = 'CEO_APPROVAL_REQUIRED';
  } else if (estimatedMarginRate < 0.3) {
    marginSafetyStatus = 'PASS';
  } else {
    marginSafetyStatus = 'PRIORITY';
  }

  const decisionMap: Record<MarginSafetyStatus, string> = {
    BLOCKED: '수주 차단',
    CEO_APPROVAL_REQUIRED: '대표 승인 필요',
    PASS: '진행 가능',
    PRIORITY: '우선 수주 가능'
  };

  const reasonMap: Record<MarginSafetyStatus, string> = {
    BLOCKED: `${config.displayNameKo} 최소 방어가 ${pricing.minimumAllowedPrice.toLocaleString('ko-KR')}원 또는 최소 마진율 20% 기준을 통과하지 못했습니다.`,
    CEO_APPROVAL_REQUIRED: `${config.displayNameKo} 20~25% 저마진 구간입니다. FINAL_ESTIMATE 전환 시 대표 승인이 필요합니다.`,
    PASS: `${config.displayNameKo} 25% 이상 마진 기준을 통과했습니다.`,
    PRIORITY: `${config.displayNameKo} 30% 이상 우선 수주 가능한 고마진 구간입니다.`
  };

  return {
    packageCode,
    estimatedCost,
    customerOfferPrice,
    estimatedMargin,
    estimatedMarginRate,
    marginSafetyStatus,
    decisionKo: decisionMap[marginSafetyStatus],
    reasonKo: reasonMap[marginSafetyStatus],
    priceSourceSummary: {
      costBasis: 'FALLBACK_ESTIMATE',
      displayStatusKo: '추정값 기반',
      actualPriceItemCount: 0,
      mappedItemCount: config.mandatoryItems.length,
      missingPriceItemCount: config.mandatoryItems.length,
      estimatedFallbackShareRate: 1,
      linkedItems: config.mandatoryItems.map((item) => ({
        materialId: item.itemId,
        materialNameKo: item.itemNameKo,
        priceBasis: 'FALLBACK_ESTIMATE',
        vendorNameKo: null,
        unitPrice: 0,
        warningKo: '실제 공급가 없음: 기준값/추정값 기반'
      }))
    }
  };
}

export function createEstimateDraft(input: EstimateInput): EstimateDraft {
  const config = getProjectConfig(input);
  return {
    estimateId: 'EST-DRAFT-0001',
    status: 'PRELIMINARY',
    priceStatus: 'UNKNOWN_PRICE_INCLUDED',
    marginSafety: calculateMarginSafety(input),
    preventionItems: config.mandatoryItems,
    generatedProcesses: config.generatedProcesses,
    conditionalProcesses: config.conditionalProcesses,
    needsConfirmation: config.needsConfirmation,
    missingPriceWarnings: config.missingPriceWarnings,
    scheduleDraft: config.scheduleDraft,
    documents: [
      { documentId: 'customer_estimate', displayNameKo: '고객용 견적서 초안', audienceKo: '고객용', statusKo: '예비 견적' },
      { documentId: 'internal_cost', displayNameKo: '내부 원가표 초안', audienceKo: '내부용', statusKo: '단가 누락 경고 포함' },
      { documentId: 'purchase_order', displayNameKo: '발주서 초안', audienceKo: '현장/구매', statusKo: config.documentWarningKo },
      { documentId: 'payment_plan', displayNameKo: '수금 계획 초안', audienceKo: '대표/회계', statusKo: '공정 조건 연동 전' }
    ]
  };
}

export async function saveEstimateDraft(payload: { minimumInput: EstimateInput; draft: EstimateDraft }): Promise<SaveEstimateDraftResult | null> {
  if (window.ecorean?.bocDb?.saveEstimateDraft) {
    const result = await (window.ecorean.bocDb.saveEstimateDraft(payload) as Promise<SaveEstimateDraftResult>);
    window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
    return result;
  }

  return null;
}

export async function loadEstimateDraftForProject(projectId: string): Promise<LoadedEstimateDraft | null> {
  if (window.ecorean?.bocDb?.loadEstimateDraftForProject) {
    return window.ecorean.bocDb.loadEstimateDraftForProject({ projectId }) as Promise<LoadedEstimateDraft | null>;
  }

  return null;
}

export async function updateEstimateDraft(payload: {
  estimateDraftId: string;
  minimumInput: EstimateInput;
  draft: EstimateDraft;
}): Promise<SaveEstimateDraftResult | null> {
  if (window.ecorean?.bocDb?.updateEstimateDraft) {
    const result = await (window.ecorean.bocDb.updateEstimateDraft(payload) as Promise<SaveEstimateDraftResult>);
    window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
    return result;
  }

  return null;
}
