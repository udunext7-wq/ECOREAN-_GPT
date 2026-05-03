# Payment Milestone Rules

## 1. 목적

계약금, 중도금, 잔금은 단순 날짜가 아니라 공정 단계, 자재 발주, 현장 진행률, 검수 상태와 연결되어야 한다.

## 2. PaymentMilestone 스키마

```ts
type PaymentMilestone = {
  paymentMilestoneId: string;
  projectId: string;
  contractId: string;
  milestoneType: 'deposit' | 'progress' | 'final' | 'changeOrderDeposit' | 'changeOrderFinal';
  name: string;
  amountType: 'fixed' | 'percentage';
  amountValue: number | 'NEEDS_RESEARCH';
  expectedBillingDate?: string;
  actualBillingDate?: string;
  expectedPaymentDate?: string;
  actualPaymentDate?: string;
  billingCondition: BillingCondition;
  linkedProcessIds: string[];
  linkedInspectionIds: string[];
  taxInvoiceDate?: string;
  unpaidAmount?: number;
  status: 'planned' | 'billable' | 'billed' | 'paid' | 'overdue' | 'cancelled';
};

type BillingCondition = {
  conditionType:
    | 'contractSigned'
    | 'materialOrdered'
    | 'materialDelivered'
    | 'processStarted'
    | 'processProgressRate'
    | 'processCompleted'
    | 'inspectionPassed'
    | 'handoverCompleted';
  threshold?: number;
  description: string;
};
```

## 3. 계약/수금 변수

```text
계약일
계약금 비율
계약금 입금 예정일
계약금 실제 입금일
중도금 조건
중도금 청구 기준 공정
중도금 입금 예정일
잔금 조건
잔금 청구 기준
잔금 실제 입금일
미수금
추가공사 계약금
추가공사 잔금
세금계산서 발행일
```

## 4. 청구 가능 조건 예시

```text
계약금: 계약 체결 후 청구 가능
중도금 1: 철거 완료 또는 주요 자재 발주 전 청구 가능
중도금 2: 타일/목공 등 핵심 공정 착수 또는 50% 공정률 도달 시 청구 가능
잔금: 준공검수, 하자 체크, 고객 인도 후 청구 가능
```

## 5. 그래프 관계

```text
Contract HAS_PAYMENT_MILESTONE PaymentMilestone
Process CAN_BILL_AFTER PaymentMilestone
Inspection CAN_BILL_AFTER PaymentMilestone
PaymentMilestone AFFECTS_CASHFLOW Cashflow
PaymentMilestone GENERATED_FROM OutputDocument
```

## 6. 승인 규칙

AI는 결제조건을 직접 변경할 수 없다.

다음은 승인 대상이다.

```text
계약금 비율 변경
중도금 조건 변경
잔금 조건 변경
입금 기한 변경
미수금 처리 조건 변경
추가공사 결제 조건 변경
```

