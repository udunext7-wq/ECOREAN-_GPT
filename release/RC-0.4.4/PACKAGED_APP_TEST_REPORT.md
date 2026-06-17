# RC-0.4.4 Packaged App Test Report

## Summary

- Test date: 2026-06-17
- Version: RC-0.4.4
- Base tag: `v0.4.3-rc-packaged`
- Source tag: `v0.4.4-rc`
- Source commit: `06b92be`
- Merge commit: `ee78a2c`
- Implementation commit: `8f92eb1`
- Stabilization commit: `91e41cc`
- Package: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: 210,149,888 bytes
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: 2,763,169 bytes

## Build and Launch

- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED with extended timeout
- `npm run dist`: PASSED
- Actual packaged launch: PASSED
- Immediate exit: NO
- Responsiveness: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First window creation: PASSED

The packaged Electron process was actually launched and observed. Full visual click QA through all seven internal entry points was not performed; source, smoke, production bundle, app.asar archive, and packaged launch verification were used.

## Package Contents

- Executable exists and is non-empty: PASSED
- app.asar exists and is non-empty: PASSED
- `internalCalendarService`: PASSED
- `siteSurveyScheduleSyncService`: PASSED
- `calendarProviderAdapter`: PASSED
- `main.js` Calendar Event IPC handlers: PASSED
- `preload.js` bridge: PASSED
- `internal_calendar_events` schema/table reference: PASSED
- `site_survey_schedule_links` schema/table reference: PASSED
- `calendar_event_reminders` schema/table reference: PASSED
- `calendar_event_audit_history` schema/table reference: PASSED
- Production UI includes `캘린더 / 현장조사 Sync`: PASSED
- Production UI includes `calendarSiteSurveySync` route key: PASSED
- Provider DISABLED marker in package: PASSED

## Data Paths

- userData: `%APPDATA%\ecorean-boc-electron` - PASSED
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite` - PASSED
- export: `%APPDATA%\ecorean-boc-electron\export` - PASSED
- backups: `%APPDATA%\ecorean-boc-electron\backups` - PASSED

## Calendar and Site Survey Sync

- Calendar lifecycle create/list/detail/update: PASSED
- Cancel / restore / complete / no-show / reschedule: PASSED
- Cancelled event update restriction: PASSED
- Completed event re-complete prevention: PASSED
- Timezone fallback to Asia/Seoul: PASSED
- ISO 8601 and start/end validation: PASSED
- Invalid date, invalid timezone, and negative duration protection: PASSED
- All-day safe handling: PASSED
- Survey linkage: PASSED
- Survey to Calendar explicit path: PASSED
- Calendar to Survey explicit path: PASSED
- Mismatch detection, manual resolve, and defer: PASSED
- Original data protection before comparison: PASSED
- Same Survey multiple Event review requirement: PASSED
- Conflict detection: PASSED
- Automatic cancel / assignment / time change / conflict resolution: ABSENT

## Reminder / CRM / Audit

- Reminder create / complete / snooze / cancel: PASSED
- OVERDUE detection: PASSED
- Duplicate Reminder / CRM Action prevention: PASSED
- Audit history: PASSED
- Calendar audit report: PASSED
- Site Survey Sync report: PASSED

## Provider and External Communication

- Provider status: `DISABLED`
- provider: `null`
- authentication_status: `NOT_CONFIGURED`
- external_call_performed: `false`
- Google Calendar API: ABSENT
- Microsoft Graph: ABSENT
- Apple/iCloud/CalDAV: ABSENT
- OAuth/API key/client secret: ABSENT
- External invitation: DISABLED
- SMS/Email/Kakao/Push: DISABLED
- Provider raw response storage: ABSENT

## Customer Safety

- Customer-safe schedule payload: PASSED
- Internal field exclusion: PASSED
- Customer safety regression: PASSED
- Customer screen internal calendar route: ABSENT
- Customer Portal Draft includes only customer-safe schedule data when exposed: PASSED by service/source/smoke boundary

Hidden from customer-facing payloads:

- owner_user_id
- internal owner personal contact
- description_internal
- priority
- conflict details
- mismatch details
- internal reminder
- CRM Next Action
- internal notification
- travel time
- location_detail_internal
- raw detailed address
- provider status/error
- external event hash
- audit history
- DB ID
- margin/PCE/Queue/Scoring
- vendor/labor/internal cost
- token/credential

## Internal Entry Points

- First Entry Panel: PASSED by source/smoke/archive
- CEO Dashboard: PASSED by source/smoke/archive
- Drawer: PASSED by source/smoke/archive
- CRM Lead 상세: PASSED by source/smoke/archive
- 현장조사 상세: PASSED by source/smoke/archive
- Project 상세: PASSED by source/smoke/archive
- Customer Portal Draft 상세: PASSED by source/smoke/archive
- Customer screen internal Calendar Center entry: ABSENT
- Visual click QA: NOT_PERFORMED

## Tests Run

- service syntax: PASSED
- `rc-0-4-4-packaged-release.smoke.js`: PASSED
- `rc-0-4-4-branch-stabilization.smoke.js`: PASSED
- `rc-0-4-4-calendar-site-survey-sync.smoke.js`: PASSED
- RC-0.4.3 / RC-0.4.2 / RC-0.4.1 / RC-0.4.0 / RC-0.3.9 regression smoke: PASSED
- real project intake: PASSED
- LightBIM customer safety / release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- `npm run dist`: PASSED

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning from electron-builder child process invocation
- npm update notice if shown

## Failed Commands and Workarounds

- Some shell operations required approved execution because Windows sandbox process creation returned `CreateProcessAsUserW failed: 5`.
- `smoke:release` and `dist` were run with sufficiently long timeouts.
- Full visual click QA was not performed and is not recorded as PASSED.
- No package, launch, customer safety, or build failure remained.

## Final Decision

`RC-0.4.4 Desktop Release Package 사용 가능`

Full visual click QA는 NOT_PERFORMED이며, source/smoke/archive 및 packaged launch 검증 기준이다.
