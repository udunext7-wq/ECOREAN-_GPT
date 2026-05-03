# ML Readiness Plan

## 1. 목적

ECOREAN 자동견적 OS의 ML Layer는 처음부터 견적을 생성하지 않는다.

초기 ML의 목적은 다음이다.

```text
예상값과 실제값의 오차를 분석하고 보정한다.
```

즉, ML은 견적 엔진을 대체하지 않고, Rule Engine + Master DB 기반 견적 결과를 보정하는 보조 계층이다.

## 2. 개발 단계

```text
Stage 1: Rule-Based Estimate
Stage 2: Actual Result Collection
Stage 3: Variance Analysis
Stage 4: Calibration Suggestion
Stage 5: ML-Assisted Correction
Stage 6: Predictive Risk Model
Stage 7: AI Executive Recommendation
```

## 3. 반드시 저장할 데이터

견적 당시:

```text
estimateId
projectId
masterDbVersion
selectedProcesses
selectedOptions
spaceInputs
quantityResults
priceBasis
laborAggregationResult
customerEstimateTotal
internalCostTotal
expectedMargin
expectedDuration
```

실제 완료 후:

```text
actualLaborCost
actualMaterialCost
actualAccessoryCost
actualEquipmentCost
actualWasteCost
actualLogisticsCost
actualDuration
actualChangeOrders
actualFinalMargin
claimCount
reworkCount
delayReason
costOverrunReason
```

## 4. 학습용 Feature 후보

```text
projectType
region
buildingType
floor
elevatorAvailable
parkingAvailable
totalArea
spaceComposition
processList
materialGrade
tileAreaTotal
weightedTileArea
crewType
minimumLaborApplied
spaceFactorSummary
selectedOptions
priceSourceType
confidenceLevel
leadTimeDays
scheduleDensity
riskFlags
```

## 5. Target 값

```text
actualTotalCost
actualLaborCost
actualMaterialCost
actualDuration
finalMarginRate
costVarianceRate
durationVarianceDays
reworkProbability
claimProbability
```

## 6. Variance 스키마

```ts
type EstimateVarianceRecord = {
  varianceId: string;
  estimateId: string;
  caseId: string;
  processCode?: string;
  spaceType?: string;
  estimatedCost: number;
  actualCost: number;
  costVariance: number;
  costVarianceRate: number;
  estimatedDuration?: number;
  actualDuration?: number;
  durationVariance?: number;
  expectedMarginRate?: number;
  finalMarginRate?: number;
  marginVariance?: number;
  rootCause:
    | 'quantity_error'
    | 'unit_price_error'
    | 'labor_productivity_error'
    | 'missing_process'
    | 'site_condition'
    | 'change_order'
    | 'supplier_price_change'
    | 'schedule_delay'
    | 'unknown';
  correctionSuggestion?: string;
  needsApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
};
```

## 7. ML 보정값 스키마

```ts
type MlCorrectionSuggestion = {
  suggestionId: string;
  modelVersion: string;
  targetType:
    | 'price'
    | 'laborProductivity'
    | 'duration'
    | 'wasteRate'
    | 'spaceFactor'
    | 'minimumLaborCharge'
    | 'riskScore';
  targetId: string;
  currentValue: number | string;
  suggestedValue: number | string;
  confidenceScore: number;
  evidenceCaseIds: string[];
  reason: string;
  needsApproval: true;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
};
```

## 8. 승인 원칙

ML Layer는 단가, 마진, 표준사양을 직접 변경할 수 없다.

반드시 승인 로그를 거친다.

```text
ML 제안
-> 승인 대기
-> 대표님 또는 관리자 검토
-> 승인/반려
-> Master DB 반영
-> 버전 변경
```

## 9. 초기 ML 이전에 필요한 것

ML을 시작하기 전에 반드시 확보해야 할 데이터:

```text
최소 50건: 오차 리포트 수동 분석 가능
최소 100건: 보정 규칙 후보 도출 가능
최소 300건: 간단한 예측 모델 실험 가능
최소 1,000건: 공간/공정/지역별 ML 보정 가능성 증가
```

## 10. 결론

초기 목표는 딥러닝이 아니다.

초기 목표는 학습 가능한 데이터 구조를 만드는 것이다.

정확한 순서:

```text
Rule Engine
-> Case Library
-> Variance Report
-> Approval-Based Correction
-> ML Calibration
```

