# Cashflow Management Schema

## 목적

현금흐름표는 계약금, 중도금, 잔금, 추가공사 입금, 자재비, 외주비, 노무비, 하자비를 하나로 연결한다.

## 입력값

```text
projectId
contractAmount
paymentMilestones
purchaseOrders
laborAllocations
subcontractSettlements
changeOrders
defectCosts
taxInvoiceDates
actualPayments
actualCosts
```

## 자동 생성 조건

```text
계약 생성
결제 마일스톤 생성
발주서 생성
인력 배정
외주 계약
추가공사 승인
하자 비용 발생
```

## 승인 조건

```text
결제 조건 변경
미수금 처리
고액 선발주
외주 선지급
하자 비용 반영
```

## 출력 형식

```text
XLSX
PDF
Dashboard
JSON
```

## 고객용/내부용 구분

```text
고객용: 청구/입금 현황
내부용: 모든 inflow/outflow, 예상/실제 차이, 마진 영향
```

## 연결되는 공정

```text
모든 공정
특히 중도금/잔금 청구 기준 공정
```

## 연결되는 결제 흐름

```text
PaymentMilestone -> Revenue -> Cashflow
PurchaseOrder -> Cost -> Cashflow
LaborCrew -> Cost -> Cashflow
ChangeOrder -> Revenue/Cost -> Cashflow
Defect -> Cost -> Cashflow
```

## Master DB 반영 여부

```text
실제 원가율
공정별 마진
현금 유출 시점
리드타임별 자금 부담
```

## Case Library 반영 여부

```text
실제 입금일
미수금
실제 지출일
최종 현금흐름
마진 악화 원인
```

## 예상값 vs 실제값 비교 여부

```text
예상 입금일 vs 실제 입금일
예상 지출액 vs 실제 지출액
예상 마진 vs 최종 마진
```

