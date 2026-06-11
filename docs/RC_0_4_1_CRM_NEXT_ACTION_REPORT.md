# RC-0.4.1 CRM Next Action Report

## 작업 정보

- 작업일: 2026-06-11
- Branch: `rc-0.4.1-crm-next-action-automation`
- Base packaged tag: `v0.4.0-rc-packaged`
- 구현 화면: `CrmNextActionCenterView`
- 구현 서비스: `crmNextActionService`
- 외부 알림 발송: `DISABLED`

## 구현 결과

- `crm_next_actions`, `crm_internal_notifications`, `crm_next_action_rules` 생성: PASSED
- lead 생성 시 `FIRST_CONTACT` 자동 생성: PASSED
- stage 변경 시 규칙별 다음 액션 생성: PASSED
- 상담 기록에서 후속 액션 생성: PASSED
- 현장조사 일정 기준 사전 확인 액션 생성: PASSED
- 동일 고객/동일 활성 action type 중복 방지: PASSED
- 기한 초과 `OVERDUE` 전환과 내부 알림 생성: PASSED
- 액션 조회와 상세 조회: PASSED
- 완료, 보류, 취소: PASSED
- 내부 알림 생성, 읽음, 닫기: PASSED
- `ON_HOLD` 활성 액션 보류: PASSED
- `LOST` 활성 액션 취소: PASSED
- 대시보드 KPI summary: PASSED
- 내부 리포트 생성: PASSED

## Stage 규칙 결과

`LEAD`, `CONTACTED`, `CONSULTING`, `SITE_SURVEY_SCHEDULED`, `SITE_SURVEY_DONE`, `ESTIMATE_REQUESTED`, `ESTIMATE_SENT`, `NEGOTIATION`, `CONTRACT_PENDING`, `CONTRACTED`의 자동 생성 규칙을 로컬 DB에 idempotent하게 등록했습니다.

`ON_HOLD`와 `LOST`는 신규 자동 액션을 만들지 않고 기존 활성 액션의 상태를 제한합니다.

## UX 결과

- 상단 KPI 7종: 구현
- 오늘/기한 초과/stage/담당자/우선순위/action type 필터: 구현
- 액션 목록과 CRM 바로가기: 구현
- stage history, 상담 요약, 추천 처리, customer-safe preview: 구현
- 수동 액션 생성: 구현
- 내부 알림 read/dismiss: 구현
- 5개 내부 진입점: 구현

## 고객 안전성

- 내부 액션/알림/customer-facing payload 분리: PASSED
- 원문 연락처, 상세주소, 내부 메모 비노출: PASSED
- 내부 원가, 마진, PCE, Queue, Scoring 비노출: PASSED
- 고객 payload allowlist 유지: PASSED

## 외부 API 비호출

- SMS: DISABLED
- Email: DISABLED
- Kakao: DISABLED
- Push notification: DISABLED
- Calendar sync: DISABLED
- Address API: DISABLED
- API key 또는 Authorization 추가: 없음

## 검증

- 서비스 및 Electron bridge syntax: PASSED
- `tests/rc-0-4-1-crm-next-action.smoke.js`: PASSED
- TypeScript / Vite production UI build: PASSED
- 지정 Node 회귀 13개: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- 인앱 브라우저 시각 자동화: Windows sandbox process start 오류로 미실행
- 허용 경고: SQLite experimental API, Vite bundle size

## 발견 이슈

- S1/S2: 없음
- S3/S4: 자동 시각 검증 도구 연결 실패. TypeScript/Vite build와 Electron production smoke로 렌더 경로를 대체 확인
- 외부 발송과 실제 캘린더/주소 연동은 의도적으로 후속 버전으로 분리

## 최종 판정

S1/S2가 없고 전체 지정 회귀, production smoke, release smoke가 통과하여 `MERGE_READY`입니다.

## 안정화 재검증

- Stabilization smoke: `tests/rc-0-4-1-branch-stabilization.smoke.js`
- 7일 연기 날짜 보존: PASSED
- OVERDUE 알림 중복 방지: PASSED
- 내부 알림 전화번호/이메일 마스킹: PASSED
- 고객 화면 내부 CRM 진입점 비노출: PASSED
- 기존 JSX 정적 검사 호환: PASSED
- 최종 merge readiness: `MERGE_READY`
