# tasas-extraction Specification

## Purpose

Extract tasas (CFTEA con IVA, CFTEA sin IVA, TEA, TNA) from Ualá statements and persist them per statement.

## Requirements

### Requirement: P1 tasas table extraction

The system MUST extract tasas from the P1 “Tasas” table when it is present in the statement PDF and map values to the statement record.

#### Scenario: P1 table available
- GIVEN a statement PDF that includes the P1 “Tasas” table
- WHEN the statement is processed
- THEN the extracted tasas values are mapped to the statement fields

#### Scenario: P1 table missing
- GIVEN a statement PDF without the P1 “Tasas” table
- WHEN the statement is processed
- THEN the system proceeds to the legal block fallback

### Requirement: Legal block fallback

The system MUST attempt to extract tasas from the “Legales” block when the P1 table is missing.

#### Scenario: Legal block available
- GIVEN a statement PDF without the P1 table but with a “Legales” block
- WHEN the statement is processed
- THEN tasas are extracted from the legal block and mapped to the statement fields

#### Scenario: Legal block missing
- GIVEN a statement PDF without the P1 table and without a “Legales” block
- WHEN the statement is processed
- THEN tasas fields remain null and extraction is marked as unavailable

### Requirement: Data model persistence

The system MUST persist `tea`, `cftea_con_iva`, and `cftea_sin_iva` as numeric columns on `statements`; `tna` MUST continue to be stored as currently defined.

#### Scenario: Persist extracted tasas
- GIVEN extracted tasas values from a statement
- WHEN the statement is saved
- THEN the statement record stores the numeric values in the new columns

#### Scenario: Missing values
- GIVEN a statement with no extractable tasas
- WHEN the statement is saved
- THEN the new tasas columns are null and existing data remains unchanged

### Requirement: Assisted backfill update

The system MUST allow a user-initiated re-upload for a statement to populate only tasas fields without altering existing transaction data.

#### Scenario: Backfill with tasas only
- GIVEN a statement with null tasas fields
- WHEN the user re-uploads the original PDF for that statement
- THEN only tasas fields are updated and transaction data is unchanged
