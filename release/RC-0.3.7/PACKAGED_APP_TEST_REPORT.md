# RC-0.3.7 Packaged App Test Report

## Summary

- Test date: 2026-06-09
- Version: RC-0.3.7
- Tag: `v0.3.7-rc`
- Commit: `49a3b48`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED

## Data Path Result

- userData: `%APPDATA%\ecorean-boc-electron`
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite`
- export: `%APPDATA%\ecorean-boc-electron\export`
- backups: `%APPDATA%\ecorean-boc-electron\backups`

## Folder Result

Required export folders:

- estimates
- contracts
- schedules
- purchase-orders
- visualizations
- boards
- reports
- lightbim

Required backup folders:

- db
- export
- full
- manifests

## RC-0.3.7 Feature Result

- Real Price Calibration Workbench: PASSED
- Queue summary/list/detail: PASSED
- Approval/rejection/deferral and reason records: PASSED
- Pending direct apply prevention: PASSED
- Master Data protection before approval: PASSED
- Master Data protection after approval and before backup: PASSED
- Backup-before-apply: PASSED
- Old/new price history: PASSED
- Linked priority task status update: PASSED
- CEO Dashboard and related entry points: PASSED
- Workbench report: PASSED

## Customer Safety Result

- Result: PASSED
- Customer-facing payloads do not expose the workbench, queue, current/proposed price, variance, approval status, backup id, internal cost, margin, PCE, vendor/labor/purchase/receiving data, internal/profit/risk_score, detailed address, phone, email, or memo.

## Final Decision

`RC-0.3.7 desktop release package 사용 가능`
