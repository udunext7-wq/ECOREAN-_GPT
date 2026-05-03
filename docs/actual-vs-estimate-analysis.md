# Actual vs Estimate Analysis

## 목적

예상값과 실제값의 차이를 기록하고, 다음 견적 정확도를 높이기 위한 분석 문서다.

## 입력값

```text
estimateSnapshot
actualResult
processAggregationResults
cashflowResults
changeOrders
defects
dailyReports
```

## 자동 생성 조건

```text
프로젝트 완료
실제 원가 입력 완료
실제 일정 입력 완료
잔금 또는 정산 완료
```

## 승인 조건

```text
오차 원인 확정
Master DB 보정 제안
외주 책임 비용 반영
하자비 반영
```

## 출력 형식

```text
Variance Report
XLSX
Dashboard
JSON
```

## 고객용/내부용 구분

```text
고객용: 비노출
내부용: 전체 분석 표시
```

## 연결되는 공정

```text
모든 실제 수행 공정
```

## 연결되는 결제 흐름

```text
최종 수금
실제 지출
미수금
최종 마진
```

## Master DB 반영 여부

```text
단가/품수/공기/손실률/리스크 보정 후보 생성
```

## Case Library 반영 여부

```text
필수 저장
```

## 예상값 vs 실제값 비교 여부

```text
핵심 목적
```

