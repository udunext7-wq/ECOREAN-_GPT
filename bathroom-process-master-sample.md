# ECOREAN 욕실 공정 Master DB 샘플 v0.1

## 1. 문서 목적

이 문서는 ECOREAN 자동견적 OS의 기준 공정 샘플로 `욕실 공정`을 설계한 것이다.

목표는 단순 공정 목록이 아니라, 실제 자동견적 OS에 바로 이식 가능한 수준의 Master DB 기준을 만드는 것이다.

이 문서의 욕실 공정은 다음 구조를 따른다.

```text
대분류
-> 중분류
-> 소분류
-> 세부사양
-> 옵션
```

각 공정은 다음 요소를 가진다.

- `defaultSpec`
- `optionGroups`
- `ontologyRelation`
- `triggerType`
- `quantityLogic`
- `priceLogic`
- `scheduleLogic`
- `orderTiming`
- `outputPolicy`

## 2. 기준 조건

이 샘플은 다음 기준으로 설계한다.

```text
기준 공간: 아파트 공용/부부 욕실 1개소
기준 면적: 바닥 3.3㎡ ~ 4.5㎡
기준 벽면적: 16㎡ ~ 22㎡
기준 공법: 기존 욕실 철거 후 습식 욕실 재시공
기준 자재: 국산 기본~중급 자재
기준 지역: 수도권 일반 현장
기준 층수: 엘리베이터 사용 가능
기준 출력 금액: VAT 별도
기준 단가 성격: 내부 기준 단가 v0.1
```

주의:

```text
이 문서의 단가는 Master DB 설계용 기준안이다.
대표님 승인 전까지 운영 단가로 확정하지 않는다.
현장, 지역, 거래처, 자재 브랜드, 시공팀 단가에 따라 조정해야 한다.
```

## 3. 욕실 표준 공정 흐름

욕실 전체 리모델링의 표준 흐름은 다음과 같다.

```text
1. 현장 보양
2. 기존 욕실 철거
3. 폐기물 반출
4. 배관 점검 및 이설
5. 바탕 정리
6. 방수
7. 담수 테스트 및 양생
8. 벽 타일
9. 바닥 타일
10. 줄눈
11. 천장
12. 전기/조명/환풍기
13. 도기/수전/액세서리 설치
14. 실리콘 마감
15. 검수 및 청소
```

## 4. 욕실 공정 패키지 요약

| 코드 | 대분류 | 중분류 | 소분류 | triggerType | 고객 노출 | 기준 단위 |
|---|---|---|---|---|---|---|
| BATH_PRE_PROTECT | 사전공정 | 보양 | 욕실 주변 보양 | AUTO | 내부 묶음 | set |
| BATH_DEMO_FULL | 철거공정 | 욕실철거 | 욕실 전체 철거 | SELECT | 표시 | set |
| BATH_WASTE | 철거공정 | 폐기물 | 욕실 폐기물 반출 | AUTO | 내부 묶음 | set |
| BATH_PIPE_CHECK | 설비공정 | 배관 | 급배수 점검 | AUTO | 내부 묶음 | set |
| BATH_PIPE_MOVE | 설비공정 | 배관 | 급배수 이설 | CONDITIONAL | 표시 | point |
| BATH_BASE_REPAIR | 습식공정 | 바탕 | 바탕면 정리/미장 | AUTO | 내부 묶음 | m2 |
| BATH_WATERPROOF | 습식공정 | 방수 | 욕실 2차 방수 | AUTO | 내부 묶음 | m2 |
| BATH_WATER_TEST | 습식공정 | 방수 | 담수 테스트 | AUTO | 내부 묶음 | set |
| BATH_TILE_WALL | 습식공정 | 타일 | 욕실 벽 타일 | AUTO/QTY | 표시 | m2 |
| BATH_TILE_FLOOR | 습식공정 | 타일 | 욕실 바닥 타일 | AUTO/QTY | 표시 | m2 |
| BATH_GROUT | 습식공정 | 줄눈 | 타일 줄눈 | AUTO | 내부 묶음 | m2 |
| BATH_CEILING | 천장공정 | 욕실천장 | 욕실 천장 마감 | SELECT | 표시 | set |
| BATH_ELEC | 전기공정 | 욕실전기 | 조명/스위치/환풍기 | QTY | 표시 | ea |
| BATH_TOILET | 설비공정 | 도기 | 양변기 설치 | QTY | 표시 | ea |
| BATH_BASIN | 설비공정 | 도기 | 세면대 설치 | QTY | 표시 | ea |
| BATH_SHOWER | 설비공정 | 수전 | 샤워수전 설치 | QTY | 표시 | ea |
| BATH_CABINET | 가구공정 | 욕실가구 | 욕실장/거울장 | SELECT | 표시 | ea |
| BATH_PARTITION | 금속유리공정 | 샤워파티션 | 욕실 파티션 | SELECT | 표시 | ea |
| BATH_SILICONE | 마감공정 | 실리콘 | 욕실 실리콘 마감 | AUTO | 내부 묶음 | set |
| BATH_CLEAN_QC | 준공공정 | 검수 | 욕실 청소/검수 | AUTO | 내부 묶음 | set |

## 5. 공통 optionGroups 기준

욕실 공정에서 가격 차이가 실제로 발생하는 핵심 옵션은 다음이다.

### 5.1 욕실 등급

```json
{
  "key": "bath_grade",
  "name": "욕실 등급",
  "required": true,
  "selectionType": "single",
  "defaultOptionKey": "standard",
  "options": [
    { "key": "basic", "name": "기본형", "materialAdjust": -0.08, "laborAdjust": 0 },
    { "key": "standard", "name": "표준형", "materialAdjust": 0, "laborAdjust": 0 },
    { "key": "premium", "name": "고급형", "materialAdjust": 0.25, "laborAdjust": 0.08 },
    { "key": "hotel", "name": "호텔형", "materialAdjust": 0.55, "laborAdjust": 0.18 }
  ]
}
```

### 5.2 현장 난이도

```json
{
  "key": "site_difficulty",
  "name": "현장 난이도",
  "required": true,
  "selectionType": "single",
  "defaultOptionKey": "normal",
  "options": [
    { "key": "easy", "name": "하", "difficultyAdjust": -0.03 },
    { "key": "normal", "name": "중", "difficultyAdjust": 0 },
    { "key": "hard", "name": "상", "difficultyAdjust": 0.12 },
    { "key": "very_hard", "name": "특수", "difficultyAdjust": 0.25 }
  ]
}
```

### 5.3 엘리베이터/양중 조건

```json
{
  "key": "lifting_condition",
  "name": "양중 조건",
  "required": true,
  "selectionType": "single",
  "defaultOptionKey": "elevator_available",
  "options": [
    { "key": "elevator_available", "name": "엘리베이터 사용 가능", "laborAdjust": 0, "equipmentAdjust": 0 },
    { "key": "no_elevator_low", "name": "엘리베이터 없음 3층 이하", "laborAdjust": 0.08, "equipmentAdjust": 70000 },
    { "key": "no_elevator_high", "name": "엘리베이터 없음 4층 이상", "laborAdjust": 0.18, "equipmentAdjust": 180000 }
  ]
}
```

## 6. 기준 공정 상세

### 6.1 BATH_PRE_PROTECT

