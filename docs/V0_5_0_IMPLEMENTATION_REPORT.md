# v0.5.0 User Roles & Permissions Implementation Report

## 기준선

- Base branch: `main`
- Base tag: `v0.4.6`
- Feature branch: `v0.5.0-user-roles-permissions`
- External authentication: `DISABLED`

## 구현

- 7개 운영 역할과 28개 permission key
- SQLite 기반 역할, 권한, 로컬 활성 역할
- default-deny evaluator와 assert API
- 권한 허용/차단 및 역할 변경 감사 로그
- 감사 payload 개인정보 redaction
- route guard, menu gate, access denied 화면
- 대시보드 역할 배지와 사용자 역할 및 권한 센터
- 고객 역할 데이터 sanitizer
- customer/internal output permission guard
- Electron IPC, preload, UI type 연결

## 호환성

기존 `sqliteService.assertUserPermission` 대문자 권한 계약은 유지한다.
v0.5.0 점 표기 권한은 새 서비스 계층에서 평가하여 기존 운영 흐름을 깨뜨리지 않는다.

## 안전성

- Unknown role/permission: `DENIED`
- Customer internal data exposure: `BLOCKED`
- Customer output without generate permission: `BLOCKED`
- Internal output without generate permission: `BLOCKED`
- Raw phone/email/detailed address in audit payload: `REDACTED`

## 검증 결과

- Syntax: `PASSED`
- v0.5.0 role matrix smoke: `PASSED`
- Customer data guard: `PASSED`
- Route/menu guard: `PASSED`
- Output guard: `PASSED`
- Branch stabilization: `MERGE_READY`
- Customer safety regression: `PASSED`
- v0.4.6 / v0.4.5 / RC-0.4.4 regression: `PASSED`
- Electron `build:ui`: `PASSED`
- Electron `smoke:prod`: `PASSED`
- Electron `smoke:release:diagnose`: `PASSED`
- Electron `smoke:release`: `PASSED`

Known warnings:

- Vite bundle size warning
- SQLite experimental API warning

## 판정

`MERGE_READY`

v0.5.0 User Roles & Permissions는 feature branch에 커밋/푸시 가능한 상태다.
