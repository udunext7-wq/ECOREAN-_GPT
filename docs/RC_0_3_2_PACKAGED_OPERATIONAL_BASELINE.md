# RC-0.3.2 Packaged Operational Baseline

## 기준 정보

- 기준 커밋: `5244e44 Run RC-0.3.2 packaged real project intake test`
- 문서 커밋 후 새 기준 태그: `v0.3.2-rc-packaged`
- 기준 일자: 2026-06-03
- Branch: `main`

## 기존 태그

- `v0.3.0-rc`
- `v0.3.1-rc`
- `v0.3.2-rc`

기존 태그는 수정하지 않습니다. `v0.3.2-rc-packaged`는 패키지 실행 검증 완료 기준을 별도로 고정하기 위한 태그입니다.

## 패키지 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

확인 결과:

- 앱 실행: PASSED
- 창 제목: `ECOREAN BOC CEO Dashboard`
- dev server 필요: NO
- 첫 화면 렌더링: PASSED

## 운영 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## 검증 완료 흐름

- packaged app launch
- full userData backup
- real project intake
- required field validation
- LightBIM 연결
- price readiness 확인
- estimate/PCE 생성
- customer safety 검사
- intake report 생성
- restart persistence 확인

## 최종 검증 명령

프로젝트 루트:

```powershell
Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }
node tests/rc-0-3-2-packaged-real-project-intake-run.smoke.js
node tests/rc-0-3-2-packaged-release.smoke.js
node tests/rc-0-3-2-branch-stabilization.smoke.js
node tests/rc-0-3-2-first-real-project-intake.smoke.js
node tests/real-project-intake.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
node tests/lightbim-boc-release-flow.smoke.js
```

Electron 폴더:

```powershell
npm run build:ui
npm run smoke:prod
npm run smoke:release
```

## 최종 검증 결과

- Service syntax: PASSED
- Packaged real project intake run: PASSED
- RC-0.3.2 packaged release smoke: PASSED
- RC-0.3.2 branch stabilization smoke: PASSED
- RC-0.3.2 first real project intake smoke: PASSED
- Real Project Intake smoke: PASSED
- Customer safety regression: PASSED
- LightBIM BOC release flow: PASSED
- Electron UI build: PASSED
- Electron production smoke: PASSED
- Electron release smoke: PASSED

## Packaged Intake Run 주요 결과

- Backup: PASSED
- Backup ID: `FULL-2026-06-03_160508`
- Intake ID: `RPI-RC032-PACKAGED-REAL-TEST`
- LightBIM import ID: `LIGHTBIM-IMPORT-1780470309009`
- Estimate ID: `INTAKE-FULL_REMODELING-1780470309041`
- Price readiness: `PARTIAL`
- PCE decision: `SCALE`
- Customer safety: PASSED
- Restart persistence: PASSED

## 고객 안전성

PASSED.

고객-facing payload는 다음 정보를 노출하지 않습니다.

- detailed address
- customer phone
- customer email
- memo
- internal cost
- margin
- PCE
- vendor data
- labor cost
- purchase / receiving data
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

## 허용된 비차단 경고

- Vite bundle size warning
- SQLite experimental warning
- electron-builder metadata warning
- Node DEP0190 warning

## 다음 버전 방향

- RC-0.3.3: actual customer data pilot
- RC-0.4.0:
  - CRM pipeline
  - address API
  - portal deployment
  - calendar integration
  - cloud sync
  - broader operational integrations

## 최종 판정

`RC-0.3.2 packaged operational baseline 사용 가능`

RC-0.3.2는 소스/태그 기준뿐 아니라 패키지 실행 검증 기준으로도 고정 가능합니다.
