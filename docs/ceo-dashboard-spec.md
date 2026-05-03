# CEO Dashboard (BOC Dashboard) Spec

## 목적

CEO Dashboard는 대표가 ECOREAN 자동견적 OS의 핵심 운영 상태를 한 화면에서 판단하고 즉시 조치하는 내부 운영 콘솔이다.

이 화면은 보고서가 아니라 의사결정 화면이다. 모든 카드는 반드시 승인, 차단, 수정 요청, 우선순위 결정 중 하나 이상의 액션과 연결된다.

## 기본 원칙

1. 대표는 숫자가 아니라 판단을 본다.
2. 위험을 먼저 보여준다.
3. 승인 없이는 Master DB 변경이 불가하다.
4. 수익보다 누수와 손실을 먼저 보여준다.
5. 고객용 화면이 아니라 내부 운영 화면이다.
6. 모든 KPI는 Action 가능해야 한다.
7. 고객용 데이터와 내부 원가/마진 데이터는 절대 혼합하지 않는다.
8. 차단 조건은 대시보드에서 즉시 식별되어야 한다.
9. 승인 요청은 Approval Log와 rollbackData를 반드시 가진다.
10. 3D Ontology View는 원인 추적용으로 연결된다.

## 화면 구조

```text
CEO Dashboard
-> Today Overview
-> Risk Dashboard
-> Profit Dashboard
-> Process Dashboard
-> Approval Center
-> Learning Dashboard
-> 3D Ontology View Link
```

위험 판단이 먼저이므로 실제 UI에서는 Today Overview 다음에 Risk Dashboard를 우선 배치한다.

## 공통 카드 구조

모든 대시보드 카드는 아래 필드를 가진다.

```ts
type DashboardCard = {
  cardId: string;
  cardName: string;
  section: string;
  sourceData: string[];
  updateFrequency: 'realTime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  owner: 'CEO' | 'BOC' | 'PMO' | 'CFO' | 'COO' | 'CTO' | 'SiteManager';
  warningThreshold: string | number;
  blockingThreshold: string | number;
  approvalNeeded: boolean;
  relatedDocument: string[];
  relatedProject: string | 'multiple' | 'none';
  actionButton: string[];
  visibility: 'internalOnly' | 'ceoOnly' | 'managerAllowed';
};
```

## 1. Today Overview

대표가 매일 가장 먼저 보는 운영 카드다.

| 카드 | 판단 목적 | 주요 액션 |
|---|---|---|
| 오늘 계약금 입금 | 계약 실행 가능 여부 판단 | 입금 확인, 공정 착수 승인 |
| 오늘 중도금 청구 가능 현장 | 청구 가능한 돈을 놓치지 않음 | 청구 승인, 보류, 수정 요청 |
| 오늘 잔금 청구 가능 현장 | 준공 후 미수 방지 | 잔금 청구 승인, 검수 재확인 |
| 오늘 발주 필요 항목 | 납기 지연 방지 | 발주 승인, 대체 자재 요청 |
| 오늘 공정 지연 현장 | 일정 리스크 확인 | 우선순위 조정, 현장관리자 호출 |
| 오늘 검수 필요 현장 | 후속 공정 차단 여부 판단 | 검수 승인, 재검수 요청 |
| 오늘 승인 필요 항목 | 병목 제거 | 승인, 반려, 보류 |

## 2. Profit Dashboard

수익 자체보다 손실 누수를 먼저 보여준다.

| 카드 | 판단 목적 | 주요 액션 |
|---|---|---|
| 예상 마진 vs 실제 마진 | 전체 수익성 이탈 확인 | 원인 분석, Case Library 저장 |
| 현장별 수익률 | 손실 현장 식별 | 현장 점검, 외주비 재협상 |
| 공정별 수익률 | 반복 손실 공정 탐지 | 단가 조사 요청, 품수 보정 요청 |
| 브랜드별 마진 | 브랜드 선택 수익성 판단 | 추천 브랜드 조정 요청 |
| 외주비 과다 발생 현장 | 외주 누수 탐지 | 외주 정산 검토, 승인 차단 |
| 반복 손실 공정 | Master DB 보정 후보 탐지 | 업데이트 요청 생성 |

## 3. Risk Dashboard

대표 화면에서 가장 먼저 강조되어야 하는 위험 영역이다.

