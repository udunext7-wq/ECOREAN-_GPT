# Current ECOREAN Estimate OS Audit

Source file:

`C:\Users\udune\OneDrive\Desktop\ECOREAN\개발프로그램\견적서\전문가용\ECOREAN_ (1).html`

Checked on: 2026-04-25

## Current State

The current file is a single-file HTML application for an ECOREAN professional interior estimate OS.

It already contains:

- Branded ECOREAN interface
- Login/loading screen
- Sidebar estimate KPI summary
- Multi-tab input structure
- Process inclusion/exclusion control
- Rate and cost database
- Space input
- Window input
- Tile input
- Electrical input
- Plumbing input
- Furniture input
- Finish input
- Carpentry input
- Door input
- Estimate result view
- Gantt-style construction schedule
- Print support
- Customer quotation HTML export
- Project JSON export/import
- Local browser auto-save
- Saved project list via localStorage

## Core Functional Modules Observed

### Data and Cost Engine

The file contains a large in-browser `DB` object with construction item data.

Each DB item generally includes:

- Major process category
- Middle category
- Item name
- Unit
- Labor cost
- Material cost
- Margin rate
- Base duration

This means the current application already has the beginning of a standardized construction cost ontology.

### Estimate Calculation

Main calculation appears to be centered around:

- `calcEst()`
- `calcSched(lines)`
- `calc()`
- `renderResult()`
- `updKPIs()`

The estimate engine appears to convert user input into line items, then aggregates labor, material, supply, margin, fees, VAT, and totals.

### Input Modules

The current app has dedicated render/update/add/delete functions for:

- Spaces
- Windows
- Tiles
- Electrical items
- Plumbing items
- Furniture
- Finishes
- Carpentry
- Doors

This is useful because the BOC can later split each of these into independent modules or database-backed entities.

### Process Control

There is a process-control layer that can enable or disable construction items or groups.

Important observed functions:

- `renderProcCtrl()`
- `ctrlToggle(code, on)`
- `ctrlGroupToggle(mj, on)`
- `ctrlAllToggle(on)`
- `diagnoseMissingCodes()`

This is strategically important because it turns the estimate system from a calculator into an operating rules engine.

### Persistence

The app currently stores project state in the browser using localStorage.

Observed storage keys:

- `ecorean_pro2`
- `ecorean_projs2`
- `ecorean_rpw`
- `ecorean_apw`

Current persistence types:

- Auto-save current project
- Save project snapshots
- Load project snapshots
- Delete saved project
- Export project as `.ecorean.json`
- Import project from JSON

### Output

The app supports:

- Browser print
- Quotation HTML download
- JSON project export

This is a good MVP output layer, but future BOC versions should separate customer-facing documents from internal operating sheets.

## Strategic Interpretation

This file is not just a prototype.

It is the first rough monolith of the ECOREAN Build Operation Center.

The correct next direction is not to discard it, but to extract its logic into a maintainable system:

1. Preserve the current HTML as the working prototype.
2. Document the calculation model.
3. Extract the DB into structured data.
4. Separate UI, calculation engine, document export, and storage.
5. Convert localStorage project data into a real project database.
6. Turn estimate output into multiple BOC outputs:
   - Customer estimate
   - Internal cost sheet
   - Process margin sheet
   - Material order sheet
   - Labor deployment table
   - Construction schedule
   - Site checklist

## Technical Risks

### Single-File Monolith

The file is around 6,663 lines.

It works as a prototype, but long-term maintenance will become difficult if HTML, CSS, data, calculation logic, UI logic, export templates, and storage remain in one file.

### Duplicate Function Names

At least one function name appears more than once:

- `openCtrlPanel()`
- `renderProcCtrl()`

This may be intentional overwrite behavior, but it should be reviewed because later function declarations override earlier ones in JavaScript.

### Encoding Risk

Some extracted sections displayed Korean text as mojibake during inspection.

The main document title was readable in another extraction path, so this may be partly terminal decoding behavior, but the customer quotation export template should be checked carefully in a browser.

### Browser-Only Storage

localStorage is suitable for prototype use, but it is fragile for an operating system:

- Data is tied to one browser/device.
- No user accounts.
- No audit trail.
- No centralized project database.
- No team collaboration.
- No version history beyond local saved snapshots.

### Data Governance

The DB is embedded directly in the app.

For BOC, the unit-cost database should become a controlled asset with:

- Versioning
- Effective dates
- Region adjustments
- Supplier/material mapping
- Approval rules
- Change history

## Recommended Next Step

The next design task should be to define the formal data model for the Interior Automated Estimation OS.

Minimum entities:

- Project
- Customer
- Site
- Space
- Estimate
- Estimate line item
- Process category
- Cost item
- Material
- Labor role
- Schedule task
- Document export

After that, the current HTML can be migrated gradually instead of rewritten blindly.

