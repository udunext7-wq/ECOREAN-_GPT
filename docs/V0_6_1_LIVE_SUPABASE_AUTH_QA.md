# v0.6.1 Live Supabase Authentication Integration QA

## 기준

- Test date: `2026-08-25`
- Branch: `v0.6.1-supabase-auth-multi-user-binding`
- Previous implementation commit: `8c5adda3927c42641f637c4b8a5ab6ac40de43a5`
- Base official tag: `v0.6.0`
- Base target: `c54cc338a0b38f57bd229cd5635c84980fb6e62b`
- Supabase JS: `2.112.4`, exact pinned
- Production environment used: `NO`
- Production customer/employee credentials used: `NO`
- Credential values recorded: `NO`

## QA 환경 감지

값을 출력하지 않고 환경 변수와 로컬 `.env`의 구성 여부만 확인했다.

| 항목 | 결과 |
| --- | --- |
| `ECOREAN_AUTH_MODE` | `NOT_CONFIGURED` |
| `SUPABASE_URL` | `NOT_CONFIGURED` |
| `SUPABASE_PUBLISHABLE_KEY` | `NOT_CONFIGURED` |
| `SUPABASE_ANON_KEY` | `NOT_CONFIGURED` |
| Local `.env` required keys | `NOT_CONFIGURED` |
| Forbidden service role / DB password / JWT secret | `NOT_CONFIGURED` |

QA 전용 Supabase project와 synthetic user credential이 제공되지 않았으므로 실제 provider 요청은 수행하지 않았다. Production 환경을 추측하거나 임의 credential을 생성하지 않았다.

## Live E2E 결과

실행하지 않은 항목은 통과로 기록하지 않는다.

| 검증 항목 | Live 결과 | 합성/로컬 근거 |
| --- | --- | --- |
| `LOGIN_USER_A` | `NOT_RUN_NOT_CONFIGURED` | synthetic password sign-in `PASSED` |
| `AUTHENTICATED_UNBOUND` | `NOT_RUN_NOT_CONFIGURED` | business access `DENIED` |
| `SESSION_RESTORE` | `NOT_RUN_NOT_CONFIGURED` | restore 및 예외 fail-closed `PASSED_SYNTHETIC` |
| `TOKEN_REFRESH` | `NOT_RUN_NOT_CONFIGURED` | SDK refresh harness `PASSED_SYNTHETIC` |
| `SIGN_OUT_CLEANUP` | `NOT_RUN_NOT_CONFIGURED` | provider 오류 시에도 local cleanup `PASSED_SYNTHETIC` |
| `MULTI_USER_ISOLATION` | `NOT_RUN_NOT_CONFIGURED` | Identity/role/cache isolation `PASSED_SYNTHETIC` |
| Organization scope | `NOT_RUN_NOT_CONFIGURED` | mismatch `DENY` |
| Project scope | `NOT_RUN_NOT_CONFIGURED` | cross-project `DENY` |
| Site scope | `NOT_RUN_NOT_CONFIGURED` | actual provider session 기준 `NOT_RUN_NOT_CONFIGURED` |
| `DISABLED_IDENTITY_FAIL_CLOSED` | `NOT_RUN_NOT_CONFIGURED` | business access `DENIED` |
| `REVOKED_BINDING` | `NOT_RUN_NOT_CONFIGURED` | active binding required, `DENIED` |
| `NETWORK_FAILURE_FAIL_CLOSED` | `NOT_RUN_NOT_CONFIGURED` | synthetic `ECONNRESET` -> `DENIED` |
| Provider exception | `NOT_RUN_NOT_CONFIGURED` | initialize/sign-in/restore/sign-out exception `PASSED_SYNTHETIC` |
| `LIVE_ROLE_CHANGE_IDENTITY_BINDING` | `NOT_RUN_NOT_CONFIGURED` | current session actor binding `PASSED_SYNTHETIC` |
| Forged approver/requester | `NOT_RUN_NOT_CONFIGURED` | forged actor `BLOCKED` |
| Restart persistence | `NOT_RUN_NOT_CONFIGURED` | secure restore design `PASSED_SYNTHETIC` |

## 안정화 수정

- provider 초기화 예외를 safe normalized error로 변환하고 `AUTH_ERROR` 상태로 유지한다.
- sign-in 및 restore adapter 예외 발생 시 ECOREAN session을 제거하고 business access를 차단한다.
- provider sign-out 예외가 발생해도 local ECOREAN session과 current Identity context를 정리한다.
- provider status 조회 예외도 raw 오류 대신 safe error code와 `DENIED` 상태로 반환한다.
- synthetic secret marker가 renderer-safe status, IPC 결과 또는 audit payload에 나타나지 않음을 확인했다.

## Audit 및 보안

- Live auth event audit: `NOT_RUN_NOT_CONFIGURED`
- Synthetic auth audit actor/session binding: `PASSED`
- Audit token/credential/raw provider user redaction: `PASSED`
- Safe provider fingerprint 유지: `PASSED`
- Secure storage OS encryption harness: `PASSED_SYNTHETIC`
- safeStorage unavailable memory-only fallback: `PASSED_SYNTHETIC`
- Plaintext access token persistence: `ABSENT`
- Plaintext refresh token persistence: `ABSENT`
- Token SQLite columns: `ABSENT`
- Renderer token exposure: `ABSENT`
- IPC token exposure: `ABSENT`
- Customer safety: `PASSED_SYNTHETIC_AND_LOCAL`

## 테스트 결과

- Service syntax: `PASSED`
- v0.6.1 focused smoke 10종: `PASSED`
- v0.6.1 live-auth fail-closed smoke: `PASSED_SYNTHETIC`
- v0.6.0 regression 8종: `PASSED`
- v0.5.2 regression 5종: `PASSED`
- v0.5.1 source/RBAC regression 4종: `PASSED`
- v0.5.0 regression 6종: `PASSED`
- Calendar / Real Project Intake / LightBIM regression 4종: `PASSED`
- `v0-5-1-rc-packaged-release.smoke.js`: `NOT_APPLICABLE_CURRENT_PACKAGE`; 현재 app.asar를 역사적 v0.5.1 manifest 크기와 비교하여 중단됨
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`, `107712 ms`, timeout/failed/remaining process 없음
- `npm run smoke:release`: `PASSED`, `106877 ms`

## 이슈 판정

- P0: 없음
- P1: 없음
- P2: provider exception cleanup 경계 1건 발견 및 수정 완료
- P3: QA Supabase project와 synthetic users 미구성으로 실제 Live E2E 전체 미실행
- Known warning: Vite bundle size, Node SQLite experimental API

## 최종 판정

- `LIVE_SUPABASE_AUTH = NOT_RUN_NOT_CONFIGURED`
- Decision: `CONDITIONAL_MERGE_READY`
- Main merge / v0.6.1 tag / package / release: `NOT_PERFORMED`

`v0.6.1 Live Supabase Authentication Integration QA 미실행, CONDITIONAL_MERGE_READY — LIVE_SUPABASE_AUTH NOT_RUN_NOT_CONFIGURED`
