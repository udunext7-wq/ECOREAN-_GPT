# ECOREAN 자동견적 OS 작업 목록

## 작업 운영 규칙

모든 작업은 다음 순서로 진행한다.

```text
BUILD -> TEST -> REPORT
```

상태 값:

- `TODO`: 대기
- `BUILD`: 작업 중
- `TEST`: 검증 중
- `REPORT`: 보고 준비
- `DONE`: 완료
- `WAITING_APPROVAL`: 승인 대기

## Phase 0: 기준 문서 생성

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P0-001 | PLAN.md 생성 | DONE | 아니오 |
| P0-002 | SPEC.md 생성 | DONE | 아니오 |
| P0-003 | ARCHITECTURE.md 생성 | DONE | 아니오 |
| P0-004 | MASTER_DB_SCHEMA.md 생성 | DONE | 아니오 |
| P0-005 | TASKS.md 생성 | DONE | 아니오 |
| P0-006 | TEST_PLAN.md 생성 | DONE | 아니오 |
| P0-007 | CHANGELOG.md 생성 | DONE | 아니오 |

## Phase 1: Legacy 보존

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P1-001 | legacy 폴더 생성 | TODO | 아니오 |
| P1-002 | 기존 HTML 경로 확인 | TODO | 아니오 |
| P1-003 | 기존 HTML을 legacy/ECOREAN_original.html로 복사 | TODO | 아니오 |
| P1-004 | 복사본 존재 확인 | TODO | 아니오 |
| P1-005 | 원본 미수정 확인 | TODO | 아니오 |
| P1-006 | CHANGELOG 기록 | TODO | 아니오 |

## Phase 2: 프로젝트 구조 생성

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P2-001 | electron 폴더 생성 | DONE | 아니오 |
| P2-002 | master-db 구조 생성 | DONE | 아니오 |
| P2-003 | estimate-engine 구조 생성 | DONE | 아니오 |
| P2-004 | schedule-engine 구조 생성 | DONE | 아니오 |
| P2-005 | outputs/customer 구조 생성 | DONE | 아니오 |
| P2-006 | outputs/internal 구조 생성 | DONE | 아니오 |
| P2-007 | storage/sqlite 구조 생성 | DONE | 아니오 |
| P2-008 | ui 구조 생성 | DONE | 아니오 |
| P2-009 | docs 구조 생성 | DONE | 아니오 |
| P2-010 | tests 구조 생성 | DONE | 아니오 |
| P2-011 | 각 모듈 README 생성 | DONE | 아니오 |
| P2-012 | CHANGELOG 기록 | DONE | 아니오 |

## Phase 3: Master DB 상세 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P3-001 | 공정 트리 기준 확정 | WAITING_APPROVAL | 예 |
| P3-002 | defaultSpec 기준 확정 | WAITING_APPROVAL | 예 |
| P3-003 | optionGroups 기준 확정 | WAITING_APPROVAL | 예 |
| P3-004 | ontologyRelation 기준 확정 | WAITING_APPROVAL | 예 |
| P3-005 | triggerType 기준 확정 | WAITING_APPROVAL | 예 |
| P3-006 | priceLogic 기준 확정 | WAITING_APPROVAL | 예 |
| P3-007 | scheduleLogic 기준 확정 | WAITING_APPROVAL | 예 |

## Phase 4: 기존 HTML 분석

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P4-001 | 기존 HTML의 DB 객체 위치 분석 | TODO | 아니오 |
| P4-002 | 기존 필드 목록 추출 | TODO | 아니오 |
| P4-003 | 신규 스키마 매핑표 작성 | TODO | 아니오 |
| P4-004 | 변환 불가능 필드 식별 | TODO | 아니오 |
| P4-005 | 샘플 공정 3개 변환안 작성 | TODO | 아니오 |
| P4-006 | 실제 변환 규칙 승인 요청 | TODO | 예 |

## Phase 5: 테스트 기준 생성

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P5-001 | 샘플 아파트 프로젝트 fixture 생성 | TODO | 아니오 |
| P5-002 | 샘플 상가 프로젝트 fixture 생성 | TODO | 아니오 |
| P5-003 | 샘플 욕실 공정 fixture 생성 | TODO | 아니오 |
| P5-004 | Master DB 스키마 검증 테스트 계획 작성 | TODO | 아니오 |
| P5-005 | 견적 엔진 테스트 계획 작성 | TODO | 아니오 |
| P5-006 | 공정표 엔진 테스트 계획 작성 | TODO | 아니오 |

