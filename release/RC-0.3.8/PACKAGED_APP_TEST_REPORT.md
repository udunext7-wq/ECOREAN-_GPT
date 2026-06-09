# RC-0.3.8 Packaged App Test Report

## Summary

- Test date: 2026-06-09
- Version: RC-0.3.8
- Tag: `v0.3.8-rc`
- Commit: `9c5d1da`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Dev server required: NO
- First screen render: PASSED

## Data Path Result

- userData: `%APPDATA%\ecorean-boc-electron` - PASSED
- DB: `%APPDATA%\ecorean-boc-electron\storage\sqlite` - PASSED
- export: `%APPDATA%\ecorean-boc-electron\export` - PASSED
- backups: `%APPDATA%\ecorean-boc-electron\backups` - PASSED

## Folder Result

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

## RC-0.3.8 Feature Result

- Unmatched Price Recommendation Center production bundle inclusion: PASSED
- Recommendation service app.asar inclusion: PASSED
- Recommendation summary and unmatched row list: PASSED
- Candidate Top 3 generation: PASSED
- HIGH 93: PASSED
- MEDIUM 66: PASSED
- LOW 54: PASSED
- NO_MATCH 0: PASSED
- Recommendation approval: PASSED
- Recommendation rejection: PASSED
- Recommendation deferral: PASSED
- Approved recommendation to Price Queue: PASSED
- Linked Queue remains `PENDING_REVIEW`: PASSED
- Recommendation report: PASSED
- Six internal entry points: PASSED
- Customer screens have no recommendation entry point: PASSED

## Master Data Protection

- Recommendation calculation does not update Master Data: PASSED
- Recommendation approval does not update Master Data: PASSED
- Queue linkage does not update Master Data: PASSED
- Existing Workbench approval, backup, apply, and history boundary remains required: PASSED

## Customer Safety Result

- Result: PASSED
- Customer-facing payloads do not expose recommendation scores, confidence, import prices, candidate Master Data, current/suggested prices, variance, Queue, approval status, internal cost, margin, PCE, vendor/labor/purchase/receiving data, internal/profit/risk_score, detailed address, phone, email, or memo.

## Known Warnings

- Vite production bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## Final Decision

`RC-0.3.8 desktop release package 사용 가능`
