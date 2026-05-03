# Interior Automated Estimation OS Module Structure

## Purpose

This document defines the target folder and module structure for the ECOREAN Interior Automated Estimation OS.

The current single-file HTML prototype should be treated as the working monolith.

The target system should separate the following core layers:

1. Master DB
2. Estimate Engine
3. Schedule Engine
4. Customer Output
5. Internal Output

The design goal is not only to generate estimates, but to create the first operating core of the Build Operation Center.

## Target Folder Structure

```text
ecorean-estimate-os/
  README.md
  package.json
  .env.example

  docs/
    product-vision.md
    data-model.md
    estimate-rules.md
    schedule-rules.md
    output-spec.md
    migration-from-html.md

  legacy/
    ECOREAN_original.html
    audit.md

  src/
    app/
      main.ts
      routes.ts
      config.ts

    master-db/
      index.ts
      schema.ts
      validators.ts
      seed/
        process-categories.json
        cost-items.json
        material-items.json
        labor-roles.json
        region-factors.json
        finish-grades.json
        schedule-templates.json
      repositories/
        cost-item-repository.ts
        material-repository.ts
        labor-repository.ts
        process-repository.ts

    domain/
      project/
        project.model.ts
        customer.model.ts
        site.model.ts
        space.model.ts
      estimate/
        estimate.model.ts
        estimate-line.model.ts
        estimate-summary.model.ts
      schedule/
        schedule-task.model.ts
        schedule.model.ts
      output/
        document.model.ts

    estimate-engine/
      index.ts
      estimate-engine.ts
      quantity-engine.ts
      cost-engine.ts
      margin-engine.ts
      fee-engine.ts
      vat-engine.ts
      rule-engine.ts
      process-selector.ts
      diagnostics.ts

    schedule-engine/
      index.ts
      schedule-engine.ts
      dependency-resolver.ts
      duration-calculator.ts
      labor-allocation.ts
      material-order-timing.ts
      gantt-builder.ts

    outputs/
      customer/
        index.ts
        customer-estimate.view.ts
        customer-estimate.template.html
        customer-summary.mapper.ts
        customer-pdf.exporter.ts
        customer-html.exporter.ts
      internal/
        index.ts
        internal-cost-sheet.view.ts
        margin-sheet.view.ts
        material-order-sheet.view.ts
        labor-deployment-sheet.view.ts
        site-management-sheet.view.ts
        cashflow-sheet.view.ts
        internal-xlsx.exporter.ts
        internal-json.exporter.ts

    storage/
      index.ts
      local-project-store.ts
      project-repository.ts
      version-history.ts

    ui/
      components/
      pages/
      forms/
      tables/
      charts/
      styles/

    shared/
      money.ts
      units.ts
      date.ts
      ids.ts
      errors.ts
      types.ts

  tests/
    master-db/
    estimate-engine/
    schedule-engine/
    outputs/
    fixtures/
      sample-apartment.json
      sample-commercial.json
      sample-office.json
```

## 1. Master DB

### Role

Master DB is the controlled source of truth for construction costs, process categories, labor roles, material information, schedule defaults, and regional adjustment factors.

It should not be mixed with UI code.

### Main Responsibilities

- Store standard construction item definitions
- Store labor and material base costs
- Store process categories and hierarchy
- Store schedule base durations
- Store finish-grade multipliers
- Store regional adjustment factors
- Store material order rules
- Support version control of unit prices

### Core Files

```text
src/master-db/schema.ts
src/master-db/seed/cost-items.json
src/master-db/seed/process-categories.json
src/master-db/seed/material-items.json
src/master-db/seed/labor-roles.json
src/master-db/seed/region-factors.json
src/master-db/seed/finish-grades.json
src/master-db/seed/schedule-templates.json
```

### Cost Item Shape