```yaml
code: BATH_PRE_PROTECT
name: 욕실 주변 보양
hierarchy:
  majorCategory: 사전공정
  middleCategory: 보양
  minorCategory: 욕실 주변 보양
  detailCategory: 바닥/동선 보양
defaultSpec:
  name: 엘리베이터-복도-현관-욕실 동선 보양
  unit: set
  standardMaterial: PE필름, 보양테이프, 보양재
  standardMethod: 공용부 및 실내 이동 동선 보양
optionGroups:
  - key: protect_range
    name: 보양 범위
    defaultOptionKey: standard
    options:
      - key: minimal
        name: 욕실 앞 부분 보양
        materialAdjust: -20000
      - key: standard
        name: 욕실-현관-엘리베이터 동선 보양
        materialAdjust: 0
      - key: full
        name: 실내 전체 주요 동선 보양
        materialAdjust: 45000
        laborAdjust: 30000
ontologyRelation:
  spaces: [욕실, 현관, 복도, 엘리베이터]
  materials: [PE필름, 보양테이프, 보양재]
  laborRoles: [현장관리자, 조공]
  equipment: []
  prerequisiteProcesses: []
  nextProcesses: [BATH_DEMO_FULL]
  requiredConditions: [공용부 보양 필요 여부 확인]
  riskFactors: [공용부 손상, 민원]
  relatedOutputs: [내부원가표, 현장체크리스트]
triggerType: AUTO
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 90000
  laborCost: 50000
  materialCost: 40000
  equipmentCost: 0
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 조공
      count: 1
  dependencies: []
  canOverlapWith: []
  cannotOverlapWith: [BATH_DEMO_FULL]
orderTiming:
  orderType: site_consumable
  recommendedOrderOffsetDays: -1
  requiredBeforeProcess: BATH_PRE_PROTECT
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.2 BATH_DEMO_FULL

```yaml
code: BATH_DEMO_FULL
name: 욕실 전체 철거
hierarchy:
  majorCategory: 철거공정
  middleCategory: 욕실철거
  minorCategory: 욕실 전체 철거
  detailCategory: 타일/도기/천장/액세서리 철거
defaultSpec:
  name: 기존 욕실 전체 철거
  unit: set
  standardMethod: 벽/바닥 타일, 도기, 천장, 액세서리 철거
optionGroups:
  - key: demolition_scope
    name: 철거 범위
    defaultOptionKey: full
    options:
      - key: tile_only
        name: 타일 부분 철거
        laborAdjust: -120000
        materialAdjust: -20000
      - key: full
        name: 전체 철거
        laborAdjust: 0
      - key: full_with_bathtub
        name: 욕조 포함 전체 철거
        laborAdjust: 120000
        equipmentAdjust: 30000
      - key: concrete_chipping
        name: 바닥/벽체 까내기 포함
        laborAdjust: 220000
        equipmentAdjust: 50000
  - key: noise_limit
    name: 소음 제한
    defaultOptionKey: normal
    options:
      - key: normal
        name: 일반 작업
        laborAdjust: 0
      - key: limited_time
        name: 작업시간 제한
        laborAdjust: 80000
        durationAdjust: 0.5
ontologyRelation:
  spaces: [욕실]
  materials: []
  laborRoles: [철거공, 조공]
  equipment: [전동해머, 그라인더, 집진기]
  prerequisiteProcesses: [BATH_PRE_PROTECT]
  nextProcesses: [BATH_WASTE, BATH_PIPE_CHECK, BATH_BASE_REPAIR]
  requiredConditions: [관리사무소 공사 신고, 소음 가능 시간 확인]
  riskFactors: [매립배관 파손, 방수층 손상, 소음 민원, 폐기물 증가]
  relatedOutputs: [고객견적서, 내부원가표, 공정표, 현장체크리스트]
triggerType: SELECT
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 420000
  laborCost: 330000
  materialCost: 0
  equipmentCost: 90000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 1
  requiredCrew:
    - role: 철거공
      count: 1
    - role: 조공
      count: 1
  dependencies: [BATH_PRE_PROTECT]
  canOverlapWith: []
  cannotOverlapWith: [BATH_WATERPROOF, BATH_TILE_WALL, BATH_TILE_FLOOR]
orderTiming:
  orderType: labor_reservation
  recommendedOrderOffsetDays: -3
  requiredBeforeProcess: BATH_DEMO_FULL
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실 기존 철거
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: false
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.3 BATH_WASTE

```yaml
code: BATH_WASTE
name: 욕실 폐기물 반출
hierarchy:
  majorCategory: 철거공정
  middleCategory: 폐기물
  minorCategory: 욕실 폐기물 반출
  detailCategory: 혼합 폐기물 처리
defaultSpec:
  name: 욕실 1개소 철거 폐기물 처리
  unit: set
  standardMethod: 마대 포장 및 지정 장소 반출
optionGroups:
  - key: waste_volume
    name: 폐기물량
    defaultOptionKey: standard
    options:
      - key: small
        name: 부분 철거
        laborAdjust: -40000
        equipmentAdjust: -30000
      - key: standard
        name: 전체 철거 일반
        laborAdjust: 0
      - key: large
        name: 욕조/조적/몰탈 다량 포함
        laborAdjust: 80000
        equipmentAdjust: 90000
  - key: disposal_method
    name: 반출 방식
    defaultOptionKey: elevator
    options:
      - key: elevator
        name: 엘리베이터 반출
        laborAdjust: 0
      - key: stair
        name: 계단 반출
        laborAdjust: 90000
      - key: ladder_truck
        name: 사다리차 사용
        equipmentAdjust: 180000
ontologyRelation:
  spaces: [욕실, 현관, 공용부]
  materials: [폐기물마대]
  laborRoles: [조공]
  equipment: [운반차량, 사다리차]
  prerequisiteProcesses: [BATH_DEMO_FULL]
  nextProcesses: [BATH_BASE_REPAIR]
  requiredConditions: [폐기물 적치 장소 확인]
  riskFactors: [공용부 오염, 폐기물 초과, 반출 지연]
  relatedOutputs: [내부원가표, 공정표, 현장체크리스트]
triggerType: AUTO
quantityLogic:
  sourceType: formula
  formula: demolition_scope == full ? 1 : 0.5
  minQuantity: 1
priceLogic:
  basePrice: 230000
  laborCost: 80000
  materialCost: 20000
  equipmentCost: 130000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 조공
      count: 1
  dependencies: [BATH_DEMO_FULL]
  canOverlapWith: [BATH_PIPE_CHECK]
  cannotOverlapWith: [BATH_TILE_WALL]
orderTiming:
  orderType: disposal_booking
  recommendedOrderOffsetDays: -2
  requiredBeforeProcess: BATH_DEMO_FULL
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: false
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.4 BATH_PIPE_CHECK

```yaml
code: BATH_PIPE_CHECK
name: 욕실 급배수 점검
hierarchy:
  majorCategory: 설비공정
  middleCategory: 배관
  minorCategory: 급배수 점검
  detailCategory: 기존 배관 상태 확인
defaultSpec:
  name: 급수/배수/냄새 역류 점검
  unit: set
  standardMethod: 철거 후 노출 배관 상태 확인
optionGroups:
  - key: pipe_age
    name: 배관 노후도
    defaultOptionKey: normal
    options:
      - key: normal
        name: 일반
        laborAdjust: 0
      - key: old
        name: 노후 배관
        laborAdjust: 50000
        durationAdjust: 0.3
      - key: severe
        name: 누수/역류 의심
        laborAdjust: 90000
        durationAdjust: 0.5
ontologyRelation:
  spaces: [욕실]
  materials: [테프론, 배관부속]
  laborRoles: [설비공]
  equipment: [수압테스터]
  prerequisiteProcesses: [BATH_DEMO_FULL]
  nextProcesses: [BATH_PIPE_MOVE, BATH_WATERPROOF]
  requiredConditions: [수도 잠금 가능 여부, 배수 상태 확인]
  riskFactors: [누수, 악취, 배수 불량, 추가 배관공사]
  relatedOutputs: [내부원가표, 공정표, 현장체크리스트]
