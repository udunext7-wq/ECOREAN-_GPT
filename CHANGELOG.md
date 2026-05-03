# 변경 기록

## 2026-04-25

### Added

- Auto-Pilot 개발 방식 문서화
- `PLAN.md` 생성
- `SPEC.md` 생성
- `ARCHITECTURE.md` 생성
- `MASTER_DB_SCHEMA.md` 생성
- `TASKS.md` 생성
- `TEST_PLAN.md` 생성
- `CHANGELOG.md` 생성
- `bathroom-process-master-sample.md` 생성
- 욕실 공정 Master DB 샘플 v0.1 작성
- 욕실 공정의 defaultSpec, optionGroups, ontologyRelation, triggerType, priceLogic, scheduleLogic, orderTiming, outputPolicy 기준안 작성
- `material-impact-schema.md` 생성
- 모든 공정에 주자재, 부자재, 소모품, 접착재, 보양재, 운반/양중, 폐기물, 손실률을 포함하는 v0.2 스키마 제안안 작성
- 타일 공정 필수 항목과 priceAdjust, laborImpact, materialImpact, durationImpact 구조 작성
- `price-source-policy.md` 생성
- official/supplier/market/internal 4단계 단가 출처 정책 작성
- PriceRecord 필수 필드 작성
- 최종 견적에 selectedPriceBasis와 price trace를 기록하는 구조 작성
- 프로젝트 1차 폴더 구조 생성: `legacy`, `master-db`, `estimate-engine`, `schedule-engine`, `outputs/customer`, `outputs/internal`, `storage/sqlite`, `ui`, `electron`, `docs`, `tests`
- 각 핵심 폴더에 README 생성
- `priceStatus` 필수 필드 반영
- AI 조직 구조와 선택 공정 원칙 문서 보강
- `src/master-db/seed/bathroom-process-sample.json` 생성
- 욕실 공정 샘플 데이터 16개 항목 작성
- 실제 단가 미확정 원칙에 따라 금액/기간/리드타임 필드는 `NEEDS_RESEARCH`로 처리
- `MASTER_DB_SCHEMA.md`에 공정 중심 통합 계산 구조 v0.4 제안 반영
- 모든 공정 구조에 `appliesToSpaces`, `spaceFactor`, `minimumLaborCharge`, `batchingRule`, `mobilizationCost`, `crewType`, `crewProductivity`, `laborAggregationRule` 필드 추가
- `bathroom-process-sample.json`에 공간별 입력 -> 공정별 통합 -> 최소 품수 적용 -> 통합 인건비 산출 -> 공간별 고객 견적 분배 구조 반영
- `docs/graph-schema.md` 생성
- `docs/ontology-visualization-rules.md` 생성
- `docs/ml-readiness-plan.md` 생성
- `docs/case-library-schema.md` 생성
- `docs/rule-engine-principles.md` 생성
- 온톨로지 기반 지식 그래프, Rule Engine, Case Library, ML 보정 구조 문서화
- `docs/schedule-rules.md` 생성
- `docs/process-dependency-schema.md` 생성
- `docs/material-order-timing-rules.md` 생성
- `docs/labor-allocation-rules.md` 생성
- `docs/diagnostics-rules.md` 생성
- 견적 선택값에서 공정표, 자재 발주, 인력 투입, 진단이 자동 생성되는 일정/공정관리 설계 문서화
- `docs/operation-ontology-schema.md` 생성
- `docs/payment-milestone-rules.md` 생성
- `docs/purchase-order-rules.md` 생성
- `docs/cashflow-rules.md` 생성
- `docs/change-order-rules.md` 생성
- `docs/inspection-and-defect-rules.md` 생성
- `docs/project-lifecycle-schema.md` 생성
- 계약, 수금, 발주, 현금흐름, 추가공사, 검수, 하자, 정산까지 연결하는 BOC 운영 온톨로지 문서화
- `docs/purchase-order-schema.md` 생성
- `docs/daily-site-report-schema.md` 생성
- `docs/material-delivery-check-schema.md` 생성
- `docs/inspection-checklist-schema.md` 생성
- `docs/change-order-approval-schema.md` 생성
- `docs/defect-management-schema.md` 생성
- `docs/cashflow-management-schema.md` 생성
- `docs/payment-claim-rules.md` 생성
- `docs/subcontract-settlement-schema.md` 생성
- `docs/client-handover-checklist.md` 생성
- `docs/closed-loop-operating-system.md` 생성
- `docs/feedback-loop-rules.md` 생성
- `docs/master-db-update-policy.md` 생성
- `docs/actual-vs-estimate-analysis.md` 생성
- `docs/continuous-improvement-rules.md` 생성
- Closed Loop Operating System 운영 문서 15종 스키마 설계
- `src/master-db/seed/bathroom-remodeling-ontology.sample.json` 생성
- 욕실 리모델링 공정 25개를 견적, 공정, 발주, 인력, 결제, 검수, 하자, 피드백 구조로 연결한 온톨로지 샘플 작성
- `docs/3d-ontology-visualization-spec.md` 생성
- `docs/graph-node-style-rules.md` 생성
- `docs/graph-filter-rules.md` 생성
- `docs/graph-risk-detection-rules.md` 생성
- 온톨로지 3D 그래프 시각화 구조, 노드/관계 스타일, 필터, 리스크 탐지 규칙 문서화
- `src/master-db/price-research/bathroom-price-research-table.json` 생성
- 욕실 리모델링 적용 단가 수집을 위한 조사 테이블 구조 작성
- 타일, 방수, 접착재, 도기류, 천장/전기, 기타 항목의 official/market/supplier/internal 단가 분리 수집 구조 작성

### Diagnostics Engine / Test Runner

- `tests/diagnostics-runner.spec.json` 생성
- `tests/rule-validation-cases.json` 생성
- `docs/test-runner-rules.md` 생성
- `docs/diagnostics-engine-rules.md` 생성
- `src/diagnostics/rule-checker.schema.json` 생성
- `src/diagnostics/warning-rules.schema.json` 생성
- `src/diagnostics/blocking-rules.schema.json` 생성
- `src/diagnostics/approval-required-rules.schema.json` 생성
- Test Runner + Diagnostics Engine의 12개 판정 케이스를 구성하고, BLOCKED/WARN/APPROVAL_REQUIRED/NEEDS_CONFIRMATION 결과가 실제 검증 가능하도록 정리했다.
- JSON 파싱, 필수 필드, expectedResult/actualResult 일치, 집계값 검증을 통과했다.

### CEO Dashboard / BOC Dashboard

- `docs/ceo-dashboard-spec.md` 생성
- `docs/dashboard-kpi-rules.md` 생성
- `docs/dashboard-alert-rules.md` 생성
- `src/dashboard/ceo-dashboard.schema.json` 생성
- Today Overview, Profit Dashboard, Risk Dashboard, Process Dashboard, Approval Center, Learning Dashboard, 3D Ontology View 연결 구조를 정의했다.
- 모든 대시보드 카드에 sourceData, updateFrequency, owner, warningThreshold, blockingThreshold, approvalNeeded, relatedDocument, relatedProject, actionButton 구조를 적용했다.
- CEO Dashboard JSON 구조 검증 결과 7개 섹션, 42개 카드, 필수 필드 누락 0건으로 확인했다.

### CEO Dashboard Screen Structure / Mock Data

- `src/dashboard/mock-data/ceo-dashboard.mock.json` 생성
- `docs/dashboard-screen-layout.md` 생성
- `docs/dashboard-widget-priority.md` 생성
- `src/dashboard/ui-layout/main-dashboard-layout.schema.json` 생성
- `src/dashboard/ui-layout/today-overview-widget.schema.json` 생성
- `src/dashboard/ui-layout/profit-dashboard-widget.schema.json` 생성
- `src/dashboard/ui-layout/risk-dashboard-widget.schema.json` 생성
- `src/dashboard/ui-layout/process-dashboard-widget.schema.json` 생성
- `src/dashboard/ui-layout/approval-center-widget.schema.json` 생성
- `src/dashboard/ui-layout/learning-dashboard-widget.schema.json` 생성
- TOP BAR, LEFT PANEL, CENTER MAIN, RIGHT PANEL, BOTTOM SECTION, FLOATING ACTION 기준의 실제 운영 화면 구조를 정의했다.
- Mock Data에 4개 프로젝트, 3개 빨간 경고, 6개 TOP BAR KPI, 3개 Immediate Action을 구성했다.
- JSON 8개 파일 파싱과 위젯 필수 필드 검증을 통과했다.

### Executable BOC CEO Dashboard UI

- `ui/package.json`, `ui/vite.config.ts`, `ui/tsconfig.json`, `ui/index.html` 생성
- `ui/src/main.tsx`, `ui/src/styles.css`, `ui/src/data/ceoDashboardMock.ts`, `ui/src/types/dashboard.ts` 생성
- `ui/app/dashboard/CeoDashboard.tsx` 생성
- `ui/app/projects`, `ui/app/approvals`, `ui/app/risks`, `ui/app/ontology`, `ui/app/settings` 기본 화면 파일 생성
- `ui/components` 하위에 cards, widgets, tables, alerts, modals 컴포넌트 생성
- `ui/state` 하위에 dashboard-store, approval-store, project-store, risk-store 생성
- `ui/services` 하위에 diagnostics-service, approval-service, project-service, ontology-service 생성
- `electron/main.js`, `electron/preload.js`, `electron/package.json` 생성
- System Layer는 영어 타입/키/서비스/상태명으로 유지하고, Display Layer는 한글 UI 문구로 구현했다.
- Mock Data 기반 Main CEO Dashboard, RED ALERT, 프로젝트 Drill Down, 승인/반려/수정 요청, Master DB Review, 3D Ontology 연결 화면을 구현했다.
- `npm run build` 및 Electron `build:ui` 검증을 통과했다.
- 로컬 개발 서버 `http://127.0.0.1:5173` 응답 확인을 완료했다.

### CEO Decision Screen Upgrade

