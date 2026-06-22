# Next Action

## Current Codex Task

Continue stabilizing `v0.4.5` as a small release focused on QA automation and operational reliability.

Active branch:

`v0.4.5-visual-output-qa-stabilization`

## Current Implementation Status

- `V045-001`: implemented with `tests/v0-4-5-release-smoke-diagnostics.js`; final `npm run smoke:release` completed in 256725 ms.
- `V045-002`: implemented as conditional packaged visual harness with launch/source-label/customer-safety checks.
- `V045-003`: implemented with synthetic PDF/XLSX/print output artifact QA.
- `V045-004`: deferred unless required after full regression.
- `V045-005`: deferred unless required after full regression.
- `V045-006`: deferred; warnings are documented.

## Next Recommended Step

Stabilize the branch for merge review. Do not tag v0.4.5 yet. The branch is suitable for merge-readiness review as `CONDITIONAL_MERGE_READY` because full click/pixel visual QA remains a documented manual gap.

## Mandatory Scope

1. Fix or isolate the `npm run smoke:release` timeout.
2. Add a packaged visual QA harness or documented manual checklist runner.
3. Add rendered PDF/Excel output QA for estimate, internal cost, contract, schedule, and purchase order artifacts.
4. Keep customer safety regression as a hard gate.
5. Do not add new business modules.

## Candidate Backlog

### V045-001

- Title: Release aggregate smoke timeout diagnosis
- Problem: `npm run smoke:release` timed out at 120s and 300s without failure logs.
- User impact: Release confidence is reduced because the broad aggregate smoke is not bounded.
- Business impact: Slower release approval and weaker audit trail.
- Implementation scope: Split or time-box the aggregate smoke, identify the hanging sub-suite, and preserve focused smoke coverage.
- Excluded scope: New business features or UI redesign.
- Completion criteria: `npm run smoke:release` exits deterministically within the agreed timeout or emits a precise failing sub-test.
- Test criteria: Run `npm run smoke:release` twice from `electron` and confirm bounded PASS/FAIL output.
- Priority: P1
- Estimated risk: Medium
- Prerequisites: Existing smoke scripts and release-candidate smoke structure.

### V045-002

- Title: Packaged visual click QA harness
- Problem: Full packaged UI click-through is not automated.
- User impact: Button, modal, dropdown, scroll, and text-overlap issues can remain manual-only risks.
- Business impact: Higher chance of release-time UI friction in front of the CEO/operator.
- Implementation scope: Add a packaged-app visual QA checklist runner or automation harness that can verify main entry screens and key controls.
- Excluded scope: Pixel-perfect redesign, new screens, public portal deployment.
- Completion criteria: CEO Control Tower, Intake, Estimate, Calendar, LightBIM, Payment, Contract, and Settings entry screens are visited with pass/fail evidence.
- Test criteria: Packaged EXE launches and the harness records screen status, screenshots/log paths, and failure reasons.
- Priority: P1
- Estimated risk: Medium
- Prerequisites: Stable packaged EXE and agreed screenshot/log storage policy.

### V045-003

- Title: Output artifact render QA
- Problem: PDF/Excel/print output layout was not rendered and visually inspected in v0.4.4 acceptance.
- User impact: Customer-facing documents may contain layout or page-break issues not caught by service tests.
- Business impact: Risk of unprofessional customer handoff or accidental internal information exposure.
- Implementation scope: Generate sample customer estimate PDF, internal cost PDF/Excel, contract, schedule, and purchase order artifacts using QA-marked test data and render/inspect them.
- Excluded scope: New document templates unless a P0/P1 leak is found.
- Completion criteria: At least one customer PDF and one internal Excel are generated, inspected, and recorded with checksum/path.
- Test criteria: Customer output hides internal cost, margin, PCE, vendor data, queue data, and sensitive customer details.
- Priority: P1
- Estimated risk: Medium
- Prerequisites: Isolated QA export folder and test-only project data.

### V045-004

