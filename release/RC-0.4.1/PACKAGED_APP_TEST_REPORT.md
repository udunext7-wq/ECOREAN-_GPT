# RC-0.4.1 Packaged App Test Report

## Summary

- Test date: 2026-06-12
- Version: RC-0.4.1
- Tag: `v0.4.1-rc`
- Source commit: `21e468d`
- Merge commit: `7ec9935`
- Packaged app path: `C:\Users\udune\Documents\Codex\2026-04-25\new-chat-2\electron\release\win-unpacked\ECOREAN BOC CEO Dashboard.exe`

## Launch Result

- Packaged app launch: PASSED
- Window title: `ECOREAN BOC CEO Dashboard`
- Process responding: PASSED
- Dev server required: NO
- First screen render: PASSED
- Executable build time: 2026-06-12 17:18:12 +09:00
- `crmNextActionService` app.asar inclusion: PASSED
- Production UI dist inclusion: PASSED

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

## CRM Next Action Center Result

- CRM Next Action Center: PASSED
- First Entry Panel entry point: PASSED
- CEO Dashboard entry point: PASSED
- Drawer entry point: PASSED
- CRM Pipeline Center entry point: PASSED
- Real Project Intake entry point: PASSED
- Safe action empty state: PASSED
- Safe notification empty state: PASSED
- Dashboard summary: PASSED

## Action Lifecycle and Automation

- Action create / list / detail: PASSED
- Complete: PASSED
- 24-hour snooze: PASSED
- 7-day defer: PASSED
- Cancel: PASSED
- Lead `FIRST_CONTACT` auto generation: PASSED
- Stage-based action generation: PASSED
- `CONTRACTED` project handoff generation: PASSED
- Active duplicate prevention: PASSED
- `OVERDUE` detection: PASSED
- Single internal overdue notification: PASSED

## Internal Notifications and Stage Guards

- Internal notification creation: PASSED
- Notification read: PASSED
- Notification dismiss: PASSED
- `ON_HOLD` active action restriction: PASSED
- `LOST` new action restriction and active action cancellation: PASSED
- External notification delivery: DISABLED

## Privacy and Customer Safety

- Phone masking: PASSED
- Email masking: PASSED
- Detailed address isolation: PASSED
- Internal action memo isolation: PASSED
- Customer-facing action / notification state isolation: PASSED
- Internal cost, margin, PCE, Queue, scoring and operational data filtering: PASSED
- Customer safety regression: PASSED
- External SMS / Email / Kakao / Push / Calendar / Address API: DISABLED
- External credential storage added: NONE

## Test Result

- Service syntax: PASSED
- RC-0.4.1 packaged smoke: PASSED
- RC-0.4.1 branch stabilization and feature smoke: PASSED
- Requested RC-0.4.0 through RC-0.3.5 and intake / LightBIM regressions: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED
- `npm run dist`: PASSED

## Known Warnings

- Vite production bundle size warning
- SQLite experimental API warning
- electron-builder description/author metadata warning
- Node DEP0190 warning

## Failed Commands

- None.

## Final Decision

`RC-0.4.1 Desktop Release Package 사용 가능`