- TOP BAR KPI를 추상 문구에서 실제 판단 금액 중심으로 변경했다.
- 오늘 입금 예정, 오늘 지급 예정, 순현금흐름, 미수금, 잔금 청구 가능, 예상 손실 금액을 최상단 KPI로 재구성했다.
- RED ALERT를 TOP BAR 바로 아래 Full Width 영역으로 승격했다.
- 방수 검수 실패, 공정 차단 필요, 발주 지연, 잔금 청구 불가, Master DB 승인 대기를 RED ALERT로 표시했다.
- Approval Center를 사이드 영역에서 중앙 핵심 의사결정 영역으로 승격했다.
- Project List에 수익률, 위험도, 미수금, 공정률, 잔여 공기를 추가했다.
- 대표 핵심 버튼을 승인, 차단, 발주, 청구 4개로 단순화했다.
- Today Overview를 설명 중심에서 Action 중심 구조로 변경했다.
- React production build 검증을 통과했다.

### Final UI Polish / Electron Packaging

- Approval Center 버튼을 승인 GREEN, 반려 RED, 수정 요청 YELLOW로 강화했다.
- Project Card에 `오늘 해야 할 것` 목록을 추가했다.
- Dashboard 하단에 Notification Log를 추가했다.
- Web Audio API 기반 UI 사운드를 추가했다.
- 사운드 ON/OFF 토글을 RED ALERT 헤더에 추가했다.
- 외부 음원 파일 없이 승인/반려/수정 요청/차단/발주/청구/3D Ontology/Project Drill Down/Master DB Review 클릭음을 연결했다.
- black metal, dark glass, subtle neon edge light 기준으로 glassmorphism, 메탈 라인, hover glow, premium command center 스타일을 강화했다.
- Electron 아이콘 `electron/build/icon.ico`를 생성하고 `electron/package.json`에 연결했다.
- `npm run build` 통과
- `npm run dist` 통과
- Windows installer `electron/release/ECOREAN BOC CEO Dashboard Setup 0.1.0.exe` 생성
- unpacked 실행 파일 `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe` 생성
- 현재 PC의 Application Control 정책으로 생성된 EXE 직접 실행 검증은 차단되었다.

### Electron Production Load Fix

- `electron/main.js` production load 경로를 `path.join(__dirname, 'dist', 'index.html')`로 수정했다.
- 개발 모드는 `loadURL('http://127.0.0.1:5173')`, 배포 모드는 `loadFile(...)`로 명확히 분리했다.
- `electron/scripts/copy-ui-dist.js`를 추가해 `ui/dist`를 패키징 전 `electron/dist`로 복사하도록 했다.
- `electron/package.json`의 `files` 설정을 `dist/**/*` 포함 구조로 수정했다.
- `ECOREAN_SMOKE_TEST=1` production smoke test 모드를 추가해 Electron이 build된 index.html을 실제로 로드하는지 검증 가능하게 했다.
- `npm run smoke:prod` 결과 `BOC dashboard loaded`를 확인했다.
- 최종 `app.asar` 내부에 `dist/index.html`, CSS, JS asset이 포함되는 것을 확인했다.
- `npm run dist`를 안정적인 `win-unpacked` 생성 명령으로 조정했고, NSIS installer 생성은 `npm run dist:installer`로 분리했다.
- 현재 PC의 Application Control 정책으로 win-unpacked EXE 직접 실행은 차단되었으나, Electron production load smoke test는 통과했다.

### Notes

- 기존 HTML 파일은 삭제하지 않는다.
- 구조 변경, DB 스키마 변경, 단가/마진/표준사양 변경 전에는 대표님 승인 대기한다.
- 현재 단계에서는 코드 작성 없이 설계 문서만 생성했다.
- 욕실 공정 단가는 설계용 기준안이며, 대표님 승인 전 운영 단가로 확정하지 않는다.
- 자재/부자재 영향 구조는 Master DB 스키마 변경에 해당하므로 실제 반영 전 대표님 승인 필요.
- 단가 출처 및 가격 기준 구조는 Master DB 스키마 변경에 해당하므로 실제 반영 전 대표님 승인 필요.
- 욕실 공정 샘플 JSON은 코드 구현이 아닌 seed 데이터 초안이며, 운영 단가로 확정하지 않는다.
- 인건비는 공간별 단독 계산이 아니라 공정별 통합 계산 기준으로 설계한다.
- 현재 단계에서는 실제 그래프 DB, Rule Engine, ML 코드를 구현하지 않고 문서와 스키마만 작성했다.
- 견적과 공정표는 분리하지 않고 동일 온톨로지 기반 데이터에서 생성한다.
- 현재 단계에서는 운영 온톨로지 문서와 JSON/TypeScript 형태의 스키마만 작성했고 실제 DB 구현은 하지 않았다.
- 모든 운영 문서는 고객용/내부용 분리, Master DB/Case Library 피드백, 예상값 vs 실제값 비교 구조를 포함한다.
- 욕실 리모델링 온톨로지 샘플은 실제 단가를 확정하지 않고 `NEEDS_RESEARCH` 또는 `UNKNOWN`으로 처리했다.
- 3D 시각화는 현재 코드 구현 없이 명세만 작성했다.
- 단가 조사 테이블에는 실제 단가를 임의 입력하지 않고 모든 가격 필드를 `NEEDS_RESEARCH`로 유지했다.
- `docs/brand-db-schema.md` 생성
- `docs/brand-compatibility-rules.md` 생성
- `docs/brand-selection-rules.md` 생성
- `docs/customer-brand-preference-rules.md` 생성
- `src/master-db/brand-research/brand-db-research-table.json` 생성
- 욕실, 타일, 창호, 주방, 마감재 브랜드 DB 조사 테이블 구조 작성
- 실제 브랜드명/모델명/단가를 추정하지 않고 미확정 값은 `NEEDS_RESEARCH`로 유지했다.
- `src/master-db/brand-db/bathroom-brand-priority-table.json` 생성
- 욕실 우선 브랜드 조사 테이블에 대림바스, 아메리칸스탠다드, 계림, 이누스, 한샘, TOTO, GROHE, hansgrohe 후보를 반영했다.
- 가격은 추정하지 않고 `supplierPrice`, `internalPrice`는 `NEEDS_RESEARCH`로 유지했다.
- `src/master-db/brand-db/bathroom-brand-real-price-research-table.json` 생성
- 욕실 브랜드별 실제 공급가 조사 구조에 dealerPrice, supplierPrice, internalPrice, 납기, A/S, 하자율, 시공팀 선호도, 대체 브랜드 관계를 반영했다.
- 실제 가격 입력 없이 모든 가격 필드를 `NEEDS_RESEARCH`로 유지했다.
- `docs/full-db-catalog.md` 생성
- `src/master-db/catalog/full-db-catalog.json` 생성
- 공정, 자재, 부자재/소모품, 브랜드, 인건비/품수, 외주/장비/운반, 일정/발주, 리스크/하자, 계약/수금/정산, 운영 문서까지 전체 DB 카탈로그 10개 영역을 정의했다.
- 전체 카탈로그 150개 항목에 requiredDataFields, sourceCandidates, priority, dataStatus, owner, updateCycle, linkedSystems를 반영했다.
- `src/master-db/process-db/tile-process-v1.json` 생성
- 타일 공정 DB v1에 벽타일, 바닥타일, 포세린, 대형타일, 박판타일, 모자이크, 계단, 외부, 졸리컷, 줄눈, 에폭시 줄눈, 코너 마감, 레벨링, 접착재, 프라이머, 방수 연계, 보양/청소 등 20개 공정을 반영했다.
- 타일 공정은 공간별 단독 계산이 아니라 공정 중심 + 공간 적용 조건 + 통합 인건비 산출 구조로 설계했다.
- `src/master-db/process-db/waterproof-process-v1.json` 생성
- 방수 공정 DB v1에 액체방수, 도막방수, 탄성방수, 시멘트계, 우레탄, 에폭시, 프라이머, 코너 보강, 배수구 처리, 벽체/바닥/젠다이/샤워부스/외부 방수, 누수 보수, 테스트, 양생, 재방수, 보양, 검수 등 20개 공정을 반영했다.
- 모든 방수 공정은 `triggerType=CONDITIONAL`로 설계하고 바닥 철거, 벽체 철거, 기존 방수층 손상, 배관 변경, 샤워구역 변경, 누수 이력, 고객 요청, 부분/전체 공사 조건을 반영했다.
- `docs/conditional-process-trigger-rules.md` 생성
- `MASTER_DB_SCHEMA.md`에 조건 기반 공정 생성 정책과 ProcessTriggerPolicy 구조를 추가했다.
- `docs/diagnostics-rules.md`에 NEEDS_CONFIRMATION, 선행공정 누락, 고위험 제외, 삭제 후 연결 레코드 잔존 경고 규칙을 추가했다.
- `tile-process-v1.json`과 `waterproof-process-v1.json`에 triggerConditions, exclusionConditions, needsConfirmationWhen, autoGeneratedReason, customerExplanation, internalReasonLog, relatedRiskFlags, diagnosticWarnings, caseLibraryFeedback 필드를 반영했다.
- 타일 공정 중 기존 AUTO 성격이던 줄눈, 압착시멘트, 보양/청소를 CONDITIONAL 판단 구조로 변경했다.
- `docs/minimum-input-schema.md` 생성
- `docs/preset-engine-rules.md` 생성
- `docs/default-spec-engine-rules.md` 생성
- `docs/auto-process-decision-rules.md` 생성
- `docs/needs-confirmation-rules.md` 생성
- `src/master-db/input-schema/minimum-project-input.schema.json` 생성
- `src/master-db/presets/apartment-full-remodeling.preset.json` 생성
- `src/master-db/presets/bathroom-remodeling.preset.json` 생성
- `src/master-db/presets/kitchen-remodeling.preset.json` 생성
- `src/master-db/presets/partial-repair.preset.json` 생성
- 최소 입력값 -> Preset Engine -> Rule Engine -> Default Spec Engine -> Estimate/Schedule/Document/Diagnostics 흐름을 설계했다.
- `tests/test-case-apartment-full-remodeling.json` 생성
- 24평 구축 아파트 전체 리모델링 대표 테스트 케이스를 작성했다.
- 최소 입력값만으로 자동 생성 공정, 조건부 판단, NEEDS_CONFIRMATION, defaultSpec 후보, 운영 문서, diagnostics 경고를 검증하는 구조를 만들었다.
- `src/storage/project-save/project-save.schema.json` 생성
- `src/master-db/presets/custom-preset.schema.json` 생성
- `src/master-db/input-schema/default-input-template.schema.json` 생성
- `src/project-db/completion-report.schema.json` 생성
- `src/case-library/estimate-vs-actual-report.schema.json` 생성
- `src/approval-log/master-db-update-request.schema.json` 생성
- `src/approval-log/approval-log.schema.json` 생성
- 프로젝트 저장, 커스텀 프리셋, 기본 입력 템플릿, 완료 보고서, 예상 vs 실제 오차 분석, Master DB 업데이트 요청, Approval Log 표준 스키마를 설계했다.
- 저장/보고/프리셋/피드백 사이클 문서를 생성했다.
- `tests/full-cycle-test-project-001.json` 생성
- 24평 구축 아파트 전체 리모델링 기준 Minimum Input부터 Master DB 업데이트 후보와 Approval Log까지 12단계 Closed Loop Operating System 구조 테스트를 작성했다.
- 전체 사이클 테스트에 공정 생성, 조건부 판단, NEEDS_CONFIRMATION, defaultSpec, 견적/공정표/문서, 완료 보고서, 오차 분석, 업데이트 요청, rollback 구조를 포함했다.
# Change Log Addendum - SQLite Real Storage