## Phase 6: 기준 공정 샘플 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P6-001 | 욕실 공정 Master DB 샘플 v0.1 작성 | DONE | 아니오 |
| P6-002 | 욕실 공정 단가 기준 승인 | WAITING_APPROVAL | 예 |
| P6-003 | 욕실 공정 코드 체계 승인 | WAITING_APPROVAL | 예 |
| P6-004 | 욕실 공정 고객 노출 정책 승인 | WAITING_APPROVAL | 예 |
| P6-005 | 욕실 공정 발주 시점 기준 승인 | WAITING_APPROVAL | 예 |
| P6-006 | 자재/부자재 영향 스키마 v0.2 작성 | DONE | 아니오 |
| P6-007 | 타일 공정 필수 자재/부자재 항목 승인 | WAITING_APPROVAL | 예 |
| P6-008 | ProcessItemV02 스키마 반영 승인 | WAITING_APPROVAL | 예 |
| P6-009 | 단가 출처 및 가격 기준 정책 v0.3 작성 | DONE | 아니오 |
| P6-010 | PriceRecord 스키마 승인 | WAITING_APPROVAL | 예 |
| P6-011 | official/supplier/market/internal 가격 기준 승인 | WAITING_APPROVAL | 예 |
| P6-012 | 최종 견적 가격 추적 필드 승인 | WAITING_APPROVAL | 예 |
| P6-013 | 욕실 공정 JSON 샘플 데이터 생성 | DONE | 아니오 |
| P6-014 | 욕실 공정 JSON 스키마 검증 기준 작성 | TODO | 아니오 |
| P6-015 | 욕실 공정 JSON 운영 데이터 전환 승인 | WAITING_APPROVAL | 예 |
| P6-016 | 공정 중심 통합 계산 구조 v0.4 문서 반영 | DONE | 아니오 |
| P6-017 | 욕실 공정 JSON에 labor aggregation 필드 반영 | DONE | 아니오 |
| P6-018 | 공정별 통합 인건비 계산 공식 승인 | WAITING_APPROVAL | 예 |

## Phase 7: Ontology Graph / Rule / Case / ML 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P7-001 | graph-schema.md 작성 | DONE | 아니오 |
| P7-002 | ontology-visualization-rules.md 작성 | DONE | 아니오 |
| P7-003 | ml-readiness-plan.md 작성 | DONE | 아니오 |
| P7-004 | case-library-schema.md 작성 | DONE | 아니오 |
| P7-005 | rule-engine-principles.md 작성 | DONE | 아니오 |
| P7-006 | Neo4j 이전 가능 구조 승인 | WAITING_APPROVAL | 예 |
| P7-007 | Rule Engine 필수 규칙 승인 | WAITING_APPROVAL | 예 |
| P7-008 | Case Library 필수 수집 데이터 승인 | WAITING_APPROVAL | 예 |

## Phase 8: Schedule / Order / Labor / Diagnostics 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P8-001 | schedule-rules.md 작성 | DONE | 아니오 |
| P8-002 | process-dependency-schema.md 작성 | DONE | 아니오 |
| P8-003 | material-order-timing-rules.md 작성 | DONE | 아니오 |
| P8-004 | labor-allocation-rules.md 작성 | DONE | 아니오 |
| P8-005 | diagnostics-rules.md 작성 | DONE | 아니오 |
| P8-006 | 일정 필수 필드 운영 기준 승인 | WAITING_APPROVAL | 예 |
| P8-007 | 공정 충돌/진단 규칙 승인 | WAITING_APPROVAL | 예 |

## Phase 9: Operation Ontology / Payment / Cashflow 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P9-001 | operation-ontology-schema.md 작성 | DONE | 아니오 |
| P9-002 | payment-milestone-rules.md 작성 | DONE | 아니오 |
| P9-003 | purchase-order-rules.md 작성 | DONE | 아니오 |
| P9-004 | cashflow-rules.md 작성 | DONE | 아니오 |
| P9-005 | change-order-rules.md 작성 | DONE | 아니오 |
| P9-006 | inspection-and-defect-rules.md 작성 | DONE | 아니오 |
| P9-007 | project-lifecycle-schema.md 작성 | DONE | 아니오 |
| P9-008 | 결제 마일스톤 운영 기준 승인 | WAITING_APPROVAL | 예 |
| P9-009 | 추가공사 승인/입금/공정 반영 기준 승인 | WAITING_APPROVAL | 예 |
| P9-010 | 잔금 청구 및 하자 blocking 조건 승인 | WAITING_APPROVAL | 예 |

## Phase 10: Closed Loop Operating Documents 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P10-001 | purchase-order-schema.md 작성 | DONE | 아니오 |
| P10-002 | daily-site-report-schema.md 작성 | DONE | 아니오 |
| P10-003 | material-delivery-check-schema.md 작성 | DONE | 아니오 |
| P10-004 | inspection-checklist-schema.md 작성 | DONE | 아니오 |
| P10-005 | change-order-approval-schema.md 작성 | DONE | 아니오 |
| P10-006 | defect-management-schema.md 작성 | DONE | 아니오 |
| P10-007 | cashflow-management-schema.md 작성 | DONE | 아니오 |
| P10-008 | payment-claim-rules.md 작성 | DONE | 아니오 |
| P10-009 | subcontract-settlement-schema.md 작성 | DONE | 아니오 |
| P10-010 | client-handover-checklist.md 작성 | DONE | 아니오 |
| P10-011 | closed-loop-operating-system.md 작성 | DONE | 아니오 |
| P10-012 | feedback-loop-rules.md 작성 | DONE | 아니오 |
| P10-013 | master-db-update-policy.md 작성 | DONE | 아니오 |
| P10-014 | actual-vs-estimate-analysis.md 작성 | DONE | 아니오 |
| P10-015 | continuous-improvement-rules.md 작성 | DONE | 아니오 |
| P10-016 | Closed Loop 운영 문서 우선순위 승인 | WAITING_APPROVAL | 예 |
| P10-017 | bathroom-remodeling-ontology.sample.json 생성 | DONE | 아니오 |
| P10-018 | 욕실 온톨로지 샘플 실제 Case 데이터 입력 기준 승인 | WAITING_APPROVAL | 예 |