triggerType: AUTO
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 90000
  laborCost: 80000
  materialCost: 10000
  equipmentCost: 0
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 설비공
      count: 1
  dependencies: [BATH_DEMO_FULL]
  canOverlapWith: [BATH_WASTE]
  cannotOverlapWith: [BATH_WATERPROOF]
orderTiming:
  orderType: labor_reservation
  recommendedOrderOffsetDays: -3
  requiredBeforeProcess: BATH_PIPE_CHECK
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: false
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.5 BATH_PIPE_MOVE

```yaml
code: BATH_PIPE_MOVE
name: 욕실 급배수 이설
hierarchy:
  majorCategory: 설비공정
  middleCategory: 배관
  minorCategory: 급배수 이설
  detailCategory: 도기/세면대/샤워 위치 변경
defaultSpec:
  name: 급수 또는 배수 1포인트 이설
  unit: point
  standardMaterial: XL관, PB관, PVC 배관, 부속
  standardMethod: 기존 배관 연결 및 위치 변경
optionGroups:
  - key: pipe_type
    name: 이설 종류
    defaultOptionKey: supply_or_drain
    options:
      - key: supply_or_drain
        name: 급수 또는 배수 단일 이설
        laborAdjust: 0
      - key: supply_and_drain
        name: 급수+배수 동시 이설
        laborAdjust: 90000
        materialAdjust: 35000
      - key: toilet_drain
        name: 양변기 배수 위치 변경
        laborAdjust: 180000
        materialAdjust: 70000
        durationAdjust: 0.5
  - key: wall_floor_cutting
    name: 바닥/벽 까내기
    defaultOptionKey: normal
    options:
      - key: normal
        name: 일반
        laborAdjust: 0
      - key: concrete_cutting
        name: 콘크리트 까내기 포함
        laborAdjust: 160000
        equipmentAdjust: 50000
ontologyRelation:
  spaces: [욕실]
  materials: [PB관, PVC관, 엘보, 소켓, 방수부속]
  laborRoles: [설비공]
  equipment: [전동해머, 컷팅기]
  prerequisiteProcesses: [BATH_PIPE_CHECK]
  nextProcesses: [BATH_BASE_REPAIR, BATH_WATERPROOF]
  requiredConditions: [도기 위치 변경, 세면대 위치 변경, 샤워 위치 변경]
  riskFactors: [누수, 배수 구배 불량, 층간 누수, 추가 미장]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: CONDITIONAL
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 180000
  laborCost: 130000
  materialCost: 40000
  equipmentCost: 10000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 설비공
      count: 1
  dependencies: [BATH_PIPE_CHECK]
  canOverlapWith: [BATH_BASE_REPAIR]
  cannotOverlapWith: [BATH_WATERPROOF, BATH_TILE_FLOOR]
orderTiming:
  orderType: material_and_labor
  recommendedOrderOffsetDays: -3
  requiredBeforeProcess: BATH_PIPE_MOVE
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실 배관 위치 변경
  customerGroupName: 욕실 추가공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.6 BATH_BASE_REPAIR

```yaml
code: BATH_BASE_REPAIR
name: 욕실 바탕면 정리
hierarchy:
  majorCategory: 습식공정
  middleCategory: 바탕
  minorCategory: 바탕면 정리
  detailCategory: 몰탈 보수/면 정리
defaultSpec:
  name: 철거 후 벽/바닥 바탕 정리
  unit: m2
  standardMaterial: 몰탈, 프라이머
  standardMethod: 들뜸 제거, 면 보수, 구배 보정
optionGroups:
  - key: base_condition
    name: 바탕 상태
    defaultOptionKey: normal
    options:
      - key: good
        name: 양호
        laborAdjust: -3000
        materialAdjust: -1000
      - key: normal
        name: 일반
        laborAdjust: 0
      - key: poor
        name: 불량/면 보수 많음
        laborAdjust: 8000
        materialAdjust: 3000
      - key: slope_repair
        name: 바닥 구배 재시공
        laborAdjust: 16000
        materialAdjust: 8000
ontologyRelation:
  spaces: [욕실]
  materials: [몰탈, 프라이머]
  laborRoles: [미장공, 조공]
  equipment: [레벨기]
  prerequisiteProcesses: [BATH_DEMO_FULL, BATH_WASTE]
  nextProcesses: [BATH_WATERPROOF]
  requiredConditions: [바탕면 들뜸 확인, 배수구 구배 확인]
  riskFactors: [타일 들뜸, 구배 불량, 방수 하자]
  relatedOutputs: [내부원가표, 자재발주표, 공정표, 현장체크리스트]
triggerType: AUTO
quantityLogic:
  sourceType: formula
  formula: floorArea + damagedWallArea
  wasteRate: 0.05
  roundingRule: ceil
priceLogic:
  basePrice: 23000
  laborCost: 15000
  materialCost: 7000
  equipmentCost: 1000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  productivityUnitPerDay: 20
  requiredCrew:
    - role: 미장공
      count: 1
  dependencies: [BATH_DEMO_FULL]
  canOverlapWith: [BATH_PIPE_MOVE]
  cannotOverlapWith: [BATH_WATERPROOF]
orderTiming:
  orderType: material
  recommendedOrderOffsetDays: -2
  requiredBeforeProcess: BATH_BASE_REPAIR
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.7 BATH_WATERPROOF

```yaml
code: BATH_WATERPROOF
name: 욕실 방수
hierarchy:
  majorCategory: 습식공정
  middleCategory: 방수
  minorCategory: 욕실 바닥/벽 방수
  detailCategory: 액체방수 1차 + 도막방수 2차
defaultSpec:
  name: 욕실 바닥 전체 및 벽체 하부 방수
  unit: m2
  standardMaterial: 액체방수재, 우레탄/도막방수재
  standardMethod: 바닥 전체 + 벽체 하부 300~600mm
  standardWasteRate: 0.08
optionGroups:
  - key: waterproof_range
    name: 방수 범위
    defaultOptionKey: floor_wall_low
    options:
      - key: floor_only
        name: 바닥 방수
        laborAdjust: -6000
        materialAdjust: -4000
      - key: floor_wall_low
        name: 바닥 + 벽체 하부
        laborAdjust: 0
      - key: full_wall
        name: 바닥 + 벽 전체 방수
        laborAdjust: 12000
        materialAdjust: 9000
  - key: waterproof_method
    name: 방수 방식
    defaultOptionKey: liquid_coating
    options:
      - key: liquid_coating
        name: 액체방수 + 도막방수
        laborAdjust: 0
      - key: urethane_plus
        name: 우레탄 보강
        laborAdjust: 6000
        materialAdjust: 9000
      - key: sheet_waterproof
        name: 시트방수
        laborAdjust: 18000
        materialAdjust: 16000
ontologyRelation:
  spaces: [욕실]
  materials: [방수재, 프라이머, 보강테이프]
  laborRoles: [방수공]
  equipment: [롤러, 헤라]
  prerequisiteProcesses: [BATH_BASE_REPAIR, BATH_PIPE_MOVE]
  nextProcesses: [BATH_WATER_TEST, BATH_TILE_WALL, BATH_TILE_FLOOR]
  requiredConditions: [바탕면 건조, 배수구 주변 보강]
  riskFactors: [누수, 양생 부족, 코너부 방수 미흡]
  relatedOutputs: [내부원가표, 자재발주표, 공정표, 현장체크리스트]
triggerType: AUTO
quantityLogic:
  sourceType: formula
  formula: floorArea + wallLowerWaterproofArea
  wasteRate: 0.08
  minQuantity: 5
  roundingRule: ceil
priceLogic:
  basePrice: 39000
  laborCost: 21000
  materialCost: 17000
  equipmentCost: 1000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 1
  productivityUnitPerDay: 15
  curingTimeDays: 1
  requiredCrew:
    - role: 방수공
      count: 1
  dependencies: [BATH_BASE_REPAIR]
  canOverlapWith: []
  cannotOverlapWith: [BATH_TILE_WALL, BATH_TILE_FLOOR]
orderTiming:
  orderType: material_and_labor
  recommendedOrderOffsetDays: -3
  requiredBeforeProcess: BATH_WATERPROOF
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.8 BATH_WATER_TEST

```yaml
code: BATH_WATER_TEST
name: 욕실 담수 테스트
hierarchy:
  majorCategory: 습식공정
  middleCategory: 방수
  minorCategory: 담수 테스트
  detailCategory: 방수층 누수 확인