```ts
type CostItem = {
  code: string;
  majorCategory: string;
  middleCategory: string;
  name: string;
  unit: 'm2' | 'm' | 'ea' | 'set' | 'day' | 'ton';
  laborCost: number;
  materialCost: number;
  defaultMarginRate: number;
  defaultDuration: number;
  exposure: 'AUTO' | 'SELECT' | 'CONDITIONAL';
  enabled: boolean;
};
```

## 2. Estimate Engine

### Role

Estimate Engine converts project input into estimate line items, costs, margins, fees, VAT, and summary totals.

This layer should know construction logic, but should not know how the screen looks.

### Main Responsibilities

- Convert user inputs into quantities
- Select required process items
- Apply finish grade and regional factors
- Calculate labor cost
- Calculate material cost
- Calculate margin
- Calculate management fees
- Calculate legal insurance/safety fees
- Calculate VAT
- Generate estimate summary
- Diagnose missing or excluded process items

### Core Files

```text
src/estimate-engine/estimate-engine.ts
src/estimate-engine/quantity-engine.ts
src/estimate-engine/cost-engine.ts
src/estimate-engine/margin-engine.ts
src/estimate-engine/fee-engine.ts
src/estimate-engine/vat-engine.ts
src/estimate-engine/process-selector.ts
src/estimate-engine/diagnostics.ts
```

### Main Input

```ts
type EstimateInput = {
  project: Project;
  site: Site;
  spaces: Space[];
  windows: WindowInput[];
  tiles: TileInput[];
  electricalItems: ElectricalInput[];
  plumbingItems: PlumbingInput[];
  furnitureItems: FurnitureInput[];
  finishItems: FinishInput[];
  carpentryItems: CarpentryInput[];
  doorItems: DoorInput[];
  options: EstimateOptions;
};
```

### Main Output

```ts
type EstimateResult = {
  lines: EstimateLine[];
  summary: EstimateSummary;
  diagnostics: EstimateDiagnostic[];
};
```

## 3. Schedule Engine

### Role

Schedule Engine converts estimate line items into construction schedule, labor deployment, material order timing, and gantt data.

This is the bridge between estimate and site operation.

### Main Responsibilities

- Convert estimate lines into schedule tasks
- Apply process order rules
- Resolve dependencies
- Calculate duration
- Calculate labor deployment
- Detect schedule conflicts
- Generate material order timing
- Generate gantt chart data

### Core Files

```text
src/schedule-engine/schedule-engine.ts
src/schedule-engine/dependency-resolver.ts
src/schedule-engine/duration-calculator.ts
src/schedule-engine/labor-allocation.ts
src/schedule-engine/material-order-timing.ts
src/schedule-engine/gantt-builder.ts
```

### Main Output

```ts
type ScheduleResult = {
  tasks: ScheduleTask[];
  laborPlan: LaborDeployment[];
  materialOrderPlan: MaterialOrderTiming[];
  conflicts: ScheduleConflict[];
  gantt: GanttRow[];
};
```

## 4. Customer Output

### Role

Customer Output creates documents that customers can see.

It should hide internal cost, margin, and operating logic.

### Main Responsibilities

- Customer-facing estimate
- Project summary
- Construction scope summary
- Payment summary
- Validity period
- Terms and notes
- Printable HTML
- PDF export

### Core Files

```text
src/outputs/customer/customer-estimate.view.ts
src/outputs/customer/customer-estimate.template.html
src/outputs/customer/customer-summary.mapper.ts
src/outputs/customer/customer-html.exporter.ts
src/outputs/customer/customer-pdf.exporter.ts
```

### Customer Output Must Include

- Brand
- Project name
- Site address
- Estimate date
- Validity period
- Construction area
- Construction scope
- Customer-visible line items
- Supply amount
- VAT
- Final total
- Terms and notes

### Customer Output Must Exclude

- Internal labor cost
- Internal material cost
- Margin by process
- Supplier details
- Labor deployment details
- Internal risk notes
- Master DB logic

