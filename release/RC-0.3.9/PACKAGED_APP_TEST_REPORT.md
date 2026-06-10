# RC-0.3.9 Packaged App Test Report

## Summary

- Test date: 2026-06-10
- Version: RC-0.3.9
- Tag: `v0.3.9-rc`
- Commit: `be0367c`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED
- Executable build time: 2026-06-10 16:59:42 +09:00

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

## Recommendation Scoring Result

- Recommendation Scoring Service app.asar inclusion: PASSED
- Recommendation Scoring Rules View production bundle inclusion: PASSED
- CEO Dashboard entry point: PASSED
- Drawer navigation entry point: PASSED
- Unmatched Price Recommendation Center entry point: PASSED
- Master Data Center entry point: PASSED
- Real Price Calibration Workbench entry point: PASSED
- Customer screen entry point absence: PASSED
- Item name normalization: PASSED
- Unit and unit alias normalization: PASSED
- Specification normalization: PASSED
- Score breakdown: PASSED
- Vendor weight: PASSED
- Approval/rejection history weight: PASSED
- Price variance safety score: PASSED
- Scoring report generation: PASSED

## Confidence Result

- HIGH 93: PASSED
- MEDIUM 66: PASSED
- LOW 54: PASSED
- NO_MATCH 0: PASSED
- Vendor-only weak candidate remains NO_MATCH: PASSED

## Master Data Protection

- Scoring calculation does not update Master Data: PASSED
- Scoring rule changes do not update Master Data: PASSED
- Recommendation approval does not update Master Data: PASSED
- Queue linkage does not update Master Data: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Workbench approval, backup, apply, and history boundary remains required: PASSED

## Customer Safety

- Result: PASSED
- Customer-facing payloads do not expose scoring, breakdown, weights, recommendation candidates, import prices, current/suggested prices, variance, Queue, approval status, internal cost, margin, PCE, vendor/labor/purchase/receiving data, internal/profit/risk_score, detailed address, phone, email, or memo.

## Known Warnings

- Vite production bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## Final Decision

`RC-0.3.9 desktop release package 사용 가능`