defaultSpec:
  name: 방수 후 담수 및 누수 확인
  unit: set
  standardMethod: 배수구 막음 후 담수 상태 확인
optionGroups:
  - key: test_duration
    name: 테스트 기간
    defaultOptionKey: standard
    options:
      - key: short
        name: 단기 확인
        laborAdjust: -20000
      - key: standard
        name: 표준 24시간 확인
        laborAdjust: 0
      - key: extended
        name: 48시간 확인
        laborAdjust: 40000
        durationAdjust: 1
ontologyRelation:
  spaces: [욕실]
  materials: [배수구 마개]
  laborRoles: [현장관리자]
  equipment: []
  prerequisiteProcesses: [BATH_WATERPROOF]
  nextProcesses: [BATH_TILE_WALL, BATH_TILE_FLOOR]
  requiredConditions: [방수 양생 완료]
  riskFactors: [누수 미확인, 하자 재시공]
  relatedOutputs: [공정표, 현장체크리스트]
triggerType: AUTO
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 60000
  laborCost: 55000
  materialCost: 5000
  equipmentCost: 0
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 1
  requiredCrew:
    - role: 현장관리자
      count: 1
  dependencies: [BATH_WATERPROOF]
  canOverlapWith: []
  cannotOverlapWith: [BATH_TILE_FLOOR]
orderTiming:
  orderType: checklist
  recommendedOrderOffsetDays: 0
  requiredBeforeProcess: BATH_TILE_FLOOR
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: false
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.9 BATH_TILE_WALL

```yaml
code: BATH_TILE_WALL
name: 욕실 벽 타일
hierarchy:
  majorCategory: 습식공정
  middleCategory: 타일
  minorCategory: 욕실 벽 타일
  detailCategory: 도기질/포세린 벽 타일
defaultSpec:
  name: 국산 300x600 벽 타일 압착 시공
  unit: m2
  standardMaterial: 국산 벽타일
  standardMethod: 압착 시공
  standardGrade: 표준형
  standardWasteRate: 0.08
  standardProductivity: 12
optionGroups:
  - key: tile_material
    name: 타일 재질
    defaultOptionKey: ceramic_300_600
    options:
      - key: ceramic_300_600
        name: 국산 도기질 300x600
        materialAdjust: 0
      - key: porcelain_600
        name: 포세린 600각
        materialAdjust: 18000
        laborAdjust: 8000
      - key: large_slab
        name: 대형 타일 600x1200 이상
        materialAdjust: 42000
        laborAdjust: 22000
        durationAdjust: 0.5
      - key: imported
        name: 수입 타일
        materialAdjust: 55000
        laborAdjust: 15000
  - key: install_method
    name: 시공 방식
    defaultOptionKey: adhesive
    options:
      - key: adhesive
        name: 압착 시공
        laborAdjust: 0
      - key: overlay
        name: 덧방 시공
        laborAdjust: -6000
        materialAdjust: -2000
      - key: mortar_bed
        name: 떠붙임/몰탈 보강
        laborAdjust: 18000
        materialAdjust: 9000
ontologyRelation:
  spaces: [욕실]
  materials: [벽타일, 압착시멘트, 타일본드, 코너비드]
  laborRoles: [타일공, 조공]
  equipment: [타일커터, 레이저레벨기]
  prerequisiteProcesses: [BATH_WATER_TEST]
  nextProcesses: [BATH_GROUT, BATH_CEILING, BATH_TOILET, BATH_BASIN]
  requiredConditions: [방수 양생 완료, 바탕면 평활도 확인]
  riskFactors: [타일 들뜸, 줄눈 불량, 자재 파손, 수직수평 불량]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: AUTO
quantityLogic:
  sourceType: wallArea
  wasteRate: 0.08
  minQuantity: 12
  roundingRule: ceil
priceLogic:
  basePrice: 78000
  laborCost: 39000
  materialCost: 37000
  equipmentCost: 2000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 1.5
  productivityUnitPerDay: 12
  requiredCrew:
    - role: 타일공
      count: 1
    - role: 조공
      count: 1
  dependencies: [BATH_WATER_TEST]
  canOverlapWith: []
  cannotOverlapWith: [BATH_TOILET, BATH_BASIN, BATH_SHOWER]
orderTiming:
  orderType: material_and_labor
  recommendedOrderOffsetDays: -5
  requiredBeforeProcess: BATH_TILE_WALL
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실 벽 타일 시공
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.10 BATH_TILE_FLOOR

```yaml
code: BATH_TILE_FLOOR
name: 욕실 바닥 타일
hierarchy:
  majorCategory: 습식공정
  middleCategory: 타일
  minorCategory: 욕실 바닥 타일
  detailCategory: 미끄럼방지 바닥 타일
defaultSpec:
  name: 국산 미끄럼방지 300각 바닥 타일
  unit: m2
  standardMaterial: 국산 바닥 타일
  standardMethod: 구배 맞춤 압착 시공
  standardWasteRate: 0.1
  standardProductivity: 8
optionGroups:
  - key: floor_tile_material
    name: 바닥 타일 재질
    defaultOptionKey: non_slip_300
    options:
      - key: non_slip_300
        name: 국산 미끄럼방지 300각
        materialAdjust: 0
      - key: porcelain_600
        name: 포세린 600각
        materialAdjust: 22000
        laborAdjust: 12000
      - key: premium_non_slip
        name: 고급 논슬립 타일
        materialAdjust: 35000
        laborAdjust: 8000
  - key: slope_difficulty
    name: 구배 난이도
    defaultOptionKey: normal
    options:
      - key: normal
        name: 일반 구배
        laborAdjust: 0
      - key: linear_drain
        name: 라인 유가
        laborAdjust: 35000
        materialAdjust: 45000
      - key: poor_slope_repair
        name: 구배 재조정
        laborAdjust: 65000
        materialAdjust: 25000
ontologyRelation:
  spaces: [욕실]
  materials: [바닥타일, 압착시멘트, 줄눈재, 유가]
  laborRoles: [타일공, 조공]
  equipment: [타일커터, 레이저레벨기]
  prerequisiteProcesses: [BATH_WATER_TEST]
  nextProcesses: [BATH_GROUT, BATH_TOILET, BATH_BASIN, BATH_SHOWER]
  requiredConditions: [방수 완료, 배수구 위치 확인, 구배 확인]
  riskFactors: [구배 불량, 물고임, 타일 들뜸, 누수]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: AUTO
quantityLogic:
  sourceType: floorArea
  wasteRate: 0.1
  minQuantity: 3
  roundingRule: ceil
priceLogic:
  basePrice: 85000
  laborCost: 44000
  materialCost: 39000
  equipmentCost: 2000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 1
  productivityUnitPerDay: 8
  curingTimeDays: 1
  requiredCrew:
    - role: 타일공
      count: 1
    - role: 조공
      count: 1
  dependencies: [BATH_WATER_TEST]
  canOverlapWith: []
  cannotOverlapWith: [BATH_TOILET, BATH_BASIN, BATH_SHOWER]
