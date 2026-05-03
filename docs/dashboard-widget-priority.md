# Dashboard Widget Priority

## 목적

대표 화면의 위젯 우선순위를 정의한다. 화면은 예쁜 순서가 아니라 운영 리스크와 현금흐름 영향 순서로 배치한다.

## 최우선 위젯

| priority | widget | reason | default action |
|---|---|---|---|
| 1 | 긴급 경고 수 | 차단해야 할 일이 있는지 즉시 판단 | openBlockingAlerts |
| 2 | 오늘 순현금흐름 | 오늘 돈이 새는지 판단 | openCashflow |
| 3 | 승인 대기 수 | 대표 승인 병목 확인 | openApprovalCenter |
| 4 | 위험 현장 수 | 누수/하자/공정 리스크 확인 | openRiskProjects |
| 5 | 오늘 중도금/잔금 청구 가능 | 받을 돈을 놓치지 않음 | approvePaymentClaim |
| 6 | 오늘 발주 필요 항목 | 공정 지연 방지 | approvePurchaseOrder |
| 7 | 예상 마진 vs 실제 마진 | 손실 누수 확인 | openVarianceReport |
| 8 | 반복 손실 공정 TOP | 구조적 손실 확인 | createMasterDbUpdateRequest |

## 화면 배치 우선순위

### TOP BAR

1. 긴급 경고 수
2. 승인 대기 수
3. 위험 현장 수
4. 오늘 순현금흐름
5. 오늘 총 매출 예정
6. 오늘 총 지출 예정

### LEFT PANEL

1. 위험도 정렬
2. 하자리스크 정렬
3. 미수금 정렬
4. 마감일 정렬

### CENTER MAIN

1. Today Overview
2. Risk Dashboard
3. Profit Dashboard

### RIGHT PANEL

1. Immediate Action List
2. Approval Center
3. 대표 승인 필요 항목

### BOTTOM SECTION

1. Estimate vs Actual TOP
2. 반복 손실 공정 TOP
3. 반복 하자 TOP
4. Learning Dashboard

## 경고 단계별 표시

```text
BLOCKING: 빨간색, 상단 고정, 액션 전까지 숨김 불가
HIGH: 빨간색, TOP BAR와 관련 위젯 동시 표시
MEDIUM: 노란색, 섹션 내 우선 표시
LOW: 회색/파란색, 일반 확인 항목
NONE: 기본 표시
```

## 대표가 가장 먼저 눌러야 하는 버튼

기본값:

```text
긴급 경고 수 -> openBlockingAlerts
```

긴급 경고가 없으면:

```text
승인 대기 수 -> openApprovalCenter
```

승인 대기도 없으면:

```text
오늘 순현금흐름 -> openCashflow
```

## 3D Ontology Drill Down 우선순위

아래 항목은 원인 관계가 복잡하므로 3D Ontology로 연결한다.

1. 방수 검수 실패
2. 발주 지연
3. 공정 충돌
4. 반복 하자
5. 반복 손실 공정
6. Master DB 업데이트 후보
7. 결로/누수 리스크
8. 현금흐름 리스크
