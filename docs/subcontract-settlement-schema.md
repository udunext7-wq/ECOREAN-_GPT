# Subcontract Settlement Schema

## 목적

외주 정산표는 외주 공정, 실제 투입, 하자 책임, 지급 조건을 연결한다.

## 입력값

```text
subcontractSettlementId
projectId
subcontractorId
processIds
contractedAmount
actualWorkDays
actualCrewCount
deductions
defectBackcharge
paymentDueDate
actualPaymentDate
taxInvoiceReceived
settlementStatus
```

## 자동 생성 조건

```text
외주 공정 선택
외주 팀 배정
공정 완료
검수 완료
하자/차감 항목 확인
```

## 승인 조건

```text
외주 단가 변경
추가 지급
하자 차감
선지급
정산 금액 조정
```

## 출력 형식

```text
XLSX
PDF
JSON
외주별 정산표
```

## 고객용/내부용 구분

```text
고객용: 비노출
내부용: 외주 금액, 차감, 지급일, 세금계산서
```

## 연결되는 공정

```text
외주 처리 공정 전체
타일
설비
전기
창호
가구
도어
도장
필름
```

## 연결되는 결제 흐름

```text
외주 정산 -> Cashflow outflow
하자 차감 -> Defect/Cost 연결
```

## Master DB 반영 여부

```text
외주 단가
실제 생산성
하자 발생률
팀별 신뢰도
```

## Case Library 반영 여부

```text
실제 외주비
실제 투입 품수
하자 차감
지급일
팀별 품질 기록
```

## 예상값 vs 실제값 비교 여부

```text
예상 외주비 vs 실제 외주비
예상 품수 vs 실제 품수
예상 하자 0 vs 실제 하자 차감
```

