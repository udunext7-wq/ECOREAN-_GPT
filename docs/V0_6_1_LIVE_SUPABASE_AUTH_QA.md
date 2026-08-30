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

## 초기 QA 환경 감지 (2026-08-25)

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

## 초기 Live E2E 결과 (2026-08-25)

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

## GPTBOC QA 환경 연결 재검증 (2026-08-27)

값을 문서나 로그에 기록하지 않고 GPTBOC Supabase QA project 구성과 provider 초기화를 다시 검증했다.

| 항목 | 결과 |
| --- | --- |
| Organization / Project | `Ecorean / GPTBOC` |
| Project ref | `itmsgcewseihwxpvoiey` |
| Region | `ap-northeast-2` |
| Project status | `ACTIVE_HEALTHY` |
| API URL | `CONFIGURED`, `https://itmsgcewseihwxpvoiey.supabase.co` |
| Publishable key | `CONFIGURED`, modern publishable format, value `NOT_RECORDED` |
| Auth mode | `SUPABASE` |
| Provider validation | `PASSED` |
| Provider initialization | `READY` |
| Auth endpoint reachability | `PASSED`, HTTP `200` |
| Public tables / migrations | `0 / 0`, no schema changes performed |
| Service role / DB password / JWT secret | `NOT_CONFIGURED_NOT_USED` |
| Previous BOC project isolation | `PASSED`, previous project not used or modified |
| `auth.users` aggregate count | `0`, no email or raw user data read |
| `QA_USER_A` | `NOT_CONFIGURED` |
| `QA_USER_B` | `NOT_CONFIGURED` |
| `QA_USER_UNBOUND` | `NOT_CONFIGURED` |

환경값은 QA 명령의 process scope에만 주입했다. Repository `.env` 파일, credential 파일, userData, SQLite, audit payload에는 publishable key를 저장하지 않았다.

### GPTBOC Live E2E 상태

QA Auth User가 없으므로 provider 실로그인이나 live session 생성은 수행하지 않았다. 연결 및 provider 준비 상태와 합성 fail-closed 회귀를 구분해 기록한다.

| 검증 항목 | GPTBOC Live 결과 | 합성/로컬 근거 |
| --- | --- | --- |
| `LOGIN_USER_A` | `BLOCKED_BY_QA_USER_SETUP` | password sign-in flow `PASSED_SYNTHETIC` |
| `AUTHENTICATED_UNBOUND` | `BLOCKED_BY_QA_USER_SETUP` | unbound business access `DENIED_SYNTHETIC` |
| `SESSION_RESTORE` | `BLOCKED_BY_QA_USER_SETUP` | secure restore/exception fail-closed `PASSED_SYNTHETIC` |
| `TOKEN_REFRESH` | `BLOCKED_BY_QA_USER_SETUP` | context reevaluation `PASSED_SYNTHETIC` |
| `SIGN_OUT_CLEANUP` | `BLOCKED_BY_QA_USER_SETUP` | local cleanup `PASSED_SYNTHETIC` |
| `MULTI_USER_ISOLATION` | `BLOCKED_BY_QA_USER_SETUP` | identity/role/cache isolation `PASSED_SYNTHETIC` |
| Organization / Project / Site scope | `BLOCKED_BY_QA_USER_SETUP` | mismatch deny rules `PASSED_SYNTHETIC` |
| `DISABLED_IDENTITY_FAIL_CLOSED` | `BLOCKED_BY_QA_USER_SETUP` | business access `DENIED_SYNTHETIC` |
| `REVOKED_BINDING` | `BLOCKED_BY_QA_USER_SETUP` | active binding required `DENIED_SYNTHETIC` |
| `NETWORK_FAILURE_FAIL_CLOSED` | `NOT_RUN_LIVE` | synthetic network failure `DENIED_SYNTHETIC` |
| `LIVE_ROLE_CHANGE_IDENTITY_BINDING` | `BLOCKED_BY_QA_USER_SETUP` | actor binding reevaluation `PASSED_SYNTHETIC` |
| Restart persistence | `BLOCKED_BY_QA_USER_SETUP` | no live session token created |

### GPTBOC Focused QA

- `v0-6-1-live-auth-fail-closed.smoke.js`: `PASSED`; configuration `CONFIGURED`, Live auth `NOT_RUN_MISSING_SYNTHETIC_USER_INPUTS`
- `v0-6-1-auth-audit-redaction.smoke.js`: `PASSED`; credential/token/raw provider user `REDACTED`
- `v0-6-1-customer-safety.smoke.js`: `PASSED`; auth/internal/personal metadata `HIDDEN`
- Provider exception / restore exception fail-closed: `PASSED_SYNTHETIC`
- Sign-out local cleanup: `PASSED_SYNTHETIC`
- Secret marker leak: `ABSENT`
- Full historical regression/build suite: not repeated because no code or runtime configuration loader changed

## 초기 안정화 수정 (2026-08-25)

