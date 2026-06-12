# RC-0.4.1 Packaged Operational Baseline

## 기준 정보

- 기준 버전: `RC-0.4.1`
- Source commit: `21e468d`
- Package commit: `afef0f4`
- Source tag: `v0.4.1-rc`
- Packaged baseline tag: `v0.4.1-rc-packaged`
- 기준 확정일: 2026-06-12

## 패키지 / 데이터 경로

- 실행 파일: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## 패키지 실행 결과

- 실제 앱 실행: PASSED
- 창 제목 `ECOREAN BOC CEO Dashboard`: PASSED
- 프로세스 응답 상태: PASSED
- dev server 필요 여부: NO
- 첫 화면 production render path: PASSED
- `app.asar` 존재: PASSED
- `app.asar` 내 `crmNextActionService.js`: PASSED
- `app.asar` 내 production UI `dist/index.html`: PASSED

## 최종 검증

- Electron service syntax 45개: PASSED
- 지정 Node smoke 15개: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- RC-0.4.1 packaged release smoke: PASSED
- RC-0.4.1 branch stabilization smoke: PASSED
- RC-0.4.1 CRM next action smoke: PASSED
- 기존 RC-0.4.0~RC-0.3.5, intake 및 LightBIM 회귀: PASSED

## CRM Next Action 기능 결과

- CRM Next Action Center: PASSED
- 5개 내부 진입점: PASSED
- Action 생성 / 목록 / 상세 조회: PASSED
- Action 완료: PASSED
- 24시간 보류: PASSED
- 7일 연기: PASSED
- Action 취소: PASSED
- Lead 생성 시 `FIRST_CONTACT` 자동 생성: PASSED
- CRM Stage 기반 자동 액션 생성: PASSED
- `CONTRACTED` 시 `PROJECT_HANDOFF` 생성: PASSED
- 동일 Lead / Action 활성 중복 방지: PASSED
- `OVERDUE` 감지: PASSED
- Internal notification 생성: PASSED
- Notification read / dismiss: PASSED
- `ON_HOLD` 활성 액션 제한: PASSED
- `LOST` 신규 자동화 중단 및 기존 액션 처리: PASSED

## 개인정보 / 고객 안전성

- 전화번호 마스킹: PASSED
- 이메일 마스킹: PASSED
- 상세주소 비노출: PASSED
- 내부 action / notification / memo 비노출: PASSED
- 원가 / 마진 / PCE / Queue / Scoring 비노출: PASSED
- Customer-safe payload: PASSED
- Customer safety regression: PASSED
- SMS / Email / Kakao / Push / Calendar / Address API: DISABLED
- 외부 credential 추가: NONE

## 커밋 제외 확인

- 실행 EXE 및 `electron/release`: NOT COMMITTED
- userData: NOT COMMITTED
- SQLite / DB: NOT COMMITTED
- backup: NOT COMMITTED
- export: NOT COMMITTED
- 생성 PDF / Excel: NOT COMMITTED
- 임시 로그: NOT COMMITTED

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description / author metadata warning
- Node DEP0190 warning
- npm update notice when shown

## 최종 판정

`RC-0.4.1 packaged operational baseline 사용 가능`

`v0.4.1-rc`는 소스 기준으로 유지하며, 검증된 CRM Next Action Desktop Package 운영 기준은 `v0.4.1-rc-packaged`로 별도 고정합니다.