orderTiming:
  orderType: material_and_labor
  recommendedOrderOffsetDays: -5
  requiredBeforeProcess: BATH_TILE_FLOOR
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실 바닥 타일 시공
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.11 BATH_GROUT

```yaml
code: BATH_GROUT
name: 욕실 줄눈
hierarchy:
  majorCategory: 습식공정
  middleCategory: 줄눈
  minorCategory: 욕실 타일 줄눈
  detailCategory: 시멘트/에폭시 줄눈
defaultSpec:
  name: 기본 시멘트 줄눈
  unit: m2
  standardMaterial: 줄눈재
  standardMethod: 벽/바닥 타일 줄눈 충진
optionGroups:
  - key: grout_type
    name: 줄눈 종류
    defaultOptionKey: cement
    options:
      - key: cement
        name: 기본 시멘트 줄눈
        materialAdjust: 0
      - key: epoxy
        name: 에폭시 줄눈
        materialAdjust: 9000
        laborAdjust: 7000
      - key: premium_color
        name: 컬러/프리미엄 줄눈
        materialAdjust: 14000
        laborAdjust: 11000
ontologyRelation:
  spaces: [욕실]
  materials: [줄눈재, 에폭시줄눈재]
  laborRoles: [타일공]
  equipment: [헤라, 스펀지]
  prerequisiteProcesses: [BATH_TILE_WALL, BATH_TILE_FLOOR]
  nextProcesses: [BATH_TOILET, BATH_BASIN, BATH_SHOWER, BATH_SILICONE]
  requiredConditions: [타일 접착 양생]
  riskFactors: [오염, 백화, 곰팡이, 줄눈 탈락]
  relatedOutputs: [내부원가표, 자재발주표, 공정표]
triggerType: AUTO
quantityLogic:
  sourceType: formula
  formula: wallTileArea + floorTileArea
  wasteRate: 0.05
  roundingRule: ceil
priceLogic:
  basePrice: 13000
  laborCost: 8000
  materialCost: 5000
  equipmentCost: 0
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 타일공
      count: 1
  dependencies: [BATH_TILE_WALL, BATH_TILE_FLOOR]
  canOverlapWith: [BATH_CEILING]
  cannotOverlapWith: [BATH_SILICONE]
orderTiming:
  orderType: material
  recommendedOrderOffsetDays: -3
  requiredBeforeProcess: BATH_GROUT
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.12 BATH_CEILING

```yaml
code: BATH_CEILING
name: 욕실 천장 마감
hierarchy:
  majorCategory: 천장공정
  middleCategory: 욕실천장
  minorCategory: 천장 마감
  detailCategory: SMC/알루미늄/리빙보드 천장
defaultSpec:
  name: SMC 욕실 천장
  unit: set
  standardMaterial: SMC 천장재, 점검구
  standardMethod: 기존 천장 철거 후 신규 설치
optionGroups:
  - key: ceiling_material
    name: 천장재
    defaultOptionKey: smc
    options:
      - key: smc
        name: SMC 천장
        materialAdjust: 0
      - key: aluminum
        name: 알루미늄 천장
        materialAdjust: 90000
        laborAdjust: 30000
      - key: waterproof_board
        name: 방수 리빙보드
        materialAdjust: 130000
        laborAdjust: 60000
  - key: lighting_design
    name: 조명 연계
    defaultOptionKey: basic_light
    options:
      - key: basic_light
        name: 기본 방습등
        materialAdjust: 0
      - key: downlight
        name: 매입등 2~3구
        materialAdjust: 60000
        laborAdjust: 30000
      - key: indirect
        name: 간접조명 포함
        materialAdjust: 160000
        laborAdjust: 120000
        durationAdjust: 0.5
ontologyRelation:
  spaces: [욕실]
  materials: [SMC천장재, 점검구, 천장틀]
  laborRoles: [천장공, 전기공]
  equipment: [절단기]
  prerequisiteProcesses: [BATH_TILE_WALL]
  nextProcesses: [BATH_ELEC, BATH_CLEAN_QC]
  requiredConditions: [환풍기 위치, 점검구 위치, 전기 배선 확인]
  riskFactors: [점검구 누락, 환풍기 간섭, 천장 처짐]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: SELECT
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 330000
  laborCost: 130000
  materialCost: 190000
  equipmentCost: 10000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 천장공
      count: 1
  dependencies: [BATH_TILE_WALL]
  canOverlapWith: [BATH_GROUT]
  cannotOverlapWith: []
orderTiming:
  orderType: material_and_labor
  recommendedOrderOffsetDays: -4
  requiredBeforeProcess: BATH_CEILING
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실 천장 마감
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.13 BATH_ELEC

```yaml
code: BATH_ELEC
name: 욕실 전기/조명/환풍기
hierarchy:
  majorCategory: 전기공정
  middleCategory: 욕실전기
  minorCategory: 조명/환풍기/스위치
  detailCategory: 방습등 및 환풍기 설치
defaultSpec:
  name: 방습등 1개 + 환풍기 1개 + 스위치 정리
  unit: ea
  standardMaterial: 방습등, 환풍기, 배선부속
  standardMethod: 기존 배선 활용 및 기구 교체
optionGroups:
  - key: electric_item
    name: 전기 항목
    defaultOptionKey: bath_light
    options:
      - key: bath_light
        name: 방습등
        materialAdjust: 0
        laborAdjust: 0
      - key: ventilation_fan
        name: 환풍기
        materialAdjust: 65000
        laborAdjust: 35000
      - key: downlight_each
        name: 매입등 1구
        materialAdjust: 25000
        laborAdjust: 22000
      - key: outlet_waterproof
        name: 방우 콘센트
        materialAdjust: 18000
        laborAdjust: 25000
  - key: wiring_condition
    name: 배선 상태
    defaultOptionKey: existing
    options:
      - key: existing
        name: 기존 배선 활용
        laborAdjust: 0
      - key: new_wiring
        name: 신규 배선
        laborAdjust: 45000
        materialAdjust: 12000
ontologyRelation:
  spaces: [욕실]
  materials: [방습등, 환풍기, 전선, 스위치, 방우콘센트]
  laborRoles: [전기공]
  equipment: [테스터기]
  prerequisiteProcesses: [BATH_CEILING]
  nextProcesses: [BATH_CLEAN_QC]
  requiredConditions: [전원 차단, 방수 등급 확인]
  riskFactors: [누전, 환기 부족, 결로, 스위치 간섭]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: QTY
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 95000
  laborCost: 35000
  materialCost: 55000
  equipmentCost: 5000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 전기공
      count: 1
  dependencies: [BATH_CEILING]
  canOverlapWith: [BATH_TOILET, BATH_BASIN]
  cannotOverlapWith: []
orderTiming:
  orderType: material_and_labor
  recommendedOrderOffsetDays: -4
  requiredBeforeProcess: BATH_ELEC
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실 전기/조명/환풍기
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.14 BATH_TOILET

```yaml
code: BATH_TOILET
name: 양변기 설치
hierarchy:
  majorCategory: 설비공정
  middleCategory: 도기
  minorCategory: 양변기
  detailCategory: 투피스/원피스/비데일체형
defaultSpec:
  name: 국산 투피스 양변기 설치
  unit: ea
  standardMaterial: 투피스 양변기, 정심, 앵글밸브
  standardMethod: 기존 위치 기준 설치
