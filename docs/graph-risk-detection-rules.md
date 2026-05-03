# Graph Risk Detection Rules

## 1. 목적

3D 온톨로지 그래프는 단순 시각화가 아니라 리스크 탐지 도구로 사용한다.

그래프에서 다음 문제를 자동 강조해야 한다.

```text
누락 공정
선후행 오류
발주 누락
발주 지연 위험
결제 조건 누락
검수 누락
하자 리스크
실제 원가 오차
승인 누락
```

## 2. RiskDiagnostic

```ts
type GraphRiskDiagnostic = {
  diagnosticId: string;
  riskType:
    | 'missingProcess'
    | 'dependencyConflict'
    | 'missingPurchaseOrder'
    | 'deliveryDelayRisk'
    | 'missingPaymentMilestone'
    | 'missingInspection'
    | 'defectRisk'
    | 'costVariance'
    | 'approvalMissing';
  severity: 'info' | 'warning' | 'blocking';
  relatedNodeIds: string[];
  relatedLinkIds: string[];
  message: string;
  recommendedAction: string;
  needsApproval: boolean;
};
```

## 3. 리스크 탐지 규칙

### 누락 공정

```text
타일 공정이 있는데 방수 공정이 없으면 blocking.
도기 설치가 있는데 설비 배관 점검이 없으면 warning.
샤워부스가 있는데 타일 완료/실측 조건이 없으면 warning.
```

### 선후행 오류

```text
타일이 방수검수보다 먼저 배치되면 blocking.
도기 설치가 타일보다 먼저 배치되면 blocking.
실리콘이 도기/수전 설치 전 배치되면 warning.
```

### 발주 누락

```text
자재가 필요한 공정인데 PurchaseOrder 노드가 없으면 warning.
leadTimeDays가 NEEDS_RESEARCH인데 실제 일정이 생성되면 warning.
입고 예정일이 공정 시작일보다 늦으면 blocking.
```

### 결제 조건 누락

```text
계약은 있는데 PaymentMilestone이 없으면 blocking.
잔금 조건이 있는데 고객 인도/준공검수 노드가 없으면 warning.
중도금 조건이 있는데 연결 공정이 없으면 warning.
```

### 하자 리스크

```text
하자 발생률이 높은 공정은 Risk 노드를 강조.
방수/타일/설비 공정은 검수 노드 없을 때 warning.
실제 Case에서 반복 하자가 발생한 공정은 risk 표시.
```

### 실제 원가 오차

```text
actualCost가 estimatedCost보다 설정 기준 이상 높으면 warning.
반복 오차가 발생하면 Master DB Update Candidate 생성.
```

### 승인 누락

```text
단가, 마진, 결제조건, Master DB 변경 후보에 ApprovalLog가 없으면 blocking.
```

## 4. 시각적 강조 방식

```text
warning: 노란 테두리
blocking: 빨간 테두리 + 링크 강조
needsApproval: 금색/빨강 이중 테두리
delayed: 시간 아이콘 또는 지연 badge
missingData: 점멸
```

## 5. 출력 연결

리스크 탐지 결과는 다음에 표시한다.

```text
3D Graph
Diagnostics Panel
현장관리표
발주표
공정표
승인 대기 화면
Case Library
```