- provider 초기화 예외를 safe normalized error로 변환하고 `AUTH_ERROR` 상태로 유지한다.
- sign-in 및 restore adapter 예외 발생 시 ECOREAN session을 제거하고 business access를 차단한다.
- provider sign-out 예외가 발생해도 local ECOREAN session과 current Identity context를 정리한다.
- provider status 조회 예외도 raw 오류 대신 safe error code와 `DENIED` 상태로 반환한다.
- synthetic secret marker가 renderer-safe status, IPC 결과 또는 audit payload에 나타나지 않음을 확인했다.

## 초기 Audit 및 보안 (2026-08-25)

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

## 초기 테스트 결과 (2026-08-25)

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

## 초기 이슈 판정 (2026-08-25)

- P0: 없음
- P1: 없음
- P2: provider exception cleanup 경계 1건 발견 및 수정 완료
- P3: QA Supabase project와 synthetic users 미구성으로 실제 Live E2E 전체 미실행
- Known warning: Vite bundle size, Node SQLite experimental API

## QA Credential 설정 및 Public Signup (2026-08-30)

- Previous HEAD: `8934bb48c9c55d57d23b0cc5f4d194b3942f0b2b`
- Branch: `v0.6.1-supabase-auth-multi-user-binding`; precheck local/origin `0/0`, working tree clean
- GPTBOC: `itmsgcewseihwxpvoiey`, `ap-northeast-2`, `ACTIVE_HEALTHY`
- SDK: installed `@supabase/supabase-js 2.112.4`
- Signup time: `2026-08-30T07:28:54Z` (KST `16:28:54`)
- Actual method: public `createClient(...).auth.signUp(...)`; each supplied QA email attempted once
- Auth settings: email enabled, signup enabled, email auto-confirm disabled
- Admin/service-role API, direct Auth SQL writes, schema changes, previous BOC project use: `NOT_PERFORMED`

### Local Environment 보안

애플리케이션은 environment file을 자동으로 읽지 않고 `process.env`를 사용한다. 이번 QA는 기존 ignore 대상인 root `.env` 하나를 만들고 Node의 `--env-file=.env`로 명시적으로 로드했다. 애플리케이션 로더나 운영 기본 인증 모드는 변경하지 않았다.

- `ECOREAN_AUTH_MODE = SUPABASE`, URL / modern publishable key / three QA credential pairs: `CONFIGURED`
- 각 비밀번호: 로컬 CSPRNG로 생성, 서로 다른 32자, 대문자/소문자/숫자/특수문자 포함
- `.env`: Git ignored / untracked-in-index 검증 완료; 값은 문서, console, audit, Git에 기록하지 않음
- `.env` ACL: 상속 제거, 실제 workspace 소유자 / SYSTEM / 로컬 Codex sandbox 실행 계정으로 제한
- Service role / database password / Postgres password / JWT secret: `NOT_CONFIGURED_NOT_USED`
- 임시 credential-free 실행기와 redacted 결과는 ignored `qa-output/`에만 보관하며 커밋하지 않음
- Signup client: session persistence / auto refresh / URL session detection disabled
- Bulk signup 실행기는 기존 결과가 있으면 재실행 차단; A/B signup이나 resend를 반복하지 않음

### 계정별 실제 결과

| 항목 | Signup | Auth DB 존재 수 | 이메일 확인 | 실제 Password Login |
| --- | --- | --- | --- | --- |
| `QA_USER_A` | `CREATED_CONFIRMATION_REQUIRED` | `1` | `REQUIRED`, 확인 수 `0` | `NOT_RUN` |
| `QA_USER_B` | `CREATED_CONFIRMATION_REQUIRED` | `1` | `REQUIRED`, 확인 수 `0` | `NOT_RUN` |
| `QA_USER_UNBOUND` | `FAILED`, HTTP `429`, `over_email_send_rate_limit` | `0` | `NOT_VERIFIED` | `NOT_RUN` |

