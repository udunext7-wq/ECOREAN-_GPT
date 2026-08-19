# v0.6.0 RC Desktop Package 실행 가이드

## 실행 파일

`C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

`win-unpacked` 폴더의 구조를 유지한 상태에서 EXE를 실행합니다. 개발 서버는 필요하지 않습니다.

## 데이터 위치

- userData: `%APPDATA%\ecorean-boc-electron`
- SQLite: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- Export: `%APPDATA%\ecorean-boc-electron\export`
- Backup: `%APPDATA%\ecorean-boc-electron\backups`

production userData, SQLite DB, backup, export 폴더를 삭제하거나 초기화하지 마십시오. 테스트 전 필요한 운영 백업을 확인하고, 문제가 발생하면 먼저 앱을 종료한 뒤 기존 데이터와 백업을 보존합니다.

## Local Identity Mode

- Provider: `LOCAL`
- External authentication: `DISABLED / NOT_IMPLEMENTED`
- OAuth/OIDC/JWT와 외부 로그인: 제공하지 않음
- Credential, access token, refresh token 저장: 없음

기존 로컬 역할은 deterministic Identity와 RoleAssignment로 비파괴 승격됩니다. 최종 권한은 renderer가 아니라 main process의 Identity, Session, RoleAssignment, Organization/Project/Site 범위 평가기가 결정합니다.

## RC 확인 순서

1. EXE를 실행하고 창 제목 `ECOREAN BOC CEO Dashboard`를 확인합니다.
2. `역할 / 권한`에서 Identity Summary, Session / Identity Status, Role Assignment를 확인합니다.
3. 역할 변경 요청과 승인 Queue에서 자기 승인 및 권한 없는 승인자가 차단되는지 확인합니다.
4. 권한 감사 조회에서 민감정보가 제거되는지 확인합니다.
5. 고객 화면에 내부 원가, 마진, PCE, 승인 내부정보, Identity/Session 메타데이터가 보이지 않는지 확인합니다.
6. 앱을 종료하고 다시 실행해 Identity/Session/RoleAssignment 복원과 migration 중복 방지를 확인합니다.

이 패키지는 RC 검증용입니다. Official `v0.6.0`, GitHub Release, Windows ZIP asset은 아직 생성하지 않습니다.
