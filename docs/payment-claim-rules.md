# Payment Claim Rules

## 목적

중도금/잔금 청구 관리표는 계약 조건, 공정률, 검수, 고객 인도와 연결된다.

## 입력값

```text
paymentMilestoneId
projectId
contractId
claimType
claimAmount
claimCondition
linkedProcessIds
linkedInspectionIds
expectedClaimDate
actualClaimDate
expectedPaymentDate
actualPaymentDate
taxInvoiceDate
unpaidAmount
```

## 자동 생성 조건

```text
계약서 결제조건 등록
공정률 기준 도달
중간 검수 통과
준공검수 통과
고객 인도 완료
```

## 승인 조건

```text
조건 미충족 청구
청구 금액 변경
입금기한 변경
미수금 조정
세금계산서 발행 조건 변경
```

## 출력 형식

```text
청구 관리표
고객 청구서
세금계산서 발행 체크리스트
JSON
```

## 고객용/내부용 구분

```text
고객용: 청구 금액, 계좌, 기한, 청구 사유
내부용: 조건 충족 여부, 미수금, 세금계산서, 현금흐름 영향
```

## 연결되는 공정

```text
중도금 기준 공정
잔금 기준 준공검수
고객 인도
```

## 연결되는 결제 흐름

```text
공정 완료/검수 -> 청구 가능
청구 -> 입금 예정
입금 -> Cashflow inflow 확정
```

## Master DB 반영 여부

```text
직접 반영하지 않음
단, 결제조건 템플릿 개선 데이터로 사용 가능
```

## Case Library 반영 여부

```text
청구일
입금일
미수금
청구 지연 사유
```

## 예상값 vs 실제값 비교 여부

```text
예상 청구일 vs 실제 청구일
예상 입금일 vs 실제 입금일
예상 미수금 0 vs 실제 미수금
```

