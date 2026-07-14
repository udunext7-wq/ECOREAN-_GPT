# v0.5.2 Implementation Report

## Summary

- Date: `2026-07-14`
- Branch: `v0.5.2-audit-export-role-change-approval`
- Base official version: `v0.5.1`
- Base official tag target: `4961573340280cc19a749d01e05359e97d700d1d`
- Scope: Permission Audit Export and Role Change Approval Workflow
- External authentication/provider: `DISABLED`
- Final decision: `MERGE_READY`

## Role Change Workflow

- Draft request: `PASSED`
- Request submission: `PASSED`
- Active-role/current-role consistency: `PASSED`
- Permission additions/removals diff: `PASSED`
- Dangerous permission classification: `PASSED`
- High-risk CEO/ADMIN classification: `PASSED`
- Authorized approval: `PASSED`
- Self-approval prevention: `PASSED`
- Unauthorized approver prevention: `PASSED`
- Rejection: `PASSED`
- Cancellation: `PASSED`
- Expiration: `PASSED`
- Completed request duplicate processing prevention: `PASSED`
- Approval without apply leaves current role unchanged: `PASSED`
- Explicit apply after approval: `PASSED`
- Apply failure preserves previous role: `PASSED`
- Direct renderer role-change IPC: `BLOCKED`
- Customer-to-internal transition safety check: `PASSED`

## Permission Audit Export

- JSON: `PASSED`
- CSV: `PASSED`
- Print-safe HTML: `PASSED`
- In-app preview: `PASSED`
- User-initiated file save: `PASSED`
- Date/event/actor-role/target-role/status/risk/decision filters: `PASSED`
- `AUDIT_EXPORT_GENERATED` event: `PASSED`
- Export redaction: `PASSED`

Redaction covers raw phone/email, detailed/full address, customer memo, token/credential, provider payload, coordinates, absolute/runtime DB paths, and private staff contacts.

## Customer Safety

- Internal cost, margin, PCE, vendor price, and approval Queue filtering: `PASSED`
- Role-change request and permission-diff filtering: `PASSED`
- Permission audit and approver metadata filtering: `PASSED`
- Customer safety regression: `PASSED`

## Validation

- Service syntax and main/preload syntax: `PASSED`
- Five v0.5.2 smoke tests: `PASSED`
- v0.5.1 RBAC UX and packaged regressions: `PASSED`
- v0.5.0 RBAC and output guard regressions: `PASSED`
- v0.4.6 visual/output QA regressions: `PASSED`
- RC-0.4.4 calendar/site survey regression: `PASSED`
- Real Project Intake regression: `PASSED`
- LightBIM customer safety and release flow: `PASSED`
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`, no timeout, no remaining process
- `npm run smoke:release`: `PASSED`, no timeout

## Findings

- P0: none
- P1: none
- P2: none
- P3: external multi-user identity binding and role-change approval identity proof remain deferred to the external authentication strategy; Excel native viewer pixel QA and OS print dialog automation remain deferred from v0.5.1.

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- npm update notice when shown

## Implementation Note

The v0.5.1 packaged smoke originally asserted that official `v0.5.1` did not exist. Since the official tag and GitHub Release are now published, the regression was updated to verify the preserved official target while keeping the historical RC manifest unchanged.

## Decision

`v0.5.2 Permission Audit Export & Role Change Approval implementation pushed, MERGE_READY`