## 2026-04-25 - Phase 37

### Added

- Added `docs/vendor-crm-rules.md`.
- Added `docs/vendor-evaluation-rules.md`.
- Added `docs/vendor-followup-rules.md`.
- Added `src/master-db/vendor-db/vendor-crm.schema.json`.
- Added `src/master-db/vendor-db/vendor-contact-log.schema.json`.
- Added `src/master-db/vendor-db/vendor-evaluation.schema.json`.
- Defined Vendor Master, Contact Log, and Vendor Evaluation structures for Living Master DB feedback.
- Added CEO approval rules for new vendor registration, blacklist registration, high-value vendor change, Master DB supplier price update, and payment condition changes.

### Verified

- Vendor CRM, Contact Log, and Evaluation schemas parse successfully.
- Required fields are present for Vendor Master, Contact Log, and Vendor Evaluation.

## 2026-04-25 - Phase 36

### Added

- Added `docs/supplier-contact-priority-list.md`.
- Added `docs/vendor-interview-checklist.md`.
- Added `docs/supplier-comparison-template.md`.
- Added `src/master-db/vendor-db/vendor-priority-list.json`.
- Defined this week's TOP 10 supplier contact execution list for `PRJ-REAL-APT-0001`.
- Added vendor priority fields for margin impact, defect risk impact, lead time impact, payment condition importance, current relationship status, first contact method, and next action.
- Added must-ask vendor questions for tile, waterproof, bathroom fixtures, window/glass, sealant, electrical material, and waste disposal suppliers.

### Verified

- Vendor priority JSON parses successfully.
- TOP 10 vendor slots are present.
- All required vendor fields are present.

## 2026-04-25 - Phase 35

### Added

- Added `src/master-db/pricing-research/window-glass-hardware-price-research.schema.json`.
- Added `src/master-db/pricing-research/window-glass-hardware-price-research.sample.json`.
- Added `docs/window-glass-hardware-price-research-rules.md`.
- Defined the third real price research structure for `PRJ-REAL-APT-0001`.
- Added 33 research items: 10 window items, 8 glass items, 8 hardware items, and 7 sealing/insulation items.
- Added replacement scope management for partial, full, conditional, and confirmation-needed decisions.
- Added condensation risk management to every item.
- Added approval flow requiring `MasterDbUpdateRequest` before any Master DB update.

### Verified

- JSON schema and sample parse successfully.
- Every item is linked to `PRJ-REAL-APT-0001`.
- Every item includes condensation risk.
- All price fields remain `UNKNOWN` or `NEEDS_RESEARCH`.
- No arbitrary price value was inserted.

## 2026-04-25 - Phase 34

### Added

- Added `src/master-db/pricing-research/bathroom-fixtures-price-research.schema.json`.
- Added `src/master-db/pricing-research/bathroom-fixtures-price-research.sample.json`.
- Added `docs/bathroom-fixtures-price-research-rules.md`.
- Defined the second real price research structure for `PRJ-REAL-APT-0001`.
- Added 23 bathroom research items: 7 fixtures, 5 bathroom furniture/mirror items, 4 shower/partition items, and 7 accessory items.
- Added brand candidates: Daelim Bath, Inus, Kyelim, American Standard, TOTO, Grohe, Hansgrohe, and Hanssem.
- Added comparison fields for dealer price, supplier price, internal price, A/S policy, warranty period, lead time, defect risk, and installation difficulty.

### Verified

- JSON schema and sample parse successfully.
- Every item is linked to `PRJ-REAL-APT-0001`.
- All required brand candidates are included.
- All price fields remain `UNKNOWN` or `NEEDS_RESEARCH`.
- No arbitrary price value was inserted.

## 2026-04-25 - Phase 33

### Added

- Added `src/master-db/pricing-research/tile-waterproof-price-research.schema.json`.
- Added `src/master-db/pricing-research/tile-waterproof-price-research.sample.json`.
- Added `docs/tile-waterproof-price-research-rules.md`.
- Defined the first real price research structure for `PRJ-REAL-APT-0001`.
- Added 25 research items: 8 tile items, 11 accessory material items, and 6 waterproof material items.
- Separated `officialPrice`, `marketPrice`, `supplierPrice`, and `internalPrice`.
- Added `sourceCandidates`, `estimateVsActualLink`, and `approvalFlow` to each research item.

### Verified

- JSON schema and sample parse successfully.
- Every item is linked to `PRJ-REAL-APT-0001`.
- All price fields remain `UNKNOWN` or `NEEDS_RESEARCH`.
- No arbitrary price value was inserted.

## 2026-04-25 - Phase 31

### Added

- Added `electron/services/sqliteService.js` as the local SQLite service layer.
- Added `electron/scripts/init-sqlite.js` for deterministic local database initialization.
- Added four local SQLite databases under `storage/sqlite`: `project.db`, `approval.db`, `master.db`, and `logs.db`.
- Added Electron IPC handlers for dashboard loading, approval decisions, action recording, and DB stats.
- Added preload bridge API under `window.ecorean.bocDb`.

### Changed

- Dashboard data loading now uses SQLite through Electron instead of React mock data.
- Approval actions now persist decisions, reasons, action history, and notifications.
- Master DB update requests now require approval before any value is applied.
- Approved Master DB changes create rollback snapshots before writing the new value.

### Verified

- `npm run db:init` completed and created the SQLite files.
- `npm run build` completed for the React UI.
- `npm run smoke:prod` completed with `BOC dashboard loaded`.
- `npm run dist` completed and regenerated the win-unpacked Electron executable.

## 2026-04-25 - Phase 32

### Added

- Added operating project storage tables to `project.db`: `project_inputs`, `preset_results`, `generated_processes`, `needs_confirmations`, `payment_plans`, `purchase_requirements`, and `schedule_drafts`.
- Added `electron/scripts/register-first-operating-project.js`.
- Added `npm run db:register-first-project`.
- Registered `PRJ-REAL-APT-0001` as the first real operating project: 24 pyeong old apartment full remodeling, 60,000,000 KRW target budget, one bathroom, one kitchen, two rooms, one balcony, partial window replacement, partial plumbing modification, partial electrical upgrade, condensation present, no leakage, and 90-day occupancy deadline.
- Stored minimum input, preset application result, generated process list, confirmation queue, payment plan draft, purchase requirements, schedule draft, and CEO approval queue.

### Verified

- Project appears through the SQLite dashboard service.
- Approval Center contains five pending CEO review items for the real project.
- `npm run smoke:prod` completed with `BOC dashboard loaded`.

## 2026-04-25 - Phase 38

### Added

- Added `src/master-db/vendor-db/vendor-master.real.json`.
- Added `src/master-db/vendor-db/vendor-contact-log.real.json`.
- Added `docs/real-vendor-registration-rules.md`.
- Added `src/master-db/vendor-db/seoul-gyeonggi-vendor-crawl.schema.json`.
- Added `src/master-db/vendor-db/seoul-gyeonggi-vendor-crawl.sample.json`.
- Added `docs/vendor-crawling-rules.md`.
- Added `docs/vendor-data-privacy-rules.md`.
- Added `docs/vendor-source-priority.md`.
- Registered 12 public real-vendor candidates across tile, waterproofing, bathroom fixture/furniture, window, glass, caulking, electrical material, and waste disposal categories.
- Added first planned contact log entries for vendor verification.

### Verified

- JSON files parse successfully.
- `vendor-master.real.json` contains 12 candidate vendors.
- `vendor-contact-log.real.json` contains 3 planned contact entries.
- Required operational fields are present: `vendorName`, `category`, `region`, `currentRelationshipStatus`, `currentPriceLevel`, `paymentCondition`, `responseSpeed`, `defectHandlingLevel`, `trustLevel`, and `nextAction`.
- Public candidates are marked as needing verification before Master DB use.

## 2026-04-25 - Phase 39

### Added

- Added `docs/vendor-contact-script.md`.
- Added `docs/vendor-verification-checklist.md`.
- Added `docs/vendor-call-result-template.md`.
- Added `src/master-db/vendor-db/vendor-contact-action-plan.json`.
- Created a contact execution package for 12 real vendor candidates.
- Added vendor-specific first contact scripts, required questions, price questions, delivery questions, payment questions, defect responsibility questions, requested documents, pass/fail criteria, next actions, and contact log templates.

### Verified

- `vendor-contact-action-plan.json` parses successfully.
- The action plan contains 12 vendors.
- Every vendor includes the required contact execution fields.
- No arbitrary price was inserted.

## 2026-04-25 - Phase 40

### Added

- Added `docs/master-db-admin-rules.md`.
- Added `docs/data-change-request-flow.md`.
- Added `docs/import-export-rules.md`.
- Added `src/master-db/admin/master-db-admin.schema.json`.
- Added `src/master-db/admin/master-db-admin.sample.json`.
- Added `src/master-db/admin/empty-data-state.schema.json`.
- Added `ui/app/master-db/MasterDbAdminView.tsx`.
- Connected the dashboard `Master DB Review` drill-down to a real Master DB Admin screen.
- Added admin sections for process DB, material DB, accessory DB, brand DB, pricing DB, labor DB, vendor DB, risk/defect DB, import/export, approval queue, rollback, and empty data states.

