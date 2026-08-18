# v0.6.0 Identity Core & Authentication Readiness

## 목적

v0.5.2의 로컬 역할 기반 권한을 Identity, Session, Role Assignment, Resource Scope 문맥으로 확장한다. 이 버전은 외부 로그인 기능을 제공하지 않으며, 이후 인증 provider를 연결할 수 있는 내부 경계를 준비한다.

## 핵심 모델

### Identity

- 유형: `USER`, `EMPLOYEE`, `PARTNER`, `CLIENT`, `SERVICE_ACCOUNT`, `SYSTEM`
- 상태: `ACTIVE`, `SUSPENDED`, `DISABLED`, `ARCHIVED`
- 비활성 Identity는 새 세션 생성, 권한 평가, 역할 변경 승인, 감사 내보내기가 차단된다.
- Identity가 비활성화되면 활성 세션을 폐기한다.

### Organization Membership

- 유형: `OWNER`, `EMPLOYEE`, `PARTNER`, `CLIENT`, `SYSTEM`
- 기본 로컬 조직: `ORG-ECOREAN`
- 조직 문맥이 역할 할당과 다르면 권한을 부여하지 않는다.

### Session Context

- 상태: `ACTIVE`, `EXPIRED`, `REVOKED`, `INVALID`
- 권한 평가는 main 프로세스가 관리하는 현재 세션을 사용한다.
- 누락, 만료, 폐기, 알 수 없는 세션은 fail-closed 처리한다.

### Role Assignment

- 범위: `GLOBAL`, `ORGANIZATION`, `PROJECT`, `SITE`
- 상태: `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`
- 권한은 Identity의 활성 역할 할당에서 파생하며 renderer가 전달한 역할 문자열을 신뢰하지 않는다.
- 프로젝트 역할 할당은 해당 프로젝트에서만 유효하다. 검증 fixture에서 `PROJECT_001`은 허용되고 `PROJECT_002`는 차단된다.

## 권한 판정

판정 결과는 `ALLOW`, `DENY`, `APPROVAL_REQUIRED`를 지원한다. 다음 조건은 기본 차단이다.

- 알 수 없는 Identity, 역할 또는 권한
- 비활성 Identity
- 누락, 만료, 폐기 또는 잘못된 세션
- 중지, 폐기 또는 만료된 역할 할당
- 조직, 프로젝트 또는 현장 범위 불일치
- Identity와 세션의 불일치

## 역할 변경과 감사

- 요청자, 대상자, 검토자, 승인자, 적용자를 불변 Identity ID로 기록한다.
- 요청자와 승인자의 Identity ID가 같으면 self-approval을 차단한다.
- 감사 이벤트는 `actorIdentityId`, `actorRole`, `actorOrganizationId`, `sessionId`, resource 정보를 기록한다.
- 감사 payload의 고객 개인정보, provider 정보, credential 및 경로는 기존 redaction 정책을 유지한다.

## 고객 안전성

고객용 payload에서 Identity ID, Session ID, 역할 할당, 조직 membership, provider subject와 기존 내부 원가, 마진, PCE, 고객 연락처 및 상세주소를 제거한다.

## UI

사용자 역할 및 권한 센터에 다음 읽기 전용 상태를 표시한다.

- Identity Summary
- Session / Identity Status
- Role Assignment

로그인 화면이나 외부 인증 설정 화면은 포함하지 않는다.