| 카드 | 즉시 판단 | 차단 조건 |
|---|---|---|
| 하자 위험 현장 | 하자 발생 가능성 | 고위험 공정 검수 누락 |
| 누수 리스크 | 방수/배관 관련 리스크 | 방수 검수 실패 후 후속 공정 시작 |
| 결로 리스크 | 단열/창호/환기 리스크 | 결로 원인 미확인 상태의 마감 공정 |
| 발주 지연 리스크 | 납기 지연 가능성 | 공정 시작일 이후 입고 예정 |
| 검수 실패 리스크 | 공정 진행 차단 여부 | 검사 실패 상태의 후속 공정 시작 |
| 고객 클레임 위험 | 민원 가능성 | 변경사항 미승인 반영 |
| 미수금 위험 | 현금흐름 악화 | 청구 조건 충족 후 미청구/연체 |

## 4. Process Dashboard

공정표, 발주표, 검수표, 현장일보를 연결해 실행 오류를 찾는다.

| 카드 | 주요 판단 | 액션 |
|---|---|---|
| 현재 진행 공정 | 현장별 현재 상태 | 우선순위 조정 |
| 공정 충돌 경고 | 동시 진행 불가 공정 탐지 | 일정 수정 요청 |
| 선후행 오류 | PRECEDES/FOLLOWS 위반 | 후속 공정 차단 |
| 방수 검수 실패 | 타일/마감 착수 차단 | 재검수 요청 |
| 발주 누락 | 자재 미발주 탐지 | 발주 생성/승인 |
| NEEDS_CONFIRMATION 누락 | 입력 부족 탐지 | 확인 요청 |

## 5. Approval Center

대표의 승인 병목을 모아 처리하는 영역이다.

| 승인 항목 | 승인 전 상태 | 승인 후 결과 |
|---|---|---|
| Master DB 업데이트 요청 | 반영 차단 | approvedCorrection 생성 |
| 단가 변경 승인 | 견적 반영 차단 | price version 갱신 |
| 브랜드 변경 승인 | 견적/발주 보류 | 대체 브랜드 반영 |
| 추가공사 승인 | 공정/수금 반영 보류 | ChangeOrder 확정 |
| 하자 재시공 승인 | 비용 반영 보류 | Defect cost/cashflow 반영 |
| 예외 승인 요청 | 위험 상태 유지 | Approval Log 생성 |

## 6. Learning Dashboard

Master DB와 Case Library의 품질을 높이는 영역이다.

| 카드 | 목적 | 액션 |
|---|---|---|
| 예상 vs 실제 오차 TOP 10 | 반복 오차 탐지 | 보정 후보 생성 |
| 반복 하자 TOP 10 | 하자 패턴 탐지 | 시공 기준 수정 요청 |
| 반복 클레임 TOP 10 | 고객 불만 원인 탐지 | 고객 안내 문구/공정 기준 수정 |
| 가장 자주 수정되는 단가 | 단가 신뢰도 저하 탐지 | 단가 조사 요청 |
| 가장 자주 승인되는 예외 | 룰 과도/부족 탐지 | Rule Engine 보정 요청 |
| ML 보정 후보 | 모델 학습 후보 정리 | 학습 데이터셋 후보 생성 |

## 7. 3D Ontology View 연결

각 위험/손실/승인 카드에서 3D 그래프 원인 추적 화면으로 이동할 수 있어야 한다.

연결 대상:

- 공정 연결 구조
- 발주 연결 구조
- 하자 연결 구조
- 리스크 연결 구조
- 결제/현금흐름 연결 구조
- Master DB 업데이트 후보 연결 구조

## 대표 액션

```text
approve
block
requestRevision
requestInspection
requestResearch
prioritize
open3DGraph
createMasterDbUpdateRequest
createChangeOrder
holdPaymentClaim
releasePaymentClaim
```

## 출력 구분

CEO Dashboard는 내부 운영 화면이다.

고객용 출력:

- 고객용 견적서
- 고객 안내용 공정표
- 고객 인도 체크리스트

내부 전용 출력:

- 내부 원가표
- 공정별 마진표
- supplierPrice
- internalPrice
- 외주 정산표
- Approval Log
- Master DB update request
- Case Library variance

고객용 카드에 내부 원가/마진/거래처 공급가가 노출되면 즉시 blocking diagnostics를 발생시킨다.
