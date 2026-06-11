# RC-0.4.0 Packaged Operational Baseline

## 기준 정보

- 기준 날짜: 2026-06-11
- 기준 커밋: `5d93aa3`
- Source commit: `7bb4970`
- Source tag: `v0.4.0-rc`
- Packaged baseline tag: `v0.4.0-rc-packaged`
- 브랜치: `main`

기존 태그:

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
- `v0.3.6-rc-packaged`
- `v0.3.7-rc`
- `v0.3.7-rc-packaged`
- `v0.3.8-rc`
- `v0.3.8-rc-packaged`
- `v0.3.9-rc`
- `v0.3.9-rc-packaged`
- `v0.4.0-rc`

## 패키지 및 데이터 경로

- 실행 파일: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## 패키지 실행 검증

- Packaged app launch: PASSED
- Window title `ECOREAN BOC CEO Dashboard`: PASSED
- Dev server 불필요: PASSED
- First screen render: PASSED
- CRM Pipeline Service app.asar 포함: PASSED
- CRM Pipeline Center production bundle 포함: PASSED

## CRM Pipeline 검증

- CRM Pipeline Center: PASSED
- CRM 12단계: PASSED
- Lead 생성 / 목록 / 상세 / 수정: PASSED
- Stage 이동 및 history: PASSED
- 상담 기록 및 다음 액션: PASSED
- 현장조사 요청: PASSED
- 견적 연결: PASSED
- 프로젝트 연결: PASSED
- CRM dashboard summary: PASSED
- 익명화 CRM report: PASSED

CRM 단계:

`LEAD → CONTACTED → CONSULTING → SITE_SURVEY_SCHEDULED → SITE_SURVEY_DONE → ESTIMATE_REQUESTED → ESTIMATE_SENT → NEGOTIATION → CONTRACT_PENDING → CONTRACTED`

별도 보류/종료 단계로 `ON_HOLD`, `LOST`를 지원합니다.

## 외부 연동 준비 구조

- 주소 준비 status: PASSED
- 고객 포털 준비 status: PASSED
- 캘린더 준비 status: PASSED
- 외부 주소 / 포털 / 캘린더 API 호출: DISABLED
- 외부 API key 또는 credential 저장: 없음

## 개인정보 및 고객 안전성

- 전화번호 마스킹: PASSED
- 이메일 마스킹: PASSED
- 상세주소 내부 전용 격리: PASSED
- Portal public token SHA-256 hash 저장: PASSED
- Portal token 원문 비저장: PASSED
- Customer-safe payload allowlist: PASSED
- 내부 원가, 마진, PCE, Queue, Scoring 비노출: PASSED
- Vendor, labor, purchase, receiving, profit, risk 정보 비노출: PASSED
- Customer safety: PASSED

## 저장 경로 검증

Export 하위 폴더:

- estimates: PASSED
- contracts: PASSED
- schedules: PASSED
- purchase-orders: PASSED
- visualizations: PASSED
- boards: PASSED
- reports: PASSED
- lightbim: PASSED

Backup 하위 폴더:

- db: PASSED
- export: PASSED
- full: PASSED
- manifests: PASSED

## 최종 테스트

- Electron service syntax 44개: PASSED
- RC-0.4.0 packaged release smoke: PASSED
- RC-0.4.0 branch stabilization smoke: PASSED
- RC-0.4.0 CRM pipeline smoke: PASSED
- 지정 RC-0.3.x, intake, customer safety, LightBIM 회귀: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning
- npm update notice when shown

## 최종 판정

`RC-0.4.0 packaged operational baseline 사용 가능`

`v0.4.0-rc`는 소스 기준으로 보존하고, 패키지 실행 검증 완료 기준은 `v0.4.0-rc-packaged`로 별도 고정합니다.
