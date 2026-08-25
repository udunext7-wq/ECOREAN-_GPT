# v0.6.1 Supabase Authentication Architecture

## 목적

v0.6.0의 `Identity -> Session -> Role Assignment -> Resource Scope -> Authorization -> Audit` 경계 앞에 Supabase Authentication을 연결한다. Supabase 로그인 성공은 신원 증명일 뿐이며 ECOREAN 권한을 직접 부여하지 않는다.

**Authentication != Authorization**

## 인증 모드

- `ECOREAN_AUTH_MODE=LOCAL`: 기본값. v0.6.0 로컬 Identity와 장기 세션 동작을 보존한다.
- `ECOREAN_AUTH_MODE=SUPABASE`: Supabase 세션을 검증하고 활성 외부 ID 바인딩이 있을 때만 ECOREAN 세션을 만든다.
- 알 수 없는 모드, 누락된 URL/키, 금지된 secret 설정은 fail-closed 처리한다.
- SUPABASE 모드에서 오류가 발생해도 LOCAL CEO로 자동 전환하지 않는다.

## 런타임 구성

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- 기존 배포 호환이 필요한 경우에만 `SUPABASE_ANON_KEY`를 대체 입력명으로 읽는다.
- `SUPABASE_SERVICE_ROLE_KEY`, DB password, JWT secret은 이 데스크톱 앱에 넣지 않는다.
- renderer에는 URL, 키, 세션 토큰 또는 provider 원문 metadata를 전달하지 않는다.

## 인증 흐름

```text
Supabase signInWithPassword
-> provider user verification
-> ExternalIdentityBinding lookup
-> active ECOREAN Identity
-> active organization membership
-> active Role Assignment
-> opaque ECOREAN SessionContext
-> resource-scoped authorization
-> redacted audit
```

미연결 사용자는 `AUTHENTICATED_UNBOUND`로 표시되지만 업무 IPC와 전체 업무 UI는 차단된다. 허용 동작은 인증 상태 확인과 로그아웃뿐이다.

## SDK 기준

- Electron main dependency: `@supabase/supabase-js` `2.112.4`, exact pin
- Runtime Node requirement: `>=22`; 검증 환경은 Node 24
- `persistSession=true`, `detectSessionInUrl=false`, OS 암호화 custom storage
- provider user authenticity 확인은 `auth.getUser()` 결과와 session user ID를 대조한다.
- 현재 장치 세션 로그아웃은 `signOut({ scope: 'local' })`을 사용한다.

## 공식 참고

- https://supabase.com/docs/reference/javascript/auth
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- https://supabase.com/docs/reference/javascript/auth-signout
- https://supabase.com/changelog?types=breaking-change
- https://www.electronjs.org/docs/latest/api/safe-storage

## 현재 검증 상태

- Synthetic provider sign-in/restore/refresh/sign-out: `PASSED`
- `LIVE_SUPABASE_AUTH = NOT_RUN_NOT_CONFIGURED`
- 최종 구현 판정: `CONDITIONAL_MERGE_READY`
