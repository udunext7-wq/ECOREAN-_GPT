# Project Save Format

## Purpose

Every estimate must be saved as a restorable project file.

The project save file stores input, decisions, estimate, schedule, documents, payments, purchase orders, inspections, defects, cashflow, and links to Case Library.

## Stored Data

- projectId
- projectName
- clientInfo
- siteInfo
- minimumInput
- selectedPreset
- selectedProcesses
- selectedOptions
- generatedEstimate
- generatedSchedule
- generatedDocuments
- paymentPlan
- purchaseOrders
- dailyReports
- inspections
- changeOrders
- defects
- cashflow
- caseLibraryLinks
- masterDbVersion
- createdAt
- updatedAt

## Rule

A project file must be enough to reopen, revise, re-export, compare, and archive an estimate.

## Export Targets

- JSON for system storage
- Excel for working tables
- PDF for signed/customer reports
- HTML for app preview and web dashboard

