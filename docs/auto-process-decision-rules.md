# Auto Process Decision Rules

## Purpose

The system automatically decides whether processes are created, excluded, or held for confirmation based on normalized input and preset suggestions.

## Decision Flow

```text
Preset candidate process
-> Rule Engine checks triggerConditions
-> Rule Engine checks exclusionConditions
-> Rule Engine checks needsConfirmationWhen
-> Decision:
   REQUIRED_BY_RULE
   EXCLUDED_BY_RULE
   NEEDS_CONFIRMATION
   USER_SELECTED
```

## Decision Record

Every decision must create:

```json
{
  "processId": "NEEDS_RESEARCH",
  "decision": "REQUIRED_BY_RULE | EXCLUDED_BY_RULE | NEEDS_CONFIRMATION",
  "matchedConditions": [],
  "excludedBy": [],
  "needsConfirmationBecause": [],
  "customerExplanation": "NEEDS_RESEARCH",
  "internalReasonLog": [],
  "caseLibraryFeedbackRequired": true
}
```

## Examples

### Waterproof

Generated when:

- floorDemolition=true
- plumbingModificationScope is not none
- showerZoneChanged=true
- existingWaterproofDamaged=true
- leakHistory exists

Excluded when:

- surfaceOnlyRepair=true
- no floor/wall demolition
- existing waterproof verified intact
- dry area only

### Waste

Generated when:

- demolitionScope is not none
- large material delivery/removal exists
- tile/floor/kitchen demolition exists

Needs confirmation when:

- demolition scope is unknown
- building disposal rules are unknown

### Electrical Upgrade

Generated when:

- kitchen appliance upgrade exists
- new lighting plan exists
- capacity increase requested
- commercial electrical load changes

Needs confirmation when:

- existing circuit condition unknown
- breaker capacity unknown