- Title: Estimate to Contract to Schedule to Order linkage stability
- Problem: End-to-end document linkage remains partly service-level verified rather than packaged click-through verified.
- User impact: The operator may need manual workarounds if downstream documents lose estimate context.
- Business impact: Contract/order errors can affect cashflow, procurement, and trust.
- Implementation scope: Verify estimate ID, customer/project summary, quantity basis, payment terms, schedule, and purchase order linkage through one deterministic QA project.
- Excluded scope: New accounting integration or external procurement systems.
- Completion criteria: Contract, schedule, and purchase order all reference the same QA project and estimate basis.
- Test criteria: Reopen after app restart and confirm linkage remains stable with no duplicate records.
- Priority: P2
- Estimated risk: Medium
- Prerequisites: QA project fixture and export path cleanup rule.

### V045-005

- Title: Calendar/site survey duplicate and restart persistence QA
- Problem: Calendar/site survey sync passed service smoke, but packaged restart persistence needs deeper visual confirmation.
- User impact: Duplicate schedules or lost survey links can confuse site visit planning.
- Business impact: Missed visits or duplicated appointments hurt operational reliability.
- Implementation scope: Create a QA-marked schedule, connect a survey, restart the packaged app, and verify no duplicate event appears.
- Excluded scope: External Google/Outlook/Naver provider activation.
- Completion criteria: One event and one survey link persist after restart with stable IDs.
- Test criteria: Duplicate detection and customer-safe payload checks pass.
- Priority: P2
- Estimated risk: Low
- Prerequisites: Provider remains disabled/local-only.

### V045-006

- Title: Build warning cleanup
- Problem: Vite bundle size, Electron metadata, SQLite experimental, and Node DEP warnings remain known warnings.
- User impact: No direct operating impact, but warnings make release logs noisy.
- Business impact: Slower QA triage and less clean release audit.
- Implementation scope: Add package metadata, consider bundle splitting, and document unavoidable runtime warnings.
- Excluded scope: Major frontend architecture rewrite.
- Completion criteria: Warnings are either removed or explicitly documented with owner/version.
- Test criteria: `npm run build:ui`, `npm run smoke:prod`, and package smoke remain green.
- Priority: P3
- Estimated risk: Low to Medium
- Prerequisites: No P0/P1 issues pending.

## Excluded From v0.4.5

- CRM pipeline expansion.
- Address API provider activation.
- Public customer portal deployment.
- Calendar provider production sync.
- LightBIM Core full production integration.
- New estimate product types.

## Completion Criteria

- No P0/P1 issues.
- Packaged app launches.
- Customer safety passes.
- Aggregate smoke no longer hangs or is split into deterministic bounded sub-suites.
- At least one PDF and one Excel output are rendered and inspected by an automated or documented visual QA path.

## v0.4.5 Official Acceptance Decision

- Decision: `ACCEPTED_WITH_WARNINGS`
- RC tag: `v0.4.5-rc`
- RC target: `b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e`
- RC package docs commit: `c46f378`
- Official `v0.4.4` preserved: `36aaa3d98b26743a828a879d878b142e9e003905`
- Official `v0.4.5` tag: create after acceptance QA documentation commit
- GitHub Release: `NOT_CREATED` in this step
- Release asset upload: `NOT_CREATED` in this step

## Immediate Next Action

- Create/push official annotated tag `v0.4.5` after acceptance QA documentation commit, only if main/origin remains `0/0` and working tree is clean.
- Do not start the next feature branch until official `v0.4.5` tag verification is complete.

## Follow-Up Candidates

- `v0.4.6`: packaged visual click automation.
- `v0.4.6`: PDF Korean typography / output render improvement.
- `v0.5.0`: User Roles & Permissions.

## Guardrails

- Do not move `v0.4.4`, `v0.4.5-rc`, or future `v0.4.5`.
- Do not enable external address/calendar providers in this release.
- Do not deploy a public customer portal in this release.
- Do not commit generated PDFs/Excels, screenshots, `qa-output`, runtime DB, userData, backups, exports, EXE, app.asar, or `electron/release`.
