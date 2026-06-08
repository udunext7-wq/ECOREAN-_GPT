# RC-0.3.6 Packaged App Test Report

## Summary

- Test date: 2026-06-08
- Version: RC-0.3.6
- Tag: `v0.3.6-rc`
- Commit: `fa560c8`
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

## RC-0.3.6 Feature Result

- Price Calibration Priority summary: PASSED
- BATHROOM PARTIAL: `대표 검토 필요`
- KITCHEN PARTIAL: `견적 전 보정 권장`
- FULL_REMODELING PARTIAL: `견적 전 보정 권장`
- NEEDS_UPDATE: `즉시 보정 필요`
- Calibration task creation: PASSED
- Task review: PASSED
- Price queue linkage: PASSED
- Queue status remains `PENDING_REVIEW`: PASSED
- Auto approval/apply does not occur: PASSED
- Master price direct change prevention: PASSED
- Priority report generation: PASSED

## Customer Safety Result

- Result: PASSED
- Customer-facing payloads do not expose internal unit cost, risk, price queue, PCE, margin, vendor/labor/purchase data, internal/profit/risk_score, detailed address, phone, email, or memo.

## Final Decision

`RC-0.3.6 desktop release package 사용 가능`
