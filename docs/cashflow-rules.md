# Cashflow Rules

## 1. 목적

현금 흐름표는 계약금, 중도금, 잔금, 추가공사 입금, 자재 발주, 노무비, 외주비, 폐기물비, 운반비와 연결되어야 한다.

## 2. Cashflow 스키마

```ts
type CashflowEntry = {
  cashflowId: string;
  projectId: string;
  relatedNodeId: string;
  relatedNodeType:
    | 'PaymentMilestone'
    | 'PurchaseOrder'
    | 'LaborCrew'
    | 'Equipment'
    | 'ChangeOrder'
    | 'Defect'
    | 'Cost'
    | 'Revenue';
  direction: 'inflow' | 'outflow';
  category:
    | 'deposit'
    | 'progressPayment'
    | 'finalPayment'
    | 'changeOrderPayment'
    | 'materialCost'
    | 'laborCost'
    | 'subcontractCost'
    | 'equipmentCost'
    | 'wasteCost'
    | 'logisticsCost'
    | 'defectCost'
    | 'tax';
  expectedDate: string | 'NEEDS_RESEARCH';
  actualDate?: string;
  expectedAmount: number | 'NEEDS_RESEARCH';
  actualAmount?: number;
  status: 'planned' | 'confirmed' | 'paid' | 'received' | 'overdue' | 'delayed';
};
```

## 3. 원가/마진 변수

```text
예상 자재비
예상 부자재비
예상 노무비
예상 외주비
장비비
폐기물 비용
운반비
양중비
경비
공정별 마진
전체 마진
실제 원가
예상 대비 실제 오차
최종 마진
```

## 4. 현금 흐름 연결

```text
PaymentMilestone -> Revenue -> Cashflow
PurchaseOrder -> Cost -> Cashflow
LaborCrew -> Cost -> Cashflow
ChangeOrder -> Revenue/Cost -> Cashflow
Defect -> Cost -> Cashflow
```

## 5. 경고 조건

```text
중도금 입금 전 고액 자재 발주
잔금 예정일 지연
미수금 발생
실제 원가가 예상 원가 초과
하자 처리비 발생
추가공사 승인 전 비용 발생
```

