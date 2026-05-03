# ECOREAN 자재/부자재 영향 스키마 v0.2 제안안

## 1. 목적

ECOREAN 자동견적 OS의 모든 공정 DB는 주자재 단가만 저장하면 안 된다.

실제 원가와 마진 오차는 주자재보다 다음 항목에서 자주 발생한다.

- 부자재
- 소모품
- 접착재
- 보양재
- 운반비
- 양중비
- 폐기물
- 손실률
- 시공 난이도

따라서 모든 공정은 `defaultSpec`, `optionGroups`, `priceAdjust`, `laborImpact`, `materialImpact`, `durationImpact` 구조를 가져야 한다.

이 문서는 기존 Master DB 스키마에 추가할 자재/부자재 영향 구조의 기준안이다.

주의:

```text
이 문서는 스키마 v0.2 제안안이다.
실제 Master DB 스키마 반영 전 대표님 승인이 필요하다.
```

## 2. 모든 공정의 자재 구성 원칙

모든 공정은 다음 자재 계층을 가진다.

```text
주자재
부자재
접착재/고정재
소모품
보양재
운반/양중
폐기물
손실률
```

## 3. 공정 자재 영향 스키마

```ts
type ProcessMaterialProfile = {
  primaryMaterials: MaterialComponent[];
  secondaryMaterials: MaterialComponent[];
  adhesives: MaterialComponent[];
  consumables: MaterialComponent[];
  protectionMaterials: MaterialComponent[];
  logistics: LogisticsImpact;
  waste: WasteImpact;
  lossRate: LossRatePolicy;
};
```

## 4. MaterialComponent

```ts
type MaterialComponent = {
  key: string;
  name: string;
  category:
    | 'primary'
    | 'secondary'
    | 'adhesive'
    | 'consumable'
    | 'protection'
    | 'fixture'
    | 'finish';
  required: boolean;
  defaultIncluded: boolean;
  unit: 'm2' | 'm' | 'ea' | 'bag' | 'can' | 'box' | 'set' | 'roll' | 'kg' | 'liter';
  baseQtyFormula: string;
  defaultLossRate?: number;
  defaultUnitCost?: number;
  note?: string;
};
```

## 5. LogisticsImpact

```ts
type LogisticsImpact = {
  carryingMethod: 'elevator' | 'stair' | 'ladderTruck' | 'crane' | 'manual';
  baseCost: number;
  floorAdjust?: PriceAdjust[];
  weightAdjust?: PriceAdjust[];
  distanceAdjust?: PriceAdjust[];
  requiredConditions?: string[];
};
```

## 6. WasteImpact

```ts
type WasteImpact = {
  wasteType: 'tile' | 'mixed' | 'ceramic' | 'wood' | 'metal' | 'packaging' | 'general';
  baseWasteQtyFormula: string;
  disposalUnit: 'bag' | 'ton' | 'truck' | 'set';
  baseDisposalCost: number;
  difficultyAdjust?: PriceAdjust[];
};
```

## 7. LossRatePolicy

```ts
type LossRatePolicy = {
  baseLossRate: number;
  minLossRate?: number;
  maxLossRate?: number;
  adjustByMaterial?: PriceAdjust[];
  adjustByPattern?: PriceAdjust[];
  adjustBySiteDifficulty?: PriceAdjust[];
};
```

## 8. Option Impact 구조

모든 option은 단순 가격 변경이 아니라 가격, 노무, 자재, 기간에 영향을 줄 수 있어야 한다.

```ts
type ProcessOption = {
  key: string;
  name: string;
  default?: boolean;
  priceAdjust?: PriceAdjust;
  laborImpact?: LaborImpact;
  materialImpact?: MaterialImpact;
  durationImpact?: DurationImpact;
  riskImpact?: RiskImpact;
  linkedMaterials?: string[];
  linkedProcesses?: string[];
};
```

## 9. PriceAdjust

