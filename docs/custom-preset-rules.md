# Custom Preset Rules

## Purpose

Users may save repeated project conditions as reusable presets.

## Preset Types

- system
- company
- user
- projectDerived

## Save Flow

```text
Project conditions
-> user edits selected process/spec choices
-> Save as custom preset
-> Approval if company-level preset
-> Reuse in future project
```

## Preset Does Not Override Rules

A preset may suggest default processes, but Rule Engine must still validate triggerConditions, exclusionConditions, and NEEDS_CONFIRMATION.

## Approval Required

Approval is required when a preset changes:

- default margin
- payment milestone
- process default inclusion
- default spec that affects customer price
- Master DB-linked item