optionGroups:
  - key: toilet_grade
    name: 양변기 등급
    defaultOptionKey: two_piece
    options:
      - key: two_piece
        name: 국산 투피스
        materialAdjust: 0
      - key: one_piece
        name: 국산 원피스
        materialAdjust: 180000
        laborAdjust: 10000
      - key: smart_toilet
        name: 비데일체형/스마트 양변기
        materialAdjust: 520000
        laborAdjust: 35000
  - key: toilet_position
    name: 위치 조건
    defaultOptionKey: existing
    options:
      - key: existing
        name: 기존 위치
        laborAdjust: 0
      - key: flange_adjust
        name: 정심 조정
        laborAdjust: 35000
        materialAdjust: 15000
      - key: moved
        name: 배수 이설 필요
        laborAdjust: 0
        linkedProcess: BATH_PIPE_MOVE
ontologyRelation:
  spaces: [욕실]
  materials: [양변기, 정심, 앵글밸브, 백시멘트]
  laborRoles: [설비공]
  equipment: [수평계]
  prerequisiteProcesses: [BATH_GROUT]
  nextProcesses: [BATH_SILICONE, BATH_CLEAN_QC]
  requiredConditions: [바닥 타일 양생, 배수 위치 확인]
  riskFactors: [누수, 흔들림, 악취, 배수 불량]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: QTY
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 295000
  laborCost: 65000
  materialCost: 220000
  equipmentCost: 10000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.3
  requiredCrew:
    - role: 설비공
      count: 1
  dependencies: [BATH_GROUT]
  canOverlapWith: [BATH_BASIN, BATH_SHOWER]
  cannotOverlapWith: [BATH_TILE_FLOOR]
orderTiming:
  orderType: material
  recommendedOrderOffsetDays: -5
  requiredBeforeProcess: BATH_TOILET
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 양변기 설치
  customerGroupName: 도기 및 수전
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.15 BATH_BASIN

```yaml
code: BATH_BASIN
name: 세면대 설치
hierarchy:
  majorCategory: 설비공정
  middleCategory: 도기
  minorCategory: 세면대
  detailCategory: 긴다리/반다리/하부장형 세면대
defaultSpec:
  name: 국산 반다리 세면대 + 기본 수전
  unit: ea
  standardMaterial: 세면대, 수전, 트랩, 앵글밸브
  standardMethod: 기존 급배수 위치 기준 설치
optionGroups:
  - key: basin_type
    name: 세면대 종류
    defaultOptionKey: half_pedestal
    options:
      - key: full_pedestal
        name: 긴다리 세면대
        materialAdjust: -30000
      - key: half_pedestal
        name: 반다리 세면대
        materialAdjust: 0
      - key: cabinet_basin
        name: 하부장형 세면대
        materialAdjust: 260000
        laborAdjust: 40000
      - key: vessel
        name: 탑볼 세면대
        materialAdjust: 340000
        laborAdjust: 60000
  - key: faucet_grade
    name: 수전 등급
    defaultOptionKey: standard
    options:
      - key: standard
        name: 기본 수전
        materialAdjust: 0
      - key: premium
        name: 고급 수전
        materialAdjust: 90000
      - key: imported
        name: 수입 수전
        materialAdjust: 220000
ontologyRelation:
  spaces: [욕실]
  materials: [세면대, 수전, 트랩, 앵글밸브, 실리콘]
  laborRoles: [설비공]
  equipment: [수평계]
  prerequisiteProcesses: [BATH_GROUT]
  nextProcesses: [BATH_SILICONE, BATH_CLEAN_QC]
  requiredConditions: [급배수 위치 확인, 벽체 고정 가능 여부]
  riskFactors: [누수, 벽체 고정 불량, 트랩 냄새]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: QTY
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 285000
  laborCost: 70000
  materialCost: 205000
  equipmentCost: 10000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.3
  requiredCrew:
    - role: 설비공
      count: 1
  dependencies: [BATH_GROUT]
  canOverlapWith: [BATH_TOILET, BATH_SHOWER]
  cannotOverlapWith: [BATH_TILE_WALL]
orderTiming:
  orderType: material
  recommendedOrderOffsetDays: -5
  requiredBeforeProcess: BATH_BASIN
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 세면대 설치
  customerGroupName: 도기 및 수전
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.16 BATH_SHOWER

```yaml
code: BATH_SHOWER
name: 샤워수전 설치
hierarchy:
  majorCategory: 설비공정
  middleCategory: 수전
  minorCategory: 샤워수전
  detailCategory: 일반/해바라기/매립형 샤워수전
defaultSpec:
  name: 국산 일반 샤워수전 설치
  unit: ea
  standardMaterial: 샤워수전, 편심, 부속
  standardMethod: 기존 급수 위치 기준 설치
optionGroups:
  - key: shower_type
    name: 샤워수전 종류
    defaultOptionKey: standard
    options:
      - key: standard
        name: 일반 샤워수전
        materialAdjust: 0
      - key: rain_shower
        name: 해바라기 샤워수전
        materialAdjust: 160000
        laborAdjust: 35000
      - key: concealed
        name: 매립형 샤워수전
        materialAdjust: 420000
        laborAdjust: 180000
        linkedProcess: BATH_PIPE_MOVE
ontologyRelation:
  spaces: [욕실]
  materials: [샤워수전, 편심, 테프론, 실리콘]
  laborRoles: [설비공]
  equipment: []
  prerequisiteProcesses: [BATH_GROUT]
  nextProcesses: [BATH_SILICONE, BATH_CLEAN_QC]
  requiredConditions: [급수 위치 확인, 수압 확인]
  riskFactors: [누수, 수압 부족, 수전 간섭]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: QTY
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 170000
  laborCost: 55000
  materialCost: 110000
  equipmentCost: 5000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.2
  requiredCrew:
    - role: 설비공
      count: 1
  dependencies: [BATH_GROUT]
  canOverlapWith: [BATH_TOILET, BATH_BASIN]
  cannotOverlapWith: [BATH_TILE_WALL]
orderTiming:
  orderType: material
  recommendedOrderOffsetDays: -5
  requiredBeforeProcess: BATH_SHOWER
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 샤워수전 설치
  customerGroupName: 도기 및 수전
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.17 BATH_CABINET

```yaml
code: BATH_CABINET
name: 욕실장/거울장 설치
hierarchy:
  majorCategory: 가구공정
  middleCategory: 욕실가구
  minorCategory: 욕실장
  detailCategory: 거울장/슬라이드장/하부장
defaultSpec:
  name: 기본 거울장 설치
  unit: ea
  standardMaterial: 욕실 거울장
  standardMethod: 벽체 앙카 고정
optionGroups:
  - key: cabinet_type
    name: 욕실장 종류
    defaultOptionKey: mirror_basic
    options:
      - key: mirror_basic
        name: 기본 거울장
        materialAdjust: 0
      - key: sliding_mirror
        name: 슬라이드 거울장
        materialAdjust: 120000
        laborAdjust: 15000
      - key: led_mirror
        name: LED 거울장
        materialAdjust: 220000
        laborAdjust: 45000
      - key: custom_cabinet
        name: 맞춤 욕실장
        materialAdjust: 420000
        laborAdjust: 80000
ontologyRelation:
  spaces: [욕실]
  materials: [욕실장, 앙카, 피스, 실리콘]
  laborRoles: [가구공, 설비공]
  equipment: [드릴, 수평계]
  prerequisiteProcesses: [BATH_TILE_WALL]
  nextProcesses: [BATH_SILICONE, BATH_CLEAN_QC]
  requiredConditions: [벽체 타공 가능 여부, 전기 필요 여부]
  riskFactors: [타일 파손, 고정 불량, LED 전원 누락]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: SELECT
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 160000
  laborCost: 45000
  materialCost: 110000
  equipmentCost: 5000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.2
  requiredCrew:
    - role: 가구공
      count: 1
  dependencies: [BATH_TILE_WALL]
  canOverlapWith: [BATH_TOILET, BATH_BASIN]
  cannotOverlapWith: []
orderTiming:
  orderType: material
  recommendedOrderOffsetDays: -7
  requiredBeforeProcess: BATH_CABINET
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 욕실장 설치
  customerGroupName: 욕실 액세서리
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.18 BATH_PARTITION

```yaml
code: BATH_PARTITION
name: 샤워 파티션
hierarchy:
  majorCategory: 금속유리공정
  middleCategory: 욕실파티션
  minorCategory: 샤워 파티션
  detailCategory: 강화유리 파티션
