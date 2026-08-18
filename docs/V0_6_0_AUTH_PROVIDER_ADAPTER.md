# v0.6.0 Auth Provider Adapter

## 범위

`authProviderAdapter.js`는 외부 인증 공급자를 위한 중립 계약만 정의한다. v0.6.0에서는 실제 네트워크 호출, OAuth, OIDC, SSO, JWT, access token 저장을 구현하지 않는다.

## 계약

- `getProviderStatus()`
- `validateConfiguration()`
- `authenticate()`
- `restoreSession()`
- `refreshSession()`
- `revokeSession()`
- `signOut()`

기본 adapter는 모든 작업에 다음을 반환한다.

- `status: DISABLED`
- `authenticationStatus: NOT_CONFIGURED`
- `externalCallPerformed: false`

## Local Identity Provider

`localIdentityProvider.js`는 기존 단일 사용자 운영을 보존하기 위한 로컬 provider다.

- 기본 Identity와 로컬 세션을 보장한다.
- 현재 세션을 복원하고 검증한다.
- 세션 폐기와 sign-out 경계를 제공한다.
- 비밀번호나 token을 만들거나 저장하지 않는다.
- 권한 결정을 수행하지 않는다. 권한 결정은 Role Permission Service가 담당한다.

## 후속 provider 연결 원칙

향후 provider 구현은 외부 주체를 내부 Identity에 매핑한 뒤 Session Context만 생성해야 한다. 역할과 권한은 provider claim에서 직접 부여하지 않고 BOC의 Role Assignment를 사용한다.
