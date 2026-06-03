# RC-0.3.3 Packaged Operational Baseline

## 기준 정보

- 기준 커밋: `1f4ea57 Run RC-0.3.3 packaged actual customer pilot test`
- 새 기준 태그: `v0.3.3-rc-packaged`
- 기준 일자: 2026-06-03
- Branch: `main`

## 보존 태그

- `v0.3.0-rc`
- `v0.3.1-rc`
- `v0.3.2-rc`
- `v0.3.2-rc-packaged`
- `v0.3.3-rc`

## 패키지 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 운영 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## 검증 완료 흐름

- packaged app launch: PASSED
- backup: PASSED
- actual customer pilot: PASSED
- intake 연결: PASSED
- LightBIM 연결: PASSED
- price readiness: PASSED (`PARTIAL` warning-only status allowed)
- estimate/PCE: PASSED
- customer output READY: PASSED
- internal output READY: PASSED
- privacy/anonymization: PASSED
- customer safety: PASSED
- restart persistence: PASSED

## 최종 검증 결과

- `node --check electron/services/*.js`: PASSED
- `node tests/rc-0-3-3-packaged-actual-customer-pilot-run.smoke.js`: PASSED
- `node tests/rc-0-3-3-packaged-release.smoke.js`: PASSED
- `node tests/rc-0-3-3-branch-stabilization.smoke.js`: PASSED
- `node tests/rc-0-3-3-actual-customer-data-pilot.smoke.js`: PASSED
- `node tests/real-project-intake.smoke.js`: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## Known Warnings

- Vite bundle size warning
- SQLite experimental warning
- electron-builder metadata warning if packaging is run
- Node DEP0190 warning if packaging is run

These warnings are non-blocking for this packaged operational baseline.

## 최종 판정

`RC-0.3.3 packaged operational baseline 사용 가능`

