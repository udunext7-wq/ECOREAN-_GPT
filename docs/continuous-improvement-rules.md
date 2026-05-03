# Continuous Improvement Rules

## 목적

단가, 품수, 공기, 하자 발생률을 지속적으로 보정하여 다음 견적 정확도를 높인다.

## 입력값

```text
Case Library
Variance Reports
Defect Records
Purchase Order Results
Labor Allocation Results
Cashflow Results
Client Claims
```

## 자동 생성 조건

```text
동일 공정 반복 오차
동일 자재 납기 지연 반복
동일 외주팀 하자 반복
실제 마진 지속 하락
minimumLaborCharge 반복 누락
```

## 승인 조건

```text
보정값 적용
Rule 변경
Master DB 변경
외주팀 등급 변경
고객 출력 정책 변경
```

## 출력 형식

```text
Improvement Report
Correction Queue
Approval Dashboard
Master DB Update Proposal
```

## 고객용/내부용 구분

```text
고객용: 비노출
내부용: 개선 후보와 승인 상태 표시
```

## 연결되는 공정

```text
오차/하자/지연이 반복되는 공정
```

## 연결되는 결제 흐름

```text
마진 악화
미수금
하자비
추가공사 수익성
```

## Master DB 반영 여부

```text
승인 후 반영
```

## Case Library 반영 여부

```text
개선 근거로 연결
```

## 예상값 vs 실제값 비교 여부

```text
필수
```

