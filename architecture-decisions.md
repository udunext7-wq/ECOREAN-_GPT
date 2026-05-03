# ECOREAN Architecture Decisions

## ADR-001: Electron as the First Productization Path

Date: 2026-04-25

### Decision

The first productized version of the ECOREAN Interior Automated Estimation OS can be developed as an Electron desktop application.

Electron is suitable for the first phase because the current system already exists as a single-file HTML prototype, and the initial operating environment is likely to be internal office use rather than public SaaS.

### Reasoning

Electron is a good first-stage choice because it supports:

- Windows desktop app distribution
- Reuse of the current HTML/JavaScript prototype logic
- React + TypeScript UI migration
- Local SQLite database
- Offline usage
- Customer quotation HTML/PDF output
- Internal XLSX output
- Local file export and backup
- Faster internal deployment than a full SaaS system

### Target First-Stage Stack

```text
Electron
+ React
+ TypeScript
+ SQLite
+ HTML/PDF/XLSX export
```

### Long-Term Direction

Electron should not be treated as the final architecture limit.

The system must be designed so it can later expand into:

```text
Electron desktop app
-> Electron + cloud sync
-> Web dashboard + API server
-> PostgreSQL-based BOC
-> AI agent operating layer
```

### Required Architecture Rule

Even inside Electron, business logic must be separated from the UI.

The system should be modularized into:

```text
master-db/
estimate-engine/
schedule-engine/
outputs/customer/
outputs/internal/
storage/sqlite/
ui/
electron/
```

### What Electron Should Handle

- Desktop shell
- Local file access
- App menu and native window
- Secure bridge through preload
- Local export path selection
- Local SQLite access through controlled APIs

### What Electron Should Not Own

Electron should not contain core business logic directly.

It should not own:

- Estimate calculation
- Cost rules
- Schedule logic
- Master DB rules
- Output mapping rules
- AI reasoning rules

Those belong in independent modules so they can later move to a server or shared package.

### Expansion Risk

Electron alone will become insufficient when ECOREAN needs:

- Multi-user collaboration
- Franchise branch control
- Centralized Master DB updates
- Permission and role management
- Real-time dashboard
- Central training dataset collection
- AI learning pipeline

Therefore, Electron is the correct first product path, but the system must remain server-ready.

### Strategic Interpretation

Electron is the first executable container for the BOC core.

It is not the final destination.

The real asset is the separated operating logic:

- Ontology
- Master DB
- Rule Engine
- Estimate Engine
- Schedule Engine
- Feedback Data
- AI Agent Layer

