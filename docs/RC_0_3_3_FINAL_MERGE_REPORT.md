# RC-0.3.3 Final Merge Report

## 기본 정보

- Source branch: `rc-0.3.3-actual-customer-data-pilot`
- Target branch: `main`
- Base tags:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
  - `v0.3.2-rc`
  - `v0.3.2-rc-packaged`
- Merge date: 2026-06-03
- Merge commit: `1d72fc9 Merge RC-0.3.3 actual customer data pilot branch`

## Included Commits

- `ab72448 Start RC-0.3.3 actual customer data pilot`
- `1d83c7c Stabilize RC-0.3.3 actual customer data pilot branch`
- `1d72fc9 Merge RC-0.3.3 actual customer data pilot branch`

## Included Scope

- Actual Customer Pilot 기록 구조
- Pilot run과 Real Project Intake 연결
- Pilot report 익명화
- LightBIM 연결 검증
- 단가 준비 상태 확인
- 견적/PCE 검증
- 고객용 출력 READY 확인
- 내부 원가표 READY 확인
- 고객 안전성 검사
- 민감정보 누출 시 S1 이슈 생성 및 고객 출력 차단

## Privacy / Anonymization Result

PASSED.

Pilot report와 고객-facing payload에서 다음 원문이 저장 또는 노출되지 않음을 확인했습니다.

- 실제 전화번호
- 실제 이메일
- 상세주소
- 고객 메모 원문
- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- variance
- calibration
- backup path
- import rows
- approval queue
- internal
- profit
- risk_score

Leak injection 테스트는 S1 customer-safety issue를 생성했고 고객 출력은 차단되었습니다.

## Customer Safety Result

PASSED.

검증 대상 payload:

- customer estimate
- client portal
- customer proposal map
- proposal board
- contract customer section

## Test Results

### Pre-Merge Validation

- `node --check electron/services/*.js`: PASSED
- `node tests/rc-0-3-3-branch-stabilization.smoke.js`: PASSED, `MERGE_READY`
- `node tests/rc-0-3-3-actual-customer-data-pilot.smoke.js`: PASSED, `실제 고객 Pilot 가능`
- `node tests/rc-0-3-2-packaged-real-project-intake-run.smoke.js`: PASSED
- `node tests/rc-0-3-2-packaged-release.smoke.js`: PASSED
- `node tests/real-project-intake.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

### Post-Merge Validation On Main

- `node --check electron/services/*.js`: PASSED
- `node tests/rc-0-3-3-branch-stabilization.smoke.js`: PASSED, `MERGE_READY`
- `node tests/rc-0-3-3-actual-customer-data-pilot.smoke.js`: PASSED, `실제 고객 Pilot 가능`
- `node tests/rc-0-3-2-packaged-real-project-intake-run.smoke.js`: PASSED
- `node tests/real-project-intake.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## Known Warnings

- Vite bundle size warning
- SQLite experimental warning
- Node DEP warning if emitted

These warnings are non-blocking for RC-0.3.3.

## Known Deferred Items

- 실제 고객 데이터 추가 Pilot
- CRM pipeline
- 주소 API
- 고객 포털 배포
- calendar integration
- cloud sync
- bundle optimization

## Final Decision

`RC-0.3.3 = 실제 고객 Pilot 흐름 main 반영 가능`

