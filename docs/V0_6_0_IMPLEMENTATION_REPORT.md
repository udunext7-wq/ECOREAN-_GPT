# v0.6.0 Identity Core Implementation Report

## 상태

- Branch: `v0.6.0-identity-auth-architecture`
- Base: official `v0.5.2`
- External authentication: `DISABLED`
- Main merge / tag / package / release: `NOT_PERFORMED`

## 구현

- Identity, Employee, Organization Membership
- Session Context와 세션 폐기
- GLOBAL / ORGANIZATION / PROJECT / SITE Role Assignment
- Resource Scope evaluator
- Identity-aware permission evaluator
- Role change immutable Identity binding
- Identity-aware audit event와 audit export gate
- Idempotent v0.5.2 local role migration
- Auth Provider Adapter와 Local Identity Provider
- 사용자 역할 및 권한 센터의 Identity 상태 패널

## 확인 결과

- Identity 상태 및 조직 membership: `PASSED`
- Session active/expired/revoked/unknown: `PASSED`
- Project scope allow/deny: `PASSED`
- Role change self-approval: `BLOCKED`
- Role change apply without administrator permission: `BLOCKED`
- Other-Identity role apply legacy-local-role isolation: `PASSED`
- Disabled Identity approval/export: `BLOCKED`
- Audit actor Identity/Organization/Session: `PASSED`
- Migration idempotency and legacy preservation: `PASSED`
- Customer-safe Identity metadata filtering: `PASSED`
- v0.5.2 / v0.5.1 / v0.5.0 RBAC regressions: `PASSED`
- Calendar / Real Project Intake / LightBIM regressions: `PASSED`
- `build:ui` / `smoke:prod`: `PASSED`
- `smoke:release:diagnose`: `PASSED`, timeout/failed tests 없음
- `smoke:release`: `PASSED`

## 보안 경계

- renderer 역할 claim은 권한 결정 근거가 아니다.
- 권한 평가는 Identity, 유효 세션, 활성 역할 할당, 리소스 범위를 모두 요구한다.
- 외부 provider, credential, token, OAuth/OIDC/SSO는 포함하지 않는다.
- 고객 payload와 출력에는 Identity/Session/Assignment 내부 메타데이터를 노출하지 않는다.

## 판정

`MERGE_READY`. P0/P1/P2 없음. SQLite experimental warning과 Vite bundle size warning만 확인되었다.
