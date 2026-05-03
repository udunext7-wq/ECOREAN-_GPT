# Feedback Loop Rules

## 목적

현장 수정사항과 실제 결과가 Master DB와 Case Library에 반영되는 규칙을 정의한다.

## 입력값

```text
dailySiteReports
materialDeliveryChecks
inspectionResults
changeOrders
defects
actualCosts
actualDurations
clientClaims
```

## 자동 생성 조건

```text
예상값과 실제값 차이 발생
반복 하자 발생
반복 지연 발생
단가 오차 반복
품수 오차 반복
```

## 승인 조건

```text
Master DB 변경 필요
Rule 변경 필요
ML 보정값 적용
단가 변경
마진 정책 변경
```

## 출력 형식

```text
Feedback Report
Correction Candidate
Approval Request
Case Library Record
```

## 고객용/내부용 구분

```text
고객용: 비노출
내부용: 전체 피드백과 보정 후보 표시
```

## 연결되는 공정

```text
오차나 하자가 발생한 공정
```

## 연결되는 결제 흐름

```text
하자비
추가공사비
미수금
외주 차감
```

## Master DB 반영 여부

```text
승인 후 반영
```

## Case Library 반영 여부

```text
항상 반영
```

## 예상값 vs 실제값 비교 여부

```text
필수
```

