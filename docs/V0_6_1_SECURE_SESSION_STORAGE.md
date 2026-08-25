# v0.6.1 Secure Session Storage

## 저장 경계

Supabase access/refresh token은 Electron main process 안에서만 처리한다.

- renderer 전달: 금지
- SQLite 저장: 금지
- 감사 로그 저장: 금지
- console/debug 출력: 금지
- 저장 파일: `%APPDATA%\\ecorean-boc-electron\\auth\\supabase-session.secure.json`

Windows에서는 Electron `safeStorage`가 DPAPI 기반 암호화를 사용한다. `isEncryptionAvailable()`이 false이거나 암복호화가 실패하면 디스크 평문 fallback을 만들지 않고 process memory 전용으로 동작한다. 이 경우 재시작 복원은 보장하지 않지만 token 평문 저장은 발생하지 않는다.

## Supabase custom storage

`getItem`, `setItem`, `removeItem`을 Supabase Auth에 전달한다. 컨테이너 파일에는 storage key와 base64 encoded ciphertext만 존재한다. 로그아웃 시 provider의 local session을 폐기하고 secure store, ECOREAN current session, coordinator cache를 함께 지운다.

## ECOREAN 세션

`identity_sessions`에는 token 대신 `provider_session_ref`만 저장한다. 이 값은 provider user와 만료 시각에서 만든 불투명 지문이며 Supabase API 호출에 사용할 수 없다.

## 검증

- synthetic access token 평문 파일 검사: `ABSENT`
- synthetic refresh token 평문 파일 검사: `ABSENT`
- binding/session DB token column 검사: `ABSENT`
- sign-out secure store clear: `PASSED`
- audit credential/token redaction: `PASSED`
- production dependency audit: `0 vulnerabilities`

## 운영 주의

- `.env`는 Git에 커밋하지 않는다.
- `.env.example`에는 placeholder만 둔다.
- publishable key 외 service role key, DB password, JWT secret을 데스크톱 설정에 넣지 않는다.
- 실제 로그인 검증 전에는 `LIVE_SUPABASE_AUTH`를 `PASSED`로 기록하지 않는다.
