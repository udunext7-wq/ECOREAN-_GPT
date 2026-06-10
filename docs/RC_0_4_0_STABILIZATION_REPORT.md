# RC-0.4.0 CRM Pipeline Foundation Stabilization Report

## 기준 정보

- 작업 날짜: 2026-06-10
- 브랜치: `rc-0.4.0-crm-pipeline-foundation`
- 기준 태그: `v0.3.9-rc-packaged`
- 포함 커밋: `c2b2f43 Start RC-0.4.0 CRM pipeline foundation`
- 병합 상태: main 병합 전
- 태그 상태: RC-0.4.0 태그 미생성

## 안정화 대상

- 서비스: `electron/services/crmPipelineService.js`
- 화면: `ui/app/crm/CrmPipelineCenterView.tsx`
- UI bridge, IPC, preload, Electron type 연결
- 진입점: First Entry Panel, CEO Dashboard, Drawer, 실제 프로젝트 접수

## 12단계 CRM 검증

`LEAD → CONTACTED → CONSULTING → SITE_SURVEY_SCHEDULED → SITE_SURVEY_DONE → ESTIMATE_REQUESTED → ESTIMATE_SENT → NEGOTIATION → CONTRACT_PENDING → CONTRACTED`

별도 보류/종료 단계로 `ON_HOLD`, `LOST`를 지원합니다.

- lead 생성, 목록, 상세 조회: PASSED
- 12개 단계 이동과 stage history: PASSED
- 상담 기록과 다음 액션: PASSED
- 현장조사 요청과 단계 연결: PASSED
- 견적 연결과 `ESTIMATE_SENT` 전환: PASSED
- 프로젝트 연결: PASSED
- dashboard KPI summary: PASSED
- 익명화 CRM report 생성: PASSED

## 외부 연동 준비 상태

- 주소 provider 준비 필드: PASSED
- 고객 포털 연결 상태와 public token SHA-256 hash: PASSED
- 캘린더 provider와 event 참조 상태: PASSED
- 공통 상태 `NOT_READY / READY_TO_CONNECT / CONNECTED / FAILED / DISABLED`: PASSED
- 외부 주소, 포털, 캘린더 API 호출: DISABLED
- API key 또는 외부 credential 추가: 없음

## 개인정보 및 고객 안전성

- 전화번호 마스킹 저장: PASSED
- 이메일 마스킹 저장: PASSED
- 상세주소 내부 전용 격리: PASSED
- 고객 포털 token 원문 비저장: PASSED
- 고객 payload allowlist 적용: PASSED
- 내부 메모, 원문 연락처, 상세주소 비노출: PASSED
- 내부 단가, 마진, PCE, Queue, scoring, vendor, labor, purchase, receiving 비노출: PASSED
- CRM report 개인정보 원문 비저장: PASSED

## 발견 및 수정 이슈

- S1: 없음
- S2: 없음
- S3: 없음
- S4: Vite bundle size 및 SQLite experimental warning
- 초기 구현 중 dashboard KPI 값의 TypeScript `unknown` 표시 오류를 문자열 변환으로 수정했습니다.
- 인앱 브라우저 시각 검증은 Windows 샌드박스 초기화 오류로 실행되지 않았습니다. TypeScript 빌드, Vite production build, Electron production smoke 및 release smoke로 대체 검증했습니다.

## 실행 검증

- Electron service syntax 44개: PASSED
- `rc-0-4-0-branch-stabilization.smoke.js`: PASSED
- `rc-0-4-0-crm-pipeline.smoke.js`: PASSED
- RC-0.3.9 recommendation scoring 및 packaged regression: PASSED
- RC-0.3.8 unmatched recommendation 및 packaged regression: PASSED
- RC-0.3.7 real price calibration workbench regression: PASSED
- RC-0.3.6 price calibration priority regression: PASSED
- RC-0.3.5 price readiness impact regression: PASSED
- real project intake regression: PASSED
- LightBIM customer safety 및 BOC release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED

## 후속 범위

- 실제 주소 API 연결
- 고객 포털 공개 배포 및 token 발급 운영
- 외부 캘린더 양방향 동기화
- CRM 고급 자동화와 알림
- 운영 데이터 기반 KPI 및 전환 분석 고도화

## 병합 준비 판정

`MERGE_READY`

미해결 S1/S2가 없고 CRM 단계, 연결 준비 구조, 익명화, 고객 안전성 및 기존 가격/견적 경계가 통과했습니다. 이 보고서는 병합 준비 판정이며 main 병합이나 RC-0.4.0 태그 생성은 수행하지 않습니다.
