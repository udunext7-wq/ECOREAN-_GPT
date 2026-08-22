# ECOREAN BOC Release Notes

## v0.5.2 RC Desktop Package

- RC tag: `v0.5.2-rc`
- RC target: `6271159b021e3c4a179ec4cb0e0a582e95480b64`
- Base official version: `v0.5.1`
- Official v0.5.1 target preserved: `4961573340280cc19a749d01e05359e97d700d1d`
- Windows unpacked package build: `PASSED`
- Actual EXE launch: `PASSED`, 2 runs
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Restart persistence / remaining process: `PASSED` / `0`
- Actual packaged `역할 / 권한` click and layout: `PASSED`
- Role request, approval Queue, audit export UI: `PASSED`
- Approval/apply separation, self-approval prevention, approver validation: `PASSED`
- Apply rollback, replay prevention, permission diff, risk classification: `PASSED`
- JSON/CSV/print-safe HTML export and redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.2/v0.5.1/v0.5.0 and historical regressions: `PASSED`
- P0/P1/P2: none
- Official v0.5.2 tag / GitHub Release / asset: `NOT_CREATED`
- Final decision: `v0.5.2 RC Desktop Package 검증 완료`

## v0.5.2 Permission Audit Export & Role Change Approval — Merged to Main

- Source branch: `v0.5.2-audit-export-role-change-approval`
- Base official version: `v0.5.1`
- Official v0.5.1 tag target preserved: `4961573340280cc19a749d01e05359e97d700d1d`
- Implementation commit: `ce88ac3f1fa060ca34fbaf51721096cb1bb38f46`
- Merge commit: `7f12c4c711c08bb7e1925abb72ca5175410f7d33`
- Merge conflict: `NO`
- Included:
  - Role change request with explicit approval and apply stages
  - DRAFT / PENDING / APPROVED / REJECTED / CANCELLED / EXPIRED / APPLIED / FAILED state transitions
  - Self-approval and unauthorized-approver prevention
  - Unknown-role, stale-role, duplicate, replay, and terminal-state fail-closed guards
  - Permission additions/removals diff and high-risk classification
  - Apply failure rollback to the previous role
  - JSON / CSV / print-safe HTML permission audit export
  - Date / event / role / status / risk / decision filters and export redaction
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.1/v0.5.0 regression: `PASSED`
- Build and release smoke before/after merge: `PASSED`
- Timeout / remaining process: none
- Findings: P0/P1/P2 none; P3 items documented.
- Final decision: `v0.5.2 Permission Audit Export & Role Change Approval main 반영 완료, MERGE_READY`

## v0.5.1 RBAC UX & Audit Viewer — Merged to Main

- Source branch: `v0.5.1-rbac-ux-audit-viewer`
- Implementation commit: `7eca99efbb08403136c98ffc3f414ced9721db48`
- Regression fix commit: `34fc6aedca0579ae0da9a8cafaad86f28b2d7833`
- Merge commit: `4d69cd4`
- Base official version: `v0.5.0`
- Official v0.5.0 tag target preserved: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- Included:
  - Role Management UX
  - Permission Center matrix/search/filter
  - Permission Audit Viewer
  - Access Denied safe reason display
  - Role Visibility Preview
  - Audit redaction preservation
  - Customer/internal visibility separation
  - Calendar reminder duplicate prevention for overdue CRM actions
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.0 RBAC regression: `PASSED`
- Build and release smoke: `PASSED`
- Findings: P0/P1/P2 none.
- Final decision: `v0.5.1 RBAC UX & Audit Viewer main 반영 완료, MERGE_READY`

## v0.5.1 RBAC UX & Audit Viewer Refinement

- Branch: `v0.5.1-rbac-ux-audit-viewer`
- Base official version: `v0.5.0`
- Official v0.5.0 tag target preserved: `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`
- GitHub Release preserved: `https://github.com/udunext7-wq/ECOREAN-_GPT/releases/tag/v0.5.0`
- Added role management UX summaries for 7 roles.
- Added 7 roles / 28 permissions matrix with search, role filter, and dangerous permission highlighting.
- Added Permission Audit Viewer for denied, role-change, internal-cost, margin, customer-output, and internal-output events.
- Added safe access denied reason display without DB path, token, provider payload, or raw customer data.
- Added customer/internal visibility preview using the existing output/customer sanitizer.
- Audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- P0/P1 findings: none.
- Known warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190, npm update notice.
- Deferred: external login/provider, real account lifecycle, public portal deployment, advanced audit export, bulk role assignment.
- Final decision: `MERGE_READY`

## v0.5.0 Official Acceptance QA

- Official version: `v0.5.0`
- RC tag: `v0.5.0-rc`
- RC target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- RC package docs commit: `268a5f9`
- Context follow-up commit: `2630f6a`
- Official v0.4.6 tag target preserved: `f1c45d4a10bae5b269b2751ab030cec06df59a58`
- Package integrity: `PASSED`
- Packaged launch: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- RBAC / default deny / route guard / output guard / customer data guard / audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- Build and release smoke: `PASSED`
- Findings: P0/P1/P2 none.
- Known warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190.
- GitHub Release: `NOT_CREATED`
- Release asset: `NOT_CREATED`
- Final decision: `ACCEPTED_WITH_WARNINGS`

## v0.5.0 RC Desktop Package

- RC tag: `v0.5.0-rc`
- RC tag target: `2ed04851024b5b9a2e26195a78a2ceb53afd61cd`
- Package type: Windows unpacked
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE SHA-256: `A9FD5B48BFF85DA2AEC1D3182509ABFEC4A5B513CB09EE8DF6D5303E39B62B86`
- app.asar SHA-256: `72FB99056913B2D5167FE977499BE1C5532C1074EADE2B15CF56893BB47176EC`
- Actual launch: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Role matrix / permission evaluator / default deny: `PASSED`
- Route / menu / output guard: `PASSED`
- Customer data guard / audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- Regression and Electron build/smoke: `PASSED`
- Official `v0.5.0` tag, GitHub Release, and release asset upload were not created.
- Final decision: `v0.5.0 RC Desktop Package 검증 완료`

## v0.5.0 User Roles & Permissions — Merged to Main

- Source branch: `v0.5.0-user-roles-permissions`
- Implementation commit: `97a284e`
- Merge commit: `d0004ff`
- Base official version: `v0.4.6`
- Official `v0.4.6` tag target preserved: `f1c45d4a10bae5b269b2751ab030cec06df59a58`
- Included:
  - 7 local/internal roles
  - 28 permission keys
  - default-deny evaluator
  - unknown/missing role denial
  - route, menu, output, and customer data guards
  - audit redaction
  - role badge and Korean permission center
  - IPC/preload/type integration
- External authentication and public login remain disabled.
- Pre-merge validation: `PASSED`
- Post-merge validation on `main`: `PASSED`
- Customer safety: `PASSED`
- Findings: P0/P1/P2/P3 none for v0.5.0 scope.
- Final decision: `v0.5.0 User Roles & Permissions main 반영 완료, MERGE_READY`
- Official `v0.5.0` tag and GitHub Release were not created.

## v0.5.0 User Roles & Permissions Started

- Branch: `v0.5.0-user-roles-permissions`
- Baseline: official `v0.4.6`
- Added 7 local operational roles and a default-deny permission matrix.
- Added role/permission evaluator, route guard, menu gate, output guard, and permission audit logging.
- Added customer-role data filtering for internal cost, margin, PCE, vendor price, queue, and sensitive contact fields.
- Added a Korean `사용자 역할 및 권한 센터` with local role badge and audit visibility.
- External authentication, OAuth, public customer login, and cloud identity providers remain disabled.
- Validation: syntax, v0.5.0 role/customer/route/output/stabilization smoke, v0.4.6/v0.4.5/RC-0.4.4 regression, customer safety, and Electron build/release smoke passed.
- Findings: P0/P1/P2/P3 none for v0.5.0 scope. Known warnings are Vite bundle size and SQLite experimental API.
- Decision: `MERGE_READY`.
- Main merge/tag/release status: not merged, not tagged, not released.

## Version: RC-0.3.6

### RC-0.3.6 Price Calibration UX Started

- Branch: `rc-0.3.6-price-calibration-ux`
- Baseline: `v0.3.5-rc-packaged`
- Added: `단가 보정 우선순위 센터`
- Purpose: connect READY / PARTIAL / NEEDS_UPDATE price readiness impact results to an operator-friendly calibration priority workflow.
- Priority rules:
  - NEEDS_UPDATE or BLOCKING: `즉시 보정 필요`
  - PARTIAL / KITCHEN: `견적 전 보정 권장`
  - PARTIAL / FULL_REMODELING: `견적 전 보정 권장`
  - PARTIAL / BATHROOM: `대표 검토 필요`
  - READY / LOW: `확인 완료`
- Safety:
  - Calibration priority tasks do not directly update Master Data prices.
  - Price updates still require queue review, approval, backup, and apply through the existing Real Price Calibration workflow.
  - Customer-facing payloads do not expose internal price calibration priority, risk, PCE, margin, queue, or internal cost data.
- Main merge/tag status: not merged, not tagged.

### RC-0.3.6 Price Calibration UX Branch Stabilization

- Branch: `rc-0.3.6-price-calibration-ux`
- Stabilization decision: `MERGE_READY`
- Verified:
  - `단가 보정 우선순위 센터`
  - BATHROOM / KITCHEN / FULL_REMODELING priority calculation
  - NEEDS_UPDATE -> `즉시 보정 필요`
  - PARTIAL / KITCHEN -> `견적 전 보정 권장`
  - PARTIAL / FULL_REMODELING -> `견적 전 보정 권장`
  - PARTIAL / BATHROOM -> `대표 검토 필요`
  - calibration task creation/review
  - price update queue linkage without auto approval/apply
  - Master Data price protection before approval/apply
  - customer payload internal data filtering
- `npm run smoke:release` path stability: PASSED from the `electron` folder.
- Customer safety: PASSED.
- Unresolved S1/S2: none.
- Main merge/tag status: not merged, not tagged.

### RC-0.3.6 Price Calibration UX — Merged to Main

- Source branch: `rc-0.3.6-price-calibration-ux`
- Merge commit: `74894f0 Merge RC-0.3.6 price calibration UX branch`
- Included:
  - `단가 보정 우선순위 센터`
  - Price readiness impact -> calibration task workflow
  - BATHROOM / KITCHEN / FULL_REMODELING priority classification
  - NEEDS_UPDATE -> `즉시 보정 필요`
  - PARTIAL / KITCHEN -> `견적 전 보정 권장`
  - PARTIAL / FULL_REMODELING -> `견적 전 보정 권장`
  - PARTIAL / BATHROOM -> `대표 검토 필요`
  - price queue linkage without auto approval/apply
  - Master Data price protection before approval/backup/apply
  - customer payload filtering for internal price, risk, queue, PCE, and margin data
  - `smoke:release` path stabilization from the Electron package folder
- Pre-merge validation: PASSED.
- Post-merge validation on `main`: PASSED.
- Customer safety: PASSED.
- Final decision: `RC-0.3.6 = 단가 보정 우선순위 UX main 반영 가능`

### RC-0.3.6 Desktop Release Package

- Package basis: `fa560c8 Finalize RC-0.3.6 merge documentation`
- Tag: `v0.3.6-rc`
- Package type: `windows-unpacked`
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Included package checks:
  - `단가 보정 우선순위 센터`
  - Price readiness impact -> calibration task workflow
  - BATHROOM / KITCHEN / FULL_REMODELING priority classification
  - price queue linkage without auto approval/apply
  - Master Data direct price change prevention
  - customer-safe payload filtering
  - `smoke:release` path stabilization
- Priority results:
  - BATHROOM PARTIAL: `MEDIUM / 대표 검토 필요`
  - KITCHEN PARTIAL: `HIGH / 견적 전 보정 권장`
  - FULL_REMODELING PARTIAL: `HIGH / 견적 전 보정 권장`
  - NEEDS_UPDATE: `BLOCKING / 즉시 보정 필요`
- Customer safety result: PASSED.
- Master price protection: PASSED.
- Dev server required: NO.
- Known warnings: Vite bundle size warning, SQLite experimental warning, Electron metadata warning if emitted, Node DEP warning if emitted, and npm update notice if emitted.
- Final decision: `RC-0.3.6 desktop release package 사용 가능`

### RC-0.3.6 Packaged Operational Baseline

- Baseline commit: `1976839 Build RC-0.3.6 desktop release package`
- Source tag preserved: `v0.3.6-rc`
- Packaged baseline tag: `v0.3.6-rc-packaged`
- Final decision: `단가 보정 우선순위 UX 패키지 운영 기준 사용 가능`
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Price queue linkage: PASSED.
- Master Data direct price change prevention: PASSED.
- Customer safety: PASSED.
- Verified flow:
  - Price Calibration Priority Center
  - BATHROOM PARTIAL: `대표 검토 필요`
  - KITCHEN PARTIAL: `견적 전 보정 권장`
  - FULL_REMODELING PARTIAL: `견적 전 보정 권장`
  - NEEDS_UPDATE: `즉시 보정 필요`
  - calibration task creation/review
  - price queue linkage with `PENDING_REVIEW`
  - no automatic approval/apply
  - no direct Master Data price change
- Known warnings: Vite bundle size warning, SQLite experimental warning, electron-builder metadata warning, Node DEP0190 warning, and npm update notice if emitted.
- Next direction:
  - RC-0.3.7: 실제 단가 보정 UX 추가 고도화
  - RC-0.4.0: CRM pipeline / 주소 API / 고객 포털 배포 / 일정 연동

## Version: RC-0.3.5

### RC-0.3.5 Packaged Operational Baseline

- Baseline commit: `29b8074 Build RC-0.3.5 desktop release package`
- Source tag preserved: `v0.3.5-rc`
- Packaged baseline tag: `v0.3.5-rc-packaged`
- Final decision: `단가 준비 상태 리스크 판단 패키지 운영 기준 사용 가능`
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- READY: `LOW` / 견적 진행 가능
- PARTIAL / BATHROOM: `MEDIUM` / 대표 검토 후 진행
- PARTIAL / KITCHEN: `HIGH` / 단가 보정 후 진행
- PARTIAL / FULL_REMODELING: `HIGH` / 단가 보정 후 진행
- NEEDS_UPDATE: `BLOCKING` / 견적 차단
- Customer safety: PASSED.
- Known warnings: Vite bundle size warning, SQLite experimental warning, electron-builder metadata warning if packaging is run, and Node DEP0190 warning if emitted by packaging.
- Next direction:
  - RC-0.3.6: 단가 보정 UX 고도화
  - RC-0.4.0: CRM pipeline / 주소 API / 고객 포털 배포 / 일정 연동

### RC-0.3.5 Desktop Release Package

