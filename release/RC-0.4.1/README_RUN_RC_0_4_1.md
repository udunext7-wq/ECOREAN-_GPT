# RC-0.4.1 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 실행 방법

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 고객 데이터를 다루기 전에 백업 / 복구 센터에서 최근 백업을 확인합니다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## CRM 다음 액션 센터 진입

다음 내부 화면에서 `CRM 다음 액션 / 내부 알림`을 엽니다.

- First Entry Panel
- CEO Dashboard
- Drawer
- CRM Pipeline Center
- 실제 프로젝트 접수

고객-facing 화면에는 내부 CRM 다음 액션 진입점을 제공하지 않습니다.

## 오늘 할 일과 기한 초과 확인

1. 다음 액션 목록에서 오늘 예정된 액션을 확인합니다.
2. `due_at`이 지난 미완료 액션은 `OVERDUE`로 표시됩니다.
3. 기한 초과 알림은 내부 알림으로 한 번만 생성됩니다.
4. 데이터가 없으면 `조건에 맞는 다음 액션이 없습니다.` 또는 `내부 알림이 없습니다.`가 표시됩니다.

## 액션 처리

- 완료: 액션을 선택하고 완료 사유를 기록합니다.
- 24시간 보류: `24시간 보류`를 선택합니다.
- 7일 연기: `7일 연기`를 선택합니다.
- 취소: 액션을 선택하고 취소 사유를 기록합니다.
- 알림 확인: 내부 알림에서 읽음 처리합니다.
- 알림 해제: 더 이상 표시할 필요가 없는 알림을 dismiss 처리합니다.

## 자동 생성 원칙

- 신규 lead 생성 시 `FIRST_CONTACT` 액션이 자동 생성됩니다.
- CRM 단계 변경 시 단계에 맞는 후속 액션이 생성됩니다.
- 같은 lead에 동일한 `action_type`의 활성 액션이 있으면 중복 생성하지 않습니다.
- `CONTRACTED` 진입 시 `PROJECT_HANDOFF` 액션을 생성합니다.

## ON_HOLD / LOST 처리

- `ON_HOLD`: 활성 액션을 보류 상태로 전환하고 신규 자동 액션 생성을 제한합니다.
- `LOST`: 신규 자동 액션 생성을 중단하고 미완료 액션을 취소 또는 종료합니다.

## 외부 발송 비활성

RC-0.4.1은 내부 운영 자동화만 수행합니다. SMS, Email, Kakao, Push, Calendar, Address API를 실제 호출하지 않으며 외부 발송 상태는 `DISABLED` 또는 `NOT_READY`로 유지합니다.

## 개인정보 마스킹

- 전화번호와 이메일은 내부 알림 및 보고서에서 마스킹합니다.
- 상세주소와 내부 메모는 고객 payload에 포함하지 않습니다.
- 실제 고객 개인정보를 fixture, 로그 또는 릴리즈 문서에 저장하지 않습니다.

## Customer-Safe Payload

고객 payload는 허용 목록으로 생성합니다. 내부 알림, 내부 액션 메모, 지연 위험, 내부 우선순위, 원가, 마진, PCE, Queue, recommendation scoring, 업체, 노무, 구매, 입고, 이익 및 risk 정보는 포함하지 않습니다.

## 문제 발생 시 점검 순서

1. 앱을 종료하고 다시 실행합니다.
2. userData와 DB 경로 접근 상태를 확인합니다.
3. 백업 / 복구 센터에서 최근 백업을 확인합니다.
4. CRM lead의 현재 단계와 stage history를 확인합니다.
5. 같은 유형의 활성 액션이 이미 있어 중복 생성이 차단됐는지 확인합니다.
6. 고객 출력 전 customer safety 검사를 다시 실행합니다.
7. 외부 발송 상태가 `DISABLED`인지 확인합니다.
8. 반복되는 문제는 개인정보 원문 없이 내부 이슈로 기록합니다.
