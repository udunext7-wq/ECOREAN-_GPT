# RC-0.4.4 실행 및 내부 검토 가이드

## 실행 정보

- 실행 파일: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- 실행 방법: 위 실행 파일을 직접 실행한다.
- 창 제목: `ECOREAN BOC CEO Dashboard`
- dev server: 불필요
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## 내부 진입점

1. First Entry Panel
2. CEO Dashboard
3. Drawer
4. CRM Lead 상세
5. 현장조사 상세
6. Project 상세
7. Customer Portal Draft 상세

## 내부 검토 순서

1. 일정 목록 확인
2. 현장조사 연결 확인
3. 시간과 timezone 확인
4. mismatch 비교
5. 사용자가 적용 방향 선택
6. 충돌 확인
7. Reminder/OVERDUE 확인
8. CRM Action 중복 확인
9. Customer-safe 일정 확인
10. Provider DISABLED 상태 확인
11. Audit history 확인

## 핵심 원칙

- 내부 Calendar가 SSOT이다.
- 외부 Calendar Provider는 `DISABLED` 상태다.
- 실제 Google Calendar, Microsoft Graph, Apple/iCloud, CalDAV, OAuth, API key/client secret, external invitation, SMS, Email, Kakao, Push 호출은 없다.
- 자동 양방향 덮어쓰기는 없다.
- 자동 취소, 담당자 자동 변경, 일정 자동 변경, 충돌 자동 해결은 없다.
- 고객에게 내부 담당자, 충돌 상세, 불일치 상세, Reminder, CRM Action, provider 상태, raw 상세주소, 내부 route를 노출하지 않는다.
- full visual click QA가 미수행이면 `NOT_PERFORMED`로 기록한다.

## 문제 발생 시 확인 순서

- 실행 파일이 존재하고 크기가 0보다 큰지 확인한다.
- `electron/release/win-unpacked/resources/app.asar`가 존재하고 크기가 0보다 큰지 확인한다.
- app.asar 안에 `internalCalendarService`, `siteSurveyScheduleSyncService`, `calendarProviderAdapter`, `CalendarSiteSurveySyncCenterView` 관련 식별자가 포함되어 있는지 확인한다.
- 고객 화면에 `calendarSiteSurveySync` 내부 진입점이 보이면 즉시 S1로 기록하고 고객 출력 사용을 중단한다.
- 고객 payload에 내부 담당자, conflict/mismatch 상세, reminder, provider, token/credential, 원가, 마진, PCE, queue, scoring, vendor/labor/internal cost가 보이면 즉시 S1로 기록한다.
- 외부 API/OAuth/invitation/message 호출 흔적이 발견되면 패키지 사용 가능 판정을 보류한다.