## Phase 11: 3D Ontology Visualization 설계

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P11-001 | 3d-ontology-visualization-spec.md 작성 | DONE | 아니오 |
| P11-002 | graph-node-style-rules.md 작성 | DONE | 아니오 |
| P11-003 | graph-filter-rules.md 작성 | DONE | 아니오 |
| P11-004 | graph-risk-detection-rules.md 작성 | DONE | 아니오 |
| P11-005 | 3D 그래프 구현 기술 스택 승인 | WAITING_APPROVAL | 예 |
| P11-006 | Neo4j 연동 여부 승인 | WAITING_APPROVAL | 예 |

## Phase 12: 실제 적용 단가 수집 구조

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P12-001 | bathroom-price-research-table.json 생성 | DONE | 아니오 |
| P12-002 | 욕실 리모델링 단가 조사 우선순위 작성 | DONE | 아니오 |
| P12-003 | 실제 단가 수집 시작 승인 | WAITING_APPROVAL | 예 |
| P12-004 | 거래처/공식/시장 단가 출처 목록 승인 | WAITING_APPROVAL | 예 |

## Phase 13: Brand DB Research Structure

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P13-001 | brand-db-schema.md 작성 | DONE | 아니오 |
| P13-002 | brand-compatibility-rules.md 작성 | DONE | 아니오 |
| P13-003 | brand-selection-rules.md 작성 | DONE | 아니오 |
| P13-004 | customer-brand-preference-rules.md 작성 | DONE | 아니오 |
| P13-005 | brand-db-research-table.json 작성 | DONE | 아니오 |
| P13-006 | 실제 브랜드/모델/공급가 수집 시작 승인 | WAITING_APPROVAL | 예 |

## Phase 14: Bathroom Brand Priority Table

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P14-001 | bathroom-brand-priority-table.json 생성 | DONE | 아니오 |
| P14-002 | 욕실 8개 항목 브랜드 우선순위 정리 | DONE | 아니오 |
| P14-003 | 브랜드별 실제 공급가/납기/A/S 수집 시작 승인 | WAITING_APPROVAL | 예 |

## Phase 15: Bathroom Brand Real Price Research

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P15-001 | bathroom-brand-real-price-research-table.json 생성 | DONE | 아니오 |
| P15-002 | 욕실 브랜드별 실제 공급가 조사 필드 구성 | DONE | 아니오 |
| P15-003 | 실제 거래처 단가/납기/A/S 정보 수집 시작 승인 | WAITING_APPROVAL | 예 |

## Phase 16: Full DB Catalog

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P16-001 | docs/full-db-catalog.md 생성 | DONE | 아니오 |
| P16-002 | src/master-db/catalog/full-db-catalog.json 생성 | DONE | 아니오 |
| P16-003 | 전체 DB 카탈로그 필수 필드 검증 | DONE | 아니오 |
| P16-004 | 전체 카탈로그 기준 실제 DB 채우기 순서 승인 | WAITING_APPROVAL | 예 |

## Phase 17: Tile Process DB v1

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P17-001 | src/master-db/process-db/tile-process-v1.json 생성 | DONE | 아니오 |
| P17-002 | 타일 공정 20개 항목 구조화 | DONE | 아니오 |
| P17-003 | 공정 중심 + 공간 적용 조건 + 통합 인건비 구조 검증 | DONE | 아니오 |
| P17-004 | 타일 실제 단가/품수/소모품 조사 시작 승인 | WAITING_APPROVAL | 예 |

## Phase 18: Waterproof Process DB v1

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P18-001 | src/master-db/process-db/waterproof-process-v1.json 생성 | DONE | 아니오 |
| P18-002 | 방수 공정 20개 항목 구조화 | DONE | 아니오 |
| P18-003 | 모든 방수 공정 CONDITIONAL triggerType 검증 | DONE | 아니오 |
| P18-004 | 방수 실제 단가/품수/양생/하자 데이터 조사 시작 승인 | WAITING_APPROVAL | 예 |

## Phase 19: Conditional Process Trigger Policy

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P19-001 | docs/conditional-process-trigger-rules.md 생성 | DONE | 아니오 |
| P19-002 | MASTER_DB_SCHEMA.md 조건 기반 공정 생성 정책 반영 | DONE | 아니오 |
| P19-003 | diagnostics-rules.md 조건 부족/누락/삭제 경고 규칙 반영 | DONE | 아니오 |
| P19-004 | tile-process-v1.json 조건 판단 필드 추가 | DONE | 아니오 |
| P19-005 | waterproof-process-v1.json 조건 판단 필드 추가 | DONE | 아니오 |
| P19-006 | AUTO 공정 최소화 정책 검증 | DONE | 아니오 |

## Phase 20: Minimum Input / Preset Engine Structure

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P20-001 | docs/minimum-input-schema.md 생성 | DONE | 아니오 |
| P20-002 | docs/preset-engine-rules.md 생성 | DONE | 아니오 |
| P20-003 | docs/default-spec-engine-rules.md 생성 | DONE | 아니오 |
| P20-004 | docs/auto-process-decision-rules.md 생성 | DONE | 아니오 |
| P20-005 | docs/needs-confirmation-rules.md 생성 | DONE | 아니오 |
| P20-006 | minimum-project-input.schema.json 생성 | DONE | 아니오 |
| P20-007 | 프리셋 4종 JSON 생성 | DONE | 아니오 |
| P20-008 | 최소 입력 기반 실제 엔진 구현 승인 | WAITING_APPROVAL | 예 |