- Package basis: `ba7df50 Finalize RC-0.3.5 merge documentation`
- Tag: `v0.3.5-rc`
- Package type: `windows-unpacked`
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Included package checks:
  - Price readiness impact analysis
  - READY / PARTIAL / NEEDS_UPDATE classification
  - `BATHROOM` / `KITCHEN` / `FULL_REMODELING` risk classification
  - fallback / confirmed line item count
  - margin impact
  - PCE decision linkage
  - CEO action required
  - customer-safe payload filtering
- Packaged readiness results:
  - READY: `LOW`, 견적 진행 가능
  - PARTIAL / BATHROOM: `MEDIUM`, 대표 검토 후 진행
  - PARTIAL / KITCHEN: `HIGH`, 단가 보정 후 진행
  - PARTIAL / FULL_REMODELING: `HIGH`, 단가 보정 후 진행
  - NEEDS_UPDATE: `BLOCKING`, 견적 차단
- Customer safety result: PASSED.
- Dev server required: NO.
- Known warnings: Vite bundle size warning, SQLite experimental warning, Electron metadata warning if emitted, Node DEP warning if emitted, and npm update notice if emitted.
- Final decision: `RC-0.3.5 desktop release package 사용 가능`

### RC-0.3.5 Price Readiness Impact Analysis — Merged to Main

- Source branch: `rc-0.3.5-price-readiness-impact-analysis`
- Merge commit: `2377194 Merge RC-0.3.5 price readiness impact analysis branch`
- Included:
  - READY / PARTIAL / NEEDS_UPDATE 단가 준비 상태별 견적 영향 분석
  - `BATHROOM` / `KITCHEN` / `FULL_REMODELING` 리스크 분류
  - fallback line item count / confirmed line item count 계산
  - margin impact 분석
  - PCE decision 연결
  - CEO action required 판단
  - customer payload 내부정보 비노출 검증
- READY result: all estimate types are `LOW` risk and `견적 진행 가능`.
- PARTIAL result:
  - `BATHROOM`: `MEDIUM`, `대표 검토 후 진행`
  - `KITCHEN`: `HIGH`, `단가 보정 후 진행`
  - `FULL_REMODELING`: `HIGH`, `단가 보정 후 진행`
- NEEDS_UPDATE result: all estimate types are `BLOCKING`, `견적 차단`.
- Customer safety result: PASSED. Customer-facing payloads hide internal cost, margin, PCE, vendor/labor/purchase data, variance, calibration, approval queue, fallback/confirmed line counts, and price readiness impact details.
- Pre-merge validation: PASSED.
- Post-merge validation on `main`: PASSED.
- Release smoke note: `tests/release-candidate.smoke.js` now exits explicitly after successful checks to prevent lingering smoke-test handles from causing a timeout.
- Known warnings: Vite bundle size warning and SQLite experimental warning are non-blocking.
- Deferred: 주방/전체 리모델링 PARTIAL 상태의 검토 부담, 단가 보정 UX 고도화, LightBIM 수량 검토 UX, PCE 해석 안내, CRM pipeline, address API, customer portal deployment, calendar integration, cloud sync, and bundle optimization.
- Final decision: `RC-0.3.5 = 단가 준비 상태 리스크 판단 흐름 main 반영 가능`

## Version: RC-0.3.4

### RC-0.3.4 Actual Customer Pilot Expansion Started

- Branch: `rc-0.3.4-actual-customer-pilot-expansion`
- Baseline: `v0.3.3-rc-packaged`
- Purpose: expand Actual Customer Pilot validation from one run to at least three project types.
- Pilot scenarios:
  - Pilot A: 욕실 단독 리모델링 / `BATHROOM`
  - Pilot B: 주방 리모델링 / `KITCHEN`
  - Pilot C: 전체 리모델링 / `FULL_REMODELING`
- Privacy rule: do not store raw phone, email, detailed address, or customer memo in Pilot documents/reports.
- Customer safety rule: customer-facing payload must not expose internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, backup path, import rows, approval queue, internal, profit, or risk_score.
- Friction tracking:
  - S1/S2 block operation and require immediate fix.
  - S3/S4 are recorded as operational bottlenecks or polish candidates.
- Main merge/tag status: not merged, not tagged.

### RC-0.3.4 Actual Customer Pilot Expansion Branch Stabilization

- Branch: `rc-0.3.4-actual-customer-pilot-expansion`
- Stabilization result: `MERGE_READY`
- Pilot scenarios verified:
  - Pilot A: 욕실 단독 리모델링 / `BATHROOM`
  - Pilot B: 주방 리모델링 / `KITCHEN`
  - Pilot C: 전체 리모델링 / `FULL_REMODELING`
- Privacy/anonymization: PASSED. Raw phone, email, detailed address, and customer memo are not stored in Pilot reports or exposed in customer-facing payloads.
- Customer safety: PASSED. Customer-facing payloads hide internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, backup path, import rows, approval queue, internal, profit, and `risk_score`.
- Estimate/PCE: PASSED for all 3 Pilot types.
- Customer output/internal output readiness: READY for all 3 Pilot types.
- Unresolved S1/S2: none.
- Operational bottlenecks:
  - 욕실: 비교적 빠름.
  - 주방: 단가/품목 검토 부담.
  - 전체 리모델링: LightBIM 수량/PCE 검토 중요.
- Deferred: additional real-customer pilots, `PARTIAL` price readiness impact analysis, LightBIM quantity review UX, PCE explanation polish, CRM pipeline, address API, portal deployment, calendar integration, cloud sync, and bundle optimization.

### RC-0.3.4 Actual Customer Pilot Expansion — Merged to Main

- Source branch: `rc-0.3.4-actual-customer-pilot-expansion`
- Merge commit: `0cba7e6 Merge RC-0.3.4 actual customer pilot expansion branch`
- Included:
  - 3개 Pilot 유형 반복 검증
  - `BATHROOM` / `KITCHEN` / `FULL_REMODELING`
  - 개인정보 익명화
  - 고객 안전성 검사
  - 견적/PCE 검증
  - 운영 병목 기록
- Pre-merge validation: PASSED.
- Post-merge validation on `main`: PASSED.
- Privacy/anonymization result: PASSED.
- Customer safety result: PASSED.
- Operational bottlenecks:
  - 욕실: 비교적 빠름.
  - 주방: 단가/품목 검토 부담.
  - 전체 리모델링: LightBIM 수량/PCE 검토 중요.
- Final decision: `RC-0.3.4 = 실제 고객 Pilot 반복 검증 흐름 main 반영 가능`

### RC-0.3.4 Desktop Release Package

- Package basis: `2cb40e4 Finalize RC-0.3.4 merge documentation`
- Tag: `v0.3.4-rc`
- Package type: `windows-unpacked`
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Included package checks:
  - Actual Customer Pilot Expansion
  - `BATHROOM` / `KITCHEN` / `FULL_REMODELING`
  - Pilot bottleneck recording
  - Privacy/anonymization
  - Customer safety regression
  - Estimate/PCE repeated verification
- Privacy/anonymization result: PASSED.
- Customer safety result: PASSED.
- Dev server required: NO.
- Known warnings: Vite bundle size warning, SQLite experimental warning, Electron metadata warning if emitted, Node DEP warning if emitted.
- Final decision: `RC-0.3.4 desktop release package 사용 가능`

### RC-0.3.4 Packaged Operational Baseline

- 기준 커밋: `12a7bbb Build RC-0.3.4 desktop release package`
- 새 태그: `v0.3.4-rc-packaged`
- 최종 판정: `3개 Pilot 유형 패키지 운영 기준 사용 가능`
- Privacy/anonymization: PASSED.
- Customer safety: PASSED.
- Verified packaged baseline flow:
  - packaged app launch
  - `BATHROOM` pilot
  - `KITCHEN` pilot
  - `FULL_REMODELING` pilot
  - privacy/anonymization
  - customer safety
  - estimate/PCE repeated verification
  - operational bottleneck recording
- Known warnings:
  - Vite bundle size warning
  - SQLite experimental warning
  - electron-builder metadata warning
  - Node DEP0190 warning
- Next direction:
  - RC-0.3.5: 실제 고객 데이터 추가 Pilot / 단가 `PARTIAL` 영향 분석
  - RC-0.4.0: CRM pipeline / 주소 API / 고객 포털 배포 / 일정 연동

## Version: RC-0.3.5

### RC-0.3.5 Price Readiness Impact Analysis Started

- Branch: `rc-0.3.5-price-readiness-impact-analysis`
- Baseline: `v0.3.4-rc-packaged`
- Purpose: analyze how `Price readiness = PARTIAL` affects estimates, PCE, margin safety, and CEO approval decisions.
- Estimate types analyzed:
  - `BATHROOM`
  - `KITCHEN`
  - `FULL_REMODELING`
- Focus:
  - HIGH/MEDIUM/LOW `NEEDS_UPDATE` counts
  - fallback line item count
  - confirmed line item count
  - estimated/default line item count
  - customer price and internal cost impact
  - margin impact
  - PCE decision impact
  - risk level and recommended action
- Customer safety rule: customer-facing payload must not expose price readiness impact, risk level, fallback price, internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, approval queue, internal, profit, risk_score, detailed address, customer phone/email, or memo.
- Main merge/tag status: not merged, not tagged.

### RC-0.3.5 Price Readiness Impact Analysis Branch Stabilization

- Branch: `rc-0.3.5-price-readiness-impact-analysis`
- Stabilization result: `MERGE_READY`
- Risk decisions:
  - READY: `LOW` / 견적 진행 가능
  - PARTIAL / `BATHROOM`: `MEDIUM` / 대표 검토 후 진행
  - PARTIAL / `KITCHEN`: `HIGH` / 단가 보정 후 진행
  - PARTIAL / `FULL_REMODELING`: `HIGH` / 단가 보정 후 진행
  - NEEDS_UPDATE: `BLOCKING` / 견적 차단
- Customer safety: PASSED. Customer-facing payload hides impact/internal data.
- Unresolved S1/S2: none.
- Deferred: collect more real-customer pilot data, standardize kitchen price calibration priority, improve full remodeling LightBIM quantity review UX, and improve internal PCE/readiness interpretation reports.

## Version: RC-0.3.3

### RC-0.3.3 Actual Customer Data Pilot Started

- Branch: `rc-0.3.3-actual-customer-data-pilot`
- Baseline: `v0.3.2-rc-packaged`
- Purpose: run one actual or anonymized customer/site data pilot without changing the RC-0.3.2 packaged operational baseline.
- Focus:
  - full backup before pilot
  - minimum customer/site data input
  - Real Project Intake reuse
  - anonymized LightBIM connection
  - price readiness check
  - estimate/PCE generation
  - customer PDF/internal cost output readiness
  - customer safety verification
  - issue/friction recording for RC-0.3.3
- Privacy rule: pilot reports must not store raw phone, email, detailed address, or customer memo.
- Customer safety: customer-facing payload must not expose detailed address, customer phone/email, memo, internal cost, margin, PCE, vendor/labor/purchase/receiving data, variance, calibration, backup path, import rows, approval queue, internal, profit, or risk_score.
- Initial pilot smoke result: `실제 고객 Pilot 가능`.

### RC-0.3.3 Actual Customer Data Pilot Branch Stabilization

- Branch: `rc-0.3.3-actual-customer-data-pilot`
- Stabilization result: `MERGE_READY`
- Pilot report anonymization: PASSED.
- Customer safety: PASSED.
- Estimate/PCE: PASSED, PCE decision `SCALE`.
- Price readiness: `PARTIAL`, warning-only and does not block estimate generation.
- Leak injection: S1 customer-safety block created and customer output blocked.
- Unresolved S1/S2: none.
- Deferred: continue observing real customer input friction during additional Pilot runs; CRM pipeline/address API/portal deployment/calendar integration remain future candidates.

### RC-0.3.3 Actual Customer Data Pilot — Merged to Main

- Source branch: `rc-0.3.3-actual-customer-data-pilot`
- Merge commit: `1d72fc9 Merge RC-0.3.3 actual customer data pilot branch`
- Included:
  - Actual Customer Pilot 기록 구조
  - Pilot report 익명화
  - intake 연결
  - LightBIM 연결
  - 견적/PCE 검증
  - 고객 안전성 검사
- Pre-merge validation: PASSED.
- Post-merge validation on `main`: PASSED.
- Privacy/anonymization result: PASSED; raw phone, email, detailed address, and customer memo are not written to pilot reports or customer-facing payloads.
- Customer safety result: PASSED.
- Final decision: `RC-0.3.3 = 실제 고객 Pilot 흐름 main 반영 가능`

### RC-0.3.3 Desktop Release Package

- Package basis: `d39cbbf Finalize RC-0.3.3 merge documentation`
- Tag: `v0.3.3-rc`
- Package type: `windows-unpacked`
- Packaged executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Included package checks:
  - Actual Customer Data Pilot service
  - Pilot report anonymization
  - Intake connection
  - LightBIM connection
  - Estimate/PCE validation
  - Customer safety regression
  - Raw phone/email/detailed address/memo report storage prevention
- Privacy/anonymization result: PASSED.
- Customer safety result: PASSED.
- Known warnings: Vite bundle size warning, SQLite experimental warning, electron-builder metadata warning, and Node DEP warning are non-blocking.
- Final decision: `RC-0.3.3 packaged desktop release 사용 가능`

### RC-0.3.3 Packaged Actual Customer Pilot Run

- Packaged app launch: PASSED.
- Backup ID: `FULL-2026-06-03_213734`
- Pilot ID: `ACP-RC033-PACKAGED-PILOT`
- Intake ID: `RPI-RC033-PACKAGED-PILOT`
- LightBIM import ID: `LIGHTBIM-IMPORT-1780490254638`
- Price readiness: `PARTIAL`
- Estimate ID: `INTAKE-FULL_REMODELING-1780490254727`
- PCE result: `SCALE`
- Customer output: `READY`
- Internal output: `READY`
- Privacy/anonymization result: PASSED.
- Customer safety result: PASSED.
- Restart persistence result: PASSED.
- Final decision: `패키지 고객 Pilot 흐름 사용 가능`

### RC-0.3.3 Packaged Operational Baseline

- 기준 커밋: `1f4ea57 Run RC-0.3.3 packaged actual customer pilot test`
- 새 태그: `v0.3.3-rc-packaged`
- 최종 판정: `패키지 고객 Pilot 흐름 사용 가능`
- Privacy/anonymization: PASSED.
- Customer safety: PASSED.
- Verified packaged baseline flow:
  - packaged app launch
  - backup
  - actual customer pilot
  - intake 연결
  - LightBIM 연결
  - price readiness
  - estimate/PCE
  - customer output READY
  - internal output READY
  - restart persistence
- Known warnings: Vite bundle size warning, SQLite experimental warning, electron-builder metadata warning, and Node DEP0190 warning are non-blocking.
- Next direction:
  - RC-0.3.4: 실제 고객 데이터 추가 Pilot / 현장 데이터 축적
  - RC-0.4.0: CRM pipeline / 주소 API / 고객 포털 배포 / 일정 연동

## Version: RC-0.3.2

