# RC-0.3.1 Packaged App Test Report

## 기본 정보

- Test date: 2026-05-29
- Version: RC-0.3.1
- Tag: `v0.3.1-rc`
- Commit used for package: `d519304`
- Branch: `main`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 패키지 빌드 결과

- Packaging script: `npm run dist`
- Package type: `electron-builder --win --x64 --dir`
- Output: `electron/release/win-unpacked`
- Result: PASSED

## 실행 확인

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED by packaged launch smoke

## userData / DB / Export / Backup

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

필수 export 폴더 확인:

- estimates: PASSED
- contracts: PASSED
- schedules: PASSED
- purchase-orders: PASSED
- visualizations: PASSED
- boards: PASSED
- reports: PASSED
- lightbim: PASSED

필수 backup 폴더 확인:

- db: PASSED
- export: PASSED
- full: PASSED
- manifests: PASSED

## RC-0.3.1 기능 확인

- Operational Data Onboarding service: PASSED
- 12-step onboarding smoke: PASSED
- Price import manual matching smoke: PASSED
- Unmatched row manual match: PASSED
- Queue readiness update: PASSED
- Customer safety regression: PASSED

## 고객 안전성

고객용 payload에서 다음 정보가 노출되지 않음을 확인했습니다.

- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase data
- receiving data
- actual used quantity
- variance
- calibration
- backup path
- onboarding issue details
- import rows
- manual matching logs
- approval queue
- internal
- profit
- risk_score

## 실행한 검증

- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- `npm run dist`: PASSED
- Packaged exe launch check: PASSED
- `node tests/lightbim-customer-safety-regression.smoke.js`: PASSED

## 알려진 경고

- Vite bundle size warning: non-blocking
- SQLite experimental warning: non-blocking
- electron-builder missing description/author metadata warning: non-blocking
- Node DEP0190 warning during packaging: non-blocking

## 최종 판정

`RC-0.3.1 패키지 실사용 가능`

패키지 바이너리는 `electron/release` 아래 로컬 생성물이며 커밋 대상이 아닙니다.