## Phase 21: Representative Structure Test Case

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P21-001 | tests/test-case-apartment-full-remodeling.json 생성 | DONE | 아니오 |
| P21-002 | 자동 생성 공정/조건부 판단/NEEDS_CONFIRMATION 구조 검증 | DONE | 아니오 |
| P21-003 | 운영 문서 자동 생성 후보 검증 | DONE | 아니오 |
| P21-004 | 실제 테스트 러너 구현 승인 | WAITING_APPROVAL | 예 |

## Phase 22: Standard Save / Report / Feedback Schemas

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P22-001 | project-save.schema.json 생성 | DONE | 아니오 |
| P22-002 | custom-preset.schema.json 생성 | DONE | 아니오 |
| P22-003 | default-input-template.schema.json 생성 | DONE | 아니오 |
| P22-004 | completion-report.schema.json 생성 | DONE | 아니오 |
| P22-005 | estimate-vs-actual-report.schema.json 생성 | DONE | 아니오 |
| P22-006 | master-db-update-request.schema.json 생성 | DONE | 아니오 |
| P22-007 | approval-log.schema.json 생성 | DONE | 아니오 |
| P22-008 | 저장/보고/피드백 사이클 문서 생성 | DONE | 아니오 |
| P22-009 | 실제 저장 모듈 구현 승인 | WAITING_APPROVAL | 예 |

## Phase 23: Full Closed Loop Test

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P23-001 | tests/full-cycle-test-project-001.json 생성 | DONE | 아니오 |
| P23-002 | STEP 1~12 전체 사이클 구조화 | DONE | 아니오 |
| P23-003 | Master DB 업데이트 요청/Approval Log/rollback 구조 검증 | DONE | 아니오 |
| P23-004 | Closed Loop 테스트 러너 구현 승인 | WAITING_APPROVAL | 예 |

## 다음 작업 제안

다음 작업은 Phase 1이다.

```text
기존 HTML을 legacy 폴더에 보존 복사한다.
```

또는 대표님 승인 후 다음 작업을 진행할 수 있다.

```text
욕실 공정 Master DB 샘플을 JSON fixture로 변환한다.
```
## Phase 24: Test Runner + Diagnostics Engine

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P24-001 | diagnostics-runner.spec.json 생성 | DONE | 아니오 |
| P24-002 | rule-validation-cases.json 생성 | DONE | 아니오 |
| P24-003 | test-runner-rules.md 작성 | DONE | 아니오 |
| P24-004 | diagnostics-engine-rules.md 작성 | DONE | 아니오 |
| P24-005 | diagnostics schema 4종 생성 | DONE | 아니오 |
| P24-006 | 12개 진단 케이스 JSON/필수 필드/결과 일치 검증 | DONE | 아니오 |
| P24-007 | 실제 TypeScript Test Runner 구현 | WAITING_APPROVAL | 예 |

## Phase 25: CEO Dashboard / BOC Dashboard

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P25-001 | ceo-dashboard-spec.md 작성 | DONE | 아니오 |
| P25-002 | dashboard-kpi-rules.md 작성 | DONE | 아니오 |
| P25-003 | dashboard-alert-rules.md 작성 | DONE | 아니오 |
| P25-004 | ceo-dashboard.schema.json 생성 | DONE | 아니오 |
| P25-005 | 7개 대시보드 섹션과 42개 카드 필수 필드 검증 | DONE | 아니오 |
| P25-006 | 실제 CEO Dashboard UI 구현 | WAITING_APPROVAL | 예 |

## Phase 26: CEO Dashboard Screen Structure / Mock Data

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P26-001 | ceo-dashboard.mock.json 생성 | DONE | 아니오 |
| P26-002 | dashboard-screen-layout.md 작성 | DONE | 아니오 |
| P26-003 | dashboard-widget-priority.md 작성 | DONE | 아니오 |
| P26-004 | main-dashboard-layout.schema.json 생성 | DONE | 아니오 |
| P26-005 | dashboard widget schema 6종 생성 | DONE | 아니오 |
| P26-006 | Mock Data와 UI Layout JSON 검증 | DONE | 아니오 |
| P26-007 | React CEO Dashboard 화면 구현 | WAITING_APPROVAL | 예 |

## Phase 27: Executable BOC CEO Dashboard UI

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P27-001 | React + Vite 기본 실행 구조 생성 | DONE | 아니오 |
| P27-002 | Electron main/preload/package 구조 생성 | DONE | 아니오 |
| P27-003 | Main CEO Dashboard 첫 화면 구현 | DONE | 아니오 |
| P27-004 | RED ALERT / 승인 대기 / 프로젝트 Drill Down 구현 | DONE | 아니오 |
| P27-005 | Approval 승인/반려/수정 요청 mock action 구현 | DONE | 아니오 |
| P27-006 | Master DB Review / 3D Ontology 연결 mock view 구현 | DONE | 아니오 |
| P27-007 | System English / Display Korean 구조 적용 | DONE | 아니오 |
| P27-008 | React production build 검증 | DONE | 아니오 |
| P27-009 | Electron EXE 실제 dist 생성 | WAITING_APPROVAL | 예 |

