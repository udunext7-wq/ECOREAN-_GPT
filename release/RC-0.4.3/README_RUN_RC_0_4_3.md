# RC-0.4.3 실행 및 내부 검토 가이드

## 실행 정보

- 실행 파일: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- 실행 방법: 위 실행 파일을 직접 실행한다.
- 창 제목: `ECOREAN BOC CEO Dashboard`
- dev server: 불필요
- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Customer Portal Draft Center 진입점

1. First Entry Panel
2. CEO Dashboard
3. Drawer
4. CRM Lead 상세
5. Project 상세
6. 계약/견적 연결 화면

## 내부 검토 순서

1. Draft 생성 또는 선택
2. 연결 Lead / Project / Estimate / Contract 확인
3. Customer-safe preview 확인
4. 제외된 내부 필드 분류 확인
5. 고객 공개 문서 확인
6. 고객용 진행률 확인
7. Customer safety 검사
8. Snapshot 생성
9. Review 요청
10. 내부 승인 또는 반려
11. 내부 Preview 생성
12. Preview 폐기

## 상태 정의

portal_status:

- `DRAFT`
- `REVIEW_REQUIRED`
- `INTERNAL_APPROVED`
- `REJECTED`
- `ARCHIVED`
- `PUBLISH_BLOCKED`

review_status:

- `NOT_REVIEWED`
- `IN_REVIEW`
- `APPROVED`
- `REJECTED`
- `REVISION_REQUIRED`

external_delivery_status:

- `DISABLED`
- `NOT_READY`

authentication_status:

- `DISABLED`
- `INTERNAL_PREVIEW_ONLY`

금지 상태:

- `PUBLIC`
- `LIVE`
- `PUBLISHED`

## 보호 원칙

- `INTERNAL_APPROVED`는 외부 공개 완료가 아니다.
- 고객 payload는 allowlist 방식으로만 만든다.
- 내부 객체를 spread한 뒤 delete하는 방식은 금지한다.
- 내부 원가, 마진, PCE, Queue, Scoring은 고객 payload에 노출하지 않는다.
- 상세주소, provider, 좌표, 내부 주소 검토 정보는 고객 payload에 노출하지 않는다.
- 내부 action / notification은 고객 payload에 노출하지 않는다.
- preview token 원문은 DB, 로그, UI, 고객 payload에 저장하거나 표시하지 않는다.
- 외부 URL, 고객 로그인, 외부 인증, 외부 호스팅, SMS, Email, Kakao, Push, Calendar 발송은 비활성이다.

## 문제 발생 시 확인 순서

- 실행 파일이 존재하는지 확인한다.
- `electron/release/win-unpacked/resources/app.asar`가 존재하고 크기가 0보다 큰지 확인한다.
- `%APPDATA%\ecorean-boc-electron` 아래 DB/export/backups 경로가 유지되는지 확인한다.
- 고객 화면에 내부 Draft Center 진입점이 보이면 즉시 S1로 기록하고 사용을 중단한다.
- 고객 payload에 원가, 마진, PCE, Queue, Scoring, 상세주소, raw phone/email, preview token 원문이 보이면 즉시 S1로 기록한다.