### RC-0.3.2 Real Project Intake Package Started

- Branch: `rc-0.3.2-real-project-intake`
- Purpose: prepare the first real customer/project data entry without changing RC-0.3.0 or RC-0.3.1 tags.
- Added structured intake flow for:
  - 고객 정보
  - 현장 정보
  - 공사 유형
  - 면적 / 공간 구성
  - 공사 범위
  - 예산 / 등급
  - 일정 희망일
  - LightBIM 도면 연결
  - 단가표 적용 여부
  - 견적/PCE 생성
  - 고객용 출력 전 내부정보 검사
  - 실제 프로젝트 입력 리포트
- Customer data handling: telephone, email, detailed address, and memo remain optional and are redacted in intake logs.
- Customer safety: customer output is blocked if internal cost, margin, PCE, vendor/labor/purchase/receiving, variance, calibration, backup path, onboarding/import/matching logs, approval queue, profit, or risk-score terms appear in customer payload.
- Status: package implementation started on RC-0.3.2 branch; not merged to main and not tagged.

### RC-0.3.2 First Real Project Intake Test

- Test date: 2026-05-30
- Intake ID: `RPI-RC032-FIRST-TEST`
- Test data path: `tests/user-test-data/rc-0.3.2/real-project-intake`
- Result: `접수 흐름 사용 가능`
- Price readiness: `PARTIAL`
- LightBIM connection: PASSED
- Estimate/PCE: PASSED, PCE decision `SCALE`
- Customer safety: PASSED
- Injected leak check: detailed address, internal cost, margin, and PCE were blocked with S1 issue creation.
- Documentation: `docs/RC_0_3_2_FIRST_REAL_PROJECT_INTAKE_TEST_REPORT.md`

### RC-0.3.2 Real Project Intake Branch Stabilization

- Branch: `rc-0.3.2-real-project-intake`
- Stabilization result: `MERGE_READY`
- Price readiness result: `PARTIAL`, allowed with warning and does not block estimate generation.
- LightBIM connection: PASSED, including project name, space count, total area, suggested estimate type, and warning count.
- Estimate/PCE: PASSED, PCE decision `SCALE` in stabilization smoke.
- Customer safety: PASSED.
- Privacy regression: detailed address, customer phone, customer email, memo, internal cost, margin, PCE, vendor/labor/purchase/receiving, variance, calibration, backup path, import rows, manual matching logs, approval queue, profit, and risk-score data are blocked from customer-facing payloads.
- Release smoke includes representative RC-0.3.2 intake checks.

### RC-0.3.2 Real Project Intake - Merged to Main

- Merge date: 2026-06-03
- Source branch: `rc-0.3.2-real-project-intake`
- Merge commit: `8875e3239110fe707077cf139432de585d050fc8`
- Included improvements:
  - Real Project Intake Center
  - customer/site/project intake validation
  - LightBIM connection from intake
  - price readiness check
  - estimate/PCE generation from intake
  - customer output safety check
  - detailed address, phone, email, and memo privacy filtering
- Tests passed:
  - `node tests/rc-0-3-2-branch-stabilization.smoke.js`
  - `node tests/rc-0-3-2-first-real-project-intake.smoke.js`
  - `node tests/real-project-intake.smoke.js`
  - `node tests/rc-0-3-1-packaged-release.smoke.js`
  - `node tests/price-import-manual-matching.smoke.js`
  - `node tests/lightbim-customer-safety-regression.smoke.js`
  - `node tests/lightbim-boc-release-flow.smoke.js`
  - `npm run build:ui`
  - `npm run smoke:prod`
  - `npm run smoke:release`
- Customer privacy/safety result: PASSED.
- Final decision: `RC-0.3.2 = main 반영 가능 / 실제 프로젝트 접수 흐름 사용 가능`.

### RC-0.3.2 Desktop Release Package

- Build date: 2026-06-03
- Commit used for package: `972571a`
- Tag: `v0.3.2-rc`
- Package type: `electron-builder win-unpacked`
- Package path: `electron/release/win-unpacked`
- Executable: `ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch: PASSED.
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO.
- userData path: `%APPDATA%\ecorean-boc-electron`
- DB path: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- Export path: `%APPDATA%\ecorean-boc-electron\export`
- Backup path: `%APPDATA%\ecorean-boc-electron\backups`
- RC-0.3.2 packaged feature check: Real Project Intake label, service, IPC/preload bridge, and production UI dist are included.
- Customer safety result: PASSED.
- Validation result: PASSED.
- Binary policy: packaged binaries under `electron/release` are generated locally and are not committed.

### RC-0.3.2 Packaged Real Project Intake Test

- Test date: 2026-06-03
- Package commit: `d85f678`
- Packaged exe: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch: PASSED.
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO.
- Backup result: PASSED, `FULL-2026-06-03_154750`
- Intake ID: `RPI-RC032-PACKAGED-REAL-TEST`
- Project name: `RC-0.3.2 패키지 접수 테스트 현장`
- LightBIM connection: PASSED, `LIGHTBIM-IMPORT-1780469270192`
- Price readiness: `PARTIAL`, warning-only and estimate generation allowed.
- Estimate ID: `INTAKE-FULL_REMODELING-1780469270225`
- PCE decision: `SCALE`
- Customer safety: PASSED, sensitive fields are blocked before customer output.
- Restart persistence: PASSED by service restart simulation against the same packaged-run data set.
- Final decision: `패키지 접수 흐름 사용 가능`.

### RC-0.3.2 Packaged Operational Baseline

- Baseline commit: `5244e44`
- Existing tags preserved:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
- New baseline tag: `v0.3.2-rc-packaged`
- Final decision: `RC-0.3.2 packaged operational baseline 사용 가능`
- Customer safety: PASSED.
- Verified packaged operational flows:
  - packaged app launch
  - full backup
  - real project intake
  - LightBIM connection
  - price readiness
  - estimate/PCE
  - customer safety
  - restart persistence
- Known warnings:
  - Vite bundle size warning
  - SQLite experimental warning
  - electron-builder metadata warning
  - Node DEP0190 warning
- Next version direction:
  - RC-0.3.3: actual customer data pilot
  - RC-0.4.0: CRM pipeline, address API, portal deployment, calendar integration, cloud sync, and larger operational integrations

## Version: RC-0.3.1

### RC-0.3.1 Operational Data Onboarding Started

- Branch: `rc-0.3.1-operational-data-onboarding`
- Baseline tag preserved: `v0.3.0-rc`
- Purpose: guide real operating data entry without changing the RC-0.3.0 operational baseline.
- Added workflow focus:
  - 실제 업체 정보 입력
  - 실제 자재/노무 단가표 가져오기
  - 단가 승인 및 Master Data 반영
  - 첫 실제 프로젝트 생성
  - 첫 LightBIM 도면 가져오기
  - 첫 견적/PCE 확인
  - 고객용 견적서와 내부 원가표 출력 확인
  - 고객 화면 내부정보 비노출 확인
  - 문제 기록 및 RC-0.3.1 수정 후보 정리
- Customer safety remains unchanged: onboarding issue details, backup paths, vendor data, labor cost, internal cost, margin, PCE, purchase/receiving data, variance, and calibration data are not customer-facing.

### RC-0.3.1 First Operational Data Onboarding Test

- Test date: 2026-05-29
- Branch: `rc-0.3.1-operational-data-onboarding`
- Onboarding run ID: `OOR-1780056032648-BDE1Y6`
- Result: `운영 시작 가능`
- Backup: `FULL-2026-05-29_210032`
- Material price CSV: 7 rows parsed, 6 matched, 1 intentionally unmatched.
- Labor rate CSV: 5 rows parsed, 5 matched.
- Price queue apply: approved updates were applied only after backup.
- First LightBIM project import: `LIGHTBIM-IMPORT-1780056034605`
- First estimate: `RC031-FIRST-OPERATIONAL-PROJECT`
- PCE decision: `SCALE`
- Customer safety: PASSED for customer estimate, client portal, customer proposal map, proposal board payload, and contract customer section.
- Deferred item: Vite bundle size warning remains non-blocking and is tracked for optimization.

### RC-0.3.1 Price Import Manual Matching UX

- Improved `단가표 일괄 가져오기` for unmatched and multiple-matched rows.
- Added Master Data candidate search for material, labor, equipment, standard estimate item, and package targets.
- Added manual match save flow:
  - `UNMATCHED` / `MULTIPLE_MATCHES`
  - search/select Master Data target
  - save as `MATCHED_MANUAL`
  - recalculate variance
  - make row eligible for approval Queue
- Added row exclusion flow with `EXCLUDED` status.
- Added queue readiness summary:
  - matched rows
  - manually matched rows
  - unmatched rows
  - multiple match rows
  - invalid rows
  - excluded rows
  - queue eligible rows
- Customer safety remains unchanged: import rows, match logs, unit cost, labor rate, variance, approval queue, and calibration history stay internal only.

### RC-0.3.1 Operational Data Onboarding Branch Stabilization

- Branch: `rc-0.3.1-operational-data-onboarding`
- Base tag preserved: `v0.3.0-rc`
- Stabilization decision: `MERGE_READY`
- Verified:
  - operational onboarding run creation and completion
  - full backup
  - material/labor CSV import
  - unmatched row manual matching
  - queue readiness after manual match
  - approval queue creation
  - backup before apply
  - Master Data price update
  - first LightBIM project import
  - estimate/PCE
  - customer/internal output separation
  - customer safety regression
- Deferred:
  - XLSX direct parsing
  - advanced fuzzy matching
  - new Master Data auto-create from unmatched rows
  - Vite bundle optimization
  - packaged app metadata cleanup

### RC-0.3.1 Operational Data Onboarding — Merged to Main

- Merge commit: `0da5513`
- Source branch: `rc-0.3.1-operational-data-onboarding`
- Base tag preserved: `v0.3.0-rc`
- Included improvements:
  - operational data onboarding center and 12-step workflow
  - first operational onboarding test package
  - price import manual matching for unmatched and multiple-matched rows
  - queue readiness and match log checks
  - stabilization smoke and MERGE_READY report
- Tests passed:
  - pre-merge RC-0.3.1 stabilization suite
  - post-merge main validation suite
  - `npm run build:ui`
  - `npm run smoke:prod`
  - `npm run smoke:release`
- Customer safety: PASSED. Customer-facing payloads do not expose internal cost, margin, PCE, vendor/labor data, purchase/receiving data, variance, calibration, backup paths, onboarding issues, import rows, manual matching logs, or approval queue details.
- Final decision: `RC-0.3.1 = main 반영 가능 / 운영 데이터 입력 개선 완료`
- Deferred:
  - XLSX direct parsing
  - advanced fuzzy matching
  - unmatched row new Master Data auto-create
  - Vite bundle optimization
  - package metadata cleanup

### RC-0.3.1 Desktop Release Package

- Package source commit: `d519304`
- Tag: `v0.3.1-rc`
- Packaging script: `npm run dist`
- Package type: `electron-builder --win --x64 --dir`
- Local package output: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked`
- Executable: `ECOREAN BOC CEO Dashboard.exe`
- Packaged launch result: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- userData path: `%APPDATA%\ecorean-boc-electron`
- DB path: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export path: `%APPDATA%\ecorean-boc-electron\export`
- backup path: `%APPDATA%\ecorean-boc-electron\backups`
- Verified:
  - RC-0.3.1 onboarding service and 12-step flow
  - price import manual matching smoke
  - customer safety regression
  - export folder creation
  - backup folder creation
  - production UI dist
- Customer safety: PASSED
- Final decision: `RC-0.3.1 패키지 실사용 가능`
- Binary policy: packaged binaries are generated locally under `electron/release` and are not committed.

### RC-0.3.1 First Real Project Run

- Test date: 2026-05-30
- Packaged app: `ECOREAN BOC CEO Dashboard.exe`
- Packaged launch: PASSED
- Dev server required: NO
- Project label: `RC-0.3.1 첫 실제 운영 테스트 프로젝트`
- Backup result: PASSED
- Price import/apply: PASSED, approved updates applied after backup
- LightBIM import: PASSED
- Estimate/PCE: PASSED, PCE decision `SCALE`
- Customer estimate/internal cost output: PASSED
- Contract/schedule/purchase order checks: PASSED
- Customer safety: PASSED
- Issues:
  - S1: none
  - S2: none
  - S3: real customer/site data was not provided, so safe test data was used
  - S4: known Vite bundle size and SQLite experimental warnings remain non-blocking
- Final decision: `첫 실제 프로젝트 운영 가능`

## Version: RC-0.3.0

### RC-0.3.0 Operational Release Candidate — Finalized

- Finalized date: 2026-05-29
- Validated functional commit: `1c421a6 Run RC-0.3.0 real price import user test`
- Final tag target: `v0.3.0-rc`
- Final decision: `RC-0.3.0 = 운영 기준선 사용 가능`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData path: `%APPDATA%/ecorean-boc-electron`
- DB path: `%APPDATA%/ecorean-boc-electron/storage/sqlite`
- export path: `%APPDATA%/ecorean-boc-electron/export`
- backup path: `%APPDATA%/ecorean-boc-electron/backups`

Confirmed flows:

- MiniCAD / LightBIM JSON export and BOC import
- LightBIM quantity review, override, traceability, space map, customer map
- Bathroom, kitchen, and full remodeling estimates
- PCE, contract, schedule, purchase order, material receiving, execution feedback
- Initial master data setup
- Real price calibration
- CSV price workbook import and real price import user test
- Customer/internal data separation
- Desktop packaged app real-use and persistence
- Backup/restore data safety

Final validation summary:

- Service syntax check: PASSED
- Real price import user test: PASSED
- Price workbook import: PASSED
- Real price calibration: PASSED
- Initial master data setup: PASSED
- Backup/restore data safety: PASSED
- Packaged real use: PASSED
- LightBIM BOC release flow: PASSED
- Customer safety regression: PASSED
- UI build: PASSED
- prod smoke: PASSED
- release smoke: PASSED

Known non-blocking warnings:

- Vite bundle size warning
- electron-builder description/author metadata warning
- SQLite experimental warning
- Node deprecation warning may appear depending on runtime

Known limitations:

- No automatic DWG/DXF parsing
- No full BIM editor
- No cloud sync
- No real-time multi-user collaboration
- No accounting/bank integration
- ComfyUI requires local server
- Customer portal public link is still local/token placeholder
- XLSX direct parsing deferred; CSV is supported

Next version direction:

- RC-0.3.1: XLSX direct import, price import matching polish, packaged metadata cleanup, bundle optimization, bugfixes.
- RC-0.4.0: LightBIM object editing, better DXF import/export, multi-project dashboard polish, accounting pre-layer.
- RC-1.0: installer/signing, production data migration policy, full backup/restore verification, customer portal deployment strategy.

### RC-0.3.0 LightBIM + BOC Release Flow

LightBIM is now stabilized as the spatial quantity source for the BOC operating flow. The release verifies the path from MiniCAD drawing export through estimate, execution planning, field feedback, traceability, and customer proposal output.

