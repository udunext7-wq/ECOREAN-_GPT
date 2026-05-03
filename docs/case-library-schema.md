# Case Library Schema

## 1. 목적

Case Library는 ECOREAN 실제 현장 결과를 저장하는 시스템이다.

자동견적 OS가 학습하려면 견적 결과만 저장해서는 안 된다.

반드시 실제 결과와 오차 원인을 저장해야 한다.

## 2. Case 구조

```ts
type ProjectCase = {
  caseId: string;
  projectId: string;
  estimateId: string;
  projectName: string;
  projectType: string;
  region: string;
  buildingType: string;
  status: 'estimated' | 'contracted' | 'inProgress' | 'completed' | 'closed';
  createdAt: string;
  completedAt?: string;
  inputSnapshot: EstimateInputSnapshot;
  estimateSnapshot: EstimateResultSnapshot;
  actualResult?: ActualResult;
  varianceReport?: VarianceReport;
  approvalLogs: ApprovalLog[];
};
```

## 3. EstimateInputSnapshot

```ts
type EstimateInputSnapshot = {
  masterDbVersion: string;
  spaces: SpaceInput[];
  selectedProcesses: string[];
  selectedOptions: Record<string, string | string[]>;
  siteConditions: string[];
  priceBasis: 'officialPrice' | 'supplierPrice' | 'marketPrice' | 'internalPrice' | 'manualOverride';
};
```

## 4. EstimateResultSnapshot

```ts
type EstimateResultSnapshot = {
  customerEstimateTotal: number | 'NEEDS_RESEARCH';
  internalCostTotal: number | 'NEEDS_RESEARCH';
  expectedLaborCost: number | 'NEEDS_RESEARCH';
  expectedMaterialCost: number | 'NEEDS_RESEARCH';
  expectedAccessoryCost: number | 'NEEDS_RESEARCH';
  expectedEquipmentCost: number | 'NEEDS_RESEARCH';
  expectedWasteCost: number | 'NEEDS_RESEARCH';
  expectedLogisticsCost: number | 'NEEDS_RESEARCH';
  expectedMargin: number | 'NEEDS_RESEARCH';
  expectedMarginRate: number | 'NEEDS_RESEARCH';
  expectedDurationDays: number | 'NEEDS_RESEARCH';
  processAggregationResults: ProcessAggregationResult[];
};
```

## 5. ProcessAggregationResult

공정 중심 통합 계산 결과를 저장한다.

```ts
type ProcessAggregationResult = {
  processCode: string;
  crewType: string;
  appliedSpaces: string[];
  rawQuantity: number;
  weightedQuantity: number;
  minimumLaborApplied: boolean;
  mobilizationCostApplied: boolean;
  aggregatedLaborCost: number | 'NEEDS_RESEARCH';
  materialCostBySpace: Record<string, number | 'NEEDS_RESEARCH'>;
  accessoryCostBySpace: Record<string, number | 'NEEDS_RESEARCH'>;
  customerDistribution: Record<string, number | 'NEEDS_RESEARCH'>;
};
```

## 6. ActualResult

```ts
type ActualResult = {
  actualResultId: string;
  contractAmount: number;
  actualLaborCost: number;
  actualMaterialCost: number;
  actualAccessoryCost: number;
  actualEquipmentCost: number;
  actualWasteCost: number;
  actualLogisticsCost: number;
  actualSubcontractCost?: number;
  actualExtraCost?: number;
  actualStartDate: string;
  actualEndDate: string;
  actualDurationDays: number;
  changeOrders: ChangeOrder[];
  claims: ClaimRecord[];
  reworks: ReworkRecord[];
  finalProfit: number;
  finalMarginRate: number;
};
```

## 7. VarianceReport

```ts
type VarianceReport = {
  varianceReportId: string;
  caseId: string;
  totalEstimatedCost: number;
  totalActualCost: number;
  totalCostVariance: number;
  totalCostVarianceRate: number;
  estimatedDurationDays: number;
  actualDurationDays: number;
  durationVarianceDays: number;
  expectedMarginRate: number;
  finalMarginRate: number;
  marginVariance: number;
  processVariances: ProcessVariance[];
  rootCauses: string[];
  correctionCandidates: CorrectionCandidate[];
};
```

## 8. ApprovalLog

AI나 ML이 단가/마진/표준사양/보정값 변경을 제안할 때 저장한다.

```ts
type ApprovalLog = {
  approvalId: string;
  targetType:
    | 'price'
    | 'margin'
    | 'defaultSpec'
    | 'optionGroup'
    | 'spaceFactor'
    | 'minimumLaborCharge'
    | 'rule'
    | 'mlCorrection';
  targetId: string;
  proposedBy: 'human' | 'ai' | 'ml';
  proposedChange: Record<string, unknown>;
  reason: string;
  evidenceCaseIds?: string[];
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
};
```

## 9. ML Dataset Export

Case Library는 다음 형태로 ML 학습 데이터셋을 export할 수 있어야 한다.

```ts
type MlDatasetRow = {
  caseId: string;
  projectType: string;
  region: string;
  buildingType: string;
  totalArea: number;
  processCode: string;
  appliedSpaces: string[];
  rawQuantity: number;
  weightedQuantity: number;
  minimumLaborApplied: boolean;
  crewType: string;
  priceBasis: string;
  confidenceLevel: string;
  estimatedCost: number;
  actualCost: number;
  costVarianceRate: number;
  estimatedDuration: number;
  actualDuration: number;
  finalMarginRate: number;
  claimCount: number;
  reworkCount: number;
};
```

## 10. 수집 우선순위

초기에는 다음 데이터를 반드시 수집한다.

```text
견적 입력값
선택 공정
공간별 수량
공정별 통합 인건비
사용 단가 출처
실제 자재비
실제 노무비
실제 폐기물비
실제 운반비
실제 공사 기간
추가 공사
최종 마진
오차 원인
```