defaultSpec:
  name: 8T 투명 강화유리 고정 파티션
  unit: ea
  standardMaterial: 강화유리, 브라켓, 실리콘
  standardMethod: 바닥/벽 고정형 설치
optionGroups:
  - key: partition_type
    name: 파티션 종류
    defaultOptionKey: fixed_glass
    options:
      - key: fixed_glass
        name: 고정형 강화유리
        materialAdjust: 0
      - key: hinged_door
        name: 여닫이 샤워부스
        materialAdjust: 260000
        laborAdjust: 60000
      - key: sliding_door
        name: 슬라이딩 샤워부스
        materialAdjust: 420000
        laborAdjust: 90000
  - key: glass_spec
    name: 유리 사양
    defaultOptionKey: clear_8t
    options:
      - key: clear_8t
        name: 투명 8T
        materialAdjust: 0
      - key: bronze_8t
        name: 브론즈 8T
        materialAdjust: 70000
      - key: fluted_8t
        name: 모루유리 8T
        materialAdjust: 130000
ontologyRelation:
  spaces: [욕실]
  materials: [강화유리, 브라켓, 실리콘]
  laborRoles: [금속유리공]
  equipment: [드릴, 흡착기]
  prerequisiteProcesses: [BATH_TILE_FLOOR, BATH_TILE_WALL]
  nextProcesses: [BATH_SILICONE, BATH_CLEAN_QC]
  requiredConditions: [타일 양생 완료, 고정 위치 확인]
  riskFactors: [유리 파손, 누수, 고정 불량]
  relatedOutputs: [고객견적서, 내부원가표, 자재발주표, 공정표]
triggerType: SELECT
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 360000
  laborCost: 80000
  materialCost: 270000
  equipmentCost: 10000
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.3
  requiredCrew:
    - role: 금속유리공
      count: 1
  dependencies: [BATH_TILE_FLOOR, BATH_TILE_WALL]
  canOverlapWith: [BATH_CABINET]
  cannotOverlapWith: [BATH_TILE_FLOOR]
orderTiming:
  orderType: custom_material
  recommendedOrderOffsetDays: -10
  requiredBeforeProcess: BATH_PARTITION
outputPolicy:
  showInCustomerEstimate: true
  customerDisplayName: 샤워 파티션 설치
  customerGroupName: 욕실 액세서리
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.19 BATH_SILICONE

```yaml
code: BATH_SILICONE
name: 욕실 실리콘 마감
hierarchy:
  majorCategory: 마감공정
  middleCategory: 실리콘
  minorCategory: 욕실 실리콘
  detailCategory: 바이오 실리콘 마감
defaultSpec:
  name: 욕실 바이오 실리콘 마감
  unit: set
  standardMaterial: 바이오 실리콘
  standardMethod: 도기/수전/파티션/모서리 마감
optionGroups:
  - key: silicone_range
    name: 실리콘 범위
    defaultOptionKey: standard
    options:
      - key: standard
        name: 도기/수전/기본 모서리
        materialAdjust: 0
      - key: full
        name: 욕실 전체 코너/파티션 포함
        materialAdjust: 25000
        laborAdjust: 35000
  - key: silicone_grade
    name: 실리콘 등급
    defaultOptionKey: bio
    options:
      - key: basic
        name: 일반 실리콘
        materialAdjust: -10000
      - key: bio
        name: 바이오 실리콘
        materialAdjust: 0
      - key: premium
        name: 프리미엄 방곰팡이 실리콘
        materialAdjust: 22000
ontologyRelation:
  spaces: [욕실]
  materials: [실리콘, 마스킹테이프]
  laborRoles: [마감공]
  equipment: [실리콘건]
  prerequisiteProcesses: [BATH_TOILET, BATH_BASIN, BATH_SHOWER]
  nextProcesses: [BATH_CLEAN_QC]
  requiredConditions: [마감재 설치 완료, 표면 건조]
  riskFactors: [곰팡이, 들뜸, 누수, 마감 불량]
  relatedOutputs: [내부원가표, 자재발주표, 공정표]
triggerType: AUTO
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 90000
  laborCost: 55000
  materialCost: 35000
  equipmentCost: 0
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.3
  requiredCrew:
    - role: 마감공
      count: 1
  dependencies: [BATH_TOILET, BATH_BASIN, BATH_SHOWER]
  canOverlapWith: []
  cannotOverlapWith: [BATH_CLEAN_QC]
orderTiming:
  orderType: site_consumable
  recommendedOrderOffsetDays: -2
  requiredBeforeProcess: BATH_SILICONE
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: true
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

### 6.20 BATH_CLEAN_QC

```yaml
code: BATH_CLEAN_QC
name: 욕실 청소 및 검수
hierarchy:
  majorCategory: 준공공정
  middleCategory: 검수
  minorCategory: 욕실 청소/검수
  detailCategory: 누수/배수/작동 확인
defaultSpec:
  name: 욕실 준공 청소 및 기능 검수
  unit: set
  standardMethod: 청소, 배수 확인, 수전 작동, 환풍기 작동, 실리콘 상태 확인
optionGroups:
  - key: qc_level
    name: 검수 수준
    defaultOptionKey: standard
    options:
      - key: standard
        name: 표준 검수
        laborAdjust: 0
      - key: photo_report
        name: 사진 리포트 포함
        laborAdjust: 30000
      - key: client_walkthrough
        name: 고객 입회 검수
        laborAdjust: 60000
ontologyRelation:
  spaces: [욕실]
  materials: [청소소모품]
  laborRoles: [현장관리자, 조공]
  equipment: []
  prerequisiteProcesses: [BATH_SILICONE, BATH_ELEC]
  nextProcesses: []
  requiredConditions: [전체 공정 완료]
  riskFactors: [하자 미발견, 고객 클레임, 잔손보기]
  relatedOutputs: [현장체크리스트, 준공확인서]
triggerType: AUTO
quantityLogic:
  sourceType: count
  minQuantity: 1
priceLogic:
  basePrice: 100000
  laborCost: 80000
  materialCost: 20000
  equipmentCost: 0
  finalPriceFormula: laborCost + materialCost + equipmentCost + optionAdjust + difficultyAdjust
scheduleLogic:
  defaultDuration: 0.5
  requiredCrew:
    - role: 현장관리자
      count: 1
  dependencies: [BATH_SILICONE, BATH_ELEC]
  canOverlapWith: []
  cannotOverlapWith: []
orderTiming:
  orderType: checklist
  recommendedOrderOffsetDays: 0
  requiredBeforeProcess: BATH_CLEAN_QC
outputPolicy:
  showInCustomerEstimate: false
  customerGroupName: 욕실공사
  showInInternalCostSheet: true
  showInMaterialOrderSheet: false
  showInLaborPlan: true
  showInSchedule: true
  showRiskInternally: true
