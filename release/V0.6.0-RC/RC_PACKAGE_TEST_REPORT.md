# v0.6.0 RC Desktop Package Test Report

## Package Baseline

- Test date: `2026-08-19`
- Branch: `main`
- RC tag/target: `v0.6.0-rc` / `0d25a066e027d2b0ec7fdb58a200a02212e4066d`
- Implementation commit: `743eb51e48b216efa0addc1fbc27b4e98105c611`
- Merge commit: `bab29ee4c68dc7881a32680d7483d619ac5eb42a`
- Official base: `v0.5.2` / `d301f0b87e1ad2122d2bb7fa56cfbaa324af58bb`

## Artifact Integrity

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `E952B620DF29A2205E6BD9912E72422A368035373FC1538AD046F1599561D348`
- app.asar size: `2923048` bytes
- app.asar SHA-256: `49132B5448819264247D51FE5A24A5797CFB74F66917B679684AA8D9CDE1848F`
- v0.6.0 services and renderer markers in app.asar: `PASSED`

## Actual Launch And Data Preservation

- Actual launch run 1: `PASSED`
- Actual launch run 2: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit / not responding / fatal crash: `NONE`
- Graceful close and remaining process after each run: `PASSED / 0`
- userData files before/after: `346 / 346`
- Missing pre-existing files: `NONE`
- Existing userData reset or deletion: `NONE`

## Identity And Migration

- Default local Identity: one `ACTIVE` `LOCAL` record
- Existing `CEO` role preservation and GLOBAL RoleAssignment: `PASSED`
- Organization membership and schema version recording: `PASSED`
- Two-run migration idempotency: `PASSED`
- Duplicate Identity / RoleAssignment: `NONE`
- LocalIdentityProvider Identity/Session/RoleAssignment restore: `PASSED`
- External provider: `DISABLED / NOT_IMPLEMENTED`

## Security Acceptance

- SUSPENDED / DISABLED / ARCHIVED / UNKNOWN / MISSING Identity: `DENY`
- EXPIRED / REVOKED / INVALID Session: `DENY`
- Missing / revoked / expired RoleAssignment: `DENY`
- Organization / Project / Site mismatch and missing scope: `DENY`
- Authorization exception: blocked, never converted to `ALLOW`
- Role Change Identity binding: `PASSED`
- Self approval, disabled/unauthorized/expired/scope-mismatch approver: `BLOCKED`
- Apply before approval: `BLOCKED`
- Apply after approval and failure rollback/audit: `PASSED`
- Audit Actor Identity and redaction: `PASSED`
- Customer Safety: `PASSED`

## Packaged UI

- Actual packaged `역할 / 권한` click: `PASSED`
- Identity Summary / Session Status / Role Assignment: `PASSED`
- Role Change Approval / Permission Audit Viewer: `PASSED`
- Layout inspection: `PASSED`
- Pixel change ratio: `0.5475152077533766`
- Capture scope: synthetic userData, application viewport only
- Production screenshot / full desktop capture: `NOT_PERFORMED / REJECTED`

## Build And Regression

- v0.6.0, v0.5.2, v0.5.1, v0.5.0, core operational regressions: `PASSED`
- `build:ui`, `smoke:prod`, `smoke:release:diagnose`, `smoke:release`, `dist`: `PASSED`
- Timed-out tests / failed child processes / remaining processes: `0 / 0 / 0`
- P0/P1/P2: `NONE`
- P3: external provider, multi-user sync, Excel native pixel QA, OS print automation

Known non-blocking warnings are Vite bundle size, SQLite experimental API, missing electron-builder package metadata, and Node DEP0190.

## Final Decision

`v0.6.0 RC Desktop Package 검증 완료`
