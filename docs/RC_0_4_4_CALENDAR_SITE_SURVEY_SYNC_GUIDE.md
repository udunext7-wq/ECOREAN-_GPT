# RC-0.4.4 Calendar / Site Survey Sync Readiness Guide

## 목적

RC-0.4.4는 실제 외부 캘린더 연동이 아니라 내부 운영 일정과 현장조사 일정의 연결 준비 상태를 검증하는 단계다.

## 운영 원칙

- Google Calendar / Outlook / Apple Calendar API는 호출하지 않는다.
- OAuth, API key, refresh token, provider payload는 저장하지 않는다.
- 고객 초대, 문자, 이메일, 외부 알림은 발송하지 않는다.
- 내부 일정과 현장조사 연결은 로컬 DB에만 기록한다.
- 불일치가 있으면 자동 덮어쓰기 없이 대표 수동 검토 상태로 둔다.

## 내부 일정 입력 순서

1. `캘린더 / 현장조사 Sync` 화면을 연다.
2. 일정 유형을 선택한다.
3. 제목, 고객 표시 제목, 시작/종료, 담당자, 위치 요약을 입력한다.
4. `내부 일정 생성`을 실행한다.
5. 충돌 상태와 감사 기록을 확인한다.

## 현장조사 연결 순서

1. CRM 현장조사 요청 또는 내부 테스트 Survey ID를 준비한다.
2. `현장조사 일정 생성`을 실행한다.
3. `site_survey_schedule_links` 연결 상태를 확인한다.
4. Survey와 Calendar 값이 다르면 `REVIEW_REQUIRED`로 남긴다.
5. 대표 확인 후 `수동 해결` 또는 `보류` 처리한다.

## 시간대 / 종일 일정

- 기본 시간대는 `Asia/Seoul`이다.
- 지원하지 않는 시간대는 `Asia/Seoul`로 보정하고 경고를 남긴다.
- 종료 시간은 시작 시간 이후여야 한다.
- 24시간 초과 일정은 경고 대상이다.

## 고객 안전성

고객-facing payload에는 다음 정보가 포함되면 안 된다.

- 내부 담당자 / 참석자
- 내부 메모
- 일정 충돌 정보
- reminder / CRM action
- provider / token / external event id
- 상세주소, 전화번호, 이메일 원문
- 원가, 마진, PCE, vendor, labor, purchase, backup, risk score

## 외부 연동 상태

RC-0.4.4 기준 외부 연동 상태는 항상 `DISABLED`다.

## 최종 판정 기준

- 내부 일정 생성 / 수정 / 취소 / 복원 / 완료 가능
- 현장조사 연결 생성 / 비교 / 불일치 해결 가능
- 충돌 감지 가능
- 알림 중복 방지 가능
- 감사 기록 생성 가능
- 고객 안전성 통과

## RC-0.4.4 검증 메모

- `Asia/Seoul`을 기본 시간대로 사용한다.
- 지원하지 않는 시간대 문자열은 저장 전에 차단/보정한다.
- Survey와 Calendar가 다를 때 원본을 자동 덮어쓰지 않는다.
- 외부 provider는 `DISABLED` 상태를 유지한다.
- Provider 응답은 `provider: null`, `authentication_status: NOT_CONFIGURED`, `external_call_performed: false`를 기준으로 확인한다.
- 완료된 일정/알림의 재완료와 취소된 일정/알림의 임의 재활성화는 차단한다.
- 동일 Survey가 여러 Event에 연결되면 자동 병합하지 않고 `REVIEW_REQUIRED`로 남긴다.
