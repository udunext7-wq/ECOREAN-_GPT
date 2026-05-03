# Change Order Approval Schema

## 목적

추가공사 승인서는 추가공사의 견적, 승인, 수금, 공정표 반영을 분리 관리한다.

## 입력값

```text
changeOrderId
projectId
requestDate
requestedBy
description
reason
affectedProcesses
affectedMaterials
estimateAmount
expectedCost
expectedMargin
scheduleImpactDays
paymentTerms
approvalStatus
clientSignature
```

## 자동 생성 조건

```text
공사일보에서 추가 요청 발생
검수 중 추가 범위 발견
현장 조건으로 기존 범위 초과
고객 변경 요청 발생
```

## 승인 조건

```text
고객 승인
대표님 또는 관리자 승인
추가공사 계약금 조건 확인
공정표 영향 승인
마진 영향 승인
```

## 출력 형식

```text
고객용 PDF
내부 승인서
JSON
추가공사 견적서
```

## 고객용/내부용 구분

```text
고객용: 추가 범위, 금액, 일정 영향, 결제 조건
내부용: 원가, 마진, 공정 영향, 리스크, 승인 로그
```

## 연결되는 공정

```text
추가공사가 영향을 주는 모든 공정
```

## 연결되는 결제 흐름

```text
추가공사 승인 -> 추가공사 계약금
추가공사 완료 -> 추가공사 잔금
```

## Master DB 반영 여부

```text
누락 공정 후보
실제 추가공사 빈도
단가 보정 후보
scope rule 보정 후보
```

## Case Library 반영 여부

```text
추가공사 발생 원인
추가 금액
추가 원가
일정 영향
최종 마진 영향
```

## 예상값 vs 실제값 비교 여부

```text
예상 추가원가 vs 실제 추가원가
예상 일정 영향 vs 실제 지연
```

