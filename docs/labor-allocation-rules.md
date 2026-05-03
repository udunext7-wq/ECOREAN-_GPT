# Labor Allocation Rules

## 1. 목적

인건비와 인력 투입은 공간별 단독 계산이 아니라 공정별 통합 품수 기준으로 계산한다.

같은 공정이 여러 공간에 적용되면 공정표에서는 묶어서 관리하고, 내부 원가표에는 공정별 통합 인건비를 표시한다.

## 2. LaborAllocation

```ts
type LaborAllocation = {
  allocationId: string;
  processId: string;
  processName: string;
  crewType: string;
  crewSize: number | 'NEEDS_RESEARCH';
  appliesToSpaces: string[];
  rawQuantity: number | 'NEEDS_RESEARCH';
  weightedQuantity: number | 'NEEDS_RESEARCH';
  crewProductivity: number | 'NEEDS_RESEARCH';
  calculatedCrewDays: number | 'NEEDS_RESEARCH';
  minimumLaborChargeApplied: boolean;
  mobilizationCostApplied: boolean;
  aggregatedLaborCost: number | 'NEEDS_RESEARCH';
  customerDistributionBasis: 'spaceQuantity' | 'weightedQuantity' | 'manualRatio';
};
```

## 3. 계산 원칙

```text
1. 공간별 수량을 수집한다.
2. 공간별 spaceFactor를 적용한다.
3. weightedQuantity를 계산한다.
4. 같은 crewType/공정은 batchingRule에 따라 묶는다.
5. crewProductivity로 필요 품수를 계산한다.
6. minimumLaborCharge를 적용한다.
7. mobilizationCost를 중복 없이 적용한다.
8. 내부 원가표에는 통합 인건비로 표시한다.
9. 고객용 견적서에는 공간별로 분배 표시한다.
```

## 4. 타일 예시

입력:

```text
욕실 타일 15㎡
주방 벽타일 5㎡
현관 바닥타일 3㎡
발코니 바닥타일 8㎡
```

공정 집계:

```text
processId: BATH_TILE 또는 TILE_PROCESS
crewType: TILE_CREW_STANDARD
rawQuantity: 31㎡
weightedQuantity: 공간별 spaceFactor 적용 후 산출
minimumLaborChargeApplied: true/false
aggregatedLaborCost: NEEDS_RESEARCH
```

고객용 분배:

```text
욕실 타일: weightedQuantity 비율로 배분
주방 벽타일: weightedQuantity 비율로 배분
현관 바닥타일: weightedQuantity 비율로 배분
발코니 바닥타일: weightedQuantity 비율로 배분
```

## 5. 최소 품수 규칙

```ts
type MinimumLaborRule = {
  processId: string;
  crewType: string;
  minimumCrewDays: number | 'NEEDS_RESEARCH';
  minimumLaborCost: number | 'NEEDS_RESEARCH';
  applyWhenQuantityBelow: number | 'NEEDS_RESEARCH';
  appliesPer: 'project' | 'process' | 'crewVisit';
};
```

주의:

```text
최소 품수는 공간별로 중복 적용하지 않는다.
공정 또는 crewVisit 기준으로 한 번만 적용한다.
```

## 6. 충돌 조건

인력 배정에서 다음을 진단한다.

```text
같은 팀이 같은 날 다른 공정에 중복 배정
crewProductivity 없이 일정 생성
minimumLaborCharge 누락
mobilizationCost 중복 적용
공간별 인건비 중복 계산
```

## 7. 출력 연결

```text
내부 원가표
인력 투입표
공정표
Calendar
현장관리표
```

