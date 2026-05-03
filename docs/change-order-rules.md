# Change Order Rules

## 1. 목적

추가공사는 기존 견적에 메모로 붙이는 것이 아니라 별도 견적, 승인, 계약, 입금, 공정 반영 구조를 가져야 한다.

## 2. ChangeOrder 스키마

```ts
type ChangeOrder = {
  changeOrderId: string;
  projectId: string;
  parentEstimateId: string;
  requestedBy: 'client' | 'site' | 'ecorean' | 'unknown';
  requestDate: string;
  description: string;
  reason:
    | 'clientRequest'
    | 'siteCondition'
    | 'missingScope'
    | 'designChange'
    | 'materialChange'
    | 'defectRepair'
    | 'unknown';
  estimateAmount: number | 'NEEDS_RESEARCH';
  expectedCost: number | 'NEEDS_RESEARCH';
  expectedMargin: number | 'NEEDS_RESEARCH';
  paymentTerms: ChangeOrderPaymentTerms;
  affectedProcessIds: string[];
  affectedMaterialIds: string[];
  scheduleImpactDays: number | 'NEEDS_RESEARCH';
  approvalLogId: string;
  status: 'draft' | 'pendingApproval' | 'approved' | 'contracted' | 'paid' | 'inProgress' | 'completed' | 'rejected';
};

type ChangeOrderPaymentTerms = {
  depositAmount?: number | 'NEEDS_RESEARCH';
  finalAmount?: number | 'NEEDS_RESEARCH';
  depositPaidDate?: string;
  finalPaidDate?: string;
};
```

## 3. 추가공사 운영 흐름

```text
추가공사 발생
-> 별도 견적 생성
-> 고객 승인
-> 추가공사 계약/동의
-> 추가공사 계약금 입금
-> 공정표 반영
-> 자재 발주 반영
-> 인력 배정 반영
-> 완료 검수
-> 추가공사 잔금 청구
```

## 4. 그래프 관계

```text
Project HAS_CHANGE_ORDER ChangeOrder
ChangeOrder NEEDS_APPROVAL ApprovalLog
ChangeOrder CAUSES_COST_CHANGE Cost
ChangeOrder CAUSES_SCHEDULE_CHANGE Schedule
ChangeOrder AFFECTS_CASHFLOW Cashflow
ChangeOrder REQUIRES_PROCESS Process
```

## 5. 금지 원칙

```text
승인 없는 추가공사 진행 금지
입금 없는 고액 추가공사 진행 경고
기존 견적 마진에 추가공사 원가를 임의 흡수 금지
```