```ts
type PriceAdjust = {
  adjustType: 'amount' | 'rate' | 'multiplier';
  target:
    | 'basePrice'
    | 'laborCost'
    | 'materialCost'
    | 'equipmentCost'
    | 'logisticsCost'
    | 'wasteCost'
    | 'finalPrice';
  value: number;
  reason?: string;
};
```

## 10. LaborImpact

```ts
type LaborImpact = {
  laborCostAdjust?: PriceAdjust;
  productivityMultiplier?: number;
  requiredSkillLevel?: 'basic' | 'standard' | 'high' | 'specialist';
  additionalLaborRoles?: LaborRequirement[];
  note?: string;
};
```

## 11. MaterialImpact

```ts
type MaterialImpact = {
  materialCostAdjust?: PriceAdjust;
  addMaterials?: MaterialComponent[];
  removeMaterials?: string[];
  changeLossRate?: number;
  note?: string;
};
```

## 12. DurationImpact

```ts
type DurationImpact = {
  durationAdjustDays?: number;
  durationMultiplier?: number;
  curingTimeAdjustDays?: number;
  leadTimeAdjustDays?: number;
  note?: string;
};
```

## 13. RiskImpact

```ts
type RiskImpact = {
  addRiskFactors?: string[];
  riskLevelAdjust?: 'none' | 'low' | 'medium' | 'high';
  requiredChecklist?: string[];
};
```

## 14. 공정 전체 스키마 v0.2 제안

```ts
type ProcessItemV02 = {
  code: string;
  name: string;
  hierarchy: ProcessHierarchy;
  defaultSpec: DefaultSpec;
  materialProfile: ProcessMaterialProfile;
  optionGroups: OptionGroupV02[];
  ontologyRelation: OntologyRelation;
  triggerType: TriggerType;
  quantityLogic: QuantityLogic;
  priceLogic: PriceLogic;
  scheduleLogic: ScheduleLogic;
  orderTiming: OrderTiming;
  outputPolicy: OutputPolicy;
  governance: Governance;
};
```

## 15. 타일 공정 필수 항목

타일 공정은 모든 공정 중 원가 변동 요소가 가장 많으므로 다음 항목을 반드시 가진다.

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

## 16. 타일 공정 MaterialProfile 기준

```yaml
materialProfile:
  primaryMaterials:
    - key: tile
      name: 타일
      category: primary
      required: true
      defaultIncluded: true
      unit: m2
      baseQtyFormula: tileArea * (1 + lossRate)
      defaultLossRate: 0.08
  secondaryMaterials:
    - key: corner_bead
      name: 코너비드
      category: secondary
      required: false
      defaultIncluded: true
      unit: m
      baseQtyFormula: exposedCornerLength
    - key: leveling_clip
      name: 레벨링 클립
      category: secondary
      required: false
      defaultIncluded: false
      unit: ea
      baseQtyFormula: tileArea * clipCountPerM2
    - key: spacer
      name: 스페이서
      category: secondary
      required: false
      defaultIncluded: true
      unit: ea
      baseQtyFormula: tileArea * spacerCountPerM2
  adhesives:
    - key: tile_cement
      name: 압착시멘트
      category: adhesive
      required: true
      defaultIncluded: true
      unit: bag
      baseQtyFormula: ceil(tileArea / 4)
    - key: tile_bond
      name: 타일본드
      category: adhesive
      required: false
      defaultIncluded: false
      unit: can
      baseQtyFormula: ceil(tileArea / 5)
    - key: epoxy_bond
      name: 에폭시본드
      category: adhesive
      required: false
      defaultIncluded: false
      unit: set
      baseQtyFormula: ceil(tileArea / 5)
    - key: primer
      name: 프라이머
      category: adhesive
      required: false
      defaultIncluded: true
      unit: can
      baseQtyFormula: ceil(tileArea / 20)
  consumables:
    - key: cutting_blade
      name: 커팅날/소모품
      category: consumable
      required: true
      defaultIncluded: true
      unit: set
      baseQtyFormula: 1
    - key: silicone
      name: 실리콘
      category: finish
      required: false
      defaultIncluded: true
      unit: ea
      baseQtyFormula: ceil(edgeLength / 8)
  protectionMaterials:
    - key: floor_protection
      name: 보양재
      category: protection
      required: true
      defaultIncluded: true
      unit: set
      baseQtyFormula: 1
  logistics:
    carryingMethod: elevator
    baseCost: 30000
  waste:
    wasteType: tile
    baseWasteQtyFormula: tileArea * lossRate
    disposalUnit: bag
    baseDisposalCost: 30000
  lossRate:
    baseLossRate: 0.08
    minLossRate: 0.05
    maxLossRate: 0.18
```

