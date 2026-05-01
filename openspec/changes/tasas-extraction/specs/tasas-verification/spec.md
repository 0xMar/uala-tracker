# tasas-verification Specification

## Purpose

Compare current actual tasas against the previously announced tasas and display verification status.

## Requirements

### Requirement: Verification status computation

The system MUST compare the current statement's actual tasas to the previous statement's announced tasas and compute a status of Coincide, No coincide, or Sin dato.

#### Scenario: Previous statement available
- GIVEN a current statement with tasas values and a previous statement with announced tasas
- WHEN verification is computed
- THEN status is Coincide if values match within tolerance, otherwise No coincide

#### Scenario: No previous statement
- GIVEN a current statement with tasas values but no previous statement
- WHEN verification is computed
- THEN status is Sin dato

### Requirement: Missing tasas handling

The system MUST return status Sin dato when either current actual tasas or previous announced tasas are missing.

#### Scenario: Current tasas missing
- GIVEN a current statement with missing tasas values
- WHEN verification is computed
- THEN status is Sin dato

#### Scenario: Previous tasas missing
- GIVEN a current statement with tasas values and a previous statement with missing tasas values
- WHEN verification is computed
- THEN status is Sin dato

### Requirement: Status presentation

The system MUST display the verification status indicator alongside tasas in UI surfaces where tasas are shown.

#### Scenario: Status shown in UI
- GIVEN a statement view that includes tasas
- WHEN verification status is available
- THEN the status indicator is displayed as Coincide, No coincide, or Sin dato

