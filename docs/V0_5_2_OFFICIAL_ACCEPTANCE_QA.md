# v0.5.2 Official Acceptance QA

## Summary

- Version: `v0.5.2`
- Acceptance date: `2026-07-26`
- Branch: `main`
- RC tag: `v0.5.2-rc`
- RC target: `6271159b021e3c4a179ec4cb0e0a582e95480b64`
- RC package docs commit: `af6e829e7e48fb7a549ecc3d2a9d9f9f2222f1ca`
- Official `v0.5.1` preserved at `4961573340280cc19a749d01e05359e97d700d1d`
- GitHub Release: `NOT_CREATED`
- Release asset: `NOT_CREATED`
- Final decision: `ACCEPTED_WITH_WARNINGS`

## Package Integrity

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888` bytes
- EXE SHA-256: `91AA0B4F6AC7A3958003622B6DCE64C61E918EB5149E58C7A7C4705CC32A128C`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2866494` bytes
- app.asar SHA-256: `E7A7E204769D2F4A2F305C0D444DD187AAD349393B90E743E926BF636C9E1534`
- RC package manifest comparison: `PASSED`

## Packaged Launch And Click QA

- Actual launch runs: `2`
- Launch result: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit: `NO`
- Not responding: `NO`
- Existing userData files before/after: `346 / 348`
- Missing pre-existing userData files: `0`
- Production userData intentional reset: `NO`
- Remaining packaged processes: `0`
- Actual packaged `역할 / 권한` click: `PASSED`
- `사용자 역할 및 권한 센터`: visible
- `역할 변경 요청`: visible
- `역할 변경 승인 Queue`: visible
- `권한 감사 내보내기`: visible
- `직접 역할 변경 차단`: visible
- Layout inspection: `PASSED`
- Pixel change ratio: `0.5054622715154728`
- Click fixture policy: isolated synthetic userData

## Role Change Security

- Request without approval: `BLOCKED`
- Change before approval: `BLOCKED`
- Self-approval: `BLOCKED`
- Unauthorized approver: `BLOCKED`
- Unknown or missing role: `BLOCKED`
- Rejected, cancelled, or expired request apply: `BLOCKED`
- Completed request reapproval/reapply: `BLOCKED`
- Duplicate and replay processing: `BLOCKED`
- `DRAFT -> PENDING`: `PASSED`
- `PENDING -> APPROVED`: `PASSED`
- `PENDING -> REJECTED`: `PASSED`
- `PENDING -> CANCELLED`: `PASSED`
- `PENDING -> EXPIRED`: `PASSED`
- `APPROVED -> APPLIED`: `PASSED`
- Apply failure to `FAILED`: `PASSED`
- Previous role preserved after apply failure: `PASSED`
- `ROLE_CHANGE_FAILED` audit event: `PASSED`

## Permission Diff And Risk

- Before/requested roles: `PASSED`
- Added/removed permissions: `PASSED`
- High-risk permission identification: `PASSED`
- CEO/ADMIN role risk: `PASSED`
- Customer visibility impact: `PASSED`
- Internal output impact: `PASSED`
- Audit access impact: `PASSED`
- Dangerous permission classification for internal cost, margin, vendor price,
  internal output, audit access, and system settings: `PASSED`

## Permission Audit Export

- JSON: `PASSED`
- CSV: `PASSED`
- Print-safe HTML: `PASSED`
- Date/event/actor role/target role/status/risk/decision filters: `PASSED`
- Required role, permission, output, and audit events: `PASSED`
- `AUDIT_EXPORT_GENERATED` event: `PASSED`
- Raw phone/email/full address/customer memo: absent
- Private staff contact: absent
- Token/credential/provider payload/coordinates: absent
- Absolute path/runtime DB path: absent
- Export redaction: `PASSED`

## Customer Safety

Customer-facing and unauthorized-role payloads were checked for internal and
sensitive data.

- Internal cost/vendor price/labor cost: `BLOCKED`
- Margin/profit/PCE/recommendation scoring: `BLOCKED`
- Queue/internal action/internal notification/internal memo: `BLOCKED`
- Audit raw entry/approval internal details/reviewer private data: `BLOCKED`
- Raw phone/email/address and provider payload/coordinates/path: `BLOCKED`
- Runtime DB path/token/credential: `BLOCKED`
- Customer safety result: `PASSED`
- External authentication/provider: `DISABLED`

## Regression, Build, And Smoke

- Electron service syntax, 55 files: `PASSED`
- v0.5.2 approval/export/customer-safety suite: `PASSED`
- v0.5.1 RBAC UX/audit/access-denied regression: `PASSED`
- v0.5.0 roles/customer-data/route/output guards: `PASSED`
- v0.4.6 packaged click/safe screenshot/output typography: `PASSED`
- RC-0.4.4 calendar/site survey sync: `PASSED`
- Real Project Intake: `PASSED`
- LightBIM customer safety and release flow: `PASSED`
- `npm run build:ui`: `PASSED`
- `npm run smoke:prod`: `PASSED`
- `npm run smoke:release:diagnose`: `PASSED`, `143566 ms`
- `npm run smoke:release`: `PASSED`, `185748 ms`
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
- electron-builder package description/author metadata warning
- Node DEP0190 warning when packaging is run
- npm update notice when emitted

## Deferred Items

- External multi-user identity binding and approver identity proof
- Excel native viewer pixel QA
- OS print dialog automation
- External authentication strategy
- GitHub Release and ZIP asset publication

## Release Decision

`v0.5.2 ACCEPTED WITH WARNINGS`

No P0/P1/P2 release blocker was found. The official annotated `v0.5.2` tag may
be created on the acceptance documentation commit after `main` is pushed and
confirmed synchronized. GitHub Release creation and asset upload remain
intentionally deferred to a separate publication step.