## 17. 타일 optionGroups 기준

```yaml
optionGroups:
  - key: tile_type
    name: 타일 종류
    required: true
    selectionType: single
    defaultOptionKey: ceramic
    options:
      - key: ceramic
        name: 도기질 타일
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 0
      - key: porcelain
        name: 포세린 타일
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 18000
          changeLossRate: 0.1
        laborImpact:
          productivityMultiplier: 0.9
      - key: large_porcelain
        name: 대형 포세린 타일
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 42000
          changeLossRate: 0.13
          addMaterials:
            - key: leveling_clip
              name: 레벨링 클립
              category: secondary
              required: true
              defaultIncluded: true
              unit: ea
              baseQtyFormula: tileArea * clipCountPerM2
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.25
          productivityMultiplier: 0.65
          requiredSkillLevel: high
        durationImpact:
          durationMultiplier: 1.3

  - key: tile_size
    name: 타일 규격
    required: true
    selectionType: single
    defaultOptionKey: size_300_600
    options:
      - key: size_300_300
        name: 300x300
        laborImpact:
          productivityMultiplier: 1
      - key: size_300_600
        name: 300x600
        laborImpact:
          productivityMultiplier: 1
      - key: size_600_600
        name: 600x600
        materialImpact:
          changeLossRate: 0.1
        laborImpact:
          productivityMultiplier: 0.85
      - key: size_600_1200
        name: 600x1200
        materialImpact:
          changeLossRate: 0.13
        laborImpact:
          productivityMultiplier: 0.65
          requiredSkillLevel: high
        durationImpact:
          durationMultiplier: 1.25

  - key: tile_location
    name: 벽/바닥 구분
    required: true
    selectionType: single
    defaultOptionKey: wall
    options:
      - key: wall
        name: 벽
        laborImpact:
          productivityMultiplier: 1
      - key: floor
        name: 바닥
        materialImpact:
          changeLossRate: 0.1
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.08
        riskImpact:
          addRiskFactors: [구배 불량, 물고임]

  - key: adhesive_type
    name: 접착재 종류
    required: true
    selectionType: single
    defaultOptionKey: tile_cement
    options:
      - key: tile_cement
        name: 압착시멘트
        materialImpact:
          addMaterials:
            - key: tile_cement
              name: 압착시멘트
              category: adhesive
              required: true
              defaultIncluded: true
              unit: bag
              baseQtyFormula: ceil(tileArea / 4)
      - key: tile_bond
        name: 타일본드
        materialImpact:
          addMaterials:
            - key: tile_bond
              name: 타일본드
              category: adhesive
              required: true
              defaultIncluded: true
              unit: can
              baseQtyFormula: ceil(tileArea / 5)
      - key: epoxy_bond
        name: 에폭시본드
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 12000
          addMaterials:
            - key: epoxy_bond
              name: 에폭시본드
              category: adhesive
              required: true
              defaultIncluded: true
              unit: set
              baseQtyFormula: ceil(tileArea / 5)
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.08

  - key: high_performance_adhesive
    name: 아덱스급 고성능 접착재 여부
    required: true
    selectionType: single
    defaultOptionKey: no
    options:
      - key: no
        name: 일반 접착재
      - key: yes
        name: 아덱스급 고성능 접착재
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 9000
        laborImpact:
          requiredSkillLevel: standard
        riskImpact:
          addRiskFactors: [접착재 배합/오픈타임 관리 필요]

  - key: grout_type
    name: 줄눈재
    required: true
    selectionType: single
    defaultOptionKey: cement_grout
    options:
      - key: cement_grout
        name: 일반 줄눈재
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 0
      - key: epoxy_grout
        name: 에폭시 줄눈
        materialImpact:
          materialCostAdjust:
            adjustType: amount
            target: materialCost
            value: 9000
        laborImpact:
          laborCostAdjust:
            adjustType: amount
            target: laborCost
            value: 7000
          productivityMultiplier: 0.8
        durationImpact:
          durationMultiplier: 1.15

  - key: edge_finish
    name: 모서리 마감
    required: true
    selectionType: single
    defaultOptionKey: corner_bead
    options:
      - key: corner_bead
        name: 코너비드
        materialImpact:
          addMaterials:
            - key: corner_bead
              name: 코너비드
              category: secondary
              required: true
              defaultIncluded: true
              unit: m
              baseQtyFormula: exposedCornerLength
      - key: jolly_cut
        name: 졸리컷
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.18
          productivityMultiplier: 0.75
          requiredSkillLevel: high
        durationImpact:
          durationMultiplier: 1.2
        riskImpact:
          addRiskFactors: [모서리 파손, 절단 불량]

  - key: leveling_system
    name: 레벨링 클립 사용
    required: false
    selectionType: single
    defaultOptionKey: no
    options:
      - key: no
        name: 미사용
      - key: yes
        name: 사용
        materialImpact:
          addMaterials:
            - key: leveling_clip
              name: 레벨링 클립
              category: secondary
              required: true
              defaultIncluded: true
              unit: ea
              baseQtyFormula: tileArea * clipCountPerM2
        laborImpact:
          productivityMultiplier: 0.9
        riskImpact:
          addRiskFactors: [클립 제거/줄눈 전 확인 필요]

  - key: transport_lifting
    name: 운반/양중
    required: true
    selectionType: single
    defaultOptionKey: elevator
    options:
      - key: elevator
        name: 엘리베이터 양중
        priceAdjust:
          adjustType: amount
          target: logisticsCost
          value: 30000
      - key: stair_under_3f
        name: 계단 양중 3층 이하
        priceAdjust:
          adjustType: amount
          target: logisticsCost
          value: 90000
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.06
      - key: stair_over_4f
        name: 계단 양중 4층 이상
        priceAdjust:
          adjustType: amount
          target: logisticsCost
          value: 180000
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.14

  - key: install_difficulty
    name: 시공 난이도
    required: true
    selectionType: single
    defaultOptionKey: normal
    options:
      - key: easy
        name: 하
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: -0.05
      - key: normal
        name: 중
      - key: hard
        name: 상
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.15
          productivityMultiplier: 0.8
        durationImpact:
          durationMultiplier: 1.2
      - key: special
        name: 특수
        laborImpact:
          laborCostAdjust:
            adjustType: rate
            target: laborCost
            value: 0.3
          productivityMultiplier: 0.6
          requiredSkillLevel: specialist
        durationImpact:
          durationMultiplier: 1.5
```

## 18. 가격 계산 반영 원칙

타일 공정의 최종 원가는 다음 요소를 모두 포함한다.

```text
주자재비
+ 부자재비
+ 접착재비
+ 소모품비
+ 보양재비
+ 운반/양중비
+ 폐기물비
+ 손실률 반영분
+ 노무비
+ 장비비
+ 난이도 보정
```

권장 계산 순서:

```text
1. 기본 수량 산출
2. 손실률 적용
3. 주자재/부자재/접착재/소모품 수량 산출
4. 옵션별 materialImpact 적용
5. 옵션별 laborImpact 적용
6. 운반/양중비 적용
7. 폐기물비 적용
8. durationImpact 적용
9. 마진/관리비/VAT 계산
```