### Verified

- Admin JSON files parse successfully.
- The admin sample defines 6 admin screens and 6 data states.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.

## 2026-04-25 - Phase 41

### Added

- Added `ui/app/estimate/NewEstimateWizard.tsx`.
- Added `ui/app/estimate/EstimatePreview.tsx`.
- Added `ui/app/estimate/ScheduleDraftPreview.tsx`.
- Added `ui/app/estimate/DocumentPreview.tsx`.
- Added `ui/services/estimate-service/estimateDraftService.ts`.
- Added `src/estimate-engine/estimate-draft.schema.json`.
- Added `src/estimate-engine/estimate-preview.schema.json`.
- Added `docs/estimate-creation-flow.md`.
- Added `docs/preliminary-estimate-rules.md`.
- Added `docs/needs-confirmation-display-rules.md`.
- Added `New Estimate` floating action to the CEO Dashboard.
- Added an `estimate` drill-down view for minimum input, preliminary estimate preview, NEEDS_CONFIRMATION items, schedule draft, and document preview.

### Verified

- Estimate JSON schemas parse successfully.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.
- Actual prices remain `UNKNOWN` or `NEEDS_RESEARCH`; no arbitrary price was inserted.

## 2026-04-25 - Phase 42

### Added

- Added Project DB tables: `estimate_drafts`, `estimate_draft_inputs`, `estimate_draft_processes`, `estimate_draft_confirmations`, `estimate_draft_documents`, and `estimate_draft_warnings`.
- Added `saveEstimateDraft` to `electron/services/sqliteService.js`.
- Added `boc:estimate-draft:save` IPC handler in `electron/main.js`.
- Added `saveEstimateDraft` preload bridge in `electron/preload.js`.
- Connected `NewEstimateWizard` save button to SQLite persistence.
- Added dashboard refresh event after saving an estimate draft.

### Changed

- Saving a preliminary estimate now creates a `PRELIMINARY` project record so the Dashboard Project List can display it.
- NEEDS_CONFIRMATION items now create Approval Center records.
- Saving an estimate draft writes Notification Log and Action Log records.

### Verified

- Direct SQLite save verification created one preliminary estimate draft and linked records.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.
- Actual prices remain `UNKNOWN` or `NEEDS_RESEARCH`; no arbitrary price was inserted.

## 2026-04-25 - Phase 43

### Added

- Added `estimate_draft_change_logs` table to Project DB migration.
- Added `loadEstimateDraftForProject` and `updateEstimateDraft` to `electron/services/sqliteService.js`.
- Added `boc:estimate-draft:load` and `boc:estimate-draft:update` IPC handlers.
- Added preload bridge methods for estimate draft load/update.
- Added UI service methods for loading and updating saved estimate drafts.
- Rebuilt `ProjectDetailView` to load saved preliminary estimate drafts from Dashboard Project List selection.
- Updated `NewEstimateWizard` to support edit mode, saved input values, editable NEEDS_CONFIRMATION items, document draft regeneration, and update save.

### Changed

- Updating a saved preliminary estimate now refreshes `updatedAt`.
- Updating a saved draft records before/after payloads and a structured diff.
- Updating a saved draft records Action Log and Notification Log entries.
- Master DB remains unchanged by estimate draft edits.

### Verified

- Direct load/update verification succeeded for a saved `PRELIMINARY` estimate draft.
- `estimate_draft_change_logs` count increased after update.
- Notification Log count increased after update.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.

## 2026-04-25 - Phase 44

### Added

- Added SQLite tables: `estimate_approval_logs`, `final_estimates`, and `final_estimate_documents`.
- Saving a preliminary estimate now creates an `EstimateApproval` approval item for FINAL ESTIMATE review.
- Added estimate approval checklist validation for NEEDS_CONFIRMATION, missing prices, high-risk processes, payment flow, and margin risk.
- Added final estimate generation after successful CEO approval.
- Added final estimate document records for customer final estimate, internal final cost, purchase order readiness, and schedule confirmation readiness.
- Added `ui/app/approvals/EstimateApprovalView.tsx`.
- Added `ui/services/estimate-approval-service/estimateApprovalService.ts`.
- Connected the Approval drill-down drawer to the Estimate Approval view.

### Changed

- Estimate approval requests with remaining blockers are converted to revision-requested flow instead of FINAL ESTIMATE.
- Rejected or revision-requested estimate approvals keep the draft in `PRELIMINARY` state.
- FINAL ESTIMATE creation does not update Master DB.

### Verified

- Direct approval verification created one `FINAL_ESTIMATE`.
- Final estimate document records were created for customer/internal/order/schedule separation.
- Estimate approval log records were created.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.

## 2026-04-25 - Phase 45

### Added

- Added SQLite tables: `execution_projects`, `execution_documents`, `purchase_orders`, `payment_milestones`, `site_report_templates`, `inspection_checklists`, and `execution_logs`.
- Added execution readiness validation to block projects without `FINAL_ESTIMATE`.
- Added `transitionProjectToExecution` to convert final estimate projects to `EXECUTION_READY`.
- Added automatic execution document generation for contract/payment plan, purchase order draft, confirmed schedule, daily site report template, inspection checklist, client handover checklist, and cashflow plan.
- Added purchase order draft creation with UNKNOWN/NEEDS_RESEARCH warning support.
- Added payment milestone records for deposit, interim payment, and balance.
- Added site report template and inspection checklist records.
- Added `ui/app/execution/ProjectExecutionView.tsx`.
- Added `ui/app/execution/ExecutionDocumentPreview.tsx`.
- Added `ui/services/project-execution-service/projectExecutionService.ts`.
- Connected Project Detail view to execution readiness and transition actions.

### Verified

- Direct execution transition verification converted a `FINAL_ESTIMATE` project to `EXECUTION_READY`.
- Seven execution documents were generated.
- Purchase order draft, three payment milestones, site report template, three inspection checklists, and execution log were created.
- UNKNOWN/NEEDS_RESEARCH pricing appears as preliminary execution warning, not a hard blocker.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.

## 2026-04-25 - Phase 46

### Added

- Added SQLite tables: `site_operations`, `daily_site_reports`, `material_delivery_checks`, `inspection_results`, `site_issues`, `change_order_requests`, and `site_risk_logs`.
- Added site operation service methods for IN_PROGRESS start, daily report save, material delivery check, inspection result, site issue, and change order request.
- Added Electron IPC and preload bridge methods for site operation actions.
- Added `ui/services/site-operation-service/siteOperationService.ts`.
- Added site UI screens: `SiteOperationView`, `DailySiteReportView`, `MaterialDeliveryCheckView`, `InspectionChecklistView`, `SiteIssueView`, and `ChangeOrderRequestView`.
- Connected Project Detail view to the Site Operation screen.

### Changed

- `EXECUTION_READY` projects can now transition to `IN_PROGRESS`.
- Failed waterproof inspection blocks downstream tile, jolly cut, grout, and silicone processes.
- Material not delivered creates a process-start warning.
- Change order requests create Approval Center records and cannot affect estimate/schedule before approval.
- Site issues update project risk visibility through Dashboard project risk fields and notification logs.

### Verified

- Direct site operation simulation started `IN_PROGRESS`.
- Daily site report, material delivery check, failed inspection, site issue, change order request, and site risk logs were saved.
- Failed waterproof inspection produced blocked downstream processes.
- Change order request increased approval count.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.

## 2026-04-25 - Phase 47

### Added

- Added SQLite tables: `change_order_approval_logs`, `change_order_cost_impacts`, `change_order_schedule_impacts`, and `change_order_payment_impacts`.
- Added ChangeOrder decision handling to the approval flow.
- Added approved change order application logic for cost, schedule, and payment impacts.
- Added change order payment milestone creation for additional work payment.
- Added execution schedule draft item creation for approved change orders.
- Added revision-requested re-registration in Approval Center.
- Added `ui/app/approvals/ChangeOrderApprovalView.tsx`.
- Added `ui/services/change-order-service/changeOrderService.ts`.
- Connected Change Order approvals to the Approval drill-down view.

### Changed

- Change order requests no longer affect estimate, schedule, or payment data before CEO approval.
- Rejected change orders keep the project in `IN_PROGRESS` with no cost/schedule/payment reflection.
- Approved change orders keep amounts as `UNKNOWN` until real data is entered.

### Verified

- Direct simulation confirmed no cost/schedule/payment impact is created before approval.
- Direct approval generated cost impact, schedule impact, payment impact, one additional payment milestone, and one execution schedule draft item.
- Approval/action/notification logs are recorded.
- `npm run build` passes for the React UI.
- `npm run build:ui` copies the production UI into Electron.
- `npm run smoke:prod` completes with `BOC dashboard loaded`.

## 2026-04-26 - Phase 48

### Added

- Added SQLite tables for `project_completion_reports`, `actual_costs`, `actual_durations`, `final_margin_reports`, `estimate_vs_actual_reports`, and `master_db_update_candidates`.
- Added Project Completion service methods for readiness checks and completion processing.
- Added `ui/app/completion/ProjectCompletionView.tsx`.
- Added `ui/app/completion/ActualCostInputView.tsx`.
- Added `ui/app/completion/DefectAndClaimReportView.tsx`.
- Added `ui/app/completion/EstimateVsActualView.tsx`.
- Added `ui/services/completion-service/projectCompletionService.ts`.
- Connected Project Completion to Project Detail.

### Changed

- Completion is blocked unless the latest site operation is `IN_PROGRESS`.
- Final margin is blocked until actual costs are entered.
- Master DB is not directly changed after completion; update candidates are created for CEO approval.
- Defects and claims are stored as Case Library candidates.

### Verified

- Direct completion simulation stores completion report, actual cost, actual duration, final margin, variance report, and Master DB candidates.
- React production build passes.
- Electron build:ui copies the production UI into Electron.
- Electron smoke test completes with `BOC dashboard loaded`.

## 2026-04-26 - Phase 53

### Added

- Added `docs/final-integration-qa-report.md`.
- Added `docs/release-readiness-checklist.md`.
- Added `tests/final-e2e-flow-checklist.json`.
- Added `tests/release-smoke-test-plan.json`.

### Verified

