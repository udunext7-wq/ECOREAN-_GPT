# ECOREAN 자동견적 OS Master DB 설계 원칙

## 1. Master DB의 목적

ECOREAN 자동견적 OS의 Master DB는 단순 단가표가 아니다.

Master DB는 다음 역할을 동시에 수행한다.

- 공정의 표준 구조 정의
- 공정별 기본 사양 정의
- 옵션별 가격 보정 정의
- 자재, 인력, 장비, 공간, 조건의 관계 정의
- 자동 견적 생성의 판단 기준 제공
- 공정표, 발주표, 인력 투입표, 내부 원가표의 기준 데이터 제공
- 향후 AI 학습과 운영 자동화의 기준 데이터 제공

즉, Master DB는 ECOREAN BOC의 기준 언어이자 운영 뼈대다.

## 2. 핵심 설계 원칙

모든 공정은 단순 항목으로 저장하지 않는다.

모든 공정은 반드시 다음 계층 구조를 가진다.

```text
대분류
-> 중분류
-> 소분류
-> 세부사양
-> 옵션
```

예시:

```text
습식공정
-> 타일
-> 욕실 바닥 타일
-> 포세린 600각
-> 덧방 / 철거 후 시공 / 난이도 상 / 줄눈 옵션
```

이 구조를 쓰는 이유는 다음과 같다.

- 같은 타일 공정이라도 공간, 자재, 시공 방식에 따라 가격이 달라진다.
- 공정은 자재, 인력, 선행공정, 후행공정과 연결되어야 한다.
- 견적은 단가표 선택이 아니라 조건 기반 계산이어야 한다.
- 향후 AI가 공정 누락, 원가 위험, 일정 충돌을 판단하려면 관계 정보가 필요하다.

## 3. 공정 데이터의 기본 단위

Master DB의 기본 단위는 `ProcessItem`이다.

하나의 `ProcessItem`은 실제 견적 라인으로 전환될 수 있는 최소 공정 단위다.

예시:

```text
WET_TILE_BATH_FLOOR
FIN_FLOOR_GANGMARU
ELE_LIGHT_DOWN
PLM_TOILET_INSTALL
CARP_CEILING_FRAME
```

## 4. 필수 구성 요소

모든 공정은 다음 구조를 가져야 한다.

```text
1. hierarchy
2. defaultSpec
3. optionGroups
4. ontologyRelation
5. triggerType
6. quantityLogic
7. priceLogic
8. scheduleLogic
9. outputPolicy
10. governance
```

## 5. hierarchy

공정의 분류 체계다.

```ts
type ProcessHierarchy = {
  majorCategory: string;
  middleCategory: string;
  minorCategory: string;
  detailCategory: string;
};
```

예시:

```json
{
  "majorCategory": "습식공정",
  "middleCategory": "타일",
  "minorCategory": "욕실 바닥 타일",
  "detailCategory": "포세린 타일"
}
```

## 6. defaultSpec

`defaultSpec`은 가장 많이 사용하는 표준 사양이다.

사용자가 세부 옵션을 선택하지 않아도 기본 견적이 생성되어야 하므로 모든 공정에는 기본값이 있어야 한다.

```ts
type DefaultSpec = {
  name: string;
  description?: string;
  unit: 'm2' | 'm' | 'ea' | 'set' | 'day' | 'ton' | 'lot';
  standardMaterial?: string;
  standardMethod?: string;
  standardThickness?: string;
  standardGrade?: string;
  standardWasteRate?: number;
  standardProductivity?: number;
};
```

설계 원칙:

- 기본값은 현장에서 가장 자주 쓰이는 사양으로 잡는다.
- 기본값만으로도 견적, 공정표, 발주표가 생성되어야 한다.
- 기본값은 Master DB 버전과 함께 관리한다.
- 기본값 변경은 과거 견적에 영향을 주면 안 된다.

## 7. optionGroups

`optionGroups`는 공정의 가격과 조건을 바꾸는 선택 요소다.

옵션은 단순 텍스트가 아니라 가격, 공정 기간, 자재, 난이도에 영향을 줄 수 있어야 한다.

```ts
type OptionGroup = {
  key: string;
  name: string;
  required: boolean;
  selectionType: 'single' | 'multiple';
  defaultOptionKey?: string;
  options: ProcessOption[];
};

type ProcessOption = {
  key: string;
  name: string;
  priceAdjustType: 'amount' | 'rate' | 'multiplier';
  laborAdjust?: number;
  materialAdjust?: number;
  equipmentAdjust?: number;
  durationAdjust?: number;
  difficultyAdjust?: number;
  description?: string;
};
```