## Phase 28: CEO Decision Screen Upgrade

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P28-001 | TOP BAR를 실제 금액 KPI 중심으로 재구성 | DONE | 아니오 |
| P28-002 | RED ALERT Full Width 최상단 승격 | DONE | 아니오 |
| P28-003 | Approval Center 중앙 핵심 영역 승격 | DONE | 아니오 |
| P28-004 | Project List 숫자 KPI 추가 | DONE | 아니오 |
| P28-005 | 대표 Action Button 4종으로 단순화 | DONE | 아니오 |
| P28-006 | Today Overview Action 중심 재설계 | DONE | 아니오 |
| P28-007 | React production build 검증 | DONE | 아니오 |

## Phase 29: Final UI Polish / Electron Packaging

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P29-001 | Approval 버튼 GREEN/RED/YELLOW 강화 | DONE | 아니오 |
| P29-002 | Project Card 오늘 해야 할 것 추가 | DONE | 아니오 |
| P29-003 | Notification Log 추가 | DONE | 아니오 |
| P29-004 | Premium command center UI 고급화 | DONE | 아니오 |
| P29-005 | Web Audio API 버튼 사운드 구현 | DONE | 아니오 |
| P29-006 | sound ON/OFF 토글 구현 | DONE | 아니오 |
| P29-007 | Electron icon 생성 및 패키징 설정 연결 | DONE | 아니오 |
| P29-008 | npm run build 검증 | DONE | 아니오 |
| P29-009 | npm run dist installer 생성 | DONE | 아니오 |
| P29-010 | EXE 실행 검증 | BLOCKED_BY_OS_POLICY | 아니오 |

## Phase 30: Electron Production Load Fix

| ID | 작업 | 상태 | 승인 필요 |
|---|---|---|---|
| P30-001 | main.js 개발/배포 로드 경로 분리 | DONE | 아니오 |
| P30-002 | production loadFile 경로를 electron/dist/index.html 기준으로 수정 | DONE | 아니오 |
| P30-003 | ui/dist -> electron/dist 복사 스크립트 추가 | DONE | 아니오 |
| P30-004 | package files에 dist 포함 | DONE | 아니오 |
| P30-005 | vite base './' 확인 | DONE | 아니오 |
| P30-006 | preload.js 경로 확인 | DONE | 아니오 |
| P30-007 | Electron production smoke test 통과 | DONE | 아니오 |
| P30-008 | app.asar 내부 dist/index.html 포함 확인 | DONE | 아니오 |
| P30-009 | npm run dist win-unpacked 생성 통과 | DONE | 아니오 |
| P30-010 | win-unpacked EXE 직접 실행 확인 | BLOCKED_BY_OS_POLICY | 아니오 |
| P30-011 | NSIS installer 생성 | BLOCKED_BY_NSIS_POLICY | 아니오 |
## Phase 31: SQLite Real Storage Connection

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P31-001 | Create SQLite service layer for Project, Approval, Master, and Logs databases | DONE | No |
| P31-002 | Create local database files under storage/sqlite | DONE | No |
| P31-003 | Persist projects, estimates, estimate-vs-actual, repeated defects, and repeated loss processes | DONE | No |
| P31-004 | Persist approval decisions, rejection records, change requests, and action logs | DONE | No |
| P31-005 | Block Master DB updates unless approval is recorded first | DONE | No |
| P31-006 | Create rollback snapshots before approved Master DB value changes | DONE | No |
| P31-007 | Connect Electron IPC and preload API to SQLite service | DONE | No |
| P31-008 | Connect React dashboard store and approval store to live SQLite data | DONE | No |
| P31-009 | Remove dashboard dependency on UI mock data | DONE | No |
| P31-010 | Run db:init, build, smoke:prod, and dist verification | DONE | No |

## Phase 32: First Real Operating Project Registration

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P32-001 | Add operating project storage tables for inputs, preset results, processes, confirmations, payments, purchases, and schedule drafts | DONE | No |
| P32-002 | Create first operating project registration script | DONE | No |
| P32-003 | Register 24 pyeong old apartment full remodeling project in SQLite | DONE | No |
| P32-004 | Store minimum input and preset engine result | DONE | No |
| P32-005 | Store generated process list and NEEDS_CONFIRMATION items | DONE | No |
| P32-006 | Store payment plan, purchase requirements, and schedule draft | DONE | No |
| P32-007 | Create Approval Center items for CEO review | DONE | No |
| P32-008 | Verify project appears through dashboard SQLite service | DONE | No |
| P32-009 | Run Electron production smoke test | DONE | No |

## Phase 33: PRJ-REAL-APT-0001 Tile Waterproof Price Research

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P33-001 | Create tile-waterproof price research JSON schema | DONE | No |
| P33-002 | Create sample research table for tile, accessory materials, and waterproof materials | DONE | No |
| P33-003 | Add official, market, supplier, and internal price separation fields | DONE | No |
| P33-004 | Add sourceCandidates for each research item | DONE | No |
| P33-005 | Add approval flow requiring MasterDbUpdateRequest before Master DB update | DONE | No |
| P33-006 | Link research items to PRJ-REAL-APT-0001 and estimate-vs-actual comparison fields | DONE | No |
| P33-007 | Validate JSON parse, item count, category count, and no arbitrary price values | DONE | No |

