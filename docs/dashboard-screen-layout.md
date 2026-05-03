# BOC CEO Dashboard Screen Layout

## 목적

이 문서는 대표가 매일 실제로 보는 BOC CEO Dashboard의 화면 구조를 정의한다. 이 화면은 보고용 화면이 아니라 승인, 차단, 수정 요청, 우선순위 결정을 수행하는 운영 통제 화면이다.

## 화면 원칙

1. 대표는 클릭 3번 안에 판단 가능해야 한다.
2. 숫자보다 위험을 먼저 본다.
3. 누수와 손실을 먼저 보여준다.
4. 승인 없이는 변경 불가하다.
5. 모든 KPI는 바로 Action 가능해야 한다.
6. 대표는 보고가 아니라 통제를 해야 한다.

## 전체 레이아웃

```text
┌────────────────────────────────────────────────────────────────────┐
│ TOP BAR: cash today / alerts / approvals / risk projects            │
├───────────────┬──────────────────────────────────────┬─────────────┤
│ LEFT PANEL    │ CENTER MAIN                          │ RIGHT PANEL │
│ project list  │ Today Overview                       │ Approval    │
│ risk sort     │ Risk Dashboard                       │ Immediate   │
│ deadline sort │ Profit Dashboard                     │ CEO actions │
├───────────────┴──────────────────────────────────────┴─────────────┤
│ BOTTOM SECTION: Learning / Estimate vs Actual / Defect / Loss TOP   │
└────────────────────────────────────────────────────────────────────┘
Floating Action: 3D Ontology View / Project Drill Down / DB Review
```

## 1. TOP BAR

대표가 화면 진입 즉시 보는 최상단 판단 영역이다.

표시 KPI:

- 오늘 총 매출 예정
- 오늘 총 지출 예정
- 오늘 순현금흐름
- 긴급 경고 수
- 승인 대기 수
- 위험 현장 수

TOP BAR 색상 원칙:

- 순현금흐름이 음수이면 빨간 경고
- 긴급 경고가 1건 이상이면 빨간 경고
- 승인 대기 중 차단 항목이 있으면 빨간 경고
- 위험 현장이 1건 이상이면 노란 경고, 누수/하자 리스크 포함 시 빨간 경고

## 2. LEFT PANEL

프로젝트 목록과 정렬 기준을 제공한다.

정렬 탭:

- 위험도 정렬
- 마감일 정렬
- 미수금 정렬
- 하자리스크 정렬

프로젝트 카드 표시 항목:

- 프로젝트명
- 현재 공정
- 위험도
- 마감 예정일
- 미수금 여부
- 하자 리스크 여부
- 다음 액션

대표는 LEFT PANEL에서 위험 현장을 선택하고 CENTER MAIN과 RIGHT PANEL에서 즉시 판단한다.

## 3. CENTER MAIN

대표 판단의 중심 영역이다.

배치 순서:

1. Today Overview
2. Risk Dashboard
3. Profit Dashboard

Today Overview는 오늘 할 일을 보여준다. Risk Dashboard는 멈춰야 할 일을 보여준다. Profit Dashboard는 돈이 새는 곳을 보여준다.

## 4. RIGHT PANEL

승인과 즉시 조치 영역이다.

포함 영역:

- Approval Center
- Immediate Action List
- 대표 승인 필요 항목

RIGHT PANEL은 항상 화면 오른쪽에 고정된다. 대표가 다른 프로젝트를 선택해도 승인/차단/수정 요청 액션은 바로 접근 가능해야 한다.

## 5. BOTTOM SECTION

반복 학습과 구조 개선 영역이다.

포함 영역:

- Learning Dashboard
- Estimate vs Actual TOP
- 반복 하자 TOP
- 반복 손실 공정 TOP

BOTTOM SECTION은 당일 실행보다 장기 개선 판단을 위한 영역이다. 단, 반복 손실이 3회 이상이면 Approval Center로 승격된다.

## 6. FLOATING ACTION

대표가 어느 화면에서든 접근할 수 있는 고정 액션이다.

버튼:

- 3D Ontology View 연결
- 프로젝트 Drill Down
- Master DB Update Review

Floating Action은 원인 추적과 승인 검토를 빠르게 하기 위한 진입점이다.

## Widget 공통 구조

각 Widget은 반드시 아래 항목을 가진다.

```ts
type DashboardWidget = {
  widgetId: string;
  title: string;
  mainKpi: string;
  warningLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  blockingLevel: 'NONE' | 'WARNING' | 'BLOCKING';
  approvalRequired: boolean;
  sourceData: string[];
  relatedProject: string | 'multiple' | 'none';
  actionButton: string[];
  nextActionRecommendation: string;
};
```

## 빨간 경고 기준

즉시 빨간 경고로 표시되는 항목:

- 방수 검수 실패 후 타일/마감 착수 예정
- 발주 입고 예정일이 공정 시작일 이후
- 중도금/잔금 조건 미충족 청구 시도
- 승인 없는 Master DB 변경 시도
- rollbackData 없는 DB 변경 시도
- 고객용 문서에 내부 원가/마진/공급가 노출
- 결로 원인 미확인 상태에서 마감 공정 착수
- 반복 손실 공정 3회 이상

## 클릭 3번 원칙

대표의 주요 판단 흐름은 3번 클릭 안에 끝나야 한다.

예시:

```text
위험 현장 클릭
-> 방수 검수 실패 카드 클릭
-> 후속 공정 차단 또는 재검수 요청
```

```text
승인 대기 클릭
-> Master DB 변경 요청 클릭
-> 승인 / 반려 / 수정 요청
```

```text
미수금 위험 클릭
-> 잔금 청구 가능 현장 클릭
-> 청구 승인 / 보류
```
