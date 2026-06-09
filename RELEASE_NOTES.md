# ECOREAN BOC Release Notes

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
