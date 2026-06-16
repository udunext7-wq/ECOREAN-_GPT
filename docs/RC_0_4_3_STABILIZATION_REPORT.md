# RC-0.4.3 Customer Portal Internal Draft Stabilization Report

- branch: `rc-0.4.3-customer-portal-internal-draft`
- base tag: `v0.4.2-rc-packaged`
- implementation commit: `a345991`
- stabilization date: 2026-06-16
- stabilization decision: `MERGE_READY`

## Service / UI / DB

- service: `electron/services/customerPortalDraftService.js`
- view: `ui/app/customer-portal/CustomerPortalDraftCenterView.tsx`
- tables:
  - `customer_portal_drafts`
  - `customer_portal_snapshots`
  - `customer_portal_audit_history`
  - `customer_portal_preview_sessions`
- IPC / preload / UI type bridge: PASSED

## Draft Lifecycle

- Draft create / list / detail / update: PASSED
- Archive / restore: PASSED
- Archived draft update restriction: PASSED
- Missing draft safe error: PASSED
- null / undefined payload safe handling: PASSED
- approved draft change returns to `REVISION_REQUIRED`: PASSED
- prohibited public statuses `PUBLIC`, `LIVE`, `PUBLISHED`: not created

## Linkage

- Lead linkage: PASSED
- Project linkage: PASSED
- Estimate linkage: PASSED
- Contract linkage: PASSED
- linkage audit history: PASSED
- missing project link triggers publish block: PASSED
- automatic Lead / Project / Estimate / Contract / Draft / Snapshot delete: ABSENT

## Allowlist Payload

- allowlist DTO builder: PASSED
- internal object spread-and-delete pattern: ABSENT
- unexpected source fields excluded: PASSED
- nested internal fields excluded: PASSED
- undefined / null / wrong-shape payloads: PASSED
- HTML / script sanitization: PASSED
- dangerous URL scheme and absolute path protection: PASSED
- customer-safe document reference: PASSED
- approved customer amount only: PASSED
- approved address summary only: PASSED
- customer-visible milestones only: PASSED
- customer-approved documents only: PASSED

## Forbidden Fields

- internal cost / purchase cost / labor cost / vendor cost: HIDDEN
- margin / profit / PCE / cashflow risk: HIDDEN
- internal estimate / unit price / supplier price / vendor comparison: HIDDEN
- price queue / price calibration / recommendation scoring / score breakdown / approval queue: HIDDEN
- next action / internal action / overdue risk / notification / internal priority / sales probability / strategy: HIDDEN
- detailed address / normalized detail / canonical key / fingerprint / duplicate candidates / provider / coordinates: HIDDEN
- vendor / subcontractor / payroll / purchase order / receiving cost / root cause / backup / DB / storage path / logs: HIDDEN
- raw phone / raw email / account / ID / preview token plaintext: HIDDEN

## Document Filter

- `CUSTOMER_ESTIMATE`: ALLOWED when customer-approved and approved/final
- `CUSTOMER_CONTRACT`: ALLOWED when customer-approved and approved/final
- `CUSTOMER_SCHEDULE`: ALLOWED when customer-approved and approved/final
- internal document types: BLOCKED
- draft and unapproved customer documents: BLOCKED
- local filesystem paths: HIDDEN

## Progress

- customer-visible milestone progress: PASSED
- manually approved customer progress: PASSED
- negative / over 100 / NaN / Infinity: CLAMPED OR SAFE
- no milestone empty state: SAFE
- internal cost, payment, labor, purchase, margin, risk, vendor score based progress: ABSENT

## Snapshot / Audit

- snapshot creation: PASSED
- revision increment: PASSED
- previous snapshot preserved: PASSED
- snapshot hash: PASSED
- snapshot customer safety: PASSED
- audit actions `CREATED`, `UPDATED`, `REVIEW_REQUESTED`, `APPROVED_INTERNAL`, `REJECTED_INTERNAL`, `APPROVAL_REVOKED`, `SNAPSHOT_CREATED`, `LINKED`, `ARCHIVED`, `RESTORED`, `PREVIEW_CREATED`, `PREVIEW_REVOKED`: PASSED
- audit history auto delete: ABSENT

## Review / Approval

- review request: PASSED
- internal approval: PASSED
- internal rejection: PASSED
- approval revocation: PASSED
- rejection reason: PASSED
- approved_by / approved_at: PASSED
- `INTERNAL_APPROVED` does not mean external publication: CONFIRMED
- external delivery remains `DISABLED`: PASSED

## Publish Block

- customer safety failure: BLOCKED
- internal financial / PCE / queue / scoring fields: BLOCKED from customer payload
- detailed address / provider / coordinates: BLOCKED from customer payload
- raw phone / email: BLOCKED from customer payload
- unapproved document / token plaintext / absolute path: BLOCKED
- missing project link: `PUBLISH_BLOCKED`
- missing portal title / customer display name: `PUBLISH_BLOCKED`
- external auth / public delivery: DISABLED

## Preview Session / Token

- internal preview session create: PASSED
- expires_at recorded: PASSED
- revoke: PASSED
- expired session access blocked: PASSED
- revoked session access blocked: PASSED
- missing session safe error: PASSED
- token plaintext DB storage: ABSENT
- token hash DB storage: PASSED
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

- First Entry Panel: PASSED
- CEO Dashboard: PASSED
- Drawer: PASSED
- CRM Lead detail: PASSED
- Project detail: PASSED
- Contract / estimate link screen: PASSED
- `ClientPortalCenterView` internal Draft Center entry: ABSENT

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

## Issues

- found:
  - S3: stabilization test initially mixed Infinity and over-100 progress expectation.
  - S2: `buildCustomerSafePortalPayload(null)` needed explicit safe object conversion.
- fixed:
  - added null payload safe handling.
  - added archived draft update restriction.
  - added approved draft change -> revision-required logic.
  - added missing project/title/customer publish block logic.
  - added expired preview access blocking.
- deferred:
  - actual public portal URL
  - customer login and external auth
  - SMS / Email / Kakao delivery
  - external hosting
  - role-based portal reviewer permissions
  - visual browser click-through QA

## Known Warnings

- Vite bundle size warning
- SQLite experimental API warning
- Node DEP0190 / npm update notice when shown

## Merge Readiness Decision

`MERGE_READY`
