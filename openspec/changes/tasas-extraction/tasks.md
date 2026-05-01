# Tasks: Tasas + CFTEA extraction & tracking

## Phase 1: Foundation (Schema + Contracts)

- [x] 1.1 Update `scripts/001_schema.sql` to add `tea`, `cftea_con_iva`, `cftea_sin_iva` numeric columns on `statements`.
- [x] 1.2 Extend `api/extract/process.py` `StatementOut` (and response models) with `tea`, `cftea_con_iva`, `cftea_sin_iva` fields.
- [x] 1.3 Update `lib/types.ts` `Statement` interface with `tea`, `cftea_con_iva`, `cftea_sin_iva` (keep `tna`).

## Phase 2: Extraction + Persistence

- [x] 2.1 Implement P1 "Tasas" table parser in `api/extract/process.py` to extract TEA/CFTEA/TNA and normalize percentages.
- [x] 2.2 Implement legal block fallback parser in `api/extract/process.py` for CFTEA/TEA/TNA patterns when P1 missing.
- [x] 2.3 Wire extracted tasas into API response payload in `api/extract/process.py`.
- [x] 2.4 Persist tasas on insert/update in `lib/actions.ts` (map payload → `statements` columns).
- [x] 2.5 ~~Add `backfillTasas(statementId, file)` action~~ — removed; re-upload via `uploadStatement(formData, forceReplace=true)` handles this; `version` field tracks replacements.

## Phase 3: Queries + Verification Logic

- [x] 3.1 Add `lib/tasas.ts` with `computeTasasStatus(current, previous)` and tolerance handling.
- [x] 3.2 Ensure `lib/supabase/queries.ts` returns tasas fields for statement fetches (align with updated types).

## Phase 4: UI Surfaces (Dashboard + Statement + Tasas)

- [x] 4.1 Create `components/dashboard/tasas-section.tsx` to render tasas values + verification badge.
- [x] 4.2 Add statement details page `app/(dashboard)/statements/[id]/page.tsx` using `TasasSection` and existing data fetchers.
- [x] 4.3 Update `components/dashboard/summary-card.tsx` to show CFTEA con IVA (or "No disponible") + status.
- [x] 4.4 Update `components/dashboard/monthly-evolution.tsx` (or new chart) to plot CFTEA con IVA with gaps.
- [x] 4.5 Create `app/(dashboard)/tasas/page.tsx` summarizing latest tasas + CFTEA chart.

## Phase 5: Tests + Verification

- [x] 5.1 Add P1 tasas parser test vectors in `api/extract/tests/test_extract.py` (table present).
- [x] 5.2 Add legal block fallback tests in `api/extract/tests/test_extract.py` (P1 missing).
- [ ] 5.3 Add verification status tests for Coincide/No coincide/Sin dato in `lib/tasas.ts` (no TS test runner configured).
- [x] 5.4 Extend API extraction tests to assert tasas in response payload.
- [ ] 5.5 Add UI checks (component or smoke plan) for Tasas section, SummaryCard CFTEA, and chart gaps.

## Phase 6: Backfill Workflow Validation

- [x] 6.1 Backfill handled by `uploadStatement(forceReplace=true)` — no separate action needed.
- [x] 6.2 No dedicated backfill CTA — re-upload flow via existing upload UI covers this.