## Phase 34: PRJ-REAL-APT-0001 Bathroom Fixtures Price Research

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P34-001 | Create bathroom fixtures price research JSON schema | DONE | No |
| P34-002 | Create sample research table for fixtures, furniture, mirrors, shower partitions, and accessories | DONE | No |
| P34-003 | Add brand candidates: Daelim Bath, Inus, Kyelim, American Standard, TOTO, Grohe, Hansgrohe, and Hanssem | DONE | No |
| P34-004 | Add dealer, supplier, internal, and market price separation fields | DONE | No |
| P34-005 | Add A/S, warranty, lead time, defect risk, and installation difficulty comparison fields | DONE | No |
| P34-006 | Link research items to PRJ-REAL-APT-0001 and MasterDbUpdateRequest approval flow | DONE | No |
| P34-007 | Validate JSON parse, item count, category count, brand coverage, and no arbitrary price values | DONE | No |

## Phase 35: PRJ-REAL-APT-0001 Window Glass Hardware Price Research

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P35-001 | Create window-glass-hardware price research JSON schema | DONE | No |
| P35-002 | Create sample research table for windows, glass, hardware, sealing, and insulation | DONE | No |
| P35-003 | Add partial/full/conditional replacement scope field | DONE | No |
| P35-004 | Add condensation risk field to every research item | DONE | No |
| P35-005 | Add official, market, dealer, supplier, and internal price separation fields | DONE | No |
| P35-006 | Add sourceCandidates and MasterDbUpdateRequest approval flow | DONE | No |
| P35-007 | Validate JSON parse, item count, category count, replacement scope, condensation risk, and no arbitrary price values | DONE | No |

## Phase 36: Supplier Contact Execution List

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P36-001 | Create supplier contact priority list document | DONE | No |
| P36-002 | Create vendor interview checklist document | DONE | No |
| P36-003 | Create supplier comparison template document | DONE | No |
| P36-004 | Create vendor priority list JSON for PRJ-REAL-APT-0001 | DONE | No |
| P36-005 | Include TOP 10 vendor contact priority | DONE | No |
| P36-006 | Include margin, defect, lead time, payment condition, relationship, contact method, and next action fields | DONE | No |
| P36-007 | Validate vendor JSON parse and required fields | DONE | No |

## Phase 37: Vendor CRM System Schema

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P37-001 | Create Vendor CRM rules document | DONE | No |
| P37-002 | Create Vendor Evaluation rules document | DONE | No |
| P37-003 | Create Vendor Follow-up rules document | DONE | No |
| P37-004 | Create Vendor Master schema | DONE | No |
| P37-005 | Create Vendor Contact Log schema | DONE | No |
| P37-006 | Create Vendor Evaluation schema | DONE | No |
| P37-007 | Include CEO approval rules for new vendor, blacklist, high-value vendor change, Master DB price update, and payment condition changes | DONE | No |
| P37-008 | Validate JSON schema parsing and required fields | DONE | No |

## Phase 38: Real Vendor Candidate Registration and Collection Rules

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P38-001 | Create real vendor candidate master file with public company names and regions | DONE | No |
| P38-002 | Create real vendor contact log seed for first follow-up actions | DONE | No |
| P38-003 | Create real vendor registration rules document | DONE | No |
| P38-004 | Create Seoul/Gyeonggi vendor candidate collection schema | DONE | No |
| P38-005 | Create Seoul/Gyeonggi vendor candidate sample | DONE | No |
| P38-006 | Create legal crawling, privacy, and source priority documents | DONE | No |
| P38-007 | Keep public candidates separate from verified Vendor Master records | DONE | No |
| P38-008 | Validate JSON parsing, required operational fields, and vendor counts | DONE | No |

## Phase 39: Vendor Contact Execution Package

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P39-001 | Create vendor contact script document | DONE | No |
| P39-002 | Create vendor verification checklist document | DONE | No |
| P39-003 | Create vendor call result template document | DONE | No |
| P39-004 | Create vendor contact action plan JSON for 12 candidates | DONE | No |
| P39-005 | Add first contact scripts and required question groups for each vendor | DONE | No |
| P39-006 | Add verification pass/fail criteria and contact log template for each vendor | DONE | No |
| P39-007 | Validate action plan JSON parse, vendor count, and required fields | DONE | No |

## Phase 40: Master DB Admin and Empty Data Management

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P40-001 | Create Master DB Admin rules document | DONE | No |
| P40-002 | Create data change request flow document | DONE | No |
| P40-003 | Create Import/Export rules document | DONE | No |
| P40-004 | Create Master DB Admin schema and sample | DONE | No |
| P40-005 | Create Empty Data State schema | DONE | No |
| P40-006 | Create React Master DB Admin view | DONE | No |
| P40-007 | Connect Master DB Review drill-down to Master DB Admin view | DONE | No |
| P40-008 | Validate JSON parsing and admin screen count | DONE | No |
| P40-009 | Run React production build and Electron production smoke test | DONE | No |

