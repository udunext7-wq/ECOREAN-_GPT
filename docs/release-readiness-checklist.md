# ECOREAN BOC Release Readiness Checklist

Date: 2026-04-26
Release Name: `ECOREAN BOC MVP RC-0.1.0`
Status: `RC_0_1_0_LOCKED`

## Required Checks

| Check | Status | Notes |
|---|---|---|
| React production build | PASS | `npm run build` |
| Electron production smoke | PASS | `npm run smoke:prod` |
| SQLite DB open | PASS | `project.db`, `approval.db`, `master.db`, `logs.db` |
| Dashboard DB connection | PASS | KPI, project, approval, notification loaded |
| Estimate draft save/edit | PASS | Draft tables populated |
| Approval flow | PASS | Approval decisions recorded |
| Execution flow | PASS | Execution tables populated |
| Site operation flow | PASS | Site operation and issue tables populated |
| Change order flow | PASS | Cost/schedule/payment impact tables populated |
| Completion flow | PASS | Actual cost and margin reports populated |
| Case Library flow | PASS | Case and pattern tables populated |
| Learning approval flow | PASS | Master DB request and rollback snapshot created |
| Backup creation | PASS | Backup folder and manifest generated |
| JSON export | PASS | Reimportable export generated |
| Excel export | PASS | Report export generated |
| Restore approval block | PASS | Restore without CEO approval is blocked |
| 3D ontology viewer | PASS | Graph view builds and opens |
| EXE package | PASS | `npm run dist` generated executable package |
| EXE launch | PASS | Window title: `ECOREAN BOC CEO Dashboard` |

## RC-0.1.0 Lock Checklist

| Check | Status | Location |
|---|---|---|
| RC baseline folder | PASS | `release/RC-0.1.0/` |
| Installer backup | PASS | `release/RC-0.1.0/installer/` |
| Unpacked executable backup | PASS | `release/RC-0.1.0/win-unpacked/` |
| Development DB snapshot | PASS | `release/RC-0.1.0/development/` |
| Production DB area separated | PASS | `release/RC-0.1.0/production/sqlite/` |
| SQLite baseline backup | PASS | `release/RC-0.1.0/backup/BACKUP-2026-04-25T23-19-57-301Z/` |
| Export area prepared | PASS | `release/RC-0.1.0/export/` |
| First project templates | PASS | `release/RC-0.1.0/production/project-templates/first-operating-project-templates.json` |

## Must Fix Before Wider Release

1. Clean mojibake Korean text in older UI labels.
2. Add a dedicated non-production restore sandbox test before using Restore on real operational data.
3. Add real Master DB data import validation before using as final quotation authority.

## Acceptable For MVP

1. `UNKNOWN` / `NEEDS_RESEARCH` data states.
2. CSS-based 3D Ontology Viewer.
3. Spreadsheet XML `.xls` export as report-only Excel.
4. Manual representative approval for risky changes.

## Operation Separation Rule

- Do not overwrite `release/RC-0.1.0/`.
- Do not use development DB snapshots as real operating DB truth.
- Start real projects only from production DB storage and approved templates.
- Keep `UNKNOWN` and `NEEDS_RESEARCH` values valid until verified data is entered.
- Master DB updates require representative approval, rollback snapshot, and approval log.

## Release Decision

Decision: `MVP_RELEASE_ALLOWED_WITH_NOTES`

Release note:

```text
This version is suitable for internal MVP operation, structural validation,
and controlled pilot use. It is not yet a fully validated production pricing
authority until real supplier, labor, brand, and site data are verified.
```
