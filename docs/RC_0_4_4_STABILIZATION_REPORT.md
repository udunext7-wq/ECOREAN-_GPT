# RC-0.4.4 Stabilization Report

## 기준

- Branch: `rc-0.4.4-calendar-site-survey-sync-readiness`
- Base tag: `v0.4.3-rc-packaged`
- Implementation commit: `8f92eb1`
- Stabilization decision: `MERGE_READY`

## 구현 범위

- `internalCalendarService`
- `siteSurveyScheduleSyncService`
- `calendarProviderAdapter`
- `CalendarSiteSurveySyncCenterView`
- UI calendar service wrapper
- IPC / preload / type / Drawer / internal entry points
- DB tables:
  - `internal_calendar_events`
  - `site_survey_schedule_links`
  - `calendar_event_reminders`
  - `calendar_event_audit_history`

## 검증 이력

- 최초 검증 차단: Windows sandbox `CreateProcessAsUserW failed: 5` 및 승인 실행 한도 초과.
- 재개 후 구현 커밋: `8f92eb1`
- 안정화 smoke 추가: `tests/rc-0-4-4-branch-stabilization.smoke.js`

## Calendar Lifecycle

- create / list / detail / update: PASSED
- cancel / restore: PASSED
- complete / no-show / reschedule: PASSED
- 존재하지 않는 event 안전 처리: PASSED
- 취소된 event 수정 제한: PASSED
- 완료된 event 재완료 방지: PASSED
- restore는 CANCELLED / NO_SHOW / RESCHEDULE_REQUIRED에서만 허용: PASSED

## Timezone

- 기본 timezone: `Asia/Seoul`
- ISO 8601 저장: PASSED
- start/end validation: PASSED
- start=end / end<start 차단: PASSED
- invalid date / NaN timestamp 차단: PASSED
- negative duration 차단: PASSED
- all-day event 안전 처리: PASSED
- 24시간 초과 event warning: PASSED
- invalid timezone fallback: PASSED
- start/end 자동 역전 없음: PASSED

## Site Survey Linkage

- Survey schedule link create / update / get / list / remove: PASSED
- Survey to Calendar event creation: PASSED
- Survey to Calendar explicit sync path: PASSED
- Calendar to Survey compare path: PASSED
- 원본 자동 덮어쓰기 없음: PASSED
- Survey/Event 자동 삭제 없음: PASSED
- Project/Lead/CRM stage 자동 변경 없음: PASSED

## Mismatch

- mismatch detection: PASSED
- manual resolution: PASSED
- defer: PASSED
- same Survey multiple event link warning: PASSED
- automatic merge/delete 없음: PASSED

## Conflict Detection

- 동일 담당자 시간 겹침 감지: PASSED
- CANCELLED event 변경 제한: PASSED
- BLOCKING conflict에서도 자동 취소/담당자 변경/시간 변경 없음: PASSED
- 충돌 해결은 사용자 선택 필요: PASSED

## Reminder / OVERDUE

- reminder create / complete / snooze / cancel: PASSED
- due_at 누락 차단: PASSED
- invalid due_at 차단: PASSED
- OVERDUE 감지: PASSED
- completed reminder 재완료 방지: PASSED
- cancelled reminder 재활성화 제한: PASSED
- CRM Action duplicate prevention: PASSED
- 외부 메시지 발송 없음: PASSED

## Provider Adapter

- provider status: `DISABLED`
- provider: `null`
- authentication_status: `NOT_CONFIGURED`
- external_call_performed: `false`
- Google / Microsoft Graph / Apple / iCloud / CalDAV / OAuth 호출 없음: PASSED
- API key / client secret 없음: PASSED
- invitation 발송 없음: PASSED
- provider raw response 저장 없음: PASSED

## Customer-safe Payload

- 허용: 승인된 일정 제목, 날짜, 시작/종료 시간, 고객용 위치 요약, 고객용 상태.
- 비노출: owner, internal memo, conflict/mismatch detail, reminder, CRM action, provider/hash, audit, DB ID, cost, margin, PCE, queue, scoring, token.
- Customer safety: PASSED

## Audit History

- lifecycle / link / mismatch / reminder action history: PASSED
- old/new value JSON 기록: PASSED
- provider 원문 비저장: PASSED
- 민감 개인정보 비저장: PASSED

## Internal Entry Points

1. First Entry Panel: PASSED
2. CEO Dashboard: PASSED
3. Drawer: PASSED
4. CRM Lead detail: PASSED
5. Site Survey detail section: PASSED
6. Project detail: PASSED
7. Customer Portal Draft detail: PASSED

## Customer Screen Isolation

- customer portal screen internal calendar route 없음: PASSED
- customer payload에 담당자/충돌/mismatch/reminder/action 없음: PASSED

## Empty / Edge Case

- empty event state: PASSED
- empty site survey link state: PASSED
- provider disabled state: PASSED
- null/empty/invalid payload protection: PASSED
- script / path-like hostile input sanitization: PASSED

## Issues Found

- Provider adapter response shape needed stabilization to `provider: null` and `authentication_status: NOT_CONFIGURED`.
- Reminder types needed RC-0.4.4 operational labels.
- Completed/cancelled event/reminder edge states needed stricter guards.
- Same Survey multiple Event link needed explicit review-required signal.

## Fixes Made

- Added provider adapter aliases for validation, fetch, and invitation blocked flows.
- Added reminder type support for survey/customer/document/travel/follow-up use cases.
- Added re-complete and cancelled-state guards.
- Added `due_at` required validation for reminders.
- Added same Survey multiple Event mismatch warning.
- Added stabilization smoke coverage.

## Deferred Items

- Real Google / Outlook / Apple / CalDAV provider integration.
- OAuth and credential storage.
- External invitation delivery.
- Visual click QA for the new center.
- Travel-time routing engine.
- Calendar export/import UX.

## Known Warnings

- Vite bundle size warning.
- SQLite experimental API warning.
- npm update notice if shown.

## Visual QA

- Source/build/smoke verified.
- Manual click QA: `NOT_PERFORMED`.

## Final Decision

`MERGE_READY`