## Phase 41: Estimate Creation Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P41-001 | Create New Estimate Wizard screen | DONE | No |
| P41-002 | Create Estimate Preview screen | DONE | No |
| P41-003 | Create Schedule Draft Preview screen | DONE | No |
| P41-004 | Create Document Preview screen | DONE | No |
| P41-005 | Create estimate draft service with UNKNOWN/NEEDS_RESEARCH preliminary output | DONE | No |
| P41-006 | Create estimate draft and estimate preview JSON schemas | DONE | No |
| P41-007 | Create estimate creation, preliminary estimate, and NEEDS_CONFIRMATION display documents | DONE | No |
| P41-008 | Connect New Estimate button to dashboard drill-down | DONE | No |
| P41-009 | Validate JSON parsing, React build, Electron build:ui, and production smoke test | DONE | No |

## Phase 42: Estimate Draft SQLite Save

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P42-001 | Add estimate draft SQLite tables to Project DB migration | DONE | No |
| P42-002 | Implement saveEstimateDraft SQLite service method | DONE | No |
| P42-003 | Add Electron IPC handler for estimate draft save | DONE | No |
| P42-004 | Expose saveEstimateDraft through preload bridge | DONE | No |
| P42-005 | Connect New Estimate Wizard save button to SQLite save service | DONE | No |
| P42-006 | Store minimum input, generated processes, conditional processes, confirmations, documents, warnings, and preliminary estimate payload | DONE | No |
| P42-007 | Create Approval Center items for NEEDS_CONFIRMATION records | DONE | No |
| P42-008 | Create Notification Log and Action Log entries on save | DONE | No |
| P42-009 | Refresh Dashboard Project List after save | DONE | No |
| P42-010 | Run direct save verification, React build, Electron build:ui, and production smoke test | DONE | No |

## Phase 43: Saved Estimate Draft Reopen and Edit

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P43-001 | Add estimate draft change log SQLite table | DONE | No |
| P43-002 | Implement loadEstimateDraftForProject service method | DONE | No |
| P43-003 | Implement updateEstimateDraft service method with before/after diff | DONE | No |
| P43-004 | Add Electron IPC handlers for estimate draft load/update | DONE | No |
| P43-005 | Expose load/update through preload bridge and UI service | DONE | No |
| P43-006 | Add Project Detail load button for saved preliminary estimate drafts | DONE | No |
| P43-007 | Open New Estimate Wizard in edit mode with saved minimumInput and draft data | DONE | No |
| P43-008 | Make NEEDS_CONFIRMATION fields editable and document drafts regenerable | DONE | No |
| P43-009 | Record update changes in estimate_draft_change_logs, action_logs, and notification_logs | DONE | No |
| P43-010 | Run direct load/update verification, React build, Electron build:ui, and production smoke test | DONE | No |