#### Completed LightBIM Modules

- MiniCAD LightBIM Core and `exportLightBIMJSON()`
- LightBIM JSON import and estimate draft creation
- Quantity calculation, review, and user override
- Estimate line item quantity binding and PCE recalculation
- Schedule duration and purchase order quantity binding
- Material receiving baseline and execution feedback
- Visual traceability and interactive internal space map
- Customer-safe proposal map and proposal board integration

#### RC-0.3.0 User Test Package

- Added the in-app `RC-0.3.0 사용자 테스트` center for starting test runs, recording evidence and severity, and completing a release verdict.
- Persists test runs and twelve release workflow steps in `user_test_runs` and `user_test_steps`.
- Stores the selected test scenario, including `전체 사용자 테스트`, on each run for clearer release audit history.
- Provides executable sample inputs in `tests/user-test-data/rc-0.3.0`.
- Provides checklist, bug report, acceptance criteria, and report templates in `docs/RC_0_3_0_*.md`.
- Release acceptance requires customer/internal data separation checks and no unresolved high-impact blocking defects.

#### RC-0.3.0 User Test Execution

- Test run: `UTRUN-RC030-1779961488230-1035`
- Scenario: `전체 사용자 테스트`
- Result: `실사용 가능`
- S1/S2 issues found: none.
- Fixed issue: `RC030-S3-001` added scenario persistence and display to the User Test Center.
- Deferred issue: `RC030-S4-001` Vite bundle size warning remains non-blocking and is tracked for later optimization.

#### RC-0.3.0 Desktop Release Package