옵션 그룹 예시:

```text
프레임
- LGS
- 목상
- 알루미늄

두께
- 9.5T
- 12.5T
- 15T

자재등급
- 기본
- 고급
- 프리미엄

시공방식
- 일반 시공
- 철거 후 시공
- 덧방 시공

난이도
- 하
- 중
- 상
```

설계 원칙:

- 옵션은 가격뿐 아니라 기간, 인력, 자재 발주에도 영향을 줄 수 있어야 한다.
- 옵션은 공정별로 다르게 정의한다.
- 사용자가 선택하지 않으면 `defaultOptionKey`를 적용한다.
- 옵션 변경 이력은 견적 스냅샷에 저장한다.

## 8. ontologyRelation

`ontologyRelation`은 공정이 다른 운영 요소와 어떻게 연결되는지 정의한다.

이 계층이 있어야 자동견적 OS가 단순 계산기가 아니라 판단 시스템이 된다.

```ts
type OntologyRelation = {
  spaces: string[];
  materials: string[];
  laborRoles: string[];
  equipment: string[];
  prerequisiteProcesses: string[];
  nextProcesses: string[];
  requiredConditions: string[];
  riskFactors: string[];
  relatedOutputs: string[];
};
```

예시:

```json
{
  "spaces": ["욕실", "다용도실", "주방"],
  "materials": ["타일", "압착시멘트", "줄눈재"],
  "laborRoles": ["타일공", "조공"],
  "equipment": ["타일커터", "레이저레벨기"],
  "prerequisiteProcesses": ["철거", "방수"],
  "nextProcesses": ["줄눈", "도기 설치"],
  "requiredConditions": ["바탕면 평활도 확인", "방수 양생 완료"],
  "riskFactors": ["구배 불량", "들뜸", "누수", "자재 파손"],
  "relatedOutputs": ["견적서", "자재발주표", "공정표", "현장체크리스트"]
}
```

설계 원칙:

- 모든 공정은 최소 1개 이상의 공간 또는 조건과 연결되어야 한다.
- 모든 공정은 필요한 인력 역할을 가져야 한다.
- 자재가 필요한 공정은 자재 Master DB와 연결되어야 한다.
- 선행공정과 후행공정은 공정표 엔진의 의존관계로 사용한다.
- 리스크 요인은 현장관리 AI와 내부 출력에 사용한다.

## 9. triggerType

`triggerType`은 공정이 견적에 포함되는 방식을 의미한다.

```ts
type TriggerType = 'AUTO' | 'SELECT' | 'QTY' | 'CONDITIONAL';
```

### AUTO

조건이 충족되면 자동으로 포함되는 공정이다.

예시:

```text
욕실 바닥 타일 선택
-> 방수 공정 자동 포함
```

### SELECT

사용자가 명시적으로 선택해야 포함되는 공정이다.

예시:

```text
간접조명
아트월
중문
전동 블라인드
```

### QTY

수량이 입력되면 포함되는 공정이다.

예시:

```text
콘센트 10개
도어 3개
창호 12m2
```

### CONDITIONAL

특정 조건 조합에 따라 포함되는 공정이다.

예시:

```text
3층 초과 + 엘리베이터 없음
-> 사다리차 또는 양중비 포함

주방 위치 변경
-> 급배수 이설 포함
```

설계 원칙:

- 모든 공정은 반드시 하나의 `triggerType`을 가진다.
- AUTO와 CONDITIONAL 공정은 누락 방지의 핵심이다.
- SELECT 공정은 고객 선택형 옵션에 적합하다.
- QTY 공정은 수량 입력형 항목에 적합하다.

## 10. quantityLogic

`quantityLogic`은 수량 산출 방식이다.

```ts
type QuantityLogic = {
  sourceType: 'manual' | 'spaceArea' | 'wallArea' | 'floorArea' | 'ceilingArea' | 'openingArea' | 'count' | 'formula';
  formula?: string;
  wasteRate?: number;
  minQuantity?: number;
  roundingRule?: 'none' | 'ceil' | 'floor' | 'round';
};
```

예시:

