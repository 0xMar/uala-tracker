# tasas-verification Specification

## Purpose

Compare current actual tasas against the previously announced tasas and display verification status.

## Requirements

### Requirement: Verification status computation

The system MUST compare the current statement's actual CFTEA con IVA against the previous statement's announced CFTEA con IVA (`cftea_con_iva_anunciada`) and compute a status of `Coincide`, `No coincide`, or `Sin dato`. Comparison uses strict equality (no tolerance).

#### Scenario: Previous statement available and values match
- GIVEN a current statement with `cftea_con_iva` and a previous statement with `cftea_con_iva_anunciada`
- WHEN verification is computed
- THEN status is `Coincide` if values are strictly equal, otherwise `No coincide`

#### Scenario: No previous statement
- GIVEN a current statement with tasas values but no previous statement
- WHEN verification is computed
- THEN status is `Sin dato`

### Requirement: Missing tasas handling

The system MUST return status `Sin dato` when either current actual tasas or previous announced tasas are missing.

#### Scenario: Current tasas missing
- GIVEN a current statement with missing `cftea_con_iva`
- WHEN verification is computed
- THEN status is `Sin dato`

#### Scenario: Previous tasas missing
- GIVEN a current statement with tasas values and a previous statement with null `cftea_con_iva_anunciada`
- WHEN verification is computed
- THEN status is `Sin dato`

### Requirement: Status presentation

The system MUST display the verification status indicator alongside tasas in UI surfaces where tasas are shown.

#### Scenario: Status shown in UI
- GIVEN a statement view that includes tasas
- WHEN verification status is available
- THEN the status indicator is displayed as `Coincide`, `No coincide`, or `Sin dato`

## Notes

- Status labels in code: `Coincide` / `No coincide` / `Sin dato` (intentional deviation from original spec labels `OK` / `Warning` / `Unknown`).
- Verification logic lives in `lib/tasas.ts` → `computeTasasStatus(current, previous)`.
- Strict equality is used (no 0.01 tolerance) — intentional decision made during apply phase.
- `lib/tasas.ts` pure functions (`computeTasasStatus`, `formatTasa`) are untested — no TS test runner (vitest/jest) configured. Adding vitest is recommended technical debt.
