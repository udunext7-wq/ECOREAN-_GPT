# RC-0.3.2 Final Merge Report

## 기본 정보

- Source branch: `rc-0.3.2-real-project-intake`
- Target branch: `main`
- Base tags preserved:
  - `v0.3.0-rc`
  - `v0.3.1-rc`
- Merge date: 2026-06-03
- Merge commit: `8875e3239110fe707077cf139432de585d050fc8`
- Final decision: `RC-0.3.2 = main 반영 가능 / 실제 프로젝트 접수 흐름 사용 가능`

## Included Commits

- `6b3860f Start RC-0.3.2 real project intake package`
- `a821362 Run RC-0.3.2 first real project intake test`
- `93d4df1 Stabilize RC-0.3.2 real project intake branch`

## Included Improvements

- Real Project Intake Center
- Customer/site/project intake validation
- Draft save and required-field blocking before estimate generation
- LightBIM connection from intake
- LightBIM summary and estimate-type conflict warning
- Price readiness check with `READY`, `PARTIAL`, and `NEEDS_UPDATE`
- Estimate/PCE generation from validated intake
- Customer output safety check before customer-facing output
- Sensitive customer data filtering for detailed address, phone, email, and memo
- RC-0.3.2 first intake test and stabilization reports

## Post-Merge Validation

Passed on `main`:

- `Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }`
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

## Privacy / Customer Safety Result

PASSED.

Customer-facing payloads must not expose:

- `detailed_address`
- `customer_phone`
- `customer_email`
- `memo`
- internal cost
- margin
- PCE
- vendor/labor/purchase/receiving data
- actual used quantity
- variance
- calibration
- backup path
- onboarding issue details
- import rows
- manual matching logs
- approval queue
- internal/profit/risk-score fields

Injected leak checks created S1 issues and blocked customer output as expected.

## Known Warnings

- Vite bundle size warning: non-blocking.
- SQLite experimental warning: non-blocking.

## Deferred Items

- CRM pipeline
- Address API
- Public customer portal deployment
- Calendar integration
- Cloud sync
- Advanced customer duplicate detection
- XLSX direct parsing
- Vite bundle optimization

## Merge Readiness Decision

`MERGE_READY`

Reason:

- No unresolved S1/S2 issues.
- Real project intake flow passed.
- Customer privacy and customer/internal separation passed.
- LightBIM connection, estimate generation, and PCE passed.
- Existing RC-0.3.1 operational onboarding and price manual matching flows still pass.
- Build and release smoke passed on `main`.
