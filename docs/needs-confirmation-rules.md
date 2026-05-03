# NEEDS_CONFIRMATION Rules

## Purpose

`NEEDS_CONFIRMATION` prevents the system from adding risky or expensive processes without enough evidence.

## Use NEEDS_CONFIRMATION When

- site condition is unknown
- demolition scope is unclear
- existing waterproof layer is unknown
- leak history is unknown
- quantity is missing
- customer selection is ambiguous
- predecessor process is not decided
- high-risk process is excluded
- lead time may violate occupancy deadline
- source price is missing

## Output Behavior

Customer estimate:

- Show item as pending or optional only when appropriate
- Explain that final confirmation requires site inspection or customer decision

Internal estimate:

- Show blocking reason
- Show risk flags
- Show required confirmation owner
- Show effect on cost, schedule, purchase order, and payment milestone

## Required Fields

```json
{
  "confirmationId": "NEEDS_RESEARCH",
  "processId": "NEEDS_RESEARCH",
  "reason": "NEEDS_RESEARCH",
  "requiredOwner": "대표 | 현장관리 AI | 견적설계 AI | 고객 | 거래처",
  "blocksEstimateFinalization": true,
  "blocksScheduleFinalization": true,
  "blocksPurchaseOrder": true,
  "customerVisible": true,
  "internalOnly": false
}
```