```text
바닥 마감 = 공간 바닥면적 * 할증률
벽 도배 = 벽면적 - 창호면적 + 할증률
도어 = 입력 수량
폐기물 = 철거 면적 기반 추정 공식
```

## 11. priceLogic

`priceLogic`은 최종 단가를 계산하는 구조다.

모든 공정은 아래 항목을 가진다.

```ts
type PriceLogic = {
  basePrice: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  optionAdjust: PriceAdjustmentRule[];
  difficultyAdjust: PriceAdjustmentRule[];
  regionAdjust?: PriceAdjustmentRule[];
  finalPriceFormula: string;
};

type PriceAdjustmentRule = {
  key: string;
  name: string;
  adjustType: 'amount' | 'rate' | 'multiplier';
  target: 'basePrice' | 'laborCost' | 'materialCost' | 'equipmentCost' | 'finalPrice';
  value: number;
};
```

기본 계산식:

```text
baseCost = laborCost + materialCost + equipmentCost
adjustedCost = baseCost + optionAdjust + difficultyAdjust + regionAdjust
finalPrice = adjustedCost * marginMultiplier
```

설계 원칙:

- `basePrice`만 저장하고 끝내지 않는다.
- 노무비, 자재비, 장비비는 분리한다.
- 옵션 보정과 난이도 보정은 계산 과정에서 분리 기록한다.
- 최종 단가는 왜 그렇게 나왔는지 추적 가능해야 한다.
- 견적 생성 시점의 계산 결과는 스냅샷으로 저장한다.

## 12. scheduleLogic

공정은 견적 금액뿐 아니라 공정표 생성에도 사용되어야 한다.

```ts
type ScheduleLogic = {
  defaultDuration: number;
  productivityUnitPerDay?: number;
  minDuration?: number;
  maxCrewPerDay?: number;
  requiredCrew: LaborRequirement[];
  dependencies: string[];
  canOverlapWith: string[];
  cannotOverlapWith: string[];
  curingTimeDays?: number;
};

type LaborRequirement = {
  role: string;
  count: number;
};
```

예시:

```text
방수
- 선행: 철거, 바탕정리
- 후행: 타일
- 양생기간: 1일
- 필요 인력: 방수공 1명
```

## 13. outputPolicy

공정마다 고객용 출력과 내부용 출력 노출 방식을 분리한다.

```ts
type OutputPolicy = {
  showInCustomerEstimate: boolean;
  customerDisplayName?: string;
  customerGroupName?: string;
  showInInternalCostSheet: boolean;
  showInMaterialOrderSheet: boolean;
  showInLaborPlan: boolean;
  showInSchedule: boolean;
  showRiskInternally: boolean;
};
```

설계 원칙:

- 고객용 출력에는 내부 원가와 마진을 노출하지 않는다.
- 내부용 출력에는 원가, 마진, 리스크, 발주, 인력을 모두 노출한다.
- 고객용 항목명과 내부 항목명은 다를 수 있다.

## 14. governance

Master DB는 운영 자산이므로 변경 이력이 필요하다.

```ts
type Governance = {
  version: string;
  status: 'draft' | 'active' | 'deprecated';
  effectiveFrom: string;
  effectiveTo?: string;
  createdBy: string;
  approvedBy?: string;
  changeReason?: string;
};
```

설계 원칙:

- Master DB는 버전 관리한다.
- 견적은 생성 시점의 Master DB 버전을 저장한다.
- 단가 변경은 과거 견적을 바꾸지 않는다.
- 공정 추가/수정/폐기는 승인 흐름을 둔다.

## 15. 공정 Master DB 전체 스키마

```ts
type ProcessItem = {
  code: string;
  name: string;
  hierarchy: ProcessHierarchy;
  defaultSpec: DefaultSpec;
  optionGroups: OptionGroup[];
  ontologyRelation: OntologyRelation;
  triggerType: TriggerType;
  quantityLogic: QuantityLogic;
  priceLogic: PriceLogic;
  scheduleLogic: ScheduleLogic;
  outputPolicy: OutputPolicy;
  governance: Governance;
};
```

## 16. 예시: 욕실 바닥 타일 공정

