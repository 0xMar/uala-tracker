# Verification Report: tasas-extraction

**Change**: tasas-extraction
**Version**: N/A (no version tag in specs)
**Mode**: Standard (Strict TDD active during apply; TS test runner not configured — Python layer verified with full TDD evidence)
**Date**: 2026-05-01

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 21 |
| Tasks complete | 19 |
| Tasks incomplete | 2 |

**Incomplete tasks:**
- [ ] 5.3 Verification status tests for `lib/tasas.ts` (TS — no test runner configured)
- [ ] 5.5 UI checks — no TS test runner; smoke plan only

> Note: 6.1 and 6.2 are resolved by design decision — backfill is handled by `uploadStatement(forceReplace=true)` via the existing upload UI; no separate CTA or action was needed. The `TasasSection` component no longer has a backfill CTA prop — it was removed during the data model gap fix batch.

---

## Build & Tests Execution

**Build**: ➖ Not run (project rule: never build after changes)

**Tests**: ✅ 20 passed / ❌ 0 failed / ⚠️ 0 skipped
```
api/extract/tests/test_extract.py::test_is_uala_pdf_true PASSED
api/extract/tests/test_extract.py::test_is_uala_pdf_wilobank PASSED
api/extract/tests/test_extract.py::test_is_uala_pdf_false PASSED
api/extract/tests/test_extract.py::test_extract_returns_correct_structure PASSED
api/extract/tests/test_extract.py::test_extract_transactions_have_required_fields PASSED
api/extract/tests/test_extract.py::test_extract_reconciliation_ok PASSED
api/extract/tests/test_extract.py::test_parse_p1_tasas_extracts_financiacion_row PASSED
api/extract/tests/test_extract.py::test_parse_p1_tasas_returns_none_when_section_missing PASSED
api/extract/tests/test_extract.py::test_parse_legal_tasas_extracts_values PASSED
api/extract/tests/test_extract.py::test_parse_legal_tasas_returns_none_when_absent PASSED
api/extract/tests/test_extract.py::test_extract_returns_tasas_from_real_pdf PASSED
api/extract/tests/test_extract.py::test_statement_out_has_tasas_fields PASSED
api/extract/tests/test_extract.py::test_statement_out_tasas_stores_values PASSED
api/extract/tests/test_extract.py::test_endpoint_success PASSED
api/extract/tests/test_extract.py::test_endpoint_rejects_non_pdf PASSED
api/extract/tests/test_extract.py::test_statement_out_has_anunciada_fields PASSED
api/extract/tests/test_extract.py::test_statement_out_anunciada_stores_values PASSED
api/extract/tests/test_extract.py::test_extract_populates_anunciada_from_legal_block PASSED
api/extract/tests/test_extract.py::test_extract_actual_and_anunciada_are_independent PASSED
api/extract/tests/test_extract.py::test_endpoint_rejects_non_uala_pdf PASSED

20 passed in 3.02s
```

**Coverage**: ➖ Not available (no coverage tool configured)

---

## Spec Compliance Matrix

### Domain: tasas-extraction

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| P1 tasas table extraction | P1 table available | `test_extract.py > test_parse_p1_tasas_extracts_financiacion_row` + `test_extract_returns_tasas_from_real_pdf` | ✅ COMPLIANT |
| P1 tasas table extraction | P1 table missing | `test_extract.py > test_parse_p1_tasas_returns_none_when_section_missing` | ✅ COMPLIANT |
| Legal block fallback | Legal block available | `test_extract.py > test_parse_legal_tasas_extracts_values` | ✅ COMPLIANT |
| Legal block fallback | Legal block missing | `test_extract.py > test_parse_legal_tasas_returns_none_when_absent` | ✅ COMPLIANT |
| Data model persistence | Persist extracted tasas | `test_extract.py > test_statement_out_tasas_stores_values` + `test_extract_returns_tasas_from_real_pdf` | ✅ COMPLIANT |
| Data model persistence | Missing values → null | `test_extract.py > test_statement_out_has_tasas_fields` | ✅ COMPLIANT |
| Assisted backfill update | Backfill with tasas only | (none — resolved by design: re-upload via `uploadStatement(forceReplace=true)`; no separate action) | ⚠️ PARTIAL |

