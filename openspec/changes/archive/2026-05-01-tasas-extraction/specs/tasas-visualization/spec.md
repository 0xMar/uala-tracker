# tasas-visualization Specification

## Purpose

Display extracted tasas in statement details, dashboard summary, a CFTEA evolution chart, and a dedicated Tasas page.

## Requirements

### Requirement: Statement Tasas section

The system MUST render a “Tasas” section in statement details showing CFTEA con IVA, CFTEA sin IVA, TEA, and TNA values or “No disponible” when missing.

#### Scenario: Tasas present
- GIVEN a statement with tasas values
- WHEN the user views statement details
- THEN the Tasas section shows the extracted numeric values

#### Scenario: Tasas missing
- GIVEN a statement with null tasas values
- WHEN the user views statement details
- THEN the Tasas section shows “No disponible” for each missing value

### Requirement: SummaryCard CFTEA

The system MUST include CFTEA con IVA in the SummaryCard when a latest statement has that value; otherwise it MUST show “No disponible”.

#### Scenario: Latest statement has CFTEA
- GIVEN the latest statement includes CFTEA con IVA
- WHEN the dashboard SummaryCard is rendered
- THEN CFTEA con IVA is displayed

#### Scenario: Latest statement missing CFTEA
- GIVEN the latest statement has no CFTEA con IVA
- WHEN the dashboard SummaryCard is rendered
- THEN the SummaryCard shows “No disponible” for CFTEA

### Requirement: Dashboard CFTEA chart

The system MUST render a CFTEA con IVA evolution chart across statements with available values and indicate gaps where values are missing.

#### Scenario: Multiple statements with CFTEA
- GIVEN at least two statements with CFTEA con IVA values
- WHEN the dashboard chart is rendered
- THEN the chart plots CFTEA con IVA per statement

#### Scenario: Mixed availability
- GIVEN statements where some CFTEA con IVA values are missing
- WHEN the dashboard chart is rendered
- THEN the chart shows gaps for missing values and does not fabricate data

### Requirement: Tasas page

The system MUST provide a dedicated Tasas page summarizing current tasas and showing the CFTEA evolution chart.

#### Scenario: Navigate to Tasas page
- GIVEN the user navigates to the Tasas page
- WHEN the page loads
- THEN current tasas and the CFTEA evolution chart are displayed
