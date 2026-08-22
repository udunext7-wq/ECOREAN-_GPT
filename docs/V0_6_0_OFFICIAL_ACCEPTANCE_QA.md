# v0.6.0 Official Acceptance QA

## Summary

- Version: `v0.6.0`
- Acceptance date: `2026-08-23`
- Branch: `main`
- RC tag: `v0.6.0-rc`
- RC target: `0d25a066e027d2b0ec7fdb58a200a02212e4066d`
- Package docs commit: `745de39d3b2694ea05ae09e1b8da361acaebd5f3`
- Implementation commit: `743eb51e48b216efa0addc1fbc27b4e98105c611`
- Merge commit: `bab29ee4c68dc7881a32680d7483d619ac5eb42a`
- Official `v0.5.2` preserved at `d301f0b87e1ad2122d2bb7fa56cfbaa324af58bb`
- GitHub Release: `NOT_CREATED`
- Windows release asset: `NOT_CREATED`
- Final decision: `ACCEPTED_WITH_WARNINGS`

## Package Integrity

- EXE: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `E952B620DF29A2205E6BD9912E72422A368035373FC1538AD046F1599561D348`
- app.asar: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2923048` bytes
- app.asar SHA-256: `49132B5448819264247D51FE5A24A5797CFB74F66917B679684AA8D9CDE1848F`
- RC manifest comparison: `PASSED`
- Package rebuild during Acceptance: `NOT_PERFORMED`

## Actual Launch And Persistence

- Actual launch 1: `PASSED`
- Actual launch 2: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Responsive: `PASSED`
- Graceful close: `PASSED`
- Dev server required: `NO`
- White screen or renderer fatal crash: `NONE`
- Remaining packaged processes: `0`
- Stable userData files before/after: `346 / 346`
- Missing stable pre-existing files: `0`
- Added files in stable comparison: `0`
- Production reset or deletion: `NOT_PERFORMED`

An initial observer run used a hidden window and could not read the native window
title. A subsequent visible two-run check passed. One intermediate count changed
from `347` to `346` after the observer cleanup; the stable rerun was `346 / 346`
with no path difference, so this was classified as transient runtime-file cleanup,
not operational data loss.

## Migration And Local Provider

- Production DB verification mode: read-only
- Deterministic local Identity: `IDN-LOCAL-ECOREAN-OWNER`, one record, `ACTIVE`
- Local provider: `LOCAL`
- RoleAssignment: `RASN-LOCAL-ECOREAN`, one record, `CEO / GLOBAL / ACTIVE`
- Organization membership: one record
- Schema version: `v0.6.0-identity-core-1`, one record
- Local Session: `SES-LOCAL-ECOREAN`, `ACTIVE / LOCAL`
- Existing role and project/customer/estimate data preservation: `PASSED`
- Migration idempotency: `PASSED`
- Duplicate Identity: `NONE`
- Duplicate RoleAssignment: `NONE`
- Runtime DB reset: `NOT_PERFORMED`
- LocalIdentityProvider restore: `PASSED`
- AuthProviderAdapter: `PASSED`
- Permission decision owner: Authorization evaluator, not LocalIdentityProvider
- External provider: `DISABLED / NOT_IMPLEMENTED`
- OAuth/OIDC or external credential/token storage: `NOT_IMPLEMENTED / NONE`

## Identity, Session, Assignment, And Scope

- ACTIVE Identity: normal evaluation `PASSED`
- SUSPENDED / DISABLED / ARCHIVED Identity: `DENY`
- UNKNOWN / MISSING Identity: `DENY`
- Disabled Identity with an existing Session: `DENY`
- Identity lookup/evaluator exception: `BLOCKED_NEVER_ALLOW`
- ACTIVE Session: normal evaluation `PASSED`
- EXPIRED / REVOKED / INVALID / missing Session: `DENY`
- Session restore failure: fail-closed
- Missing / revoked / expired RoleAssignment: `DENY`
- Organization mismatch: `DENY`
- Project mismatch: `DENY`
- Site mismatch: `DENY`
- Missing required resource scope: `DENY`
- Same-project permission evaluation: `ALLOW` only when permission exists
- Malformed or exceptional authorization context: `DENY`
- Renderer authorization bypass: `BLOCKED`

## Role Change Identity Binding

- requesterIdentityId / targetIdentityId: `PASSED`
- reviewedByIdentityId / approvedByIdentityId / appliedByIdentityId: `PASSED`
- Self-approval: `BLOCKED`
- Disabled or unauthorized approver: `BLOCKED`
- Expired approver assignment: `BLOCKED`
- Scope-mismatch approver: `BLOCKED`
- Apply before approval: `BLOCKED`
- Duplicate/replay and completed-request reapply: `BLOCKED`
- Apply after authorized approval: `PASSED`
- Apply failure preserves the previous role: `PASSED`
- Failed apply audit event: `PASSED`

## Audit And Customer Safety

- Actor Identity, role, organization, Session, and resource context: `PASSED`
- Password/token/refresh token/authorization header/secret: absent
- Provider raw payload and private contact/address/memo: absent
- Absolute path and runtime DB path: absent from customer/audit output
- Audit redaction: `PASSED`
- CLIENT_VIEWER and unauthorized Identity internal-data filtering: `PASSED`
- Internal cost, vendor/labor price, margin, profit, PCE, score, queue, approval
  internals, audit raw entry, raw contact/address, coordinates, token, credential,
  provider payload, and filesystem path: `HIDDEN`
- Customer Safety: `PASSED`

## Packaged UI Acceptance

- Actual packaged `역할 / 권한` navigation event: `PASSED`
- Identity Summary: visible
- Session / Identity Status: visible
- Role Assignment: visible
- Role Change Approval Queue: visible
- Permission Audit Viewer: visible
- Audit permission action: actual CDP click `PASSED`
- External provider disabled notice: visible
- Layout inspection: `PASSED`
- Pixel change ratio: `0.5478377741446099`
- Capture scope: app viewport only
- Fixture: isolated synthetic userData
- Production screenshot or full desktop capture: `NOT_PERFORMED`
- Safe Korean access-denied reason: `PASSED`

## Regression, Build, And Smoke

- Electron service syntax: `PASSED`
- v0.6.0 packaged/Identity/Session/scope/approval/audit/migration/customer suite: `PASSED`
- v0.5.2 approval/export/customer suite: `PASSED`
- v0.5.1 RBAC UX/audit/access-denied suite: `PASSED`
- v0.5.0 role/customer/route/output guard suite: `PASSED`
- RC-0.4.4 calendar/site survey sync: `PASSED`
- Real Project Intake: `PASSED`
- LightBIM Customer Safety and release flow: `PASSED`
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`, `219833 ms`
- `npm run smoke:release`: `PASSED`, `192192 ms`
- Timed-out tests: none
- Failed tests: none
- Remaining child processes: none
- `npm run dist`: `NOT_PERFORMED` by Acceptance rule

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - External authentication provider and OAuth/OIDC integration remain deferred.
  - External multi-user synchronization remains deferred.
  - Excel native viewer pixel QA remains deferred.
  - OS print dialog automation remains deferred.

## Known Warnings

- Vite bundle/chunk size warning
- Node SQLite experimental API warning
- electron-builder package description/author metadata warning from packaging stage
- Node DEP0190 warning when packaging is run
- npm update notice when emitted

## Release Decision

`v0.6.0 ACCEPTED WITH WARNINGS`

No P0/P1/P2 release blocker was found. The official annotated `v0.6.0` tag
may be created on the Acceptance documentation commit after `main` is pushed
and confirmed synchronized. GitHub Release creation and Windows ZIP upload are
intentionally deferred to a separate publication task.
