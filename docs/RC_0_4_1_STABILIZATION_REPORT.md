# RC-0.4.1 CRM Next Action Automation Stabilization Report

## 기준 정보

- 작업일: 2026-06-11
- Branch: `rc-0.4.1-crm-next-action-automation`
- 구현 기준 commit: `0a9573d`
- Base packaged tag: `v0.4.0-rc-packaged`
- Main merge: 미실행
- RC-0.4.1 tag: 미생성

## 구현 화면과 서비스

- 화면: `ui/app/crm/CrmNextActionCenterView.tsx`
- 서비스: `electron/services/crmNextActionService.js`
- CRM 연결: `electron/services/crmPipelineService.js`
- DB:
  - `crm_next_actions`
  - `crm_internal_notifications`
  - `crm_next_action_rules`

## 안정화 결과

| 검증 항목 | 결과 |
| --- | --- |
| next action 생성 / 목록 / 상세 | PASSED |
| 완료 | PASSED |
| 24시간 보류 | PASSED |
| 7일 연기 | PASSED |
| 취소 | PASSED |
| Lead 생성 시 `FIRST_CONTACT` | PASSED |
| stage별 자동 action 생성 | PASSED |
| 동일 lead/action type 활성 중복 방지 | PASSED |
| 지난 `due_at`의 `OVERDUE` 감지 | PASSED |
| OVERDUE 내부 알림 단일 생성 | PASSED |
| notification read / dismiss | PASSED |
| dashboard summary | PASSED |
| `ON_HOLD` 활성 action 보류 | PASSED |
| `LOST` 미완료 action 취소 | PASSED |
| 내부 report 생성 | PASSED |

## 자동 생성 규칙

- `LEAD` → `FIRST_CONTACT`
- `CONTACTED` → `CONSULTATION_REVIEW`
- `CONSULTING` → `FOLLOW_UP`
- `SITE_SURVEY_SCHEDULED` → `SITE_SURVEY_CONFIRM`
- `SITE_SURVEY_DONE` → `ESTIMATE_PREPARE`
- `ESTIMATE_REQUESTED` → `ESTIMATE_SEND`
- `ESTIMATE_SENT` / `NEGOTIATION` → `NEGOTIATION_FOLLOW_UP`
- `CONTRACT_PENDING` → `CONTRACT_FOLLOW_UP`
- `CONTRACTED` → `PROJECT_HANDOFF`

`ON_HOLD`와 `LOST`에서는 신규 자동 action을 만들지 않습니다.

## 개인정보와 고객 안전성

- CRM 내부 알림과 action memo customer payload 비노출: PASSED
- delay/overdue risk customer payload 비노출: PASSED
- raw phone/email/detailed address customer payload 비노출: PASSED
- 내부 원가, 마진, PCE, Queue, Scoring 비노출: PASSED
- 내부 알림 title/message에 입력된 전화번호와 이메일 마스킹: PASSED
- customer-facing 화면에 `crmNextActions` 진입점 없음: PASSED
- 고객 payload allowlist 유지: PASSED

## 외부 API 비호출

- SMS: DISABLED
- Email: DISABLED
- Kakao: DISABLED
- Push notification: DISABLED
- Calendar sync: DISABLED
- Address API: DISABLED
- API key / Authorization 추가: 없음
- `external_delivery_status`: `DISABLED`

## 내부 진입점

- First Entry Panel: PASSED
- CEO Dashboard: PASSED
- Drawer: PASSED
- CRM Pipeline Center: PASSED
- 실제 프로젝트 접수: PASSED
- 빈 action / notification empty state: PASSED

## Fixed Issues

- RC-0.4.0 안정화 스모크가 기대한 `<CrmPipelineCenterView />` JSX 형태를 보존해 기존 정적 검사가 재발하지 않도록 했습니다.
- 내부 알림 title/message의 전화번호와 이메일을 저장 전 마스킹합니다.
- 24시간 보류와 별도로 7일 연기 동작 및 날짜 보존을 안정화 스모크에서 검증합니다.

## Issues Found

- S1: 없음
- S2: 없음
- S3/S4: 인앱 브라우저 자동 시각 검증이 Windows sandbox process start 오류로 실행되지 않음

시각 자동화 대신 TypeScript/Vite production build, Electron production smoke, Electron release smoke를 사용해 렌더 및 실행 경로를 검증합니다.

## Deferred

- 실제 SMS / Email / Kakao / push 발송
- 캘린더 실제 동기화
- 주소 API 실제 호출
- 고객 동의 및 외부 provider 전달 정책
- 역할별 알림 배정과 권한

## Test Result

- 신규 안정화 smoke: PASSED
- RC-0.4.1 기능 smoke: PASSED
- 전체 지정 Node 회귀: PASSED
- 서비스 syntax: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- 허용 경고: Vite bundle size, SQLite experimental API

## Merge Readiness

`MERGE_READY`

미해결 S1/S2가 없고, action lifecycle, stage automation, 개인정보 보호, 고객 안전성, 외부 API 비호출 및 전체 build/smoke가 통과했습니다.
