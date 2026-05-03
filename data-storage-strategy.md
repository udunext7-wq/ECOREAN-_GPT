# ECOREAN Estimate OS Data Storage Strategy

## Purpose

The Interior Automated Estimation OS must store more than estimates.

It must store the full decision trail:

- What was entered
- What the system calculated
- What the customer accepted
- What actually happened on site
- Where the estimate was wrong
- How the system should improve

This is the foundation for a self-improving AI estimation system.

## Storage Maturity Roadmap

```text
Stage 1: Local JSON files
Stage 2: SQLite local database
Stage 3: PostgreSQL server database
Stage 4: Object storage for documents/images
Stage 5: Analytics warehouse
Stage 6: AI training dataset and feedback loop
```

## Stage 1: Local JSON

### Use Case

Best for early prototype and CLI development.

### What To Store

- Project input
- Estimate result
- Customer quote
- Internal cost sheet
- Schedule result
- Actual result when available

### Example Folder

```text
data/
  projects/
    2026-0001/
      project.json
      estimate-input.json
      estimate-result.json
      schedule-result.json
      customer-quote.html
      internal-cost-sheet.json
      actual-result.json
      feedback.json
```

### Pros

- Easy to inspect
- Easy to version with Git
- Good for early testing
- No server required

### Cons

- Not ideal for multi-user work
- Hard to search at scale
- Weak permission control

## Stage 2: SQLite

### Use Case

Best for a local desktop app or single-office internal tool.

### Why SQLite

SQLite is simple, reliable, and file-based.

It is better than loose JSON once projects increase.

### Pros

- One local database file
- Fast search
- Easy backup
- Structured tables
- Good for CLI testing

### Cons

- Not ideal for many simultaneous users
- Limited team collaboration

## Stage 3: PostgreSQL

### Use Case

Best for SaaS, team dashboard, franchise expansion, and Build Operation Center.

### Why PostgreSQL

PostgreSQL can handle:

- Multi-user access
- Project database
- Master DB versioning
- Estimate history
- Actual cost tracking
- Analytics queries
- Role-based access

This should be the long-term main database.

## Core Database Entities

### Project

Stores the basic project identity.

```text
projects
- id
- project_code
- project_name
- customer_id
- site_id
- project_type
- status
- created_at
- updated_at
```

### Customer

```text
customers
- id
- name
- phone
- email
- customer_type
- memo
```

### Site

```text
sites
- id
- address
- region
- building_type
- floor
- elevator_available
- parking_available
- site_constraints
```

### Estimate

Stores estimate versions.

```text
estimates
- id
- project_id
- version
- status
- created_by
- created_at
- valid_until
- total_supply
- total_vat
- total_amount
- expected_cost
- expected_margin
- expected_margin_rate
```

### Estimate Input Snapshot

Stores the raw input used to create each estimate.

```text
estimate_input_snapshots
- id
- estimate_id
- input_json
- created_at
```

### Estimate Lines

```text
estimate_lines
- id
- estimate_id
- cost_item_code
- major_category
- middle_category
- item_name
- unit
- quantity
- labor_cost
- material_cost
- margin_amount
- supply_amount
- note
```

### Schedule Tasks

```text
schedule_tasks
- id
- estimate_id
- task_name
- process_category
- start_date
- end_date
- duration_days
- dependency_codes
- labor_role
- labor_count
```

### Material Order Items

```text
material_order_items
- id
- estimate_id
- material_code
- material_name
- quantity
- unit
- required_date
- recommended_order_date
- supplier_id
- status
```

### Actual Result

This is the most important table for learning.

```text
actual_results
- id
- project_id
- estimate_id
- contract_amount
- actual_labor_cost
- actual_material_cost
- actual_subcontract_cost
- actual_extra_cost
- actual_start_date
- actual_end_date
- actual_duration_days
- final_profit
- final_margin_rate
- created_at
```

### Variance Analysis

Stores expected vs actual differences.

```text
variance_reports
- id
- project_id
- estimate_id
- estimated_cost
- actual_cost
- cost_variance
- cost_variance_rate
- estimated_duration
- actual_duration
- duration_variance
- estimated_margin_rate
- final_margin_rate
- margin_variance
- root_cause
```

### Feedback

Stores human or AI feedback for future improvement.

```text
estimate_feedback
- id
- estimate_id
- feedback_type
- target_code
- issue
- recommendation
- accepted
- created_by
- created_at
```

## Master DB Versioning

Master DB must be versioned.

When an estimate is created, the system must record which Master DB version was used.

This prevents future price changes from corrupting old estimates.

```text
master_db_versions
- id
- version_name
- effective_from
- effective_to
- created_by
- created_at
- memo
```

```text
cost_items
- id
- master_db_version_id
- code
- major_category
- middle_category
- name
- unit
- labor_cost
- material_cost
- default_margin_rate
- default_duration
- enabled
```

## File and Document Storage

The database should store metadata.

Actual files should be stored separately.

Examples:

- Customer quote PDF
- Internal cost sheet XLSX
- Site photos
- Contract files
- Material invoices
- Completion documents

Recommended structure:

```text
storage/
  projects/
    2026-0001/
      quotes/
      internal/
      contracts/
      photos/
      invoices/
      completion/
```

In a server system, this can later move to object storage such as S3-compatible storage.

## AI Learning Data

For AI/ML development, the system should export clean training datasets.

### Training Dataset Example

```text
training_datasets/
  cost_prediction/
    dataset_2026_q2.csv
  duration_prediction/
    dataset_2026_q2.csv
  risk_prediction/
    dataset_2026_q2.csv
```

### Important Features To Store

- Project type
- Region
- Area
- Space composition
- Building type
- Floor
- Elevator availability
- Finish grade
- Process list
- Material grade
- Labor roles
- Estimated cost
- Actual cost
- Estimated duration
- Actual duration
- Final margin
- Claims
- Rework
- Change orders

## Recommended First Implementation

For the current stage, use a hybrid of JSON and SQLite.

```text
Short term:
- JSON files for project snapshots
- SQLite for searchable structured project/estimate records

Long term:
- PostgreSQL for BOC/SaaS
- Object storage for files
- Analytics warehouse for AI learning
```

## Minimum Data To Start Saving Now

Even before the full database is built, every estimate should save:

```text
1. Estimate input
2. Estimate result
3. Master DB version
4. Customer quote output
5. Internal cost output
6. Schedule output
7. Actual result after construction
8. Variance report
9. Feedback and correction notes
```

## Strategic Principle

The database should not only store results.

It should store the reason behind each result.

That is what allows ECOREAN to move from:

```text
Estimate Program
-> Operating System
-> Learning System
-> AI Executive System
```