### Domain: tasas-visualization

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Statement Tasas section | Tasas present | (none — no TS test runner) | ❌ UNTESTED |
| Statement Tasas section | Tasas missing → "No disponible" | (none — no TS test runner) | ❌ UNTESTED |
| SummaryCard CFTEA | Latest statement has CFTEA | (none — no TS test runner) | ❌ UNTESTED |
| SummaryCard CFTEA | Latest statement missing CFTEA → "No disponible" | (none — no TS test runner) | ❌ UNTESTED |
| Dashboard CFTEA chart | Multiple statements with CFTEA | (none — no TS test runner) | ❌ UNTESTED |
| Dashboard CFTEA chart | Mixed availability → gaps | (none — no TS test runner) | ❌ UNTESTED |
| Tasas page | Navigate to Tasas page | (none — no TS test runner) | ❌ UNTESTED |

### Domain: tasas-verification

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Verification status computation | Previous statement available | (none — no TS test runner) | ❌ UNTESTED |
| Verification status computation | No previous statement | (none — no TS test runner) | ❌ UNTESTED |
| Missing tasas handling | Current tasas missing | (none — no TS test runner) | ❌ UNTESTED |
| Missing tasas handling | Previous tasas missing | (none — no TS test runner) | ❌ UNTESTED |
| Status presentation | Status shown in UI | (none — no TS test runner) | ❌ UNTESTED |

**Compliance summary**: 6 compliant + 1 partial / 20 scenarios (Python layer fully compliant; TS/UI layer untestable without a test runner)

---

## Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| P1 tasas table parser | ✅ Implemented | `_parse_p1_tasas()` in `process.py`; handles multi-line and single-line variants |
| Legal block fallback parser | ✅ Implemented | `_parse_legal_tasas()` in `process.py`; regex matches announced-rates sentence |
| `StatementOut` actual tasas fields | ✅ Implemented | `tna`, `tea`, `cftea_con_iva`, `cftea_sin_iva` with `None` defaults |
| `StatementOut` *_anunciada fields | ✅ Implemented | `tna_anunciada`, `tea_anunciada`, `tem_anunciada`, `cftea_con_iva_anunciada`, `cftna_con_iva_anunciada` (data model gap fix) |
| Schema columns — actual | ✅ Implemented | `tea`, `cftea_con_iva`, `cftea_sin_iva` NUMERIC in `001_schema.sql` |
| Schema columns — anunciada | ✅ Implemented | All 5 `*_anunciada` NUMERIC columns in `001_schema.sql` |
| `Statement` TS interface | ✅ Implemented | All 9 tasas fields (4 actual + 5 anunciada) in `lib/types.ts` |
| `uploadStatement` persists tasas | ✅ Implemented | Both insert and update paths persist all 9 tasas fields in `lib/actions.ts` |
| `backfillTasas` action | ✅ Resolved | Removed by design — `uploadStatement(forceReplace=true)` handles re-upload; `version` field tracks replacements |
| `lib/tasas.ts` helper | ✅ Implemented | `computeTasasStatus()` compares `current.cftea_con_iva` vs `previous.cftea_con_iva_anunciada`; `formatTasa()` present |
| `TasasSection` component | ✅ Implemented | Shows 4 actual values + StatusBadge + verification history table (period, actual, anunciada, estado) |
| `SummaryCard` CFTEA row | ✅ Implemented | Uses `formatTasa()` → returns "No disponible" when null |
| `CfteaEvolutionChart` component | ✅ Implemented | Dedicated CFTEA-only chart; `connectNulls=false` for gap rendering |
| `MonthlyEvolution` CFTEA line | ✅ Resolved | CFTEA line removed from `MonthlyEvolution`; replaced by dedicated `CfteaEvolutionChart` |
| Statement detail page | ✅ Implemented | `app/(dashboard)/statements/[id]/page.tsx` with `TasasSection` (current + previous statement) |
| Tasas page | ✅ Implemented | `app/(dashboard)/tasas/page.tsx` with `TasasSection` (+ `statements` prop for history) + `CfteaEvolutionChart` |
| Sidebar "Tasas" nav item | ✅ Implemented | `/tasas` route accessible via sidebar |
| Backfill CTA wiring | ✅ Resolved | Previous report flagged broken CTA; component was refactored — no `showBackfillCta`/`onBackfill` props exist; re-upload via existing upload UI is the intended flow |
| Verification status labels | ⚠️ Deviation | Spec says `OK / Warning / Unknown`; implementation uses `Coincide / No coincide / Sin dato`. Intentional deviation approved during apply; spec files not updated. |
| P1 → actual / legal → anunciada separation | ✅ Implemented | `extract()` always parses both independently; no fallback conflation between actual and announced fields |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| P1 table first, legal block fallback | ⚠️ Evolved | Original design: P1 canonical, legal only when P1 missing. Actual: ALWAYS parse both independently — P1 → actual fields, legal → *_anunciada fields. Better design; no fallback conflation. |
| Store tasas in `statements` columns | ✅ Yes | No separate table created |
| Compute verification in UI/helper | ✅ Yes | `lib/tasas.ts` computes on demand; nothing precomputed in DB |
| Assisted backfill via re-upload | ✅ Yes | `uploadStatement(forceReplace=true)` handles this; no separate `backfillTasas` action needed |
| `cftea_sin_iva` reserved as None | ✅ Yes | Hardcoded `None` in `extract()` with comment; column exists for future use |
| `tem` parsed but not stored in actual | ✅ Yes | `_parse_p1_tasas` returns `tem` but `StatementOut` doesn't expose it as an actual field; `tem_anunciada` IS stored |
| Tolerance 0.01 for verification | ⚠️ Deviated | Design specified 0.01 tolerance; implementation uses strict equality (`===`). Intentional — approved during apply. |
| File changes match design table | ✅ Yes | All 11 files in the design table were modified/created; additional files created for data model gap fix (G.1–G.10) |