- Packaging script used: `npm run dist` from `electron/`.
- Package output: `electron/release/win-unpacked`.
- Packaged executable: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`.
- Packaged launch check: PASSED, main window title `ECOREAN BOC CEO Dashboard`.
- Packaged userData path: `%APPDATA%/ecorean-boc-electron`.
- Packaged export folders created under `%APPDATA%/ecorean-boc-electron/export`.
- Release docs and manifest created under `release/RC-0.3.0`.
- Packaged readiness smoke: PASSED.
- Known warnings: Vite bundle size warning and electron-builder missing description/author warnings are non-blocking for RC-0.3.0.

#### RC-0.3.0 Packaged App Real Use Test

- Packaged app launch: PASSED.
- Dev server requirement: not required in packaged mode.
- userData path: `%APPDATA%/ecorean-boc-electron`.
- Export path: `%APPDATA%/ecorean-boc-electron/export`.
- LightBIM import in packaged environment: PASSED.
- Estimate/PCE result: FULL_REMODELING estimate created, PCE `SCALE`.
- Export result: customer estimate PDF, internal estimate Excel, and proposal board PDF created in userData export folders.
- Persistence result: saved estimate remained available after packaged service restart and could export again.
- Customer safety result: PASSED.
- Fixed packaged-only S1 issue `RC030-S1-001`: repeated packaged userData initialization no longer causes `company_cashflow_forecast.forecast_id` duplicate errors.
- Final packaged decision: `패키지 실사용 가능`.

#### RC-0.3.0 Backup Restore and Data Safety Layer

- Added internal `백업 / 복구 센터` for RC-0.3.0 packaged desktop use.
- Backup root: `%APPDATA%/ecorean-boc-electron/backups`.
- Supported backup types:
  - DB backup under `backups/db`
  - Export folder backup under `backups/export`
  - Full userData backup under `backups/full`
  - Pre-update full backup placeholder
- Each backup generates a manifest under `backups/manifests` and a `backup_history` record in SQLite.
- Current DB validation checks DB file presence, openability, key table availability, and SQLite `PRAGMA integrity_check`.
- Restore is intentionally plan-first in RC-0.3.0 and does not silently overwrite current operating data.
- Backup controls are internal-only and are not exposed to customer portal or customer proposal map screens.
- Limitation: no cloud backup, external storage integration, account login, or automatic remote restore in RC-0.3.0.

#### RC-0.3.0 Initial Master Data Setup Package

- Added internal `초기 기준 데이터 세팅` center for preparing editable RC-0.3.0 starting data.
- Seeds process, material, labor, equipment, standard estimate item, and default estimate package data with source marker `INITIAL_RC_0_3_0`.
- Adds seed tracking through `initial_master_data_seed_logs`.
- Adds default packages through `estimate_default_packages`.
- Seed execution is idempotent and does not overwrite existing edited rows unless explicitly requested.
- Full setup creates a pre-seed backup through the local backup restore service when available.
- All starting prices are marked as estimated / needs update and must be calibrated against real vendor and labor conditions before live use.
- Documentation added in `docs/RC_0_3_0_INITIAL_MASTER_DATA_SETUP.md`.

#### RC-0.3.0 Real Price Calibration Package

- Added internal `실제 단가 보정` center for replacing estimated defaults with user-entered real vendor, purchase, and labor prices.
- Adds `real_price_update_queue` and `real_price_update_history`.
- Supports NEEDS_UPDATE price lists, HIGH/MEDIUM/LOW priority classification, vendor quote input, actual purchase input, labor rate input, variance analysis, approval, backup, and apply.
- Approved prices are applied only after backup and are recorded in history with old/new price values.
- Updated master records move from `NEEDS_UPDATE` to `CONFIRMED`.
- Customer-facing views remain separated and do not expose vendor quote details, internal unit cost, labor rate, price variance, approval queue, or calibration history.
- Documentation added in `docs/RC_0_3_0_REAL_PRICE_CALIBRATION_GUIDE.md`.

#### RC-0.3.0 Price Workbook Import Layer

- Added internal `단가표 일괄 가져오기` center for bulk CSV price input.
- Supports 자재 단가표, 업체 견적 단가표, 실제 매입 단가표, 노무 단가표, 장비 단가표, 표준 견적 품목 단가표 import types.
- Adds `price_workbook_imports` and `price_workbook_import_rows` for import audit history.
- Provides Korean CSV templates under `templates/price-import`.
- Import flow parses, previews, infers columns, validates rows, matches master data, calculates variance, and creates `PENDING_REVIEW` queue items.
- Imported prices do not update master data directly; approval, backup, and apply remain in the Real Price Calibration Center.
- Customer-facing screens do not expose imported vendor quotes, unit cost, labor rates, variance, approval queue, import history, or calibration history.
- Limitation: CSV is the primary supported format in RC-0.3.0. XLSX is available only if a local parser dependency is present; no external market verification is performed.
- Documentation added in `docs/RC_0_3_0_PRICE_WORKBOOK_IMPORT_GUIDE.md`.

#### RC-0.3.0 Real Price Import User Test

- Added realistic user-test CSV files under `tests/user-test-data/rc-0.3.0/price-import`.
- Verified material, vendor quote, actual purchase, labor rate, and standard estimate item CSV import flows.
- Verified column mapping, master data matching, unmatched/invalid row handling, variance analysis, and approval queue creation.
- Verified imported prices are not applied before approval.
- Verified approval applies updates only after backup and records old/new price history.
- Verified updated material, labor, and standard estimate item prices appear in master data and the next estimate can read updated master data or safely fallback.
- Verified customer-facing payloads hide vendor quote, unit cost, labor rate, price variance, approval queue, import history, calibration history, internal cost, margin, and PCE.
- Final result: `실사용 가능`.
- Deferred: XLSX parser support and automatic new master-data creation for unmatched rows.

#### Verified End-To-End Flow

`MiniCAD / LightBIM -> JSON Export -> BOC Import -> Quantity Review -> Estimate / PCE -> Contract -> Schedule -> Purchase Order -> Material Receiving -> Execution Feedback -> Traceability -> Space Map -> Customer Proposal Map -> Proposal Board / Export -> Project Closing / Calibration`

#### Export Paths

- `export/estimates`
- `export/contracts`
- `export/schedules`
- `export/purchase-orders`
- `export/visualizations`
- `export/boards`
- `export/reports`
- `export/lightbim`

Development builds use the project export directory. Packaged Electron builds use the application `userData/export` directory.

#### Customer / Internal Separation

- Customer-facing portal, proposal map, estimate, contract sections, and proposal board must not expose internal cost, margin, PCE, vendor, labor, purchasing, receiving, variance, calibration, profit, or risk-score fields.
- Internal quantity review, execution feedback, traceability, and space-map views remain operational control surfaces.
- Customer proposal exports use sanitized payloads before PDF generation.

#### Validation Commands

```powershell
Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }
node tests/lightbim-boc-release-flow.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
node tests/lightbim-proposal-board-integration.smoke.js
node tests/lightbim-customer-proposal-map.smoke.js
node tests/lightbim-interactive-space-map.smoke.js
node tests/lightbim-traceability.smoke.js
node tests/lightbim-execution-feedback.smoke.js
node tests/lightbim-schedule-purchase-binding.smoke.js
node tests/lightbim-quantity-review.smoke.js
node tests/lightbim-quantity-binding.smoke.js
node tests/lightbim-quantity-accuracy.smoke.js
node tests/rc-0-3-0-user-test-package.smoke.js
cd electron
npm run build:ui
npm run smoke:prod
npm run smoke:release
```

#### Known Limitations

- No external DWG/DXF automatic parsing.
- No full BIM object editor.
- No real-time multi-user collaboration.
- No accounting or bank transfer integration.
- ComfyUI requires a local server when used.
- Customer portal link remains a local/token placeholder.
- Vite bundle size warning is non-blocking for RC-0.3.0 and is a future optimization target.

---

## Version: RC-0.2.0

### Stability Goal

BOC core release hardening for crash-proof startup, stable schemas, contract/payment execution, site operation continuity, and production smoke validation.

### Included Modules

- CEO Control Tower and drawer navigation
- Estimate and PCE foundation
- Bathroom, kitchen, and full remodeling estimate wizards
- Customer and internal estimate PDF/Excel export
- Contract generation and contract PDF export
- Schedule and purchase order generation
- Site execution, daily reports, change orders, inspections, defect handling, and receiving
- Payment / cashflow control
- Communication Center, Floorplan Center, AI Visualization Center, and Board Generation Center
- Release readiness checks, diagnostics, backup/restore, and internal test-mode environment tools

# Version: RC-0.3.7

## RC-0.3.7 Real Price Calibration UX started

- Added the internal `실제 단가 보정 워크벤치` flow for reviewing real price update queue items.
- Supports queue filtering by status, target type, and risk level.
- Supports approve, reject, defer, and backup-before-apply actions through the existing safe calibration workflow.
- Keeps Master Data unchanged until approval and backup-backed apply.
- Customer-facing payloads must continue to hide vendor quotes, internal unit costs, variance, queue status, backup ids, and calibration details.

## RC-0.3.7 Real Price Calibration UX Stabilized

- Branch: `rc-0.3.7-real-price-calibration-ux`
- Queue summary/list/detail: PASSED
- Approve/reject/defer with review reasons: PASSED
- Pending direct apply prevention: PASSED
- Master Data protection before approval and backup: PASSED
- Backup-backed apply and old/new price history: PASSED
- Linked priority task status update: PASSED
- CEO Dashboard, Drawer, pricing/import/master entry points: PASSED
- Customer safety: PASSED
- Fixed SQLite CASE string quoting and the missing CEO Dashboard workbench entry point.
- Unresolved S1/S2: none.
- Stabilization decision: `MERGE_READY`
- Main merge/tag status: not merged, not tagged.

## RC-0.3.7 Real Price Calibration UX — Merged to Main

- Source branch: `rc-0.3.7-real-price-calibration-ux`
- Merge commit: `35c1a09609d1aec7b5f388d9b6a0f1d78de5793f`
- Included commits: `5f21a6f`, `9f46c7e`
- Approve/reject/defer workflow: PASSED
- Master Data protection before approval and backup: PASSED
- Backup-backed apply and old/new price history: PASSED
- Linked priority task status update: PASSED
- CEO Dashboard and related workbench entry points: PASSED
- Customer safety: PASSED
- Pre-merge and post-merge build/release smoke: PASSED
- Final decision: `RC-0.3.7 = main 반영 완료 / release candidate tag 생성 가능`

## RC-0.3.7 Desktop Release Package

- Source tag: `v0.3.7-rc`
- Package source commit: `49a3b48`
- Windows unpacked package: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch without dev server: PASSED
- Real Price Calibration Workbench: PASSED
- Approval/rejection/deferral workflow: PASSED
- Master Data protection before approval and backup: PASSED
- Backup-before-apply: PASSED
- Old/new price history and linked priority task update: PASSED
- Customer safety: PASSED
- Packaged binaries remain local ignored build artifacts.
- Final decision: `RC-0.3.7 desktop release package 사용 가능`

## RC-0.3.7 Packaged Operational Baseline

- Baseline commit: `f3ff67e`
- New tag: `v0.3.7-rc-packaged`
- Real Price Calibration Workbench: PASSED
- Approval / Rejection / Deferral: PASSED
- Backup-before-apply: PASSED
- Master Data direct change prevention: PASSED
- Old/new price history record: PASSED
- Linked priority task update: PASSED
- Customer safety: PASSED
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190, and npm update notices when shown.
- Next direction:
  - RC-0.3.8: 단가표 미매칭 자동 추천 고도화
  - RC-0.4.0: CRM pipeline, 주소 API, 고객 포털, 일정 연동
- Final decision: `실제 단가 보정 워크벤치 패키지 운영 기준 사용 가능`

# Version: RC-0.3.8

## RC-0.3.8 Unmatched Price Auto Recommendation started

- Added the internal `단가 미매칭 추천 센터`.
- Calculates Master Data candidate Top 3 using item name, category/process, unit, specification/brand, price range, vendor repetition, and prior review history.
- Classifies recommendations as `HIGH`, `MEDIUM`, `LOW`, or `NO_MATCH`.
- Supports recommendation approval, rejection, deferral, and linking an approved recommendation to a `PENDING_REVIEW` price queue.
- Recommendation approval and queue linking do not directly update Master Data.
- Final price application remains protected by the Real Price Calibration Workbench approval, backup, and history workflow.
- Customer-facing payloads continue to hide recommendation, import price, candidate, queue, internal price, margin, PCE, vendor, labor, purchase, and personal information.
- Initial decision: `MERGE_READY`.

## RC-0.3.8 Unmatched Price Auto Recommendation Stabilized

- Branch: `rc-0.3.8-unmatched-price-auto-recommendation`
- Implementation commit: `eea7e80`
- Confidence fixture stability: `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0` PASSED
- Approve / reject / defer: PASSED
- Approved recommendation to Price Queue: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Recommendation approval does not change Master Data: PASSED
- Queue linking does not change Master Data: PASSED
- Existing Workbench approval, backup, apply, and history boundary remains required.
- CEO Dashboard, Drawer, Price Workbook Import, Real Price Workbench, Price Calibration Priority, and Master Data entry points: PASSED
- Customer safety: PASSED
- Initial MEDIUM fixture boundary issue was isolated to fixture wording; the corrected fixture remained stable without further changes.
- Unresolved S1/S2: none.
- Stabilization decision: `MERGE_READY`
- Main merge/tag status: not merged, not tagged.

## RC-0.3.8 Unmatched Price Auto Recommendation — Merged to Main

- Source branch: `rc-0.3.8-unmatched-price-auto-recommendation`
- Merge commit: `4c5fa803827efe0959a38ce86f54668a8eb88993`
- Included commits: `eea7e80`, `288a34b`
- Included:
  - 단가 미매칭 추천 센터
  - 미매칭 import row 조회
  - Master Data 후보 Top 3 추천
  - `HIGH / MEDIUM / LOW / NO_MATCH` confidence 분류
  - 추천 승인 / 반려 / 보류
  - approved recommendation의 Price Queue 연결
  - Queue `PENDING_REVIEW` 상태 유지
  - 추천 승인만으로 Master Data 변경 방지
  - Queue 연결만으로 Master Data 변경 방지
  - 고객 payload의 recommendation/internal data 비노출
  - CEO Dashboard를 포함한 6개 내부 진입점
- Confidence verification: `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0` PASSED
- Customer safety: PASSED
- Pre-merge and post-merge build/release smoke: PASSED
- Final decision: `RC-0.3.8 = 미매칭 단가 자동 추천 main 반영 가능`

## RC-0.3.8 Desktop Release Package

- Source tag: `v0.3.8-rc`
- Package source commit: `9c5d1da`
- Windows unpacked package: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch without dev server: PASSED
- Window title and first screen render: PASSED
- Unmatched Price Recommendation Center production bundle inclusion: PASSED
- Recommendation service app.asar inclusion: PASSED
- Confidence classification `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0`: PASSED
- Recommendation approval / rejection / deferral: PASSED
- Approved recommendation to Price Queue: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Recommendation approval and Queue linkage do not update Master Data: PASSED
- Existing Workbench approval, backup, apply, and history boundary remains required.
- Six internal entry points: PASSED
- Customer safety: PASSED
- userData, DB, export, backup, required export folders, and required backup folders: PASSED
- Packaged binaries remain local ignored build artifacts.
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder description/author metadata, and Node DEP0190.
- Final decision: `RC-0.3.8 desktop release package 사용 가능`

## RC-0.3.8 Packaged Operational Baseline

- Baseline commit: `625150d`
- Source commit: `9c5d1da`
- Source tag: `v0.3.8-rc`
- New packaged baseline tag: `v0.3.8-rc-packaged`
- Packaged app launch without dev server: PASSED
- Confidence classification: `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0` PASSED
- Recommendation approval / rejection / deferral: PASSED
- Price Queue linkage: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Recommendation approval and Queue linkage do not update Master Data: PASSED
- Existing Workbench approval, backup, apply, and history boundary remains required.
- Customer safety: PASSED
- Full package, regression, UI build, production smoke, and release smoke: PASSED
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190, and npm update notices when shown.
- Final decision: `RC-0.3.8 packaged operational baseline 사용 가능`

# Version: RC-0.3.9

## RC-0.3.9 Recommendation Scoring Enhancement started

- Added the internal `추천 점수 규칙 센터`.
- Added item synonym, unit, and specification normalization.
- Added vendor, approval/rejection history, and price variance scoring.
- Added score breakdown for name, category/process, unit, specification/brand, vendor, history, and price.
- Preserved the RC-0.3.8 confidence fixtures: `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0`.
- Prevented vendor weighting alone from promoting a weak identity match to `HIGH`.
- Added scoring rule activation/deactivation and report generation.
- Recommendation rule changes, recommendation approval, and Price Queue linkage do not directly change Master Data.
- Linked Price Queue items remain `PENDING_REVIEW`; Workbench approval, backup, apply, and history remain required.
- Customer-facing payloads continue to hide scoring, recommendation, queue, internal price, vendor, labor, margin, PCE, and personal information.
- Initial decision: `MERGE_READY`.

## RC-0.3.9 Recommendation Scoring Enhancement Stabilized

- Branch: `rc-0.3.9-recommendation-scoring-enhancement`
- Implementation commit: `18f38d4`
- Confidence fixtures: `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0` PASSED
- Score breakdown and item/unit/spec normalization: PASSED
- Vendor weighting and vendor-only HIGH prevention: PASSED
- Approval/rejection history weighting: PASSED
- Recommendation rule changes do not update Master Data: PASSED
- Recommendation approval and Queue linkage do not update Master Data: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Workbench approval, backup, apply, and history boundary: PASSED
- Five internal entry points and safe empty state: PASSED
- Customer safety: PASSED
- Fixed regressions remain resolved: UI bridge typing, identical-string 100 similarity, and full-schema test fixture.
- Unresolved S1/S2: none.
- Stabilization decision: `MERGE_READY`
- Main merge/tag status: not merged, not tagged.

## RC-0.3.9 Recommendation Scoring Enhancement — Merged to Main

- Source branch: `rc-0.3.9-recommendation-scoring-enhancement`
- Merge commit: `471c6c306904832529a1d9d6301f374fd6bdb063`
- Included commits: `18f38d4`, `ab3322f`
- Included:
  - recommendation scoring service
  - 추천 점수 규칙 센터
  - 품목명, 단위, 규격 정규화
  - 공급처 가중치
  - 승인/반려 이력 가중치
  - 가격 차이율 안전 점수
  - name/category/unit/spec/vendor/history/price score breakdown
  - `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0` 기준 유지
  - 공급처 단독 HIGH 승격 방지
  - 추천 규칙 변경만으로 Master Data 변경 방지
  - 추천 승인만으로 Master Data 변경 방지
  - Queue 연결만으로 Master Data 변경 방지
  - Queue `PENDING_REVIEW` 유지
  - 고객 payload scoring/internal data 비노출
  - CEO Dashboard를 포함한 5개 내부 진입점
- Pre-merge and post-merge service, regression, UI build, production smoke, and release smoke: PASSED
- Customer safety: PASSED
- Final decision: `RC-0.3.9 = 추천 점수 고도화 main 반영 가능`

## RC-0.3.9 Desktop Release Package

- Source tag: `v0.3.9-rc`
- Package source commit: `be0367c`
- Windows unpacked package: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch without dev server: PASSED
- Window title and first screen render: PASSED
- Recommendation Scoring Service app.asar inclusion: PASSED
- Recommendation Scoring Rules View production bundle inclusion: PASSED
- Item name, unit, and specification normalization: PASSED
- Vendor and approval/rejection history weighting: PASSED
- Price variance safety score and score breakdown: PASSED
- Confidence classification `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0`: PASSED
- Vendor-only weak candidate HIGH prevention: PASSED
- Recommendation rule changes, recommendation approval, and Queue linkage do not update Master Data: PASSED
- Linked Queue remains `PENDING_REVIEW`; Workbench approval, backup, apply, and history remain required.
- Five internal entry points and no customer entry point: PASSED
- Customer safety: PASSED
- userData, DB, export, backup, required export folders, and required backup folders: PASSED
- Packaged binaries remain local ignored build artifacts.
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder description/author metadata, and Node DEP0190.
- Final decision: `RC-0.3.9 desktop release package 사용 가능`

## RC-0.3.9 Packaged Operational Baseline

- Baseline commit: `c00eed2`
- Source commit: `be0367c`
- Source tag: `v0.3.9-rc`
- New packaged baseline tag: `v0.3.9-rc-packaged`
- Final decision: `추천 점수 고도화 패키지 운영 기준 사용 가능`
- Recommendation Scoring Rules View: PASSED
- Confidence: `HIGH 93 / MEDIUM 66 / LOW 54 / NO_MATCH 0`
- Item name, unit, and specification normalization: PASSED
- Score breakdown: PASSED
- Vendor weight: PASSED
- Approval/rejection history weight: PASSED
- Price variance safety score: PASSED
- Vendor-only HIGH guard: PASSED
- Recommendation rule changes do not update Master Data: PASSED
- Recommendation approval does not update Master Data: PASSED
- Price Queue linkage does not update Master Data: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Customer safety: PASSED
- Full service syntax, regression, UI build, production smoke, and release smoke: PASSED
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190, and npm update notices when shown.
- Next direction:
  - RC-0.4.0: CRM pipeline, address API, customer portal deployment, and schedule integration
  - Or RC-0.3.10: operational-data-based recommendation weight auto-tuning

# Version: RC-0.4.0

## RC-0.4.0 CRM Pipeline Foundation started

- Added the internal `고객 CRM 파이프라인 센터`.
- Added 12 CRM stages from `LEAD` through `CONTRACTED`, with `ON_HOLD` and `LOST`.
- Added CRM lead creation, update, filtering, detail, stage history, consultation logs, and site survey requests.
- Added project and estimate linkage without copying internal price, margin, PCE, Queue, or scoring data into CRM customer payloads.
- Added dashboard KPI counts for new leads, consulting, site surveys, estimates, contracts, holds, and losses.
- Added address, customer portal, schedule, and calendar connection preparation statuses without external API calls.
- Phone and email values are stored masked; portal public tokens are stored only as SHA-256 hashes.
- Customer payloads use an explicit allowlist and exclude detailed address, internal memo, raw contact data, internal price, margin, PCE, Queue, scoring, vendor, labor, purchase, receiving, profit, and risk data.
- Added anonymized CRM report generation and RC-0.4.0 CRM documentation.
- Initial CRM smoke and UI production build: PASSED.
- Initial decision: `MERGE_READY`.

## RC-0.4.0 CRM Pipeline Foundation Stabilized

- Branch: `rc-0.4.0-crm-pipeline-foundation`
- Foundation commit: `c2b2f43`
- All 12 CRM stages and stage history: PASSED
- Lead, consultation, site survey, estimate, and project linkage: PASSED
- Address, customer portal, and calendar connection preparation: PASSED
- External API calls and credential storage: DISABLED
- Phone/email masking and portal token SHA-256 hashing: PASSED
- Customer payload allowlist and internal-data filtering: PASSED
- Four internal entry points: PASSED
- Existing intake, LightBIM, pricing, and customer safety regressions: PASSED
- Unresolved S1/S2: none
- Stabilization decision: `MERGE_READY`
- Main merge/tag status: not merged, not tagged
- Deferred: actual address API, public portal deployment, calendar synchronization, advanced CRM automation, and operational conversion analytics

## RC-0.4.0 CRM Pipeline Foundation — Merged to Main

- Source branch: `rc-0.4.0-crm-pipeline-foundation`
- Merge commit: `17cb1ed`
- Included:
  - 고객 CRM 파이프라인 센터
  - `crmPipelineService`
  - CRM 12단계 stage와 stage history
  - lead 생성, 조회, 수정
  - 상담 기록과 다음 액션
  - 현장조사 요청
  - 견적 및 프로젝트 연결
  - 주소, 고객 포털, 캘린더 연결 준비 status
  - 외부 API 비호출 구조
  - 전화번호와 이메일 마스킹
  - portal public token SHA-256 hash 저장
  - 상세주소와 내부 메모 customer payload 비노출
  - 원가, 마진, PCE, Queue, Scoring customer payload 비노출
  - First Entry Panel, CEO Dashboard, Drawer, 실제 프로젝트 접수 내부 진입점
- Pre-merge service syntax, regression, UI build, production smoke, and release smoke: PASSED
- Post-merge main service syntax, regression, UI build, production smoke, and release smoke: PASSED
- External API calls: DISABLED
- Privacy masking and portal token hashing: PASSED
- Customer safety: PASSED
- Final decision: `RC-0.4.0 = CRM Pipeline Foundation main 반영 가능`

## RC-0.4.0 Desktop Release Package

- Source tag: `v0.4.0-rc`
- Package source commit: `7bb4970`
- Windows unpacked package: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Packaged app launch without dev server: PASSED
- Window title and first screen render: PASSED
- CRM Pipeline Service app.asar inclusion: PASSED
- CRM Pipeline Center production bundle inclusion: PASSED
- Lead create, list, detail, and update: PASSED
- 12-stage CRM movement and stage history: PASSED
- Consultation log, next action, and site survey request: PASSED
- Estimate and project linking: PASSED
- Address, customer portal, and calendar preparation status: PASSED
- Phone/email masking and portal token SHA-256 hashing: PASSED
- External API execution: DISABLED
- Customer-safe payload filtering: PASSED
- userData, DB, export, backup, required export folders, and required backup folders: PASSED
- Packaged binaries remain local ignored build artifacts.
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder description/author metadata, and Node DEP0190.
- Final decision: `RC-0.4.0 desktop release package 사용 가능`

## RC-0.4.0 Packaged Operational Baseline

- Baseline commit: `5d93aa3`
- Source commit: `7bb4970`
- Source tag: `v0.4.0-rc`
- New packaged baseline tag: `v0.4.0-rc-packaged`
- Final decision: `CRM Pipeline Foundation 패키지 운영 기준 사용 가능`
- CRM Pipeline Center: PASSED
- CRM 12-stage flow: PASSED
- Lead create / list / detail / update: PASSED
- Stage history: PASSED
- Consultation log and site survey request: PASSED
- Estimate and project linking: PASSED
- Address / customer portal / calendar preparation status: PASSED
- External API execution: DISABLED
- Phone/email privacy masking: PASSED
- Portal token SHA-256 hashing: PASSED
- Customer-safe payload filtering: PASSED
- Customer safety: PASSED
- Required export folders: PASSED
- Required backup folders: PASSED
- Full service syntax, packaged regression, UI build, production smoke, and release smoke: PASSED
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190, and npm update notices when shown.
- Next direction:
  - RC-0.4.1: CRM 알림 / 다음 액션 자동화
  - RC-0.4.2: 주소 API 연동 준비 고도화
  - RC-0.4.3: 고객 포털 초안
  - RC-0.4.4: 캘린더 동기화 준비
  - RC-0.5.0: 운영 권한 / 사용자 역할 관리

## RC-0.4.1 CRM Next Action & Notification Automation started

- Branch: `rc-0.4.1-crm-next-action-automation`
- Added the internal `CRM 다음 액션 / 내부 알림` center.
- Added automatic next actions for lead creation and CRM stage transitions.
- Added action create, list, detail, update, complete, snooze, cancel, duplicate prevention, and overdue detection.
- Added internal notification create, read, dismiss, severity/category tracking, and dashboard KPI summary.
- `ON_HOLD` snoozes active actions; `LOST` cancels active actions.
- Added entry points from First Entry Panel, CEO Dashboard, Drawer, CRM Pipeline, and Real Project Intake.
- SMS, email, Kakao, push, calendar, and address API execution remain `DISABLED`.
- Customer payloads continue to exclude internal notifications, action memo, delay risk, raw contact details, internal cost, margin, PCE, Queue, and Scoring data.
- RC-0.4.1 standalone smoke and production UI build: PASSED.
- Initial decision: `MERGE_READY`.

## RC-0.4.1 CRM Next Action Automation Stabilized

- Branch: `rc-0.4.1-crm-next-action-automation`
- Implementation commit: `0a9573d`
- Action create, list, detail, complete, 24-hour snooze, 7-day defer, and cancel: PASSED
- Lead and CRM stage automatic action generation: PASSED
- Active duplicate action prevention: PASSED
- OVERDUE detection and single internal notification: PASSED
- Internal notification read/dismiss: PASSED
- `ON_HOLD` and `LOST` automation restrictions: PASSED
- Phone/email masking in internal notification text: PASSED
- Five internal entry points and safe empty states: PASSED
- Customer-facing internal action/notification entry point: none
- External SMS, email, Kakao, push, calendar, and address API execution: DISABLED
- Customer safety and privacy allowlist: PASSED
- Service syntax, Node regressions, UI build, production smoke, and release smoke: PASSED
- Existing JSX static-test compatibility: PASSED
- In-app visual automation remained unavailable due to the Windows sandbox; build and Electron smoke checks were used as the render-path verification.
- Unresolved S1/S2: none
- Stabilization decision: `MERGE_READY`

## RC-0.4.1 CRM Next Action Automation — Merged to Main

- Source branch: `rc-0.4.1-crm-next-action-automation`
- Merge commit: `7ec9935`
- Included:
  - Lead 생성 및 CRM 단계 변경 기반 자동 다음 액션
  - 액션 생성 / 목록 / 상세 / 완료 / 미루기 / 연기 / 취소
  - 활성 액션 중복 방지와 기한 초과 판정
  - 내부 알림 생성 / 읽음 / 해제
  - `ON_HOLD` 활성 액션 미루기와 `LOST` 활성 액션 취소
  - First Entry Panel, CEO Dashboard, Drawer, CRM Pipeline, Real Project Intake 진입점
  - 전화번호 / 이메일 마스킹과 customer-safe payload 필터링
- External SMS, email, Kakao, push, calendar, and address API execution: DISABLED
- Pre-merge and post-merge service syntax, regression, UI build, production smoke, and release smoke: PASSED
- Customer safety: PASSED
- Final decision: `RC-0.4.1 = CRM Next Action Automation main 반영 가능`

## RC-0.4.1 Desktop Release Package

- Source commit: `21e468d`
- Merge commit: `7ec9935`
- Source tag: `v0.4.1-rc`
- Windows unpacked package: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Actual packaged app launch: PASSED
- Window title and first screen render: PASSED
- Dev server required: NO
- CRM Next Action Center and five internal entry points: PASSED
- Action create / list / detail / complete / 24-hour snooze / 7-day defer / cancel: PASSED
- Lead `FIRST_CONTACT` and stage-based action generation: PASSED
- Active duplicate action prevention: PASSED
- `OVERDUE` detection and internal notification: PASSED
- Internal notification read / dismiss: PASSED
- `ON_HOLD` / `LOST` safeguards: PASSED
- External SMS, email, Kakao, push, calendar, and address API: DISABLED
- Phone / email privacy masking: PASSED
- Customer-safe payload filtering: PASSED
- Customer safety: PASSED
- Packaged binaries remain local ignored build artifacts.
- Known non-blocking warnings: Vite bundle size, SQLite experimental API, electron-builder description/author metadata, Node DEP0190, and npm update notices when shown.
- Final decision: `RC-0.4.1 Desktop Release Package 사용 가능`

## RC-0.4.1 Packaged Operational Baseline

- Source commit: `21e468d`
- Package commit: `afef0f4`
- Source tag: `v0.4.1-rc`
- Packaged baseline tag: `v0.4.1-rc-packaged`
- Actual packaged launch: PASSED
- Dev server required: NO
- Action lifecycle: PASSED
- Stage automation: PASSED
- Duplicate prevention: PASSED
- `OVERDUE` detection: PASSED
- Internal notification read / dismiss: PASSED
- `ON_HOLD` / `LOST` guard: PASSED
- Privacy masking: PASSED
- Customer safety: PASSED
- External SMS, email, Kakao, push, calendar, and address API: DISABLED
- Final decision: `RC-0.4.1 packaged operational baseline 사용 가능`
- Next direction:
  - RC-0.4.2: 주소 정규화 및 주소 API 연결 준비
  - RC-0.4.3: 고객 포털 내부 초안
  - RC-0.4.4: 캘린더 / 현장조사 일정 동기화 준비
  - RC-0.5.0: 사용자 권한 및 역할 관리

## RC-0.4.2 Address Normalization & Provider Readiness started

- Branch: `rc-0.4.2-address-normalization-readiness`
- Added the internal `주소 정규화 센터` for CRM Lead, site survey, and project addresses.
- Added ROAD, JIBUN, MIXED, and UNKNOWN structure detection.
- Added HIGH, MEDIUM, LOW, and INVALID confidence classification.
- Preserved original address fields separately from normalized results.
- Added approval, rejection, deferral, linking, and address normalization history.
- Added SHA-256 canonical/fingerprint duplicate warnings without automatic merge or deletion.
- Added Lead, site survey, and project links plus six internal entry points.
- Added an address provider adapter interface with all network operations `DISABLED`.
- No address API key, HTTP request, geocoding request, or coordinate lookup is performed.
- Customer-safe payloads exclude internal detail, hashes, duplicate candidates, provider data, coordinates, validation details, and internal business data.
- Service syntax, standalone smoke, requested regressions, UI build, production smoke, and release smoke: PASSED.
- Initial decision: `MERGE_READY`.

## RC-0.4.2 Address Normalization & Provider Readiness Stabilized

- Branch: `rc-0.4.2-address-normalization-readiness`
- Implementation commit: `3d372e7`
- ROAD/JIBUN/MIXED/UNKNOWN detection: PASSED
- HIGH/MEDIUM/LOW/INVALID confidence: PASSED
- Original and normalized address separation: PASSED
- Approval/rejection/deferral and full history: PASSED
- Canonical, fingerprint, structural, same Lead/survey/project duplicate warnings: PASSED
- Automatic address/Lead/project merge or deletion: absent
- Lead/site survey/project linking: PASSED
- Null, invalid, long-detail, whitespace, and hyphen edge cases: PASSED
- Address provider and geocoding calls: DISABLED
- External network call and API credential: absent
- Six internal entry points: PASSED
- Customer-safe payload filtering: PASSED
- Service syntax, Node regressions, UI build, production smoke, and release smoke: PASSED
- Unresolved S1/S2: none
- Stabilization decision: `MERGE_READY`

## RC-0.4.2 Address Normalization & Provider Readiness — Merged to Main

- Source branch: `rc-0.4.2-address-normalization-readiness`
- Implementation commit: `3d372e7`
- Stabilization commit: `d379950`
- Merge commit: `cb41933`
- Base tag: `v0.4.1-rc-packaged`
- Included address normalization service, disabled provider adapter, and internal Address Normalization Center.
- ROAD/JIBUN/MIXED/UNKNOWN and HIGH/MEDIUM/LOW/INVALID classification: PASSED
- Original/normalized address separation and approval/rejection/deferral history: PASSED
- Duplicate candidate warnings without automatic merge or deletion: PASSED
- Lead/site survey/project linking: PASSED
- Null, malformed, whitespace, hyphen, mixed-language, and long-detail edge cases: PASSED
- External address API, geocoding, coordinate lookup, provider URL, and API credentials: absent
- Customer-safe payload and six internal entry points: PASSED
- Pre-merge and post-merge service syntax, regressions, UI build, production smoke, and release smoke: PASSED
- Final decision: `RC-0.4.2 Address Normalization & Provider Readiness main 반영 완료`

## RC-0.4.2 Desktop Release Package

- Source commit: `8dfd5ef`
- Merge commit: `cb41933`
- Source tag: `v0.4.2-rc`
- Windows package: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- Actual packaged launch, responding process, and window title: PASSED
- Dev server required: NO
- ROAD/JIBUN/MIXED/UNKNOWN: PASSED
- HIGH/MEDIUM/LOW/INVALID: PASSED
- Original address protection and separate normalized storage: PASSED
- Approval/rejection/deferral and history: PASSED
- Duplicate warning and automatic merge/delete guards: PASSED
- Lead/site survey/project linkage: PASSED
- Provider adapter and external address API: DISABLED
- Customer-safe payload filtering: PASSED
- Six internal entry points: PASSED by source, production bundle, archive, and smoke verification
- Null, malformed, empty, whitespace, numeric, building-only, road-only, lot, mixed, long-detail, mixed-language, and hyphen edge cases: PASSED
- app.asar includes address services, Electron bridge, production UI route, and Korean center label: PASSED
- Packaged binaries, app.asar, userData, DB, backups, and export files remain uncommitted
- Known warnings: Vite bundle size, SQLite experimental API, electron-builder description/author metadata, Node DEP0190
- Final decision: `RC-0.4.2 Desktop Release Package 사용 가능`

## RC-0.4.2 Packaged Operational Baseline

- Source commit: `8dfd5ef`
- Package documentation commit: `8924fbd`
- Merge commit: `cb41933`
- Source tag: `v0.4.2-rc`
- Packaged tag: `v0.4.2-rc-packaged`
- Packaged launch: PASSED
- Window title / responsiveness: PASSED
- app.asar inclusion: PASSED
- Dev server: not required
- Address types: PASSED
- Confidence classification: PASSED
- Original address protection: PASSED
- Approval / rejection / deferral: PASSED
- History: PASSED
- Duplicate warning: PASSED
- Automatic merge / delete prevention: PASSED
- Lead / site survey / project linkage: PASSED
- Provider: DISABLED
- External API / geocoding / coordinates: DISABLED
- Customer safety: PASSED
- Six internal entry points: PASSED
- Edge cases: PASSED
- Git exclusions: packaged EXE, app.asar, `electron/release`, userData, DB / SQLite, backups, exports, real address data, generated PDF / Excel, and temporary logs were not committed.
- Known warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190, and npm update notice when shown.
- Final decision: operational baseline available.
- Next direction:
  - RC-0.4.3: Customer Portal Internal Draft
  - RC-0.4.4: Calendar & Site Survey Sync Readiness
  - RC-0.5.0: User Roles & Permissions

## RC-0.4.3 Customer Portal Internal Draft started

- Branch: `rc-0.4.3-customer-portal-internal-draft`
- Base tag: `v0.4.2-rc-packaged`
- Added internal `고객 포털 내부 초안` center.
- Added `customerPortalDraftService` with draft lifecycle, allowlist customer-safe payload builder, snapshot, audit history, internal preview session, and publish block validation.
- External public portal, customer login, external hosting, SMS, Email, Kakao, Push, Calendar, Address API, geocoding, coordinates, API key, and OAuth remain DISABLED.
- Customer-safe payloads are built as new allowlist DTOs, not by copying internal objects and deleting fields.
- Internal draft approval does not mean public release.
- Customer screens do not expose the internal Draft Center entry point.

## RC-0.4.3 Customer Portal Internal Draft Stabilized

- Branch: `rc-0.4.3-customer-portal-internal-draft`
- Implementation commit: `a345991`
- Draft lifecycle create / list / detail / update / archive / restore: PASSED
- Archived draft update restriction: PASSED
- Lead / Project / Estimate / Contract linkage and audit history: PASSED
- Allowlist customer-safe payload builder: PASSED
- Unexpected nested internal fields, raw phone/email, cost, margin, PCE, queue, scoring, detailed address, hash, provider, coordinates, internal action, and notification data: HIDDEN
- customer-approved and approved/final documents only: PASSED
- customer-visible milestones only and progress 0~100 safety: PASSED
- Snapshot revision and previous snapshot retention: PASSED
- Review request / internal approval / rejection / approval revocation: PASSED
- Approved draft change returns to revision-required review: PASSED
- Missing project, portal title, or customer display name triggers publish block: PASSED
- Preview session token plaintext storage: ABSENT
- Preview token hash storage, expiration block, and revoke block: PASSED
- External public URL, hosting, login, auth API, SMS, Email, Kakao, Push, Calendar, address API, geocoding, and coordinates: DISABLED
- Six internal entry points: PASSED
- Customer screen internal Draft Center entry: ABSENT
- Customer safety: PASSED
- Stabilization decision: `MERGE_READY`

## RC-0.4.3 Customer Portal Internal Draft — Merged to Main

- Source branch: `rc-0.4.3-customer-portal-internal-draft`
- Base tag: `v0.4.2-rc-packaged`
- Implementation commit: `a345991`
- Stabilization commit: `f22c5a6`
- Smoke compatibility commit: `f5be119`
- Merge commit: `b6c9500`
- Included Customer Portal Draft Service and internal Customer Portal Draft Center.
- Draft lifecycle create / list / detail / update / archive / restore: PASSED
- Lead / Project / Estimate / Contract linkage: PASSED
- Allowlist customer payload and internal field exclusion: PASSED
- Approved document filtering and customer-visible progress: PASSED
- Snapshot revision, previous snapshot retention, and audit history: PASSED
- Internal review / approval / rejection / revocation: PASSED
- Publish block and internal preview session: PASSED
- Preview token SHA-256 protection: PASSED
- External public portal, external URL, customer login, external auth/API, SMS, Email, Kakao, Push, Calendar, geocoding, and coordinate lookup: DISABLED
- Six internal entry points: PASSED by source/smoke validation
- Customer screen internal Draft Center entry: ABSENT
- Customer safety: PASSED
- Visual browser click QA: NOT PERFORMED
- Source / smoke / build route validation: PASSED
- Final decision: `RC-0.4.3 Customer Portal Internal Draft main 반영 완료`

## RC-0.4.3 Desktop Release Package

- Source commit: `3a99fdf`
- Source tag: `v0.4.3-rc`
- Merge commit: `b6c9500`
- Implementation commit: `a345991`
- Stabilization commit: `f22c5a6`
- Smoke correction commit: `f5be119`
- Package path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- Actual packaged launch: PASSED
- Window title and responsiveness: PASSED
- Dev server required: NO
- Visual click QA: BASIC_LAUNCH_VERIFIED_FULL_CLICK_QA_NOT_PERFORMED
- Draft lifecycle: PASSED
- Lead / Project / Estimate / Contract linkage: PASSED
- Allowlist customer payload: PASSED
- Forbidden internal field exclusion: PASSED
- Approved customer document filter: PASSED
- Customer-visible progress safety: PASSED
- Snapshot / revision retention: PASSED
- Audit history: PASSED
- Internal review / approval / rejection / revocation: PASSED
- Publish block: PASSED
- Internal preview session and token SHA-256 protection: PASSED
- External public portal / authentication / API / message delivery: DISABLED
- Customer safety: PASSED
- Six internal entry points: PASSED by source/smoke/archive
- Customer screen isolation: PASSED
- Known warnings: Vite bundle size, SQLite experimental API, electron-builder metadata, Node DEP0190
- Final decision: `RC-0.4.3 Desktop Release Package 사용 가능`

## RC-0.4.3 Packaged Operational Baseline

- Base tag: `v0.4.2-rc-packaged`
- Source commit: `3a99fdf`
- Merge commit: `b6c9500`
- Package documentation commit: `60cb288`
- Source tag: `v0.4.3-rc`
- Packaged tag: `v0.4.3-rc-packaged`
- Packaged launch: PASSED
- Window title / responsiveness: PASSED
- app.asar inclusion: PASSED
- Dev server: not required
- Draft lifecycle: PASSED
- Linkage: PASSED
- Allowlist payload: PASSED
- Forbidden fields: excluded
- Document filter: PASSED
- Progress safety: PASSED
- Snapshot / revision: PASSED
- Audit history: PASSED
- Review workflow: PASSED
- Publish block: PASSED
- Preview / token protection: PASSED
- Customer safety: PASSED
- Customer screen isolation: PASSED
- External portal / authentication / API / message: DISABLED
- Six internal entry points: source / smoke / archive PASSED
- Full visual click QA: NOT_PERFORMED
- Final decision: packaged operational baseline available
- Next direction:
  - RC-0.4.4 Calendar & Site Survey Sync Readiness
  - RC-0.5.0 User Roles & Permissions
  - Separate QA: Customer Portal packaged full click QA
# RC-0.4.4 Calendar & Site Survey Sync Readiness started

- Branch: `rc-0.4.4-calendar-site-survey-sync-readiness`
- Base tag: `v0.4.3-rc-packaged`
- Added internal-only Calendar / Site Survey Sync readiness layer.
- Added local DB tables for internal calendar events, site survey links, reminders, and audit history.
- Added disabled calendar provider adapter for Google / Outlook / Apple Calendar readiness without external API calls.
- Added Korean internal UI center for calendar, site survey sync, conflict review, reminders, and audit report actions.
- Customer safety rule remains enforced: no internal calendar metadata, conflict details, reminders, provider data, personal raw contact data, cost, margin, PCE, vendor, purchase, backup, or risk score may be exposed.
- External sync, OAuth, API keys, customer invitations, SMS, email, and public calendar delivery remain disabled.
- Validation resumed and passed: service syntax, RC-0.4.4 smoke, RC-0.4.x / RC-0.3.x regression, `build:ui`, `smoke:prod`, and `smoke:release`.
- Fixed during validation: unsupported timezone fallback, SQLite empty-string literal compatibility, and UI result typing.
- Next direction: RC-0.4.5 may evaluate manual calendar export/import or provider preparation after security review; RC-0.5.0 can revisit real provider integration.

# RC-0.4.4 Calendar & Site Survey Sync Readiness Stabilized

- Stabilization decision: `MERGE_READY`
- Added branch stabilization smoke for calendar lifecycle, timezone, Survey link protection, mismatch, conflict detection, reminders, Provider DISABLED state, and customer-safe payload.
- Provider adapter remains disabled: `provider: null`, `authentication_status: NOT_CONFIGURED`, `external_call_performed: false`.
- External Calendar/OAuth/invitation/SMS/email/push calls remain absent.
- Completed/cancelled event and reminder edge cases are guarded.
- Same Survey multiple Event linkage now requires review instead of automatic merge/delete.
- Customer safety: PASSED.
- Visual click QA: NOT_PERFORMED.

# RC-0.4.4 Calendar & Site Survey Sync Readiness — Merged to Main

- Source branch: `rc-0.4.4-calendar-site-survey-sync-readiness`
- Base tag: `v0.4.3-rc-packaged`
- Implementation commit: `8f92eb1`
- Stabilization commit: `91e41cc`
- Merge commit: `ee78a2c`
- Included improvements:
  - Internal Calendar & Site Survey Sync readiness center
  - Calendar lifecycle, timezone handling, conflict detection, reminders, and audit history
  - Site survey linkage from calendar to survey and survey to calendar
  - Original event protection, no auto-cancel, no auto-assignment, and no automatic time change
  - Provider adapter readiness with all external API/OAuth/invitation/message calls disabled
  - CRM Action duplicate prevention and overdue reminder behavior
  - Customer-safe payload filtering and customer screen isolation
- Validation:
  - Pre-merge source/smoke/build validation: PASSED
  - Post-merge source/smoke/build validation: PASSED
- Customer safety: PASSED
- Visual QA: NOT_PERFORMED
- Known warnings: Vite bundle size warning, SQLite experimental API warning, Node DEP warning if shown
- Final decision: `RC-0.4.4 Calendar & Site Survey Sync Readiness main 반영 완료`

# RC-0.4.4 Desktop Release Package

- Source commit: `06b92be`
- Source tag: `v0.4.4-rc`
- Merge commit: `ee78a2c`
- Package path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: 2,763,169 bytes
- Packaged launch: PASSED
- Window title/responsiveness: PASSED
- Dev server required: NO
- Visual QA: NOT_PERFORMED; source/smoke/archive and packaged launch verified
- Calendar lifecycle: PASSED
- Timezone: PASSED
- Survey sync: PASSED
- Survey to Calendar / Calendar to Survey: PASSED
- Mismatch/original protection: PASSED
- Conflict detection: PASSED
- Automatic change prevention: PASSED
- Reminder/OVERDUE: PASSED
- CRM Action duplicate prevention: PASSED
- Provider: DISABLED
- external API/OAuth/invitation: DISABLED
- Customer-safe payload: PASSED
- Customer safety: PASSED
- Seven internal entry points: PASSED by source/smoke/archive
- Customer screen isolation: PASSED
- Known warnings: Vite bundle size warning, SQLite experimental API warning, electron-builder metadata warning, Node DEP0190 warning
- Packaged baseline tag: not created in this step
- Final decision: `RC-0.4.4 Desktop Release Package 사용 가능`

# RC-0.4.4 Packaged Operational Baseline

- Base tag: `v0.4.3-rc-packaged`
- Source commit: `06b92be`
- Merge commit: `ee78a2c`
- Package documentation commit: `517aa1d`
- Source tag: `v0.4.4-rc`
- Packaged tag: `v0.4.4-rc-packaged`
- Packaged launch: PASSED
- app.asar inclusion: PASSED
- Dev server: not required
- Calendar lifecycle: PASSED
- Timezone: PASSED
- Survey sync: PASSED
- mismatch/original protection: PASSED
- conflict detection: PASSED
- automatic change prevention: PASSED
- Reminder/OVERDUE: PASSED
- CRM Action duplicate prevention: PASSED
- audit history: PASSED
- Provider/external API/OAuth/invitation/message: DISABLED
- Customer-safe payload: PASSED
- Customer safety: PASSED
- Seven entry points: source/smoke/archive PASSED
- Customer screen isolation: PASSED
- Full visual click QA: NOT_PERFORMED
- Known warnings: Vite bundle size warning, SQLite experimental API warning, electron-builder metadata warning, Node DEP0190 warning
- Next direction:
  - RC-0.5.0 User Roles & Permissions
  - Separate QA: Calendar packaged full click QA
  - External Provider integration only in a separate future version
- Final decision: operational baseline available

# v0.4.4 Official Operational Baseline

- Release candidate source tag: `v0.4.4-rc`
- Packaged operational baseline tag: `v0.4.4-rc-packaged`
- Official release tag: `v0.4.4`
- Electron package version: `0.4.4`
- UI package version: `0.4.4`
- Official release scope:
  - Calendar & Site Survey Sync readiness
  - Internal Calendar SSOT
  - Survey linkage and explicit manual sync directions
  - mismatch review, conflict detection, reminders, and audit history
  - external Calendar provider/OAuth/invitation/message delivery disabled
  - customer-safe schedule payload filtering
- Packaged application verification: PASSED
- Runtime launch verification: PASSED
- EXE SHA-256: `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C`
- app.asar SHA-256: `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051`
- Customer safety: PASSED
- Full visual click QA: NOT_PERFORMED
- Installation/run:
  - Run `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
  - userData: `%APPDATA%\ecorean-boc-electron`
  - DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
  - export: `%APPDATA%\ecorean-boc-electron\export`
  - backups: `%APPDATA%\ecorean-boc-electron\backups`
