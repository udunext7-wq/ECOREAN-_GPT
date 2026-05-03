# Operation Ontology Schema

## 1. 목적

ECOREAN 자동견적 OS는 단순 견적 프로그램이 아니라 인테리어 공사 운영 전체를 데이터화하는 Build Operation Center, BOC의 시작점이다.

이 문서는 견적, 계약, 결제, 발주, 공정, 인력, 자재, 검수, 추가공사, 하자, 정산을 하나의 온톨로지 구조로 연결하기 위한 운영 스키마다.

## 2. 핵심 원칙

```text
1. 모든 공정은 견적 금액뿐 아니라 일정, 발주, 인력, 결제, 검수, 리스크와 연결된다.
2. 공정표는 견적 선택값에서 자동 생성된다.
3. 자재 발주일은 공정 시작일과 납기 리드타임을 기준으로 자동 계산된다.
4. 계약금, 중도금, 잔금은 공정 단계와 연결된다.
5. 추가공사는 별도 견적, 승인, 계약, 입금, 공정 반영 구조를 가진다.
6. 고객용 출력과 내부용 출력은 반드시 분리한다.
7. AI는 단가, 마진, 결제조건을 임의 변경할 수 없고 ApprovalLog를 거쳐야 한다.
```

## 3. 노드 유형

```ts
type OperationNodeType =
  | 'Project'
  | 'Client'
  | 'Contract'
  | 'PaymentMilestone'
  | 'Process'
  | 'Space'
  | 'Material'
  | 'AccessoryMaterial'
  | 'LaborCrew'
  | 'Equipment'
  | 'PurchaseOrder'
  | 'Delivery'
  | 'Inspection'
  | 'ChangeOrder'
  | 'Defect'
  | 'Risk'
  | 'Cost'
  | 'Revenue'
  | 'Cashflow'
  | 'Schedule'
  | 'ApprovalLog'
  | 'OutputDocument';
```

## 4. 관계 유형

```ts
type OperationRelationType =
  | 'HAS_CONTRACT'
  | 'HAS_PAYMENT_MILESTONE'
  | 'TRIGGERS_PAYMENT'
  | 'REQUIRES_PROCESS'
  | 'PRECEDES'
  | 'FOLLOWS'
  | 'DEPENDS_ON'
  | 'USES_MATERIAL'
  | 'USES_ACCESSORY'
  | 'REQUIRES_LABOR'
  | 'REQUIRES_EQUIPMENT'
  | 'REQUIRES_PURCHASE_ORDER'
  | 'HAS_LEAD_TIME'
  | 'DELIVERED_BEFORE'
  | 'NEEDS_INSPECTION'
  | 'CAN_START_AFTER'
  | 'CAN_BILL_AFTER'
  | 'HAS_CHANGE_ORDER'
  | 'CAUSES_COST_CHANGE'
  | 'CAUSES_SCHEDULE_CHANGE'
  | 'HAS_RISK'
  | 'AFFECTS_CASHFLOW'
  | 'NEEDS_APPROVAL'
  | 'GENERATED_FROM';
```

## 5. 운영 그래프 기본 스키마

```ts
type OperationGraph = {
  schemaVersion: string;
  projectId: string;
  nodes: OperationNode[];
  edges: OperationEdge[];
};

type OperationNode = {
  id: string;
  type: OperationNodeType;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'needsReview';
  sourceModule: string;
  metadata: Record<string, unknown>;
};

type OperationEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: OperationRelationType;
  required: boolean;
  conditionExpression?: string;
  needsApproval?: boolean;
  metadata?: Record<string, unknown>;
};
```

## 6. 주요 연결 구조

```text
Project
-> HAS_CONTRACT
-> Contract
-> HAS_PAYMENT_MILESTONE
-> PaymentMilestone
-> TRIGGERS_PAYMENT
-> Cashflow
```

```text
Estimate selected Process
-> REQUIRES_PURCHASE_ORDER
-> PurchaseOrder
-> HAS_LEAD_TIME
-> Delivery
-> DELIVERED_BEFORE
-> Process
```

```text
Process
-> NEEDS_INSPECTION
-> Inspection
-> CAN_BILL_AFTER
-> PaymentMilestone
```

```text
ChangeOrder
-> CAUSES_COST_CHANGE
-> Cost
-> CAUSES_SCHEDULE_CHANGE
-> Schedule
-> NEEDS_APPROVAL
-> ApprovalLog
```

## 7. 승인 보호 구조

다음 변경은 반드시 ApprovalLog 노드를 생성한다.

```text
단가 변경
마진 변경
결제조건 변경
계약금/중도금/잔금 조건 변경
추가공사 승인
하자 처리비 승인
ML 보정값 적용
```

