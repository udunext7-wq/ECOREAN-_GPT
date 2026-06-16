# RC-0.4.3 Customer Portal Internal Draft Final Merge Report

- source branch: `rc-0.4.3-customer-portal-internal-draft`
- base tag: `v0.4.2-rc-packaged`
- implementation commit: `a345991`
- stabilization commit: `f22c5a6`
- smoke compatibility commit: `f5be119`
- merge commit: `b6c9500`
- merge date: 2026-06-16
- merge conflict: none
- final decision: `RC-0.4.3 Customer Portal Internal Draft main 반영 완료`

## Included Structure

- service: `electron/services/customerPortalDraftService.js`
- view: `ui/app/customer-portal/CustomerPortalDraftCenterView.tsx`
- DB tables:
  - `customer_portal_drafts`
  - `customer_portal_snapshots`
  - `customer_portal_audit_history`
  - `customer_portal_preview_sessions`
- IPC / preload / UI type bridge: PASSED

## Draft Lifecycle

- Draft create / list / detail / update: PASSED
- Archive / restore: PASSED
- Archived Draft update restriction: PASSED
- non-existing Draft safe handling: PASSED
- null / undefined / wrong-shape payload safe handling: PASSED
- approved Draft change returns to review-required revision flow: PASSED
- public statuses `PUBLIC`, `LIVE`, `PUBLISHED`: not created

## Linkage

- Lead linkage: PASSED
- Project linkage: PASSED
- Estimate linkage: PASSED
- Contract linkage: PASSED
- linkage audit history: PASSED
- missing project link triggers publish block: PASSED
- automatic Lead / Project / Estimate / Contract / Draft / Snapshot deletion: ABSENT

## Allowlist Customer Payload

- customer-safe payload is built by explicit allowlist DTO: PASSED
- internal object spread-and-delete payload pattern: ABSENT
- unexpected source fields: EXCLUDED
- nested internal fields: EXCLUDED
- prototype pollution influence: BLOCKED
- HTML / script / iframe text: SANITIZED
- `javascript:` / `file://` / absolute Windows path / traversal strings: HIDDEN OR BLOCKED
- internal DB ID / storage path / userData path: HIDDEN
- approved customer amount and address summary only: PASSED
- customer-visible milestones only: PASSED
- customer-approved documents only: PASSED

## Forbidden Field Exclusion

- internal cost / purchase cost / labor cost / vendor cost: HIDDEN
- margin / margin rate / profit / expected profit / live margin: HIDDEN
- PCE / cashflow risk: HIDDEN
- internal estimate / internal unit price / supplier price / vendor comparison: HIDDEN
- price queue / price calibration / recommendation scoring / score breakdown / approval queue: HIDDEN
- CRM next action / internal action / overdue risk / internal notification / notification severity / internal priority: HIDDEN
- consultation internal memo / sales probability / negotiation strategy / customer risk score: HIDDEN
- address detail internal / normalized detail / canonical key / fingerprint / hash / duplicate candidates: HIDDEN
- provider payload / provider configuration / coordinates / latitude / longitude / internal validation reason: HIDDEN
- vendor / subcontractor / labor attendance / payroll / internal purchase order / receiving cost: HIDDEN
- root cause / prevention rule / internal inspection / backup ID / DB ID / logs: HIDDEN
- raw phone / raw email / account number / identity values / preview token plaintext: HIDDEN

## Document Filter

- `customer_approved = true`: REQUIRED
- `document_status = FINAL` or `APPROVED`: REQUIRED
- allowed customer document types: PASSED
- customer-safe document reference: PASSED
- local filesystem absolute path: HIDDEN
- unapproved documents: BLOCKED
- DRAFT documents: BLOCKED
- internal document names and types: BLOCKED

## Progress

- customer-visible milestone progress: PASSED
- manually approved customer progress: PASSED
- negative / over 100 / NaN / Infinity: CLAMPED OR SAFE
- no milestone empty state: SAFE
- internal cost, payment, labor, purchase, margin, risk, vendor score based progress: ABSENT

## Snapshot / Revision / Audit

- snapshot creation: PASSED
- revision increment: PASSED
- previous snapshot preserved: PASSED
- snapshot hash: PASSED
- approved payload and snapshot linkage: PASSED
- approved payload change requires new review/revision: PASSED
- snapshot customer payload safety: PASSED
- audit history actions: PASSED
- audit history automatic deletion: ABSENT