- Known limitations:
  - No real Google/Microsoft/Apple/CalDAV provider integration
  - No OAuth credential storage
  - No external invitation delivery
  - No customer schedule notification delivery
  - Full visual click QA remains a separate QA item
- Rollback reference:
  - `v0.4.4-rc-packaged`
  - `v0.4.3-rc-packaged`
- Final decision: official operational baseline release approved after final tag and GitHub Release creation

# v0.4.5 Visual & Output QA Stabilization — Started

- Branch: `v0.4.5-visual-output-qa-stabilization`
- Base: `v0.4.4` official operational baseline
- Scope:
  - release smoke timeout diagnostics
  - packaged visual QA harness
  - PDF / Excel / print output artifact QA
- Added:
  - `tests/v0-4-5-release-smoke-diagnostics.js`
  - `tests/v0-4-5-packaged-visual-qa.smoke.js`
  - `tests/v0-4-5-output-artifact-render.smoke.js`
  - `smoke:release:diagnose`
  - `smoke:release:timed`
- Release smoke diagnostics:
  - previous aggregate timeout addressed by per-test child process isolation
  - final diagnostics run completed in 175396 ms from project root
  - `npm run smoke:release:diagnose` completed in 217628 ms
  - `npm run smoke:release` completed in 256725 ms
  - timed out tests: none
  - failed tests: none
  - remaining processes: none
  - `project-profit-closing.smoke.js` measured as a long-running smoke and has a documented 60000 ms per-test timeout
