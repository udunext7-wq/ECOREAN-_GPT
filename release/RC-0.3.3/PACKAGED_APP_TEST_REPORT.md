# RC-0.3.3 Packaged App Test Report

## 기본 정보

- Test date: 2026-06-03
- Version: RC-0.3.3
- Tag: `v0.3.3-rc`
- Commit used for package: `d39cbbf`
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
- First screen render: PASSED by packaged launch check

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

## RC-0.3.3 기능 확인

- Actual Customer Data Pilot service: PASSED
- Pilot run creation smoke: PASSED
- Intake connection smoke: PASSED
- LightBIM connection smoke: PASSED
- Estimate/PCE smoke: PASSED
- Customer safety smoke: PASSED
- Leak injection S1 issue block: PASSED
- Pilot report generation: PASSED
- Pilot report anonymization: PASSED

## 개인정보 익명화

Pilot report와 customer-facing payload에 다음 원문이 저장/노출되지 않음을 확인했습니다.

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

## 고객 안전성

- Customer safety regression: PASSED
- Checked payloads: customer estimate, client portal, customer proposal map, proposal board, contract customer section
- Customer output is blocked when a sensitive-data leak is injected.

## 최종 판정

`RC-0.3.3 packaged desktop release 사용 가능`

## 커밋 제외 정책

`electron/release`, userData, backups, export output, generated PDFs/Excels, and packaged binaries are not committed.