- SQLite state check confirmed Dashboard, approval, completion, Case Library, Learning, and Backup data are present.
- Final E2E checklist JSON validates.
- Release smoke test plan JSON validates.
- React production build passes.
- Electron build:ui copies the production UI into Electron.
- Electron smoke test completes with `BOC dashboard loaded`.
- `npm run dist` generated the `win-unpacked` executable package.
- Packaged EXE launched successfully with window title `ECOREAN BOC CEO Dashboard`.

### Release Decision

- Current version is `MVP_RELEASE_CANDIDATE`.
- No critical blocker found.
- Known non-blocking issues: legacy Korean mojibake, CSS-based 3D graph MVP, real price/vendor/brand data still pending.

## 2026-04-26 - Phase 52

### Added

- Added `src/ontology/ontology-graph.schema.json`.
- Added `src/ontology/ontology-node-types.json`.
- Added `src/ontology/ontology-edge-types.json`.
- Added `ui/services/ontology-service/ontologyGraphService.ts`.
- Added `ui/app/ontology/Ontology3DView.tsx`.
- Replaced the old ontology placeholder with the 3D Ontology Viewer.
- Added Project, Process, Material, Approval, Risk, Payment, and Case graph nodes.
- Added relationship edges for process inclusion, material usage, approval requirements, risk links, payment triggers, and Case records.
- Added project and process filters.
- Added Risk and Approval Pending visual emphasis.
- Added node click detail panel.

### Changed

- The ontology drill-down now opens the real 3D graph view instead of a placeholder.
- Dashboard floating action still opens the 3D Ontology View.

### Verified

- Ontology node type JSON validates.
- Ontology edge type JSON validates.
- React production build passes.
- Electron build:ui copies the production UI into Electron.
- Electron smoke test completes with `BOC dashboard loaded`.

## 2026-04-26 - Phase 49

### Added

- Added SQLite tables: `case_library`, `defect_patterns`, `profit_patterns`, `learning_suggestions`, and `auto_update_candidates`.
- Added automatic Case Library registration from completed projects.
- Added case category classification for bathroom, kitchen, window, tile, waterproof, paint, carpentry, electrical, condensation, leak, defect, change order, and loss signals.
- Added repeated loss/defect pattern detection using completed Case data.
- Added repeated profit pattern detection using final margin signals.
- Added learning suggestion generation with approval-required and rollback-required metadata.
- Added `ui/app/case-library/CaseLibraryView.tsx`.
- Added `ui/app/case-library/PatternDetectionView.tsx`.
- Added `ui/app/case-library/LearningSuggestionView.tsx`.
- Added `ui/services/case-library-service/caseLibraryService.ts`.
- Connected Case Library to the CEO Dashboard drill-down.

### Changed

- Project completion now triggers Case Library sync and learning analysis after completion data is stored.
- Learning suggestions create Approval Center items but do not modify Master DB automatically.

### Verified

- Direct learning analysis registered completed projects as Cases.
- Direct learning analysis generated repeated defect/profit patterns, suggestions, and auto update candidates.
- React production build passes.
- Electron build:ui copies the production UI into Electron.
- Electron smoke test completes with `BOC dashboard loaded`.

## 2026-04-26 - Phase 50

### Added

- Added SQLite tables: `learning_approval_logs` and `learning_update_snapshots`.
- Added `LearningSuggestion` approval type for Case Library learning recommendations.
- Added LearningSuggestion decision handling in the approval flow.
- Added Master DB Update Request creation from approved learning suggestions.
- Added learning rollback snapshots before Master DB application.
- Added approved value application to `master_db_values` only after CEO approval.
- Added `ui/app/approvals/LearningApprovalView.tsx`.
- Added `ui/services/learning-approval-service/learningApprovalService.ts`.
- Connected Learning approvals to the Approval Center drill-down.

### Changed

- Learning Engine approval items are synced as `LearningSuggestion` instead of generic `Exception`.
- Single-case learning suggestions are blocked from Master DB application.
- Learning suggestions require before/after comparison and rollback snapshot creation before applying.

### Verified

- Direct approval smoke test created one Master DB Update Request and one learning rollback snapshot.
- Direct revision smoke test re-registered the approval flow and wrote learning approval logs.
- React production build passes.
- Electron build:ui copies the production UI into Electron.
- Electron smoke test completes with `BOC dashboard loaded`.

## 2026-04-26 - Phase 51

### Added

- Added `electron/services/backupService.js`.
- Added backup audit tables: `backup_logs`, `restore_logs`, and `export_logs`.
- Added full SQLite backup generation for `project.db`, `approval.db`, `master.db`, and `logs.db`.
- Added DB-specific backup generation.
- Added backup manifest with created date, BOC version, DB list, SHA-256 checksums, and personal data notice.
- Added Restore Preview with checksum verification.
- Added Restore flow that requires CEO approval and creates a pre-restore backup before overwrite.
- Added JSON export with reimportable database/table/row structure.
- Added Excel report export as Spreadsheet XML `.xls`.
- Added `ui/app/settings/BackupRestoreView.tsx`.
- Added `ui/app/settings/ExportDataView.tsx`.
- Added `ui/services/backup-service/backupService.ts`.
- Connected Backup settings to the CEO Dashboard drill-down.

### Changed

- Settings now includes Backup/Restore and Export controls.
- Restore is blocked unless `approvalConfirmed` is explicitly true.

### Verified

- Full backup created with manifest and checksums.
- Restore preview validates checksums successfully.
- JSON export file created.
- Excel export file created.
- Restore without CEO approval is blocked.
- React production build passes.
- Electron build:ui copies the production UI into Electron.
- Electron smoke test completes with `BOC dashboard loaded`.

## 2026-04-26 - RC-0.1.0 Release Lock

### Added

- Locked current baseline as `ECOREAN BOC MVP RC-0.1.0`.
- Added `docs/PROJECT_MASTER_CONTEXT.md`.
- Added `docs/NEXT_ACTION.md`.
- Added `docs/first-project-template-guide.md`.
- Added `docs/operation-start-checklist.md`.
- Added release baseline folder `release/RC-0.1.0/`.
- Added operating separation folders: `production`, `development`, `backup`, `export`, `installer`, and `win-unpacked`.
- Added first operating project templates under `release/RC-0.1.0/production/project-templates/first-operating-project-templates.json`.
- Added SQLite baseline backup copy under `release/RC-0.1.0/backup/BACKUP-2026-04-25T23-19-57-301Z/`.

### Changed

- RC-0.1.0 is now treated as the fixed MVP baseline.
- Production DB area is separated from development DB snapshots.
- First real operating project must start from an approved template.
- Real data entry remains blocked from direct Master DB mutation and must follow approval/rollback flow.

### Release Baseline