- Packaged visual QA:
  - EXE launch: PASSED
  - window title: PASSED
  - customer screen isolation: PASSED
  - full click automation: CONDITIONAL / dependency not added
  - screenshots: NOT_CAPTURED_PRIVACY_SAFE
- Output artifact QA:
  - customer estimate PDF: PASSED
  - internal cost PDF: PASSED
  - customer Excel: PASSED
  - internal Excel: PASSED
  - customer print HTML: PASSED
  - customer/internal separation: PASSED
  - known warning: PDF Korean text uses ASCII fallback
- Current decision: `CONDITIONAL_MERGE_READY`

# v0.4.5 Visual & Output QA Stabilization — Merged to Main

- Source branch: `v0.4.5-visual-output-qa-stabilization`
- Implementation commit: `d9d84f2`
- Stabilization commit: `e3089e6`
- Merge commit: `a1e2213`
- Main-context smoke adjustment commit: `86d2596`
- `v0.4.5-rc` tag target: final merge documentation commit
- Official `v0.4.4` tag preserved:
  - `36aaa3d98b26743a828a879d878b142e9e003905`
- Release smoke timeout: resolved
  - root cause: aggregate release smoke crossed the default 30000 ms boundary on slow tests
  - action: child-process diagnostics and documented per-test `60000 ms` timeout for `project-profit-closing.smoke.js`
- Post-merge diagnostics:
  - project-root diagnostics: PASSED, `171518 ms`
  - `npm run smoke:release:diagnose`: PASSED, `149741 ms`
  - `npm run smoke:release`: PASSED, `148005 ms`
  - timed out tests: none
  - failed tests: none
  - remaining process: none
- Packaged visual QA: `CONDITIONAL_PASSED`
  - EXE launch: PASSED
  - customer screen isolation: PASSED
  - full click automation: PARTIAL / deferred
  - pixel-level screenshot comparison: deferred
  - screenshots: NOT_CAPTURED_PRIVACY_SAFE
- Output artifact QA: `PASSED_WITH_WARNINGS`
  - customer PDF: PASSED
  - internal PDF: PASSED
  - customer Excel: PASSED
  - internal Excel: PASSED
  - customer print HTML: PASSED
  - customer/internal separation: PASSED
  - warning: `PDF_KOREAN_TEXT_ASCII_FALLBACK`
- Customer safety: PASSED
- P0/P1: none
- P2: release smoke timeout risk resolved
- P3:
  - visual click automation remains partial
  - pixel screenshot comparison remains deferred
  - safe screenshot capture mode remains deferred
  - PDF Korean typography improvement remains deferred
- Known warnings:
  - Vite bundle size warning
  - SQLite experimental API warning
  - PDF Korean text ASCII fallback
  - npm update notice if shown
- Final decision: `v0.4.5 Visual & Output QA Stabilization main 반영 완료, CONDITIONAL_MERGE_READY`

# v0.4.5 RC Desktop Package

- RC tag: `v0.4.5-rc`
- RC tag target: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- Official `v0.4.4` preserved:
  - `36aaa3d98b26743a828a879d878b142e9e003905`
- Official `v0.4.5` tag: not created
- GitHub Release / release asset upload: not created
- EXE path:
  - `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- app.asar path:
  - `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2763157` bytes
- Actual packaged launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED
  - package build precheck: `161848 ms`
- `npm run smoke:release`: PASSED
  - package build precheck: `247454 ms`
- Post-package v0.4.5 diagnostics: PASSED, `171934 ms`
- Timeout: none
- Remaining process: none
- Packaged visual QA: `CONDITIONAL_PASSED`
- Output artifact QA: `PASSED_WITH_WARNINGS`
- PDF result: PASSED with `PDF_KOREAN_TEXT_ASCII_FALLBACK`
- Excel result: PASSED
- Print result: PASSED
- Customer/internal separation: PASSED
- Customer safety: PASSED
- P0/P1: none
- P2: none open
- P3:
  - full packaged visual click automation remains partial
  - pixel-level screenshot comparison remains deferred
  - safe screenshot capture mode remains deferred
  - PDF Korean typography improvement remains deferred
- Known warnings:
  - Vite bundle size warning
  - SQLite experimental API warning
  - electron-builder description/author metadata warning
  - Node DEP0190 warning
  - PDF Korean text ASCII fallback
- Final decision: `v0.4.5 RC Desktop Package 검증 완료`

# v0.4.5 Official Acceptance QA

- RC tag: `v0.4.5-rc`
- RC target: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- RC package docs commit: `c46f378`
- Official `v0.4.4` preserved:
  - `36aaa3d98b26743a828a879d878b142e9e003905`
- Official acceptance decision: `ACCEPTED_WITH_WARNINGS`
- Official `v0.4.5` tag target: Acceptance QA documentation commit
- GitHub Release: `NOT_CREATED`
- Release asset upload: `NOT_CREATED`
- Package identity:
  - EXE size: `210149888` bytes
  - EXE SHA256: `FFA455C9E224A74695F46767D2A5D3A5DB0038FFA56275A489E70A5FDAEAD06C`
  - app.asar size: `2763157` bytes
  - app.asar SHA256: `879B876C0D0AC58362C8288DFECD82DFAB10F25A1AA71120986D290F3DC95051`
- Actual launch: PASSED, 2 runs
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release:diagnose`: PASSED, `141883 ms`
- `npm run smoke:release`: PASSED, `147053 ms`
- Timeout: none
- Remaining process: none
- Packaged visual QA: `CONDITIONAL_PASSED`
- Output artifact QA: `PASSED_WITH_WARNINGS`
- Customer/internal separation: PASSED
- Customer safety: PASSED
- P0/P1: none
- P2: none open
- P3:
  - full packaged visual click automation remains partial
  - pixel-level screenshot comparison remains deferred
  - safe screenshot capture mode remains deferred
  - PDF Korean typography improvement remains deferred