```

## 7. 고객용 출력 묶음 정책

고객 견적서에는 내부 공정 전부를 노출하지 않는다.

### 고객에게 노출할 항목

```text
욕실 기존 철거
욕실 벽 타일 시공
욕실 바닥 타일 시공
욕실 천장 마감
욕실 전기/조명/환풍기
양변기 설치
세면대 설치
샤워수전 설치
욕실장 설치
샤워 파티션 설치
욕실 배관 위치 변경
```

### 고객에게 묶어서 숨길 항목

```text
보양
폐기물 반출
급배수 점검
바탕면 정리
방수
담수 테스트
줄눈
실리콘 마감
청소 및 검수
```

숨기는 이유:

- 고객 견적서는 단순하고 이해 가능해야 한다.
- 내부 원가 통제 항목을 노출하지 않는다.
- 단, 고객 신뢰를 위해 설명 문구에는 “방수, 폐기물, 기본 마감 포함”처럼 요약 표시 가능하다.

## 8. 내부 출력 정책

내부 출력에는 모든 공정을 노출한다.

내부 출력별 연결:

| 출력물 | 포함 항목 |
|---|---|
| 내부 원가표 | 모든 공정의 laborCost, materialCost, equipmentCost |
| 공정별 마진표 | 고객 노출 공정 + 내부 묶음 공정의 마진 |
| 자재 발주표 | 타일, 방수재, 도기, 수전, 천장재, 전기기구, 파티션 |
| 인력 투입표 | 철거공, 설비공, 방수공, 타일공, 전기공, 천장공, 마감공 |
| 공정표 | 선행/후행 관계 전체 |
| 현장 체크리스트 | 방수, 담수, 배수, 전기, 실리콘, 준공 검수 |
| 리스크표 | 누수, 구배, 배관, 타일 들뜸, 소음, 파손 |

## 9. 자재 발주 시점 기준

| 자재/외주 | 기준 공정 | 권장 발주 시점 |
|---|---|---|
| 보양재 | 보양 | 공사 1일 전 |
| 폐기물 차량/마대 | 철거 | 공사 2일 전 |
| 배관 부속 | 배관 점검/이설 | 공사 3일 전 |
| 방수재 | 방수 | 방수 3일 전 |
| 타일 | 벽/바닥 타일 | 타일 시공 5일 전 |
| 줄눈재 | 줄눈 | 줄눈 3일 전 |
| 천장재 | 욕실 천장 | 천장 시공 4일 전 |
| 조명/환풍기 | 전기 | 전기 시공 4일 전 |
| 양변기/세면대/수전 | 도기 설치 | 설치 5일 전 |
| 욕실장 | 욕실장 설치 | 설치 7일 전 |
| 샤워 파티션 | 파티션 설치 | 설치 10일 전 |
| 실리콘 | 마감 | 마감 2일 전 |

## 10. 표준 공정표 기준

욕실 1개소 표준 공기:

```text
Day 1: 보양, 철거, 폐기물 반출
Day 2: 배관 점검/이설, 바탕 정리
Day 3: 방수
Day 4: 담수 테스트/양생
Day 5: 벽 타일
Day 6: 바닥 타일
Day 7: 줄눈, 천장
Day 8: 전기, 도기, 수전, 욕실장
Day 9: 파티션, 실리콘, 청소, 검수
```

단축 가능 조건:

- 배관 이설 없음
- 기본 타일
- 파티션 없음
- 자재 사전 입고 완료
- 한 팀이 연속 투입 가능

지연 위험 조건:

- 배관 이설
- 누수 이력
- 대형 타일
- 매립 수전
- 맞춤 욕실장
- 샤워부스 제작
- 관리사무소 소음 제한

## 11. 자동 트리거 규칙

```text
욕실 전체 철거 선택
-> 폐기물 반출 AUTO
-> 급배수 점검 AUTO
-> 바탕 정리 AUTO

욕실 타일 시공 포함
-> 방수 AUTO
-> 담수 테스트 AUTO
-> 줄눈 AUTO
-> 실리콘 AUTO

양변기/세면대/샤워 위치 변경
-> 급배수 이설 CONDITIONAL

매립형 샤워수전 선택
-> 급배수 이설 CONDITIONAL
-> 벽체 까내기 옵션 권장

대형 타일 선택
-> 타일 노무비 증가
-> 시공 기간 증가
-> 파손 리스크 증가

엘리베이터 없음 + 4층 이상
-> 양중비/사다리차 옵션 권장

샤워 파티션 선택
-> 제작 발주 10일 전 필요
-> 타일 시공 완료 후 실측 확인 필요
```

## 12. 기준 견적 패키지 예시

### 기본형 욕실

구성:

```text
전체 철거
기본 방수
국산 벽/바닥 타일
SMC 천장
기본 방습등/환풍기
국산 투피스 양변기
반다리 세면대
일반 샤워수전
기본 거울장
실리콘/청소/검수
```

예상 고객 공급가 범위:

```text
2,800,000원 ~ 4,000,000원
```

### 표준형 욕실

구성:

```text
전체 철거
방수 보강
국산 중급 타일
SMC 또는 알루미늄 천장
매입등/환풍기
원피스 양변기
반다리 또는 하부장형 세면대
고급 샤워수전
슬라이드 욕실장
샤워 파티션 선택 가능
```

예상 고객 공급가 범위:

```text
4,000,000원 ~ 6,500,000원
```

### 고급형 욕실

구성:

```text
전체 철거
방수 보강 또는 벽체 방수 확대
포세린/대형 타일
알루미늄 또는 리빙보드 천장
간접조명
스마트 양변기
하부장형 세면대
해바라기 또는 매립형 샤워수전
LED 거울장
샤워부스 또는 고급 파티션
```

예상 고객 공급가 범위:

```text
6,500,000원 ~ 10,000,000원 이상
```

## 13. 검수 체크리스트

욕실 공정 완료 후 반드시 확인할 항목:

```text
방수 담수 테스트 기록
바닥 구배 및 배수 상태
양변기 흔들림 여부
세면대 급배수 누수 여부
샤워수전 냉온수 방향
환풍기 작동
조명 작동
콘센트 방수커버 여부
타일 들뜸/깨짐
줄눈 누락
실리콘 마감 상태
파티션 고정 상태
욕실장 수평 및 고정
문 개폐 간섭
고객 인수 전 청소 상태
```

## 14. 향후 Master DB 반영 전 승인 필요 항목

이 문서를 실제 Master DB로 반영하기 전 대표님 승인이 필요한 항목:

```text
공정 코드 체계
공정 포함/제외 기준
defaultSpec 기준
optionGroups 기준
기준 단가
노무비/자재비/장비비 분리 기준
고객 노출 정책
발주 시점 기준
공정표 기준 일수
리스크 항목
```

## 15. v0.2 보강 원칙: 타일 공정 자재/부자재 반영

대표님 지시에 따라 욕실 타일 공정은 단순히 타일 주자재와 노무비만 계산하지 않는다.

다음 항목을 반드시 포함한다.

```text
타일 종류
타일 규격
벽/바닥 구분
접착재 종류
아덱스급 고성능 접착재 여부
압착시멘트
타일본드
에폭시본드
프라이머
방수재
줄눈재
에폭시 줄눈
코너비드
졸리컷
레벨링 클립
스페이서
실리콘
보양재
커팅날/소모품
손실률
운반/양중
폐기물
시공 난이도
```

각 항목은 다음 구조로 관리한다.

```text
defaultSpec
optionGroups
priceAdjust
laborImpact
materialImpact
durationImpact
```

상세 스키마는 `material-impact-schema.md`에 작성했다.

욕실 타일 공정의 기존 `BATH_TILE_WALL`, `BATH_TILE_FLOOR`는 v0.2 적용 시 다음 구조를 추가해야 한다.

```text
materialProfile
optionGroups.tile_type
optionGroups.tile_size
optionGroups.tile_location
optionGroups.adhesive_type
optionGroups.high_performance_adhesive
optionGroups.grout_type
optionGroups.edge_finish
optionGroups.leveling_system
optionGroups.transport_lifting
optionGroups.install_difficulty
```

주의:

```text
이 보강은 설계 기준이다.
실제 Master DB 반영 전 대표님 승인 필요.
```