## Review / Approval / Rejection / Revocation

- review request: PASSED
- internal approval: PASSED
- internal rejection: PASSED
- approval revocation: PASSED
- rejection reason: PASSED
- approved_by / approved_at: PASSED
- `INTERNAL_APPROVED` is not external publication: CONFIRMED
- external delivery remains `DISABLED`: PASSED

## Publish Block

- customer safety failure: BLOCKED
- missing project link: `PUBLISH_BLOCKED`
- missing portal title: `PUBLISH_BLOCKED`
- missing customer display name: `PUBLISH_BLOCKED`
- internal financial / PCE / queue / scoring fields: BLOCKED from customer payload
- detailed address / provider / coordinates: BLOCKED from customer payload
- raw phone / raw email: BLOCKED from customer payload
- unapproved document / token plaintext / absolute path: BLOCKED
- internal action / notification: BLOCKED
- external auth / public delivery: DISABLED

## Preview Session / Token

- internal preview session create: PASSED
- expires_at recorded: PASSED
- revoke: PASSED
- expired session access: BLOCKED
- revoked session access: BLOCKED
- missing session safe error: PASSED
- token plaintext DB storage: ABSENT
- token SHA-256 hash storage: PASSED
- full token UI/log/customer payload exposure: ABSENT
- external URL: ABSENT

## External Communication

- external web hosting: DISABLED
- public URL deployment: DISABLED
- external file upload: DISABLED
- customer login: DISABLED
- SMS / Email / Kakao / Push / Calendar: DISABLED
- Address API / geocoding / coordinate lookup: DISABLED
- OAuth / external auth server / API key: ABSENT

## Entry Points

- First Entry Panel: PASSED by source/smoke
- CEO Dashboard: PASSED by source/smoke
- Drawer: PASSED by source/smoke
- CRM Lead detail: PASSED by source/smoke
- Project detail: PASSED by source/smoke
- Contract / estimate link screen: PASSED by source/smoke
- `ClientPortalCenterView` internal Draft Center entry: ABSENT
- visual browser click QA: NOT PERFORMED

## Boundary / Hostile Inputs

- null / undefined / empty object: SAFE
- wrong array/string/object shapes: SAFE
- long title: SAFE
- script / iframe tags: SANITIZED
- `javascript:` / `file://` / Windows absolute path / traversal strings: HIDDEN OR BLOCKED
- unexpected nested internal fields: EXCLUDED
- invalid dates: SAFE
- NaN / Infinity progress: SAFE
- duplicate snapshot request: SAFE
- expired / revoked preview session: BLOCKED
- archived draft approval/update: SAFE

## Pre-Merge Tests

- service syntax: PASSED
- `rc-0-4-3-branch-stabilization.smoke.js`: PASSED
- `rc-0-4-3-customer-portal-draft.smoke.js`: PASSED
- RC-0.4.2, RC-0.4.1, RC-0.4.0, RC-0.3.9, real project intake, and LightBIM customer safety regressions: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED with extended timeout

## Post-Merge Tests

- service syntax: PASSED
- RC-0.4.3 smoke and branch stabilization: PASSED
- RC-0.4.2 / RC-0.4.1 / RC-0.4.0 packaged and core regressions: PASSED
- real project intake: PASSED
- LightBIM customer safety and release flow: PASSED
- `npm run build:ui`: PASSED
- `npm run smoke:prod`: PASSED
- `npm run smoke:release`: PASSED with extended timeout

## Operational Notes

- The first `smoke:release` attempt in earlier stabilization used a 184 second limit and timed out without failure logs; rerun with a longer timeout passed.
- Windows sandbox `CreateProcessAsUserW failed: 5` occurred on several read/test/git/npm commands; approved reruns succeeded.
- RC-0.4.0 stabilization smoke was adjusted to detect `<CrmPipelineCenterView` with props instead of only the legacy self-closing string.

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- electron-builder metadata warning when packaging runs
- Node DEP0190 / npm update notice when shown

## Deferred Items

- actual customer external portal
- customer login / authentication
- public URL
- external hosting
- SMS / Email / Kakao invitation delivery
- per-customer access permissions
- real file download delivery layer
- preview click-based GUI QA
- mobile responsive customer portal
- roles and permissions management
- audit log retention policy
- bundle optimization

## Final Decision

`RC-0.4.3 Customer Portal Internal Draft main 반영 완료`
