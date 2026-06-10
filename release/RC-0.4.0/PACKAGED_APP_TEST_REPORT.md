# RC-0.4.0 Packaged App Test Report

## Summary

- Test date: 2026-06-10
- Version: RC-0.4.0
- Tag: `v0.4.0-rc`
- Commit: `7bb4970`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED
- Executable build time: 2026-06-10 23:17:44 +09:00
- `crmPipelineService` app.asar inclusion: PASSED
- CRM Pipeline Center production bundle inclusion: PASSED

## Data Path Result

- userData: `%APPDATA%\ecorean-boc-electron` - PASSED
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite` - PASSED
- export: `%APPDATA%\ecorean-boc-electron\export` - PASSED
- backups: `%APPDATA%\ecorean-boc-electron\backups` - PASSED

Required export folders:

- estimates: PASSED
- contracts: PASSED
- schedules: PASSED
- purchase-orders: PASSED
- visualizations: PASSED
- boards: PASSED
- reports: PASSED
- lightbim: PASSED

Required backup folders:

- db: PASSED
- export: PASSED
- full: PASSED
- manifests: PASSED

## CRM Pipeline Result

- CRM Pipeline Center: PASSED
- First Entry Panel entry point: PASSED
- CEO Dashboard entry point: PASSED
- Drawer entry point: PASSED
- Real Project Intake entry point: PASSED
- Lead create / list / detail / update: PASSED
- 12-stage CRM flow: PASSED
- Stage movement and history: PASSED
- Consultation log and next action: PASSED
- Site survey request: PASSED
- Estimate and project linking: PASSED
- CRM dashboard summary: PASSED
- Address / portal / calendar preparation status: PASSED
- Anonymized CRM report: PASSED

## Privacy and External Integration

- Phone masking: PASSED
- Email masking: PASSED
- Detailed address internal isolation: PASSED
- Portal token SHA-256 hash: PASSED
- External API execution: DISABLED
- External credential storage: NONE

## Customer Safety

- Result: PASSED
- Customer-facing payloads do not expose raw phone/email, detailed address, internal memo, internal risk or priority, internal estimate cost, margin, PCE, price Queue, recommendation scoring, score breakdown, weights, approval status, backup ID, vendor/labor/purchase/receiving data, profit, or risk score.
- Customer-facing screens do not provide an internal CRM cost or pricing entry point.

## Known Warnings

- Vite production bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## Final Decision

`RC-0.4.0 desktop release package 사용 가능`