```json
{
  "code": "WET_TILE_BATH_FLOOR",
  "name": "욕실 바닥 타일",
  "hierarchy": {
    "majorCategory": "습식공정",
    "middleCategory": "타일",
    "minorCategory": "욕실 바닥 타일",
    "detailCategory": "포세린 타일"
  },
  "defaultSpec": {
    "name": "포세린 600각 일반 시공",
    "unit": "m2",
    "standardMaterial": "포세린 타일",
    "standardMethod": "압착 시공",
    "standardGrade": "기본",
    "standardWasteRate": 0.08,
    "standardProductivity": 12
  },
  "optionGroups": [
    {
      "key": "tile_grade",
      "name": "자재등급",
      "required": true,
      "selectionType": "single",
      "defaultOptionKey": "standard",
      "options": [
        {
          "key": "standard",
          "name": "기본",
          "priceAdjustType": "amount",
          "materialAdjust": 0
        },
        {
          "key": "premium",
          "name": "프리미엄",
          "priceAdjustType": "rate",
          "materialAdjust": 0.25
        }
      ]
    },
    {
      "key": "install_method",
      "name": "시공방식",
      "required": true,
      "selectionType": "single",
      "defaultOptionKey": "standard_install",
      "options": [
        {
          "key": "standard_install",
          "name": "일반 시공",
          "priceAdjustType": "amount",
          "laborAdjust": 0
        },
        {
          "key": "after_demolition",
          "name": "철거 후 시공",
          "priceAdjustType": "rate",
          "laborAdjust": 0.15,
          "durationAdjust": 0.5
        }
      ]
    }
  ],
  "ontologyRelation": {
    "spaces": ["욕실"],
    "materials": ["포세린 타일", "압착시멘트", "줄눈재"],
    "laborRoles": ["타일공", "조공"],
    "equipment": ["타일커터", "레이저레벨기"],
    "prerequisiteProcesses": ["WET_WATERPROOF_BATH_FLOOR"],
    "nextProcesses": ["WET_GROUT_BATH_FLOOR", "PLM_FIXTURE_INSTALL"],
    "requiredConditions": ["방수 양생 완료", "바탕면 평활도 확인"],
    "riskFactors": ["구배 불량", "들뜸", "누수"],
    "relatedOutputs": ["견적서", "자재발주표", "공정표", "현장체크리스트"]
  },
  "triggerType": "AUTO",
  "quantityLogic": {
    "sourceType": "floorArea",
    "wasteRate": 0.08,
    "minQuantity": 1,
    "roundingRule": "ceil"
  },
  "priceLogic": {
    "basePrice": 76000,
    "laborCost": 38000,
    "materialCost": 36000,
    "equipmentCost": 2000,
    "optionAdjust": [],
    "difficultyAdjust": [],
    "finalPriceFormula": "(laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust) * marginMultiplier"
  },
  "scheduleLogic": {
    "defaultDuration": 1,
    "productivityUnitPerDay": 12,
    "minDuration": 1,
    "maxCrewPerDay": 2,
    "requiredCrew": [
      {
        "role": "타일공",
        "count": 1
      },
      {
        "role": "조공",
        "count": 1
      }
    ],
    "dependencies": ["WET_WATERPROOF_BATH_FLOOR"],
    "canOverlapWith": [],
    "cannotOverlapWith": ["PLM_FIXTURE_INSTALL"],
    "curingTimeDays": 1
  },
  "outputPolicy": {
    "showInCustomerEstimate": true,
    "customerDisplayName": "욕실 바닥 타일 시공",
    "customerGroupName": "욕실공사",
    "showInInternalCostSheet": true,
    "showInMaterialOrderSheet": true,
    "showInLaborPlan": true,
    "showInSchedule": true,
    "showRiskInternally": true
  },
  "governance": {
    "version": "2026.1",
    "status": "active",
    "effectiveFrom": "2026-04-25",
    "createdBy": "ECOREAN",
    "changeReason": "초기 Master DB 설계"
  }
}
```

## 17. AI 시스템 관점의 의미

이 구조를 적용하면 AI는 단순히 “견적을 작성하는 도구”가 아니라 다음 판단을 수행할 수 있다.

- 어떤 공정이 누락되었는가
- 어떤 선행공정이 필요한가
- 어떤 자재가 자동 발주 대상인가
- 어떤 인력이 언제 필요한가
- 어떤 공정이 일정 충돌을 일으키는가
- 어떤 옵션이 원가와 마진을 악화시키는가
- 어떤 현장 조건이 리스크를 높이는가

즉, Master DB는 AI의 기억이고, 온톨로지는 AI의 판단 구조다.