- Auth users total: `2`; supplied QA accounts distinct count: `2`
- Gmail alias A/B: 서로 다른 Auth users임을 읽기 전용 aggregate query로 확인, UUID/email 원문은 결과에 출력하지 않음
- `GMAIL_ALIAS_DISTINCT_USERS = NOT_ESTABLISHED_FOR_ALL_THREE`; 두 계정 분리는 확인됐지만 세 계정 전체 통과로 판정하지 않음
- Alias collision / unique constraint error: `NOT_OBSERVED`; UNBOUND 실패 원인은 alias 충돌이 아니라 email-send rate limit
- Supabase Auth 기본 email provider는 project-wide 시간당 2회 발송 제한을 문서화한다. 이번 429는 해당 제한과 일치하지만 project 관리 설정을 수정하거나 우회하지 않았다. [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- 확인 메일의 inbox 도착이나 사용자의 확인 완료는 검증하지 않았다. 기존 A/B에 다시 가입 요청을 보내거나 임의 확인 처리를 하지 않았다.

### Live E2E 결과와 미검증 범위

| 항목 | 이번 Live 결과 |
| --- | --- |
| `LOGIN_USER_A`, `AUTHENTICATED_UNBOUND` | `NOT_RUN`, email confirmation 및 UNBOUND 생성 대기 |
| Identity fixture / ExternalIdentityBinding | `NOT_CREATED`; UNBOUND binding 없음 |
| `SESSION_RESTORE`, `TOKEN_REFRESH`, `SIGN_OUT_CLEANUP` | `NOT_RUN` |
| `MULTI_USER_ISOLATION`, cross-user leakage | `NOT_RUN` |
| Organization / Project / Site scope | `NOT_RUN` |
| `DISABLED_IDENTITY_FAIL_CLOSED`, `REVOKED_BINDING_FAIL_CLOSED` | `NOT_RUN` |
| `NETWORK_FAILURE_FAIL_CLOSED` in authenticated context | `NOT_RUN` |
| `LIVE_ROLE_CHANGE_IDENTITY_BINDING`, forged/self/unauthorized approver | `NOT_RUN` |
| `SECURE_SESSION_STORAGE_LIVE` | `NOT_RUN`; no live provider session returned |
| Live token leakage across renderer / IPC / audit / logs / business DB / exports | `NOT_TESTED_NO_LIVE_TOKEN`; 통과로 판정하지 않음 |
| Signup result / document / staged diff credential exposure | `ABSENT` |
| `CUSTOMER_SAFETY` | `PASSED_SYNTHETIC`; 실제 authenticated QA context 검증은 `NOT_RUN` |

### Focused Regression 재실행

다음 10개는 실제 QA credential을 전달하지 않은 합성/소스 검증이며 모두 exit `0`으로 통과했다.

- `v0-6-1-auth-provider-adapter.smoke.js`: `PASSED`
- `v0-6-1-supabase-auth-provider.smoke.js`: `PASSED`
- `v0-6-1-external-identity-binding.smoke.js`: `PASSED`
- `v0-6-1-auth-session.smoke.js`: `PASSED`
- `v0-6-1-multi-user-switch.smoke.js`: `PASSED`
- `v0-6-1-role-change-auth-binding.smoke.js`: `PASSED`
- `v0-6-1-auth-audit-redaction.smoke.js`: `PASSED`
- `v0-6-1-customer-safety.smoke.js`: `PASSED`
- `v0-6-1-migration.smoke.js`: `PASSED`
- `v0-6-1-branch-stabilization.smoke.js`: `PASSED`; 이 source smoke의 고정 `NOT_RUN_NOT_CONFIGURED` 출력은 실제 Live 상태 근거로 사용하지 않음
- Temporary signup harness syntax: `PASSED`
- Application/source changes: `NONE`; full historical regression / build / dist: `NOT_RERUN`
- Known warning observed: Node SQLite experimental API

### 실패 및 다음 조치

- P0/P1: 이번 실행에서 새 결함 발견 없음. 전체 Live 보안 검증이 완료됐다는 의미는 아님.
- P2: 이번 실행에서 새 application 결함 발견 없음.
- P3 / external setup blockers: A/B email confirmation 미완료, UNBOUND email-send rate limit으로 미생성.
- `git rev-parse HEAD v0.6.0^{}`: unquoted braces의 PowerShell 해석으로 실패. `git rev-list -n 1 'v0.6.0'`로 재검증해 기존 target 보존 확인.
- Node signup startup 2회: `.env: not found`; sandbox 전용 ACL 때문에 승인 실행 계정의 접근 불가. API 호출 전에 중단됨.
- `Set-Acl` 권한 보정: `SeSecurityPrivilege` 오류. 파일 하나에 대해 `icacls`로 workspace 소유자 권한을 추가하고 승인 실행의 env 검증 통과 후 public signup 실행.
- 실제 UNBOUND signup: `429 over_email_send_rate_limit`. 자동 재시도, rate limit 변경, confirmation 우회 없음.
- 다음: 이미 생성된 A/B 메일을 각각 확인한다. 발송 제한 해제 후 기존 `.env` credential을 유지한 채 **UNBOUND만** public signup으로 생성하고 세 계정의 confirmation 상태를 확인한다.
- A/B 재가입 또는 자동 resend 금지. 세 계정 확인 완료 후 기존 절차의 전체 Live E2E를 수행한다.

## 최종 판정

- `GPTBOC_CONFIGURATION = PASSED`
- `LIVE_PROVIDER_INITIALIZATION = PASSED`
- `QA_CREDENTIALS = CONFIGURED_IGNORED_LOCAL_ENV`
- `QA_AUTH_USERS = PARTIALLY_CREATED_2_OF_3`
- `QA_USER_CREATION = BLOCKED_BY_AUTH_EMAIL_RATE_LIMIT`
- `LIVE_SUPABASE_AUTH = BLOCKED_BY_EMAIL_CONFIRMATION`
- Additional blocker: `QA_USER_UNBOUND` must still be created after the provider email-send limit clears
- Decision: `CONDITIONAL_MERGE_READY`
- Main merge / v0.6.1 tag / package / release: `NOT_PERFORMED`

`v0.6.1 GPTBOC QA A/B 생성 완료, 이메일 확인 및 UNBOUND 발송 제한 해제 대기, CONDITIONAL_MERGE_READY`
