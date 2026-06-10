# RC-0.4.0 실행 가이드

## 실행 파일 위치

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## 최초 실행

1. 실행 파일을 엽니다.
2. 창 제목이 `ECOREAN BOC CEO Dashboard`인지 확인합니다.
3. dev server 없이 첫 화면이 렌더링되는지 확인합니다.
4. 실제 고객정보를 입력하기 전에 백업 / 복구 센터에서 백업 상태를 확인합니다.

## 데이터 경로

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backup: `%APPDATA%\ecorean-boc-electron\backups`

## RC-0.4.0 추가 내용

- 고객 CRM 파이프라인 센터
- lead 생성, 목록, 상세, 수정
- 12단계 CRM 진행 상태와 stage history
- 상담 기록과 다음 액션
- 현장조사 요청
- 견적 및 프로젝트 연결
- 주소, 고객 포털, 캘린더 연결 준비 status
- 전화번호와 이메일 마스킹
- portal public token SHA-256 hash 저장
- customer-safe payload allowlist

## CRM Pipeline Center 사용

First Entry Panel, CEO Dashboard, Drawer 또는 실제 프로젝트 접수 화면에서 `고객 CRM 파이프라인 센터`를 엽니다.

1. 신규 lead를 생성합니다.
2. 고객 표시명, 프로젝트 유형과 공개 가능한 공사 범위를 입력합니다.
3. 상담 진행에 맞춰 CRM 단계를 변경합니다.
4. 상담 기록과 다음 액션 및 기한을 저장합니다.
5. 현장조사가 필요하면 요청을 생성합니다.
6. 작성된 견적과 프로젝트를 lead에 연결합니다.
7. 주소, 포털, 캘린더 연동 준비 상태를 확인합니다.

## CRM 12단계

- `LEAD`: 신규 문의
- `CONTACTED`: 최초 연락 완료
- `CONSULTING`: 상담 진행
- `SITE_SURVEY_SCHEDULED`: 현장조사 예정
- `SITE_SURVEY_DONE`: 현장조사 완료
- `ESTIMATE_REQUESTED`: 견적 요청
- `ESTIMATE_SENT`: 견적 발송 또는 연결 완료
- `NEGOTIATION`: 조건 협의
- `CONTRACT_PENDING`: 계약 대기
- `CONTRACTED`: 계약 완료
- `ON_HOLD`: 보류
- `LOST`: 전환 실패

모든 단계 변경은 이전 단계, 다음 단계, 사유와 변경자를 stage history에 기록합니다.

## 상담 기록

- 내부 상담 요약과 고객 공개 가능 요약을 분리합니다.
- 고객 payload에는 공개 가능 요약만 포함합니다.
- 다음 액션과 기한을 함께 저장합니다.
- 전화번호, 이메일, 상세주소와 내부 메모 원문을 보고서에 기록하지 않습니다.

## 현장조사 요청

요청일, 희망 시간, 주소 요약과 담당자를 기록합니다. 현장조사 요청 생성 시 단계가 `SITE_SURVEY_SCHEDULED`로 이동하며 상세주소는 고객용 일정 payload에 포함하지 않습니다.

## 견적 / 프로젝트 연결

- 견적 연결 시 `linked_estimate_id`를 저장하고 단계를 `ESTIMATE_SENT`로 이동합니다.
- 프로젝트 연결 시 `linked_project_id`만 저장합니다.
- CRM에는 연결 ID와 상태만 저장하며 내부 원가, 마진, PCE, Queue 또는 scoring 결과를 복제하지 않습니다.

## 주소 / 포털 / 캘린더 준비 status

- `NOT_READY`: 연결 준비 전
- `READY_TO_CONNECT`: 필수 내부 준비 완료
- `CONNECTED`: 외부 참조 연결 완료
- `FAILED`: 연결 실패 상태
- `DISABLED`: 사용하지 않음

RC-0.4.0은 준비 상태와 참조 필드만 제공합니다. 실제 외부 주소, 포털, 캘린더 API를 호출하지 않으며 API key를 저장하지 않습니다.

## 개인정보 마스킹

- 전화번호는 `010-****-1234` 형태로 저장합니다.
- 이메일은 앞 두 글자만 남겨 마스킹합니다.
- 상세주소는 내부 전용 필드로 격리합니다.
- portal public token은 원문 대신 SHA-256 hash만 저장합니다.

## Customer-Safe Payload

고객 payload는 허용 목록으로 새 객체를 생성합니다. 원문 연락처, 상세주소, 내부 메모, 원가, 마진, PCE, Queue, recommendation scoring, 업체, 노무, 구매, 입고, 이익과 risk 정보는 포함하지 않습니다.

## 문제 발생 시 확인 순서

1. 앱을 종료하고 다시 실행합니다.
2. userData와 DB 경로 접근 가능 여부를 확인합니다.
3. 백업 / 복구 센터에서 최근 백업 상태를 확인합니다.
4. CRM lead 상세의 stage history와 연결 ID를 확인합니다.
5. 고객 출력 전 customer safety 검사를 다시 실행합니다.
6. 반복되는 문제는 내부 이슈로 기록하고 고객 개인정보 원문은 로그나 보고서에 붙이지 않습니다.