- Installer: `release/RC-0.1.0/installer/ECOREAN BOC CEO Dashboard Setup 0.1.0.exe`
- Unpacked executable: `release/RC-0.1.0/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Development DB snapshot: `release/RC-0.1.0/development/`
- Baseline backup: `release/RC-0.1.0/backup/BACKUP-2026-04-25T23-19-57-301Z/`

## 2026-04-26 - Production Project 001

### Added

- Registered first operating project in production SQLite DB.
- Project ID: `PRJ-PROD-BATH-0001`.
- Estimate Draft ID: `EST-DRAFT-PROD-BATH-0001`.
- Project status: `PRELIMINARY`.
- Project name: `구축 아파트 욕실 단독 리모델링`.
- Added 14 preliminary generated/conditional processes.
- Added 8 `NEEDS_CONFIRMATION` items.
- Added 9 Approval Center items including FINAL ESTIMATE transition approval.
- Added customer/internal draft documents for preliminary operation.
- Added production project summary: `release/RC-0.1.0/production/first-operating-project-001-summary.md`.

### Rules Preserved

- No real prices were entered.
- `UNKNOWN` / `NEEDS_RESEARCH` states were preserved.
- Waterproofing was not automatically confirmed.
- FINAL ESTIMATE remains blocked until confirmations and representative approval are complete.

## 2026-04-26 - Production Project 001 Confirmation Resolution

### Changed

- Resolved all 8 `NEEDS_CONFIRMATION` items for `PRJ-PROD-BATH-0001`.
- Changed waterproof scope from full re-waterproofing to inspection and spot reinforcement if needed.
- Excluded plumbing modification because no plumbing change is required.
- Added `bathroom_zendai` process.
- Added `shower_booth` process.
- Updated fixture default spec to American Standard / 아메리칸스탠다드.
- Updated tile default spec to 600x600 polished tile / 600각 폴리싱 타일.
- Updated tile difficulty and waste-rate fields as `NEEDS_RESEARCH_600_POLISHED_TILE`.
- Updated FINAL ESTIMATE approval reason: confirmations resolved, price research and representative final approval still required.

### Preserved

- Real prices remain `UNKNOWN` / `NEEDS_RESEARCH`.
- Master DB was not directly changed.
- FINAL ESTIMATE was not generated.

## 2026-04-26 - Bathroom Standard V1 Registration

### Added

- Registered `BATHROOM_REMODEL_STANDARD_V1` in production Master DB.
- Added option module for bond installation vs floating mortar installation.
- Added fixed modules for dome ceiling, washbasin, one-piece toilet, shower/accessories, and ventilator.
- Added option module for shower booth vs glass partition.
- Added toggle module for zendai + marble finish.
- Added bathroom fixture brand grade structure.
- Connected the standard to `PRJ-PROD-BATH-0001` PRELIMINARY estimate draft.
- Added Approval Center audit record `APP-MDB-BATHROOM-STANDARD-V1`.

### Preserved

- Real supplier/internal prices remain `UNKNOWN` / `NEEDS_RESEARCH`.
- Customer-facing output and internal cost output remain separated.
- Future standard changes require Approval Center approval and rollback snapshot.

## 2026-04-26 - Production Project 001 Customer Estimate Revision

### Changed

- Discarded previous 8,400,000원 customer basis for `PRJ-PROD-BATH-0001`.
- Updated customer proposal amount to 5,490,000원.
- Applied payment schedule: contract deposit 30%, progress payment 40%, final payment 30%.
- Marked change orders as separate approval flow.
- Updated customer estimate draft and internal cost draft separation.
- Re-requested FINAL_ESTIMATE approval in Approval Center.
- Added EstimateRevision approval item `APP-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION`.

### Preserved

- Internal cost remains `NEEDS_RESEARCH`.
- Expected margin remains pending until actual internal cost inputs are entered.
- Master DB was not directly changed by the customer estimate revision.

## 2026-04-26 - Production Project 001 Final Estimate Approval

### Changed

- Approved `APP-PRJ-PROD-BATH-0001-CUSTOMER-PRICE-REVISION`.
- Approved `APP-PRJ-PROD-BATH-0001-FINAL`.
- Converted `PRJ-PROD-BATH-0001` from PRELIMINARY to FINAL_ESTIMATE.
- Created final estimate `FINAL-EST-PRJ-PROD-BATH-0001`.
- Generated customer final estimate document.
- Generated internal final cost document.
- Generated purchase preparation records.
- Generated payment milestones: contract deposit 30%, progress payment 40%, final payment 30%.
- Enabled Execution Ready transition.
- Recorded approval, notification, and action logs.

### Preserved

- Purchase items still require model/spec/quantity confirmation before order.
- Additional work remains separate approval flow.

## 2026-04-26 - Production Project 001 Execution Ready

### Changed

- Converted `PRJ-PROD-BATH-0001` from FINAL_ESTIMATE to EXECUTION_READY.
- Created execution project `EXEC-PRJ-PROD-BATH-0001`.
- Confirmed contract deposit payment: 1,647,000원.
- Generated confirmed contract/payment plan.
- Generated purchase preparation records.
- Generated confirmed schedule draft.
- Generated daily site report template.
- Generated inspection checklists.
- Generated client handover checklist document.
- Generated cashflow statement document.
- Updated Dashboard state to Site Operation entry ready.

### Remaining Warnings

- Purchase orders require final model/spec/quantity/lead-time confirmation before actual order.
- IN_PROGRESS requires site start date, working constraints, waste/vendor schedule, and waterproof inspection owner confirmation.

## 2026-04-26 - Production Project 001 In Progress

### Changed

- Converted `PRJ-PROD-BATH-0001` from EXECUTION_READY to IN_PROGRESS.
- Activated Site Operation `SITE-PRJ-PROD-BATH-0001`.
- Created Day 1 daily site report `DSR-PRJ-PROD-BATH-0001-DAY-001`.
- Recorded demolition start and waste carry-out schedule confirmation.
- Created waterproof status inspection task.
- Activated blocking risk for waterproof inspection failure.
- Connected risk to Risk Dashboard data tables.
- Recorded notification and action logs.

### Blocking Rule

- If waterproof status inspection fails, tile installation, zendai, shower booth, fixture installation, and silicone finish are blocked.

## 2026-04-26 - Production Project 001 Waterproof Inspection PASS

### Changed

- Recorded waterproof status inspection result as PASS.
- Cleared blocking processes for waterproof inspection.
- Marked waterproof blocking issue as RESOLVED.
- Added low-severity risk log `WATERPROOF_BLOCKING_RELEASED`.
- Created tile start approval `APP-PRJ-PROD-BATH-0001-TILE-START`.
- Updated Site Operation current process to tile start preparation.

### Result

- No change order was created.
- No re-waterproof approval was requested.
- Next process is tile start approval and tile installation.

## 2026-04-26 - Production Project 001 Tile Start Approval

### Changed

- Approved `APP-PRJ-PROD-BATH-0001-TILE-START`.
- Activated tile process for Day 2.
- Created Day 2 daily site report `DSR-PRJ-PROD-BATH-0001-DAY-002`.
- Recorded material delivery checks for 600각 폴리싱 타일, 타일 본드, 압착시멘트, 줄눈, and 부자재.
- Started tile measured quantity tracking.
- Started waste-rate tracking with initial expected range 8~12%.
- Started tile labor record tracking.
- Created pending tile mid-inspection point `TILE_MID_INSPECTION`.

### Next Inspection

- Tile mid-inspection must verify 들뜸, 수평, 줄눈 간격, 파손, and visible finish quality before 후속 마감 공정.

## 2026-04-26 - Tile Order Loss Rule V1

### Added

- Registered `TILE_ORDER_LOSS_RULE_V1` in production Master DB.
- Added first-order tile quantity formula: `orderQuantity = measuredAreaM2 * (1 + orderWasteRate)`.
- Set 600각 폴리싱 tile order waste rate to 12%.
- Set warning threshold above 12%.
- Set RED ALERT threshold above 15%.
- Connected rule to `PRJ-PROD-BATH-0001` tile metrics.
- Updated 600각 폴리싱 tile purchase order status to `READY_TO_ORDER_AFTER_MEASUREMENT_WITH_12_PERCENT_WASTE`.
- Added Approval Center audit record `APP-MDB-TILE-ORDER-LOSS-RULE-V1`.

### Principle

- Tile loss must be reflected before first order, not only after construction.

## 2026-04-26 - Production Project 001 Tile Order Quantity

### Changed

- Recorded measured tile area for `PRJ-PROD-BATH-0001`: 28㎡.
- Applied order formula: `28㎡ x 1.12 = 31.36㎡`.
- Applied box coverage basis: 1.44㎡ per box.
- Confirmed final tile order quantity: 22 boxes.
- Recorded ordered box area: 31.68㎡.
- Recorded expected remainder: 3.68㎡.
- Updated 600각 폴리싱 tile purchase order to `ORDER_QUANTITY_CONFIRMED`.
- Connected tile labor baseline to measured area.
- Saved loss-rate baseline for later actual vs estimate comparison.

## 2026-04-26 - Production Project 001 Tile Mid Inspection Checklist

### Changed

- Converted `TILE_MID_INSPECTION` from single-result judgment to item-level checklist judgment.
- Added seven checklist items: 들뜸, 수평, 줄눈 간격, 파손, 코너 마감, 배수구 경사, 젠다이 연결부.
- Set each checklist item to `PENDING`.
- Set inspection result to `PENDING_ITEM_RESULTS`.
- Preserved blocking process list until item-level results are entered.
- Added Risk Dashboard entry for pending tile mid-inspection.

## 2026-04-26 - Production Project 001 Fixture Installation Approval

### Changed

- Updated `TILE_MID_INSPECTION` to WARNING with no FAIL and no RED ALERT.
- Recorded grout spacing and corner finish as correction-in-progress conditions.
- Approved fixture installation with `APP-PRJ-PROD-BATH-0001-FIXTURE-INSTALL`.
- Recorded American Standard basic fixture package.
- Added fixture items: toilet, washbasin, basin faucet, shower faucet, and shower head.
- Created Day 3 daily site report `DSR-PRJ-PROD-BATH-0001-DAY-003`.
- Created fixture installation inspection checklist.
- Updated project progress to 32%.

### Next Inspection

- Fixture installation inspection must verify toilet level/shake, washbasin fixation/drainage, faucet leaks, shower faucet hot/cold direction, shower operation, and pre-silicone joints.

## 2026-04-26 - Production Project 001 Fixture Inspection PASS

### Changed

- Recorded fixture installation inspection result as PASS.
- Marked all fixture inspection items as PASS.
- Confirmed no leak.
- Confirmed no toilet shake.
- Confirmed reinstall is not required.
- Cleared blocking process list for fixture inspection.
- Updated next process to shower booth installation.
- Updated project progress to 42%.

## 2026-04-26 - Production Project 001 Shower Booth PASS

### Changed

- Approved shower booth installation with `APP-PRJ-PROD-BATH-0001-SHOWER-BOOTH`.
- Recorded tempered glass installation.
- Recorded hardware installation.
- Recorded door open/close test.
- Recorded silicone joint finish.
- Recorded shower booth inspection result as PASS.
- Confirmed no lower leakage.
- Confirmed no RED ALERT.
- Confirmed no rework required.
- Created Day 4 daily site report `DSR-PRJ-PROD-BATH-0001-DAY-004`.
- Activated next process: dome ceiling and ventilator.
- Updated project progress to 58%.

## 2026-04-26 - Production Project 001 Completion Closing Package

### Changed

- Ran full Completion + Closing Package for `PRJ-PROD-BATH-0001`.
- Created Day 5 and Final daily site reports.
- Created completion checklist and customer handover checklist.
- Approved Completion Approval.
- Converted project, execution project, and site operation to COMPLETED.
- Stored `ACTUAL_COST_BASELINE_PARTIAL`.
- Stored known actual cost baseline: 2,850,000원.
- Stored final revenue: 5,490,000원.
- Calculated provisional margin: 2,640,000원.
- Calculated provisional margin rate: 48.09%.
- Generated Estimate vs Actual report.
- Stored no defects and no claims.
- Registered Case Library record.
- Created Learning Suggestion for actual cost capture improvement.
- Created Auto Update Candidate with repeated-pattern approval requirement.
- Created closing backup.
- Created JSON and Excel exports.
- Dashboard status updated to COMPLETED.

### Verified

- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

### Notes

- Final margin is provisional because several actual cost fields remain unresolved.
- Single case did not directly modify Master DB.

## 2026-04-26 - Actual Cost Capture System V2

### Added

- Added `Actual Cost Capture System V2` documentation and blocking rules.
- Added cost capture schema and diagnostics rules.
- Added SQLite tables for cost capture requirements, entries, forecast status, and cost leak analysis.
- Seeded mandatory cost requirements for `PRJ-PROD-BATH-0001`: demolition, waste, tile, tile accessories, labor, transport, and miscellaneous site expenses.
- Added Electron IPC methods for cost capture dashboard, actual cost entry save, and completion readiness evaluation.
- Added React `Cost Capture Dashboard` with missing-cost alerts, margin forecast, cost entry form, leak analysis, and blocking rule view.
- Added Dashboard navigation to Cost Capture from floating actions and Profit Leak panel.

### Changed

- Completion readiness now checks `Actual Cost Capture V2` before allowing completion.
- Dashboard top KPIs and RED ALERTS now surface missing critical actual costs.

### Verified

- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-04-26 - Production Project 001 Missing Cost Recovery Package

### Changed

- Ran Missing Cost Recovery Package for `PRJ-PROD-BATH-0001`.
- Recovered 7 missing actual cost categories into `cost_capture_entries`.
- Recalculated captured actual cost from 2,850,000원 to 5,070,000원.
- Recalculated final actual margin to 420,000원.
- Recalculated final actual margin rate to 7.65%.
- Cleared critical missing cost RED ALERT.
- Cleared Completion blocking status.
- Updated Completion, Case Library, Learning Suggestion, Cost Leak Analysis, Action Log, and Notification Log data.

### Notes

- Recovered values are `ACTUAL_COST_BASELINE_PENDING_SUPPLIER_PROOF`.
- Supplier invoices and transaction records can still override these baselines later.
- Low margin creates CEO Alert and requires pricing/process correction before the next bathroom project.

## 2026-04-26 - Bathroom Pricing Standard V2

### Added

- Added Bathroom Pricing Standard V2 based on `PRJ-PROD-BATH-0001` reverse engineering.
- Added margin safety tables: `bathroom_pricing_standards`, `bathroom_pricing_options`, and `margin_safety_rules`.
- Added Basic / Standard / Premium bathroom packages.
- Added upsell-only options for shower booth, zendai, 600각 polishing tile, imported fixtures, epoxy grout, jolly cut, and floating mortar.
- Added Margin Safety Dashboard and quote guard evaluation.
- Added Electron IPC for bathroom pricing standard and quote evaluation.
- Added production and development DB seeding script.

### Changed

- V1 customer-price-first bathroom pricing is superseded by V2 margin-first pricing.
- 5,490,000원 bathroom quote is now blocked under Basic and Standard guard rules.

### Verified

- Bathroom Pricing Standard V2 applied to development and production `master.db`.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-02 - Margin Safety Enforcement Layer

### Added

- Added bathroom package selection to `New Estimate Wizard`: Basic, Standard, Premium.
- Added customer offer price input and live margin safety calculation in estimate preview.
- Added `estimated_cost`, `estimated_margin`, `estimated_margin_rate`, and `margin_safety_status` columns to `estimate_drafts` and `final_estimates`.
- Added Dashboard KPI for low-margin estimates, blocked estimate count, CEO approval count, and average expected margin rate.
- Added RED ALERT for estimates blocked by margin rate below 20%.

### Changed

- Estimate draft save/update now recalculates margin safety in Electron SQLite service, so UI/client values cannot override system margin status.
- FINAL_ESTIMATE approval checklist now blocks `BLOCKED` and `NOT_EVALUATED` margin safety states.
- Execution readiness now blocks any final estimate that remains in `BLOCKED` margin safety status.
- Estimate Wizard and Estimate Preview display strings were normalized to Korean display text while preserving English system keys.

### Verified

- Bathroom quote guard check: 5,490,000 KRW Basic quote returns `BLOCKED` with 19.49% margin rate.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-02 - Live Margin Tracking Layer

### Added

- Added `live_margin_snapshots` table for project-level live margin snapshots.
- Added `process_cost_leaks` table for process-level cost leak detection.
- Added live margin recalculation whenever an actual cost entry is saved.
- Added current expected margin rate, initial estimate margin rate, margin drop, estimated remaining cost, and current expected margin to Cost Capture Dashboard.
- Added process-level Cost Leak display to Cost Capture Dashboard and Project Detail.
- Added CEO Dashboard top KPI for current expected margin rate.
- Added RED ALERTs for live margin collapse and RED process cost leaks.

### Changed

- Cost Capture status now separates captured actual cost from estimated remaining cost.
- Completion readiness now blocks when live margin status is RED.
- Process cost leak rule flags baseline variance greater than 15%.

### Verified

- `PRJ-PROD-BATH-0001` live margin recalculated to 7.65% current expected margin rate and RED alert state.
- Process leaks detected for demolition, waste, tile accessories, transport, and miscellaneous site expenses.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-02 - Cost Leak Root Cause Analyzer

### Added

- Added `cost_leak_root_causes` table for candidate root cause records.
- Added `root_cause_patterns` table for repeated root cause detection.
- Added `root_cause_learning_suggestions` table for root-cause-driven learning suggestions.
- Added automatic root cause classification for process cost leaks.
- Added Root Cause Analyzer cards to Cost Capture Dashboard.
- Added root cause display in Project Detail cost leak section.
- Added repeated root cause TOP list to Case Library.

### Changed

- `PRJ-PROD-BATH-0001` cost leaks now classify into:
  - demolition: estimate missing
  - waste: estimate missing
  - tile accessories: accessory underestimated
  - transport: estimate missing
  - miscellaneous site expenses: estimate missing
- Repeated root causes create learning suggestions only when occurrence count is 2 or higher.
- Root causes remain `CANDIDATE` before CEO approval and do not update Master DB automatically.

### Verified

- `PRJ-PROD-BATH-0001` generated 5 root cause candidates.
- `estimate_missing` repeated 4 times and created `RCLS-estimate_missing` as `PENDING_CEO_APPROVAL`.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-02 - Root Cause Prevention Layer

### Added

- Added `prevention_rules`, `estimate_mandatory_items`, and `estimate_rule_overrides` SQLite tables.
- Added Root Cause to Estimate Rule mapping for estimate missing, underestimated unit price, underestimated quantity, underestimated labor, underestimated accessories, waste/transport missing, option inclusion error, site condition change, vendor price gap, and defect rework.
- Added PRJ-PROD-BATH-0001 prevention baseline for bathroom remodeling estimates:
  - demolition cost
  - waste disposal cost
  - transport cost
  - miscellaneous contingency cost
  - tile accessory package
- Added Estimate Wizard section: `자동 포함 항목 (과거 누수 방지)`.
- Added Estimate Preview display for prevention items.

### Changed

- Estimate draft save/update now syncs mandatory prevention items from active prevention rules.
- FINAL_ESTIMATE approval checklist now blocks missing mandatory prevention items.
- Mandatory prevention items cannot be silently removed; removal requires CEO approval or revision flow.
- Next bathroom estimate drafts now automatically include the five PRJ-PROD-BATH-0001 cost leak prevention items.

### Verified

- Bathroom estimate draft generated 5 prevention items.
- Missing mandatory item forced FINAL approval to `REVISION_REQUESTED`.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Kitchen Remodeling Standard V1

### Added

- Added Kitchen Remodeling Standard V1 with Basic, Standard, and Premium package structures.
- Added `kitchen_pricing_standards` and `kitchen_pricing_options` SQLite tables.
- Added kitchen package selection to the Estimate Wizard.
- Added kitchen margin safety calculation using the same approval gate as bathroom estimates:
  - below 20 percent: `BLOCKED`
  - 20 to 25 percent: `CEO_APPROVAL_REQUIRED`
  - 25 to 30 percent: `PASS`
  - 30 percent or higher: `PRIORITY`
- Added kitchen Root Cause Prevention mandatory items:
  - kitchen demolition cost
  - kitchen waste disposal cost
  - kitchen transport cost
  - sink cabinet package
  - countertop package
  - kitchen wall tile and accessory package
  - kitchen miscellaneous contingency cost
- Added kitchen generated process, conditional process, needs-confirmation, schedule draft, and missing-price warning structures.

### Changed

- Estimate draft margin safety now chooses bathroom or kitchen pricing standard based on `projectType` / construction scope.
- FINAL_ESTIMATE approval blocks kitchen estimates when margin safety is `BLOCKED`.
- Kitchen options are separated from the base package: countertop type, door finish, hardware, hood, faucet, sink bowl, kitchen wall tile, and built-in appliances.

### Verified

- Kitchen Standard quote at 9,900,000 KRW generated 27.27 percent expected margin and `PASS`.
- Kitchen Basic quote at 6,200,000 KRW generated 16.13 percent expected margin and blocked FINAL approval with `REVISION_REQUESTED`.
- Kitchen estimate draft generated 7 prevention items.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Universal Project Standard Layer

### Added

- Added universal project type config tables:
  - `project_type_configs`
  - `project_type_packages`
  - `project_type_mandatory_items`
  - `project_type_options`
- Added config records for:
  - `bathroom_remodeling`
  - `kitchen_remodeling`
  - `full_remodel`
  - `restoration`
- Added config-driven package, margin, mandatory item, and option definitions for bathroom and kitchen remodeling.
- Added placeholder config shells for full remodeling and restoration so future expansion can be done by adding config data first.

### Changed

- Estimate Wizard service now uses `PROJECT_TYPE_CONFIGS` instead of bathroom/kitchen-specific estimate branches.
- SQLite margin safety now resolves project type config first, then calculates package cost floor, minimum allowed price, margin, and margin safety status.
- Prevention item sync now reads `project_type_mandatory_items` first and merges learned Root Cause prevention rules afterward.
- Kitchen and bathroom now share the same Margin Safety / Prevention approval gate.

### Verified

- Universal config seed created ACTIVE configs for bathroom and kitchen, and STRUCTURE_READY configs for full remodel and restoration.
- Kitchen Standard quote at 9,900,000 KRW generated 27.27 percent expected margin and `PASS` through project type config.
- Kitchen Basic quote at 6,200,000 KRW generated 16.13 percent expected margin and blocked FINAL approval with `REVISION_REQUESTED`.
- Kitchen estimate draft generated 7 config-based mandatory prevention items.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Vendor Real Price Integration Layer

### Added

- Added real vendor price integration tables:
  - `vendor_price_catalog`
  - `vendor_price_history`
  - `material_price_mapping`
- Added material price mappings for bathroom and kitchen mandatory estimate items.
- Added NEEDS_RESEARCH catalog placeholders for tile accessories, kitchen sink package, kitchen countertop, transport, and waste disposal.
- Added estimate price source summary with:
  - actual vendor price count
  - mapped material count
  - missing vendor price count
  - fallback estimate share rate
  - linked material price basis
- Added Vendor Price status card to Cost Capture Dashboard.
- Added actual cost capture to vendor price history sync.

### Changed

- Estimate margin safety now resolves price priority as:
  1. VERIFIED and APPROVED vendor price catalog
  2. project type internal standard
  3. fallback estimate
- If all mapped mandatory materials have verified vendor prices, estimated cost uses vendor price total.
- If vendor prices are partial or missing, the estimate remains fallback-based and displays warnings.
- Actual cost entries now create vendor price history records and mark repeated material prices as learning candidates after the second occurrence.

### Verified

- Kitchen Standard estimate without verified vendor prices displayed `추정값 기반` with 100 percent fallback share.
- Cost Capture actual entry created a `vendor_price_history` record.
- Second actual entry for the same material marked `LEARNING_CANDIDATE`.
- Verified vendor catalog test switched estimate cost basis to `VENDOR_PRICE_VERIFIED`.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Vendor Price Admin + Approval Flow

### Added

- Added vendor supplier price approval tables:
  - `vendor_price_approval_logs`
  - `vendor_price_evidence`
  - `vendor_price_rollback_snapshots`
- Added Vendor Price Admin screen for supplier price input:
  - vendor
  - material
  - model/spec
  - supplier price
  - unit
  - lead time
  - payment condition
  - evidence memo
- Added Vendor Price Approval screen with approve, reject, and request revision actions.
- Added Electron IPC bridge methods for vendor price get/create/decision.
- Added CEO Dashboard KPI for pending supplier price approvals.

### Changed

- New supplier prices are stored as `PENDING` and `PENDING_CEO_APPROVAL`.
- Only `VERIFIED` + `APPROVED` vendor prices can be used by the Estimate Engine as actual supplier price basis.
- Unapproved supplier prices remain reference/admin data and are blocked from estimate cost application.
- Vendor price approval now requires evidence before `APPROVED`.
- Approval decisions create rollback snapshots before status changes.

### Verified

- Pending supplier price creation stores a non-applied catalog row.
- Evidence-less supplier price approval is blocked.
- Approved supplier price becomes `VERIFIED` + `APPROVED`.
- Rollback snapshot is created on approval.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Automation & Scheduler Layer

### Added

- Added scheduler and event automation tables:
  - `scheduled_jobs`
  - `job_execution_logs`
  - `event_triggers`
- Added seeded scheduler intervals for:
  - 5-minute critical event sweep
  - 1-hour operations event sweep
  - 1-day daily action planner
- Added event detection for:
  - unpaid or delayed payment milestones
  - pending purchase orders and unknown price warnings
  - failed inspections and unresolved failed inspections
  - missing actual costs
  - margin collapse under 20 percent
  - live margin RED alerts
- Added automatic in-app notification creation when a new active event is detected.
- Added Dashboard KPI for active automation events and RED automation events.
- Added automation event feed into RED ALERT and Today Action / Immediate Action lists.

### Changed

- Dashboard data refresh now runs the 5-minute automation sweep before KPI, alert, notification, and next-action data is built.
- Critical automation events are connected to blocking actions such as Completion blocking, Execution blocking, follow-up process blocking, and Cost Capture review.

### Verified

- Scheduler creates job execution logs.
- Event triggers are created from active project conditions.
- RED automation events appear in Dashboard RED ALERT.
- Automation events generate next-action rows such as `차단`, `발주`, and `청구`.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - User Role & Permission Layer

### Added

- Added local mock user and permission tables:
  - `users`
  - `roles`
  - `permissions`
  - `user_permission_logs`
- Added roles:
  - `CEO`
  - `SiteManager`
  - `Estimator`
  - `FinanceManager`
  - `Vendor`
  - `ReadOnly`
- Added permission checks for:
  - estimate draft creation
  - FINAL estimate approval
  - Master DB approval
  - execution transition
  - completion approval
  - site operation input
  - cost capture input
  - vendor price input
  - vendor price approval
  - backup creation
  - restore execution
  - data export
- Added Settings > User & Permission screen with role matrix and permission logs.

### Changed

- CEO-only actions now run through the permission layer before the original business rule executes.
- Unauthorized actions are blocked and written to `user_permission_logs` and `action_logs`.
- Backup, Restore, and Export IPC calls now pass through permission checks before the backup service runs.

### Verified

- Vendor role can submit supplier price but cannot approve supplier price.
- Estimator role cannot transition a project to `EXECUTION_READY`.
- Permission denial is logged.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Portfolio & Resource Management Layer

### Added

- Added multi-project portfolio tables:
  - `portfolio_projects`
  - `resource_allocations`
  - `resource_conflicts`
  - `portfolio_cashflow`
- Added Portfolio Dashboard view with:
  - total revenue
  - total cost
  - total expected margin
  - active project count
  - RED ALERT project count
  - status groups
  - resource board
  - resource conflicts
  - integrated cashflow
  - portfolio risk ranking
- Added Portfolio KPI to CEO Dashboard top bar.
- Added `boc:portfolio:get` IPC bridge and UI service.

### Changed

- Dashboard refresh now syncs portfolio project summaries and detects resource conflicts.
- Project records remain independent while resource allocations are shared across projects.
- Resource overlap for the same resource and same date range is stored as an active WARNING conflict.

### Verified

- Portfolio sync created 4 project portfolio records.
- Resource board created 4 allocations.
- Same-resource overlap detected 1 active conflict for `타일 A팀`.
- Portfolio cashflow created 4 inflow/outflow records and calculated net cashflow.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Crew / HR Management Layer

### Added

- Added crew and labor management tables:
  - `crew_members`
  - `crew_skills`
  - `crew_allocations`
  - `crew_attendance`
  - `crew_performance`
  - `labor_cost_records`
  - `crew_risk_logs`
- Added seeded crew types:
  - `Master`
  - `TeamLeader`
  - `SkilledWorker`
  - `Helper`
  - `SubcontractCrew`
- Added Crew Dashboard views:
  - `CrewDashboardView`
  - `CrewMemberDetailView`
  - `CrewAllocationBoard`
  - `LaborCostView`
- Added Crew KPI to CEO Dashboard top bar.
- Added `boc:crew:get` IPC bridge and UI service.

### Changed

- Labor cost records are generated from crew allocations and linked to Cost Capture status.
- Crew risk detection now flags double booking, missing labor cost capture, high absence/late history, and quality risk.
- Crew Dashboard shows today crew, tomorrow crew, labor cost variance, missing labor cost, allocation board, risks, and productivity.

### Verified

- Crew Master seeded 5 crew members and 6 skill records.
- Project allocation board seeded 4 crew allocations.
- Labor cost records generated 4 records from crew allocations.
- Missing actual labor cost appears as Cost Capture linked action.
- Crew risk detection generated active warning records.
- CEO Dashboard Crew KPI displays active crew risk count.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Company Finance Control Layer

### Added

- Added company finance tables:
  - `company_fixed_costs`
  - `monthly_profit_loss`
  - `company_cashflow_forecast`
  - `receivables`
  - `payables`
- Added fixed cost categories for office rent, vehicle, equipment, salary, insurance, tax/accounting, advertising, software subscription, and other fixed costs.
- Added Company Finance Dashboard views:
  - `CompanyFinanceDashboard`
  - `FixedCostManagementView`
  - `MonthlyProfitLossView`
  - `CashflowForecastView`
  - `ReceivablePayableView`
- Added Company Finance KPI to CEO Dashboard top bar.
- Added `boc:finance:get` IPC bridge and UI service.

### Changed

- Company monthly profit/loss now separates project margin from company operating profit by subtracting fixed costs.
- Cashflow forecast combines receivables, payables, and fixed cost payment dates into running balance projections.
- Cash shortage risk is flagged when forecast running balance becomes negative.

### Verified

- Fixed cost seed created 9 monthly fixed cost records.
- Monthly P/L calculated revenue, direct cost, fixed cost, operating profit, and net cashflow.
- Receivables and payables were integrated into company cashflow forecast.
- Cash shortage risk detected on 2026-05-13 from projected material payment.
- CEO Dashboard Company Finance KPI displays operating profit and fixed cost.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03 - Sales Pipeline & Lead Management Layer

### Added

- Added sales pipeline SQLite tables:
  - `leads`
  - `lead_activities`
  - `lead_estimate_links`
  - `sales_pipeline_metrics`
  - `lost_reason_logs`
- Added Lead Management UI:
  - `LeadDashboardView`
  - `LeadDetailView`
  - `SalesPipelineView`
- Added Sales Pipeline KPI to CEO Dashboard top bar.
- Added sales IPC bridge and UI service for lead creation, status updates, and pipeline loading.

### Changed

- Estimate drafts can now store `lead_id` and link a lead to an estimate/project flow.
- `WON` leads automatically create a PRELIMINARY project shell.
- `LOST` leads now require a recorded lost reason.
- Automation now detects stale NEW leads, stale ESTIMATE_SENT leads, and LOST leads without reasons.

### Verified

- SQLite service smoke test passed for lead creation, LOST reason blocking, WON project generation, and funnel metrics.
- Electron UI production build passed via `npm run build:ui`.

## 2026-05-03 - Client & Contract Document Layer

### Added

- Added client and contract document tables:
  - `clients`
  - `contracts`
  - `contract_documents`
  - `contract_approval_logs`
  - `client_document_logs`
- Added Client & Contract UI:
  - `ClientDashboardView`
  - `ClientDetailView`
  - `ContractDocumentView`
- Added customer/internal document generation for:
  - customer estimate
  - contract
  - scope confirmation
  - change order approval
  - client handover
  - defect receipt
  - internal contract review
- Added client/contract IPC bridge and UI service.

### Changed

- `WON` leads now create a Client Master record, contract draft, contract documents, and contract approval request.
- EXECUTION_READY transition now requires an approved contract.
- Additional work remains separated through the change order approval document path.

### Verified

- SQLite service smoke test passed for WON lead to client/contract/document generation.
- Contract approval updates contract status and approval log.
- Electron UI production build passed via `npm run build:ui`.
- Electron production smoke test passed via `npm run smoke:prod`.

## 2026-05-03

### Profit Generation Engine

- Added Qualification Engine with lead scoring, minimum budget, and price-per-m2 filtering.
- Added Profit Control Engine (PCE) with risk-buffered real margin decisions: BLOCK, MODIFY, GO, SCALE.
- Enforced mandatory PCE approval before WON leads can create projects.
- Added high-margin template replication tables and template matching hooks for new estimates.
- Added admin override logging for profit decisions with traceable reason records.
- Connected profit decisions, qualification results, and template matches to Sales Pipeline data and Dashboard IPC.

### Profit Dashboard Enforcement

- Added CEO Dashboard Profit Alert block with monthly expected net profit, loss-defense amount, and scalable template count.
- Added PCE BLOCK/MODIFY alerts into RED ALERT flow for low-margin project defense.
- Added Profit Template Library UI for high-margin project structures and template matches.
- Updated Sales Pipeline lead ordering to prioritize profitable leads by qualification score, budget density, and budget size.
- Added monthly profit generation summary with expected net profit, loss-defense amount, blocked estimate count, and average real margin.
