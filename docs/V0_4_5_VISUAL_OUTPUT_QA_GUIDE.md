# v0.4.5 Visual & Output QA Guide

## Goal

v0.4.5 stabilizes QA reliability after the v0.4.4 official operational baseline. It does not add new business features.

## Required Commands

From project root:

```powershell
Get-ChildItem electron/services -Filter *.js | ForEach-Object { node --check $_.FullName }
node tests/v0-4-5-release-smoke-diagnostics.js
node tests/v0-4-5-packaged-visual-qa.smoke.js
node tests/v0-4-5-output-artifact-render.smoke.js
node tests/rc-0-4-4-packaged-release.smoke.js
node tests/rc-0-4-4-branch-stabilization.smoke.js
node tests/rc-0-4-4-calendar-site-survey-sync.smoke.js
node tests/real-project-intake.smoke.js
node tests/lightbim-customer-safety-regression.smoke.js
node tests/lightbim-boc-release-flow.smoke.js
```

From `electron`:

```powershell
npm run build:ui
npm run smoke:prod
npm run smoke:release:diagnose
npm run smoke:release
```

## QA Output Policy

Generated QA output is written under:

`qa-output/v0.4.5/`

This folder is intentionally ignored by Git and must not be committed.

## Packaged Visual QA

Run:

```powershell
node tests/v0-4-5-packaged-visual-qa.smoke.js
```

The harness verifies:

- packaged EXE exists
- EXE checksum
- actual packaged launch
- window title
- app remains alive after launch
- no remaining packaged process after stop
- bundled/source labels for key internal screens
- customer portal source isolation from forbidden internal terms

Screenshots are not captured automatically in this run to avoid accidental desktop, customer, or production data capture. The manifest records this explicitly as `NOT_CAPTURED_PRIVACY_SAFE`.

## Output Artifact QA

Run:

```powershell
node tests/v0-4-5-output-artifact-render.smoke.js
```

The harness uses synthetic QA data only and verifies:

- customer estimate PDF
- internal cost PDF
- customer Excel
- internal Excel
- customer print HTML
- file existence and size
- PDF header and EOF
- PDF page structure
- XLSX OpenXML workbook and sheets
- print CSS A4/page behavior
- customer/internal data separation

Known warning:

- Current basic PDF writer uses ASCII fallback, so Korean text render validation is recorded as `PDF_KOREAN_TEXT_ASCII_FALLBACK`.

## Customer Safety Gate

Customer-facing artifacts must not expose:

- internal cost
- vendor price
- labor cost
- margin
- margin rate
- profit
- PCE
- recommendation scoring
- queue
- internal action
- internal notification
- internal memo
- raw phone/email
- detailed internal address
- provider payload
- coordinates
- internal file path
- runtime DB path
- token/credential

Any customer leak is P0/P1 and blocks merge readiness.