---

## Issues Found

**CRITICAL** (must fix before archive):
- None

**WARNING** (should fix):
1. **12 spec scenarios UNTESTED** — All tasas-visualization and tasas-verification scenarios lack automated tests because no TS test runner (vitest/jest) is configured. The logic in `lib/tasas.ts` is pure and trivially testable once a runner is added.
2. **Verification status label mismatch** — Spec defines `OK / Warning / Unknown`; code uses `Coincide / No coincide / Sin dato`. Intentional deviation approved during apply, but the spec files were never updated to reflect it. The spec is now stale.

**SUGGESTION** (nice to have):
1. Add vitest to the project — `lib/tasas.ts` has 2 pure functions (`computeTasasStatus`, `formatTasa`) that would take ~10 minutes to cover fully. This would flip 5 UNTESTED scenarios to COMPLIANT.
2. `SummaryCard` renders TNA as `${currentStatement.tna}%` (raw number) while CFTEA uses `formatTasa()` (locale-formatted with `es-AR`). Inconsistency — TNA should also use `formatTasa()` for uniform display.
3. The spec for `tasas-extraction` domain should be updated to reflect: (a) the `*_anunciada` fields added in the data model gap fix, (b) the `Coincide / No coincide / Sin dato` status labels, (c) the "always parse both" extraction strategy instead of the original fallback-only approach.

---

## Verdict

**PASS WITH WARNINGS**

All 20 Python tests pass (up from 16 in the previous report — 4 new tests cover the `*_anunciada` data model). The full data pipeline is structurally complete and correct: extraction (P1 actual + legal announced independently), persistence (all 9 tasas columns), verification logic (`computeTasasStatus`), and all UI surfaces (TasasSection with history table, SummaryCard, CfteaEvolutionChart, Tasas page, Statement detail page). The previous WARNING about the broken backfill CTA is resolved — the component was refactored and re-upload via the existing upload UI is the intended flow. Remaining warnings are: 12 TS/UI scenarios untested due to missing test runner, and the spec labels for verification status are stale.
