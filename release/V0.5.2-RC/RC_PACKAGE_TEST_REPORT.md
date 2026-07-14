# v0.5.2 RC Package Test Report

## Summary

- Version: `v0.5.2-rc`
- Branch: `main`
- RC tag target: `6271159b021e3c4a179ec4cb0e0a582e95480b64`
- Base official version: `v0.5.1`
- Official v0.5.1 target: `4961573340280cc19a749d01e05359e97d700d1d`
- Implementation commit: `ce88ac3f1fa060ca34fbaf51721096cb1bb38f46`
- Merge commit: `7f12c4c711c08bb7e1925abb72ca5175410f7d33`
- Test date: `2026-07-14`
- Final decision: `v0.5.2 RC Desktop Package 검증 완료`

## Package Integrity

- EXE path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`
- EXE size: `210149888`
- EXE SHA-256: `91AA0B4F6AC7A3958003622B6DCE64C61E918EB5149E58C7A7C4705CC32A128C`
- app.asar path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\resources\app.asar`
- app.asar size: `2866494`
- app.asar SHA-256: `E7A7E204769D2F4A2F305C0D444DD187AAD349393B90E743E926BF636C9E1534`

## Build Metrics

- `build:ui`: `PASSED`, `5970 ms`
- `smoke:prod`: `PASSED`, `7530 ms`
- `smoke:release:diagnose`: `PASSED`, `131325 ms`
- `smoke:release`: `PASSED`, `162299 ms`
- `npm run dist`: `PASSED`, `16615 ms`

## Actual Packaged Launch

- Launch runs: `2`
- Launch result: `PASSED`
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: `NO`
- Immediate exit / not responding: `NO`
- Restart persistence: `PASSED`
- Existing userData files before/after: `346 / 346`
- Missing existing files: none
- Production userData intentional reset: `NO`
- Remaining process: `0`

## Packaged UI And Archive Verification

- Actual packaged `역할 / 권한` click: `PASSED`
- `사용자 역할 및 권한 센터` visibility: `PASSED`
- `역할 변경 요청` visibility: `PASSED`
- `역할 변경 승인 Queue` visibility: `PASSED`
- `권한 감사 내보내기` visibility: `PASSED`
- Direct role change blocked display: `PASSED`
- Layout: `PASSED`
- Pixel change ratio: `0.5054622715154728`
- app.asar role approval service markers: `PASSED`
- app.asar audit export service markers: `PASSED`
- app.asar renderer Korean UI markers: `PASSED`
- Fixture policy: isolated synthetic userData, no real customer or employee data

## Role Change Workflow

- Request creation and reason: `PASSED`
- Current/requested role: `PASSED`
- Eight state transitions: `PASSED`
- Approval and apply separation: `PASSED`
- Self-approval prevention: `PASSED`
- Approver permission validation: `PASSED`
- Unknown/missing role: `BLOCKED`
- Permission additions/removals diff: `PASSED`
- High-risk role/permission classification: `PASSED`
- Approve/reject/cancel/expire: `PASSED`
- Approved apply: `PASSED`
- Rejected/cancelled/expired apply: `BLOCKED`
- Apply failure rollback: `PASSED`
- `ROLE_CHANGE_FAILED` audit: `PASSED`
- Duplicate/replay/terminal-state processing: `BLOCKED`

## Permission Audit Export

- JSON / CSV / Print-safe HTML: `PASSED`
- Date/event/actor role/target role/status/risk/decision filters: `PASSED`
- `AUDIT_EXPORT_GENERATED` audit event: `PASSED`
- Export redaction: `PASSED`
- Raw phone/email/address/memo: absent
- Token/credential/provider payload/coordinates: absent
- Absolute file path/runtime DB path/private staff contact: absent

## Customer Safety

- `CLIENT_VIEWER` guard: `PASSED`
- Unauthorized role guard: `PASSED`
- Internal cost/vendor/labor/margin/profit/PCE: hidden
- Queue/scoring/internal action/audit raw entry: hidden
- Approval reason/reviewer private data/raw contact: hidden
- Provider payload/coordinates/path/token: hidden
- Customer safety regression: `PASSED`
- External auth/provider: `DISABLED`

## Regression

- v0.5.2 smoke suite: `PASSED`
- v0.5.1 regression: `PASSED`
- v0.5.0 regression: `PASSED`
- v0.4.6 visual/output regression: `PASSED`
- RC-0.4.4 calendar/site survey sync: `PASSED`
- Real Project Intake: `PASSED`
- LightBIM customer safety and release flow: `PASSED`
- Timeout: none
- Remaining process: none

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
- Node DEP0190 warning
- npm update notice when emitted

## Deferred Items

- v0.5.2 Official Acceptance QA
- official v0.5.2 tag after acceptance
- GitHub Release after official tag
- external multi-user identity binding and approver identity proof
- Excel native viewer pixel QA
- OS print dialog automation
- external authentication strategy

## Publication State

- official `v0.5.2` tag: `NOT_CREATED`
- GitHub Release: `NOT_CREATED` (`release not found`)
- Release asset: `NOT_UPLOADED`

## Final Decision

`v0.5.2 RC Desktop Package 검증 완료`