- Final decision: `v0.4.5 ACCEPTED WITH WARNINGS`
# v0.4.6 Packaged Visual Click & Output Typography QA

- Started from official `v0.4.5` without changing the official or RC tags and without modifying the GitHub Release asset.
- Added actual packaged renderer click QA for LightBIM, CRM, and Client Portal routes.
- Added app-viewport-only screenshot capture with isolated synthetic userData and explicit desktop/private-data rejection.
- Added PNG pixel delta and visible layout-bound inspection.
- Replaced the real PDF ASCII fallback with runtime Windows Korean font embedding, ToUnicode mapping, CID width correction, line wrapping, and multi-page output.
- Added Poppler raster verification for every generated PDF page.
- Expanded customer/internal safety checks across PDF, XLSX, and print layout guards.
- Customer safety: `PASSED`
- P0/P1/P2: none
- Remaining P3: native Excel viewer pixel automation and OS print dialog click automation.
- Decision: `MERGE_READY`
# v0.4.6 Packaged Visual Click & Output Typography QA - Merged to Main

- Source branch: `v0.4.6-packaged-visual-click-output-typography-qa`
- Implementation commit: `318c3d9`
- Merge commit: `016b50a`
- Post-merge smoke context commit: `f22874e`
- Packaged visual click QA: `PASSED`
- LightBIM / CRM / Client Portal click QA: `PASSED`
- Safe screenshot viewport-only mode: `PASSED`
- Full desktop capture: blocked
- Sensitive customer information capture: blocked
- Pixel/layout comparison: added and passed
- PDF Korean font embedding: `PASSED`
- Poppler PDF render: `PASSED`
- Customer PDF: 1 page, `PASSED`
- Internal PDF: 2 pages, `PASSED`
- PDF/Excel/Print customer/internal separation: `PASSED`
- Customer safety: `PASSED`
- Historical v0.4.5 package smoke updated so a newer mutable `win-unpacked`
  package does not falsely fail against the archived v0.4.5 app.asar size.
- P0/P1/P2: none
- Remaining P3:
  - Excel native viewer pixel automation
  - OS print dialog click automation
- Official `v0.4.5` tag preserved at `abe9094a8f09776a0960f0e65550bf301c5b8c55`.
- `v0.4.6-rc` target: this final merge documentation commit.
- Decision: `v0.4.6 Packaged Visual Click & Output Typography QA main 반영 완료, MERGE_READY`
# v0.4.6 RC Desktop Package

- RC tag: `v0.4.6-rc`
- RC tag target: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- Official `v0.4.5` preserved at `abe9094a8f09776a0960f0e65550bf301c5b8c55`.
- Official `v0.4.6` tag / GitHub Release / release asset: not created.
- EXE: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- app.asar size: `2772008` bytes
- Actual packaged launch: `PASSED`, 2 runs
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Restart persistence: `PASSED`
- Packaged visual click QA: `PASSED`
- LightBIM / CRM / Client Portal clicks: `PASSED`
- Safe screenshot viewport-only mode: `PASSED`
- Full desktop / sensitive information capture: blocked
- Pixel/layout comparison: `PASSED`
- PDF Korean typography: `PASSED`
- Poppler render: `PASSED`
- Customer PDF: 1 page, `PASSED`
- Internal PDF: 2 pages, `PASSED`
- Excel OpenXML structure: `PASSED`
- Print CSS layout guards: `PASSED`
- PDF/Excel/Print customer/internal separation: `PASSED`
- Customer safety: `PASSED`
- P0/P1/P2: none
- P3:
  - Excel native viewer pixel automation
  - OS print dialog click automation
- Final decision: `v0.4.6 RC Desktop Package 검증 완료`
# v0.4.6 Official Acceptance QA

- Decision: `ACCEPTED_WITH_WARNINGS`
- RC tag: `v0.4.6-rc`
- RC target: `59f646968e7de4aa6c1392216f8c9444a49d6bf8`
- RC package docs commit: `88d2e4e`
- Official `v0.4.5` preserved at `abe9094a8f09776a0960f0e65550bf301c5b8c55`.
- EXE SHA-256: `CADE74000D0C60E9FD158C167A692275DD5C7FD4046C538EF617B07DD25B113B`
- app.asar SHA-256: `AD92EA901A664C231F1D61A4B9AADCF1A3802A4C39337B66D0A1000A494BFD4D`
- Packaged launch and restart persistence: `PASSED`
- Visual click / safe screenshot / pixel-layout QA: `PASSED`
- PDF Korean typography / Poppler render: `PASSED`
- PDF/Excel/Print customer/internal separation: `PASSED`
- Customer safety: `PASSED`
- P0/P1/P2: none
- Remaining P3:
  - Excel native viewer pixel automation
  - OS print dialog automation
- GitHub Release: `NOT_CREATED`
- Release asset: `NOT_CREATED`
- Official `v0.4.6` tag target: this acceptance QA documentation commit.

# v0.5.1 RC Desktop Package

- RC tag: `v0.5.1-rc`
- RC tag target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- Official `v0.5.0` preserved at `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`.
- Official `v0.5.1` tag / GitHub Release / release asset: not created.
- EXE: `electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `17E8A0CAF81F3BEC5AC464B1F9A75B6FE11EBE7084FD0D651EBDF6BC9BE19319`
- app.asar size: `2816483` bytes
- app.asar SHA-256: `95D21A9DE575FD5BC14723EBE46F2B558393572CB2E095A0574F350B3B5EEAF4`
- Actual packaged launch: `PASSED`, 2 runs
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Restart persistence: `PASSED`
- Role Management UX: `PASSED`
- Permission Center UX: `PASSED`
- Permission Audit Viewer: `PASSED`
- Access Denied Reason: `PASSED`
- Visibility Preview: `PASSED`
- Audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.0 RBAC regression: `PASSED`
- OVERDUE CRM reminder duplicate prevention: `PASSED`
- P0/P1/P2: none
- P3:
  - Excel native viewer pixel automation
  - OS print dialog automation
- Final decision: `v0.5.1 RC Desktop Package 검증 완료`

# v0.5.1 Official Acceptance QA

- Acceptance QA commit: pending at document creation time
- RC tag: `v0.5.1-rc`
- RC target: `12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51`
- RC package docs commit: `c4c19c9`
- Official `v0.5.0` preserved at `2ae94a13ba7f3f42450684f33946bc4a1cd0604e`.
- Official `v0.5.1` tag: create after this acceptance QA documentation commit.
- GitHub Release / release asset: `NOT_CREATED` in this step.
- Packaged launch: `PASSED`, 2 runs.
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Role Management UX: `PASSED`
- Permission Center UX: `PASSED`
- Permission Audit Viewer: `PASSED`
- Access Denied Reason: `PASSED`
- Visibility Preview: `PASSED`
- Audit redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.0 RBAC regression: `PASSED`
- Build and release smoke: `PASSED`
- P0/P1/P2: none
- P3 deferred:
  - Excel native viewer pixel automation
  - OS print dialog automation
- Final decision: `v0.5.1 ACCEPTED WITH WARNINGS`

# v0.5.2 Permission Audit Export & Role Change Approval Workflow

- Branch: `v0.5.2-audit-export-role-change-approval`
- Base official version: `v0.5.1`
- Permission Audit Export: JSON / CSV / print-safe HTML `PASSED`
- Audit filters and redaction: `PASSED`
- Role change draft/request/approval/apply workflow: `PASSED`
- Approval / rejection / cancellation / expiration: `PASSED`
- Self-approval and unauthorized approval: `BLOCKED`
- Direct renderer role change: `BLOCKED`
- Permission diff and dangerous permission classification: `PASSED`
- Apply failure previous-role preservation: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- v0.5.1 and v0.5.0 RBAC regressions: `PASSED`
- Build and release smoke: `PASSED`
- P0/P1/P2: none
- P3: external multi-user identity binding, Excel native viewer pixel QA, OS print dialog automation
- Final decision: `MERGE_READY`

# v0.5.2 Official Acceptance QA

- Acceptance date: `2026-07-26`
- RC tag: `v0.5.2-rc`
- RC target: `6271159b021e3c4a179ec4cb0e0a582e95480b64`
- RC package docs commit: `af6e829e7e48fb7a549ecc3d2a9d9f9f2222f1ca`
- Official `v0.5.1` preserved at `4961573340280cc19a749d01e05359e97d700d1d`.
- Package integrity: `PASSED`
- Actual packaged launch: `PASSED`, 2 runs
- Window title and no-dev-server operation: `PASSED`
- userData persistence: `PASSED`, no pre-existing file missing
- Packaged role/permission click and layout: `PASSED`
- Pixel change ratio: `0.5054622715154728`
- Role-change state transitions and rollback: `PASSED`
- Self-approval, unauthorized approval, duplicate/replay: `BLOCKED`
- Permission diff and risk classification: `PASSED`
- Audit JSON/CSV/print-safe HTML export, filters, and redaction: `PASSED`
- Customer safety: `PASSED`
- External auth/provider: `DISABLED`
- Regression/build/release smoke: `PASSED`
- P0/P1/P2: none
- P3:
  - External multi-user identity binding and approver identity proof
  - Excel native viewer pixel QA
  - OS print dialog automation
- Official `v0.5.2` tag: create on this Acceptance QA documentation commit.
- GitHub Release / release asset: `NOT_CREATED`
- Final decision: `v0.5.2 ACCEPTED WITH WARNINGS`

# v0.6.0 Identity Core & Authentication Readiness

- Branch: `v0.6.0-identity-auth-architecture`
- Base official version: `v0.5.2`
- Identity, Employee, Organization Membership: implemented
- Session Context with active/expired/revoked/invalid fail-closed policy: implemented
- GLOBAL / ORGANIZATION / PROJECT / SITE Role Assignment: implemented
- Identity-aware permission evaluator: implemented
- Role change requester/target/reviewer/approver/applier Identity binding: implemented
- Unauthorized apply and cross-Identity legacy role mutation: `BLOCKED`
- Audit actor Identity, organization, session, and resource context: implemented
- Deterministic and idempotent v0.5.2 local role migration: implemented
- Auth Provider Adapter: `DISABLED`, no external calls
- Local Identity Provider: implemented without credentials or tokens
- Customer-safe Identity/Session/Assignment metadata filtering: `PASSED`
- v0.5.2 / v0.5.1 / v0.5.0 and operational regressions: `PASSED`
- UI build, production smoke, release diagnostics, aggregate release smoke: `PASSED`
- P0/P1/P2: none
- Implementation decision: `MERGE_READY`
- Implementation-stage main merge / v0.6.0 tag / package / release: `NOT_PERFORMED`

# v0.6.0 Identity Core & Authentication Readiness - Merged to Main

- Source branch: `v0.6.0-identity-auth-architecture`
- Implementation commit: `743eb51e48b216efa0addc1fbc27b4e98105c611`
- Merge commit: `bab29ee4c68dc7881a32680d7483d619ac5eb42a`
- Merge conflicts: `NONE`
- Identity, SessionContext, RoleAssignment, ResourceScope, and AuthorizationContext: `PASSED`
- Identity/session/assignment invalid-state and scope mismatch fail-closed checks: `PASSED`
- Role Change Identity binding and approver validation: `PASSED`
- Audit actor Identity and redaction: `PASSED`
- Idempotent, non-destructive v0.5.2 migration: `PASSED`
- Customer Safety: `PASSED`
- External authentication/provider: `DISABLED / NOT_IMPLEMENTED`
- v0.5.2 / v0.5.1 / v0.5.0 and operational regressions: `PASSED`
- UI build, production smoke, release diagnostics, aggregate release smoke: `PASSED`
- P0/P1/P2: none
- Known warnings: Vite bundle size and Node SQLite experimental API
- Final decision: `v0.6.0 Identity Core & Authentication Readiness main integration MERGE_READY`
- Next: `v0.6.0 RC Desktop Package`

# v0.6.0 RC Desktop Package

- RC tag/target: `v0.6.0-rc` / `0d25a066e027d2b0ec7fdb58a200a02212e4066d`
- Windows unpacked package: `PASSED`
- EXE SHA-256: `E952B620DF29A2205E6BD9912E72422A368035373FC1538AD046F1599561D348`
- app.asar SHA-256: `49132B5448819264247D51FE5A24A5797CFB74F66917B679684AA8D9CDE1848F`
- Actual packaged launch, two runs, no dev server: `PASSED`
- Existing userData preservation and migration idempotency: `PASSED`
- Identity/Session/RoleAssignment/Organization/Project/Site fail-closed checks: `PASSED`
- Role Change Identity binding, approver validation, Audit Actor Identity: `PASSED`
- Packaged Identity UI click/layout/pixel verification: `PASSED`
- Customer Safety and audit redaction: `PASSED`
- External authentication/provider: `DISABLED / NOT_IMPLEMENTED`
- v0.6.0 and v0.5.x regressions, build, release smoke, dist: `PASSED`
- P0/P1/P2: none
- Final decision: `v0.6.0 RC Desktop Package 검증 완료`
- Official `v0.6.0`, GitHub Release, and Windows release ZIP: `NOT_CREATED`

# v0.6.0 Official Acceptance QA

- Acceptance date: `2026-08-23`
- RC tag/target: `v0.6.0-rc` / `0d25a066e027d2b0ec7fdb58a200a02212e4066d`
- Package docs commit: `745de39d3b2694ea05ae09e1b8da361acaebd5f3`
- Official `v0.5.2` preserved at `d301f0b87e1ad2122d2bb7fa56cfbaa324af58bb`.
- EXE/app.asar size and SHA-256 integrity: `PASSED`
- Actual packaged launch: `PASSED`, 2 visible runs, no dev server
- Stable production userData comparison: `346 / 346`, missing `0`
- Deterministic Identity migration and idempotency: `PASSED`
- Identity/Session/RoleAssignment and organization/project/site fail-closed: `PASSED`
- Role Change Identity binding, self-approval prevention, approver validation: `PASSED`
- Audit Actor Identity and redaction: `PASSED`
- Packaged Identity UI click, layout, and pixel comparison: `PASSED`
- Pixel change ratio: `0.5478377741446099`
- Customer Safety: `PASSED`
- External authentication/provider: `DISABLED / NOT_IMPLEMENTED`
- v0.6.0, v0.5.2, v0.5.1, v0.5.0, and operational regressions: `PASSED`
- Build, production smoke, release diagnostics, and aggregate release smoke: `PASSED`
- P0/P1/P2: none
- P3: external provider/OAuth, external multi-user sync, Excel native viewer pixel QA, OS print dialog automation
- GitHub Release / Windows ZIP asset: `NOT_CREATED`
- Final decision: `v0.6.0 ACCEPTED WITH WARNINGS`
