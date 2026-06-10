# RC-0.4.0 CRM Pipeline Foundation Final Merge Report

## 기준 정보

- 병합 날짜: 2026-06-10
- Source branch: `rc-0.4.0-crm-pipeline-foundation`
- Target branch: `main`
- Base tag: `v0.3.9-rc-packaged`
- Merge commit: `17cb1ed`
- Included commits:
  - `c2b2f43 Start RC-0.4.0 CRM pipeline foundation`
  - `f9781a9 Stabilize RC-0.4.0 CRM pipeline foundation branch`

## 구현 화면 / 서비스

- 화면: `ui/app/crm/CrmPipelineCenterView.tsx`
- 서비스: `electron/services/crmPipelineService.js`
- UI bridge: `ui/services/crm-service/crmPipelineService.ts`
- IPC / preload / Electron type 연결: PASSED
- 내부 진입점: First Entry Panel, CEO Dashboard, Drawer, 실제 프로젝트 접수

## CRM 12단계 결과

`LEAD → CONTACTED → CONSULTING → SITE_SURVEY_SCHEDULED → SITE_SURVEY_DONE → ESTIMATE_REQUESTED → ESTIMATE_SENT → NEGOTIATION → CONTRACT_PENDING → CONTRACTED`

별도 보류/종료 단계로 `ON_HOLD`, `LOST`를 지원합니다.

- 12단계 정의와 이동: PASSED
- stage history 이전/다음 단계와 사유 기록: PASSED
- lead 생성 / 목록 / 상세 / 수정: PASSED
- 상담 기록과 다음 액션: PASSED
- 현장조사 요청과 단계 연결: PASSED
- 견적 연결과 `ESTIMATE_SENT` 전환: PASSED
- 프로젝트 연결: PASSED
- CRM dashboard KPI summary: PASSED
- 익명화 CRM report 생성: PASSED

## 주소 / 포털 / 캘린더 준비 구조

- 공통 상태 `NOT_READY / READY_TO_CONNECT / CONNECTED / FAILED / DISABLED`: PASSED
- 주소 정규화 상태와 provider 참조: PASSED
- 고객 포털 연결 및 초대 준비 상태: PASSED
- public token SHA-256 hash 저장: PASSED
- 캘린더 provider, event 참조 및 sync 상태: PASSED
- 외부 주소 / 포털 / 캘린더 API 호출: DISABLED
- API key 또는 외부 credential 추가: 없음

## 개인정보 / 고객 안전성

- 전화번호 마스킹 저장: PASSED
- 이메일 마스킹 저장: PASSED
- 상세주소 내부 전용 격리: PASSED
- 내부 메모 고객 payload 비노출: PASSED
- portal public token 원문 비저장: PASSED
- 고객 payload allowlist 적용: PASSED
- 내부 원가, 마진, PCE, Queue, scoring 비노출: PASSED
- vendor, labor, purchase, receiving, profit, risk 정보 비노출: PASSED
- CRM report 개인정보 원문 비저장: PASSED

## 테스트 결과

병합 전:

- Electron service syntax 44개: PASSED
- RC-0.4.0 CRM / branch stabilization smoke: PASSED
- 지정 RC-0.3.x, intake, LightBIM 회귀 13개: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

병합 후 main:

- Electron service syntax 44개: PASSED
- RC-0.4.0 및 핵심 기존 회귀 8개: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning when packaging
- Node DEP0190 warning when shown
- npm update notice when shown

## Deferred Items

- 실제 주소 API 연동
- 고객 포털 배포
- 캘린더 실제 동기화
- CRM 알림 자동화
- 영업 전환율 분석
- 고객 문의 폼 배포
- 클라우드 동기화
- 사용자 권한 / 역할 관리
- 번들 최적화

## 최종 판정

`RC-0.4.0 = CRM Pipeline Foundation main 반영 가능`

미해결 S1/S2가 없고 개인정보 마스킹, customer-safe payload, 내부 가격 정보 분리 및 외부 API 비호출 원칙이 병합 전후 모두 통과했습니다.
