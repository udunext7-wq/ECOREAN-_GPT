# RC-0.3.6 Packaged Operational Baseline

## Summary

- Baseline commit: `1976839 Build RC-0.3.6 desktop release package`
- New tag: `v0.3.6-rc-packaged`
- Final decision: `RC-0.3.6 packaged operational baseline 사용 가능`

## Existing Tags Preserved

- `v0.3.0-rc`
- `v0.3.1-rc`
- `v0.3.2-rc`
- `v0.3.2-rc-packaged`
- `v0.3.3-rc`
- `v0.3.3-rc-packaged`
- `v0.3.4-rc`
- `v0.3.4-rc-packaged`
- `v0.3.5-rc`
- `v0.3.5-rc-packaged`
- `v0.3.6-rc`

## Packaged App

- Executable: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Verified Flow

- packaged app launch
- Price Calibration Priority Center
- BATHROOM PARTIAL: `대표 검토 필요`
- KITCHEN PARTIAL: `견적 전 보정 권장`
- FULL_REMODELING PARTIAL: `견적 전 보정 권장`
- NEEDS_UPDATE: `즉시 보정 필요`
- calibration task 생성
- task 검토 완료
- price queue 연결
- queue status `PENDING_REVIEW` 유지
- 자동 승인/자동 반영 없음
- Master Data 직접 변경 방지
- customer safety

## Price Calibration Priority Result

| Estimate type | PARTIAL result | NEEDS_UPDATE result |
| --- | --- | --- |
| BATHROOM | `MEDIUM / 대표 검토 필요` | `BLOCKING / 즉시 보정 필요` |
| KITCHEN | `HIGH / 견적 전 보정 권장` | `BLOCKING / 즉시 보정 필요` |
| FULL_REMODELING | `HIGH / 견적 전 보정 권장` | `BLOCKING / 즉시 보정 필요` |

READY status remains `LOW / 확인 완료`.

## Queue And Master Data Safety

- Price queue linkage: PASSED.
- Queue status remains `PENDING_REVIEW`: PASSED.
- Automatic approval: not performed.
- Automatic apply: not performed.
- Master Data direct price change prevention: PASSED.

Master Data price updates remain limited to the approved Real Price Calibration backup/apply workflow.

## Customer Safety

- Customer safety: PASSED.
- Customer-facing payloads do not expose:
  - price calibration priority
  - `risk_level`
  - fallback price
  - `current_price`
  - `suggested_price`
  - internal cost
  - margin
  - PCE
  - vendor / labor / purchase / receiving data
  - approval queue
  - internal / profit / risk_score
  - detailed address / phone / email / memo

## Final Verification

- `node --check electron/services/*.js`: PASSED.
- `node tests/rc-0-3-6-packaged-release.smoke.js`: PASSED.
- `node tests/rc-0-3-6-branch-stabilization.smoke.js`: PASSED.
- `node tests/rc-0-3-6-price-calibration-ux.smoke.js`: PASSED.
- `node tests/rc-0-3-5-packaged-release.smoke.js`: PASSED.
- `node tests/real-project-intake.smoke.js`: PASSED.
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED.
- `node tests/lightbim-boc-release-flow.smoke.js`: PASSED.
- `npm run build:ui`: PASSED.
- `npm run smoke:prod`: PASSED.
- `npm run smoke:release`: PASSED.

Known non-blocking warnings:

- Vite bundle size warning.
- SQLite experimental warning.
- electron-builder metadata warning.
- Node DEP0190 warning.

## Operational Decision

`RC-0.3.6 packaged operational baseline 사용 가능`

The source release tag `v0.3.6-rc` remains preserved. The packaged operational baseline is fixed separately as `v0.3.6-rc-packaged`.