## 5. Internal Output

### Role

Internal Output creates operating documents for ECOREAN.

This layer is more important than the customer estimate because it controls execution.

### Main Responsibilities

- Internal cost sheet
- Process margin sheet
- Material order sheet
- Labor deployment sheet
- Construction schedule
- Site management sheet
- Cash flow sheet
- Risk and missing-item diagnostics

### Core Files

```text
src/outputs/internal/internal-cost-sheet.view.ts
src/outputs/internal/margin-sheet.view.ts
src/outputs/internal/material-order-sheet.view.ts
src/outputs/internal/labor-deployment-sheet.view.ts
src/outputs/internal/site-management-sheet.view.ts
src/outputs/internal/cashflow-sheet.view.ts
src/outputs/internal/internal-xlsx.exporter.ts
src/outputs/internal/internal-json.exporter.ts
```

### Internal Output Must Include

- Labor cost
- Material cost
- Subcontract cost when needed
- Margin by process
- Margin rate by process
- Total expected profit
- Material order quantity
- Material order timing
- Labor roles and deployment timing
- Process duration
- Site checklist
- Risk flags
- Missing process warnings

## Data Flow

```text
User Input
  -> Input Normalizer
  -> Master DB Lookup
  -> Quantity Engine
  -> Process Selector
  -> Cost Engine
  -> Margin/Fee/VAT Engine
  -> Estimate Result
  -> Schedule Engine
  -> Customer Output
  -> Internal Output
```

## Module Dependency Rule

Dependencies should flow in one direction.

```text
UI
  -> Estimate Engine
  -> Master DB

UI
  -> Schedule Engine
  -> Estimate Result

Outputs
  -> Estimate Result
  -> Schedule Result
```

Forbidden dependencies:

- Master DB must not depend on UI.
- Estimate Engine must not depend on HTML templates.
- Schedule Engine must not depend on UI components.
- Customer Output must not access internal margin data unless explicitly mapped.
- UI must not calculate final business logic directly.

## Migration Strategy From Current HTML

### Step 1: Preserve Legacy

Copy the current HTML into:

```text
legacy/ECOREAN_original.html
```

This becomes the reference implementation.

### Step 2: Extract Master DB

Move the current `DB` object into:

```text
src/master-db/seed/cost-items.json
```

Normalize fields:

```text
mj -> majorCategory
md -> middleCategory
nm -> name
u  -> unit
lb -> laborCost
mt -> materialCost
mg -> defaultMarginRate
dr -> defaultDuration
```

### Step 3: Extract Estimate Calculation

Move calculation logic from:

```text
calcEst()
calc()
updKPIs()
renderResult()
```

Into:

```text
src/estimate-engine/
```

The engine should return data, not HTML.

### Step 4: Extract Schedule Calculation

Move logic from:

```text
calcSched(lines)
renderGantt()
```

Into:

```text
src/schedule-engine/
```

The engine should return schedule data, not visual DOM.

### Step 5: Split Outputs

Move customer quotation download logic into:

```text
src/outputs/customer/
```

Move internal sheets into:

```text
src/outputs/internal/
```

### Step 6: Rebuild UI Around Engines

The UI should become a shell that:

1. Collects inputs
2. Sends input to engines
3. Displays results
4. Exports outputs

It should not own the business logic.

## First Implementation Priority

The first real refactor should not be a full rewrite.

Priority order:

1. Copy current HTML to `legacy/`
2. Extract `DB` to JSON
3. Write a small loader that reads the JSON
4. Extract `calcEst()` into a pure estimate function
5. Create test fixtures for 2-3 sample projects
6. Compare old HTML result vs new engine result
7. Only then rebuild UI modules

## BOC Principle

Every module must answer:

1. What decision does it control?
2. What human judgment does it standardize?
3. What output does it create?
4. Can the same result be reproduced by another operator?

