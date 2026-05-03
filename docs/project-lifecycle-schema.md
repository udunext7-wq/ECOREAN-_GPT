# Project Lifecycle Schema

## 1. 목적

프로젝트 생애주기는 상담부터 정산까지 하나의 그래프로 연결되어야 한다.

## 2. Lifecycle 단계

```text
Lead
-> Consultation
-> Site Survey
-> Estimate
-> Contract
-> Deposit
-> Procurement
-> Construction
-> Progress Billing
-> Inspection
-> Handover
-> Final Payment
-> Defect Management
-> Settlement
-> Case Library
```

## 3. ProjectLifecycle 스키마

```ts
type ProjectLifecycle = {
  projectId: string;
  clientId: string;
  currentStage:
    | 'lead'
    | 'consultation'
    | 'siteSurvey'
    | 'estimate'
    | 'contract'
    | 'deposit'
    | 'procurement'
    | 'construction'
    | 'progressBilling'
    | 'inspection'
    | 'handover'
    | 'finalPayment'
    | 'defectManagement'
    | 'settlement'
    | 'caseClosed';
  stages: LifecycleStage[];
};

type LifecycleStage = {
  stageId: string;
  stageName: string;
  startedAt?: string;
  completedAt?: string;
  requiredNodes: string[];
  blockingConditions: string[];
  outputDocuments: string[];
  status: 'pending' | 'active' | 'completed' | 'blocked';
};
```

## 4. 단계별 산출물

```text
Estimate: 고객용 견적서, 내부 원가표
Contract: 계약서, 결제조건
Procurement: 자재 발주표, 입고 일정
Construction: 공정표, 인력 투입표, 현장관리표
ProgressBilling: 중도금 청구서, 세금계산서
Inspection: 검수표, 사진 기록
Handover: 고객 인수 확인
FinalPayment: 잔금 청구서, 미수금 현황
DefectManagement: 하자 접수/처리 기록
Settlement: 최종 원가표, 최종 마진, Case Library 저장
```

## 5. 생애주기 종료 조건

```text
공정 완료
준공검수 완료
고객 인도 완료
잔금 입금 완료
미수금 0
하자 open 항목 없음
실제 원가 입력 완료
최종 마진 계산 완료
Case Library 저장 완료
```

## 6. 그래프 연결

```text
Project HAS_CONTRACT Contract
Project GENERATED_FROM OutputDocument
Project HAS_CHANGE_ORDER ChangeOrder
Project HAS_RISK Risk
Project AFFECTS_CASHFLOW Cashflow
Project GENERATED_FROM Case
```