## Phase 44: Estimate Approval Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P44-001 | Add estimate approval and final estimate SQLite tables | DONE | No |
| P44-002 | Create EstimateApproval approvals when saving preliminary estimate drafts | DONE | No |
| P44-003 | Add estimate approval checklist and blocking validation in SQLite service | DONE | No |
| P44-004 | Generate FINAL_ESTIMATE and final estimate documents after successful CEO approval | DONE | No |
| P44-005 | Keep rejected/revision-requested estimates in PRELIMINARY state | DONE | No |
| P44-006 | Record estimate approval logs with checklist and blocking reasons | DONE | No |
| P44-007 | Create EstimateApprovalView UI | DONE | No |
| P44-008 | Connect Approval drill-down to EstimateApprovalView | DONE | No |
| P44-009 | Run direct final estimate approval verification, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 45: Project Execution Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P45-001 | Add execution project SQLite tables | DONE | No |
| P45-002 | Implement execution readiness validation | DONE | No |
| P45-003 | Implement FINAL_ESTIMATE to EXECUTION_READY transition | DONE | No |
| P45-004 | Generate execution documents, purchase order draft, payment milestones, site report template, and inspection checklists | DONE | No |
| P45-005 | Add action log, notification log, and execution log records on transition | DONE | No |
| P45-006 | Create ProjectExecutionView UI | DONE | No |
| P45-007 | Create ExecutionDocumentPreview UI | DONE | No |
| P45-008 | Connect Project Detail view to execution readiness and transition service | DONE | No |
| P45-009 | Run direct execution transition verification, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 46: Site Operation Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P46-001 | Add site operation SQLite tables | DONE | No |
| P46-002 | Implement EXECUTION_READY to IN_PROGRESS transition | DONE | No |
| P46-003 | Implement daily site report save flow | DONE | No |
| P46-004 | Implement material delivery check save flow | DONE | No |
| P46-005 | Implement inspection result save flow with downstream process blocking | DONE | No |
| P46-006 | Implement site issue and site risk log creation | DONE | No |
| P46-007 | Implement change order request creation with approval queue | DONE | No |
| P46-008 | Create Site Operation UI screens | DONE | No |
| P46-009 | Connect Project Detail to Site Operation view | DONE | No |
| P46-010 | Run direct site operation simulation, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 47: Change Order Approval Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P47-001 | Add change order approval impact SQLite tables | DONE | No |
| P47-002 | Implement ChangeOrder approval decision handling | DONE | No |
| P47-003 | Prevent cost, schedule, and payment reflection before CEO approval | DONE | No |
| P47-004 | Generate cost impact after approval | DONE | No |
| P47-005 | Generate schedule impact and schedule draft item after approval | DONE | No |
| P47-006 | Generate additional payment milestone after approval | DONE | No |
| P47-007 | Keep rejected change orders in IN_PROGRESS with no reflection | DONE | No |
| P47-008 | Re-register revision-requested change orders in Approval Center | DONE | No |
| P47-009 | Create ChangeOrderApprovalView and service | DONE | No |
| P47-010 | Run direct change order approval verification, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 48: Project Completion Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P48-001 | Add completion, actual cost, actual duration, final margin, variance, and Master DB candidate tables | DONE | No |
| P48-002 | Block completion unless project is IN_PROGRESS | DONE | No |
| P48-003 | Require actual cost before final margin confirmation | DONE | No |
| P48-004 | Generate Completion Report and Actual Cost records | DONE | No |
| P48-005 | Generate Estimate vs Actual Report | DONE | No |
| P48-006 | Generate Master DB Update Candidate without modifying Master DB | DONE | No |
| P48-007 | Link defects and claims as Case Library candidates | DONE | No |
| P48-008 | Create Project Completion UI screens and service | DONE | No |
| P48-009 | Connect Project Detail to Project Completion view | DONE | No |
| P48-010 | Run direct completion verification, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 49: Case Library + Learning Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P49-001 | Add Case Library, pattern, suggestion, and auto update candidate tables | DONE | No |
| P49-002 | Auto-register completed projects as Case Library records | DONE | No |
| P49-003 | Classify cases by process/risk categories | DONE | No |
| P49-004 | Detect repeated defect, claim, rework, low-margin, and loss patterns | DONE | No |
| P49-005 | Detect repeated profit patterns | DONE | No |
| P49-006 | Generate learning suggestions without auto-applying Master DB changes | DONE | No |
| P49-007 | Create Approval Required items for learning suggestions | DONE | No |
| P49-008 | Create Case Library UI screens and service | DONE | No |
| P49-009 | Connect Case Library to CEO Dashboard drill-down | DONE | No |
| P49-010 | Run direct learning analysis verification, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 50: Learning Suggestion Approval Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P50-001 | Add learning approval log and rollback snapshot tables | DONE | No |
| P50-002 | Promote Learning Engine approvals to LearningSuggestion type | DONE | No |
| P50-003 | Create Learning Suggestion approval UI | DONE | No |
| P50-004 | Create learning approval service helpers | DONE | No |
| P50-005 | Approve LearningSuggestion only when repeated Case evidence exists | DONE | No |
| P50-006 | Create Master DB Update Request on approval | DONE | No |
| P50-007 | Create learning and Master DB rollback snapshots before applying | DONE | No |
| P50-008 | Apply approved value to Master DB values only after CEO approval | DONE | No |
| P50-009 | Record reject and revision request outcomes | DONE | No |
| P50-010 | Run approval, revision, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 51: Backup / Restore / Export Flow

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P51-001 | Add Electron backup service | DONE | No |
| P51-002 | Add backup, restore, and export audit log tables | DONE | No |
| P51-003 | Implement full SQLite backup with manifest and checksum | DONE | No |
| P51-004 | Implement DB-specific backup for project, approval, master, and logs | DONE | No |
| P51-005 | Implement JSON export with reimportable row structure | DONE | No |
| P51-006 | Implement Excel report export | DONE | No |
| P51-007 | Implement restore preview with checksum verification | DONE | No |
| P51-008 | Block restore without CEO approval and create pre-restore backup | DONE | No |
| P51-009 | Create Backup/Restore and Export UI screens | DONE | No |
| P51-010 | Run backup/export/restore-block verification, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 52: 3D Ontology Viewer

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P52-001 | Create ontology graph schema | DONE | No |
| P52-002 | Create ontology node type definitions | DONE | No |
| P52-003 | Create ontology edge type definitions | DONE | No |
| P52-004 | Build ontology graph service from Dashboard data | DONE | No |
| P52-005 | Visualize Project, Process, Material, Approval, Risk, Payment, and Case nodes | DONE | No |
| P52-006 | Add project and process filters | DONE | No |
| P52-007 | Highlight Risk and Approval Pending nodes | DONE | No |
| P52-008 | Add click-to-detail node drawer panel | DONE | No |
| P52-009 | Connect Dashboard drill-down to 3D Ontology Viewer | DONE | No |
| P52-010 | Run schema validation, React build, Electron build:ui, and smoke test | DONE | No |

## Phase 53: Final Integration QA + Release Stabilization

| ID | Task | Status | Approval Required |
|---|---|---|---|
| P53-001 | Create final integration QA report | DONE | No |
| P53-002 | Create release readiness checklist | DONE | No |
| P53-003 | Create final E2E flow checklist JSON | DONE | No |
| P53-004 | Create release smoke test plan JSON | DONE | No |
| P53-005 | Validate SQLite DB state and dashboard connectivity | DONE | No |
| P53-006 | Validate JSON checklist files | DONE | No |
| P53-007 | Run React production build | DONE | No |
| P53-008 | Run Electron build:ui and production smoke test | DONE | No |
| P53-009 | Run win-unpacked EXE package build | DONE | No |
| P53-010 | Launch packaged EXE and confirm window title | DONE | No |
