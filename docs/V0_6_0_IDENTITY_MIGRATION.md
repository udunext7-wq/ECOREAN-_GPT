# v0.6.0 Identity Migration

## 기준

- 기준 버전: official `v0.5.2`
- 기존 사용자: `USER-LOCAL-RBAC`
- 기존 세션 상태: `role_session_state / LOCAL`
- 신규 기본 Identity: `IDN-LOCAL-ECOREAN-OWNER`
- 신규 기본 Role Assignment: `RASN-LOCAL-ECOREAN`
- 신규 기본 Session: `SES-LOCAL-ECOREAN`

## 동작

1. 기존 역할 정의와 로컬 현재 역할을 읽는다.
2. 결정적 ID의 로컬 Identity, Employee, Organization Membership을 생성한다.
3. 기존 현재 역할을 신규 GLOBAL Role Assignment에 연결한다.
4. 로컬 Session Context를 생성한다.
5. `identity_schema_versions`에 `v0.6.0-identity-core-1` 적용 결과를 기록한다.

## 안전성

- `INSERT OR IGNORE`와 고유 키를 사용해 반복 실행이 안전하다.
- 기존 `users`와 `role_session_state` 레코드를 삭제하거나 변경하지 않는다.
- userData, 고객 데이터, 프로젝트 데이터, 출력 파일을 이동하거나 삭제하지 않는다.
- 두 번째 실행은 동일 Identity, Assignment, Session을 재사용한다.
- 마이그레이션 결과에는 `destructiveChanges: false`를 기록한다.

## 롤백 경계

v0.6.0 구현 단계에서는 기존 v0.5.2 테이블을 그대로 유지하므로 소스 롤백 시 기존 로컬 역할 데이터가 남는다. 신규 테이블 자동 삭제는 수행하지 않는다.
