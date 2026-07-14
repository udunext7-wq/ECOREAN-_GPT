# v0.5.2 Final Merge Report

## Summary

- Source branch: `v0.5.2-audit-export-role-change-approval`
- Base official version: `v0.5.1`
- Official v0.5.1 tag target: `4961573340280cc19a749d01e05359e97d700d1d`
- Implementation commit: `ce88ac3f1fa060ca34fbaf51721096cb1bb38f46`
- Merge commit: `7f12c4c711c08bb7e1925abb72ca5175410f7d33`
- Merge conflict: `NO`
- Merge date: `2026-07-14`
- RC tag: `v0.5.2-rc` (targets the final merge documentation commit)

## Role Change Workflow

- Role change request creation: `PASSED`
- State transitions (DRAFT / PENDING / APPROVED / REJECTED / CANCELLED / EXPIRED / APPLIED / FAILED): `PASSED`
- Approval and apply separation: `PASSED`
- Direct role change without approval: `BLOCKED`
- Self-approval prevention: `PASSED`
- Approver permission validation: `PASSED`
- Unknown or missing role: `BLOCKED`
- Stale current-role claim: `BLOCKED`
- Permission additions/removals diff: `PASSED`
- CEO/ADMIN and dangerous-permission risk classification: `PASSED`
- Approve / reject / cancel / expire: `PASSED`
- Apply after approval: `PASSED`
- Apply failure rollback to previous role: `PASSED`
- Duplicate, replay, and terminal-state reprocessing: `BLOCKED`

## Permission Audit Export

- Formats: `JSON`, `CSV`, print-safe `HTML`
- Filters: date, event, role, status, risk, decision
- Filter behavior: `PASSED`
- Export redaction: `PASSED`
- Print-safe HTML: `PASSED`
- `AUDIT_EXPORT_GENERATED` audit event: `PASSED`

## Safety And External Integration

- Customer payload filtering: `PASSED`
- Customer-to-internal transition guard: `PASSED`
- Audit redaction: `PASSED`
- Customer safety regression: `PASSED`
- External authentication/provider: `DISABLED`

## Validation Results

- Service syntax checks: `PASSED` (55 services)
- v0.5.2 smoke suite (5): `PASSED`
- v0.5.1 regression suite: `PASSED`
- v0.5.0 regression suite: `PASSED`
- v0.4.6 visual/output regression: `PASSED`
- RC-0.4.4 calendar/site survey regression: `PASSED`
- Real Project Intake regression: `PASSED`
- LightBIM customer safety and release flow: `PASSED`
- Pre-merge `build:ui`: `PASSED`
- Pre-merge `smoke:prod`: `PASSED`
- Pre-merge `smoke:release:diagnose`: `PASSED` (`152699 ms`)
- Pre-merge `smoke:release`: `PASSED` (`162361 ms`)
- Post-merge `build:ui`: `PASSED`
- Post-merge `smoke:prod`: `PASSED`
- Post-merge `smoke:release:diagnose`: `PASSED` (`249022 ms`)
- Post-merge `smoke:release`: `PASSED` (`164998 ms`)
- Timed-out tests: none
- Failed tests: none
- Remaining processes: none

## Findings

- P0: none
- P1: none
- P2: none
- P3:
  - External multi-user identity binding and approver identity proof remain deferred.
  - Excel native viewer pixel QA remains deferred.
  - OS print dialog automation remains deferred.

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- Node/Electron warning when emitted
- npm update notice when emitted

## Deferred Items

- v0.5.2 RC Desktop Package verification
- v0.5.2 Official Acceptance QA
- GitHub Release and asset only after the official tag
- External multi-user identity binding
- Excel native viewer pixel QA
- OS print dialog automation
- External authentication strategy

## Final Decision

`v0.5.2 Permission Audit Export & Role Change Approval main 반영 완료, MERGE_READY`
