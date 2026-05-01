# tasas-extraction Specification

## Purpose

Extract tasas (CFTEA con IVA, CFTEA sin IVA, TEA, TNA) from Ualá statements and persist them per statement. Both actual (P1 table) and announced (legal block) values are always parsed independently.

## Requirements

### Requirement: P1 tasas table extraction

The system MUST extract actual tasas from the P1 "Tasas" table when it is present in the statement PDF and map values to the statement's actual-tasas fields.

#### Scenario: P1 table available
- GIVEN a statement PDF that includes the P1 "Tasas" table
- WHEN the statement is processed
- THEN the extracted tasas values are mapped to the actual-tasas fields (`tna`, `tea`, `cftea_con_iva`, `cftea_sin_iva`)

#### Scenario: P1 table missing
- GIVEN a statement PDF without the P1 "Tasas" table
- WHEN the statement is processed
- THEN actual-tasas fields remain null; announced-tasas parsing continues independently

### Requirement: Legal block announced-tasas extraction

The system MUST always attempt to extract announced tasas from the "Legales" block, independently of whether the P1 table is present.

#### Scenario: Legal block available
- GIVEN a statement PDF with a "Legales" block
- WHEN the statement is processed
- THEN announced tasas are extracted and mapped to the `*_anunciada` fields (`tna_anunciada`, `tea_anunciada`, `tem_anunciada`, `cftea_con_iva_anunciada`, `cftna_con_iva_anunciada`)

#### Scenario: Legal block missing
- GIVEN a statement PDF without a "Legales" block
- WHEN the statement is processed
- THEN `*_anunciada` fields remain null

### Requirement: Data model persistence

The system MUST persist 4 actual-tasas columns (`tna`, `tea`, `cftea_con_iva`, `cftea_sin_iva`) and 5 announced-tasas columns (`tna_anunciada`, `tea_anunciada`, `tem_anunciada`, `cftea_con_iva_anunciada`, `cftna_con_iva_anunciada`) as NUMERIC columns on `statements`.

#### Scenario: Persist extracted tasas
- GIVEN extracted tasas values from a statement
- WHEN the statement is saved
- THEN the statement record stores the numeric values in the corresponding columns

#### Scenario: Missing values
- GIVEN a statement with no extractable tasas
- WHEN the statement is saved
- THEN the tasas columns are null and existing data remains unchanged

### Requirement: Assisted backfill update

The system MUST allow a user-initiated re-upload for a statement to populate tasas fields without altering existing transaction data.

#### Scenario: Backfill via re-upload
- GIVEN a statement with null tasas fields
- WHEN the user re-uploads the original PDF for that statement using `uploadStatement(forceReplace=true)`
- THEN all statement fields including tasas are updated and the `version` counter increments

## Notes

- `cftea_sin_iva` is always stored as `null` — not present in current PDF layout; column reserved for future use.
- `tem` (TEM) is parsed from the legal block into `tem_anunciada`; actual TEM is not stored.
- Extraction strategy: P1 → actual fields, legal block → `*_anunciada` fields. Always both, no fallback conflation.
