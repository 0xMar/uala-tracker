# Archive Report: tasas-extraction

**Change**: tasas-extraction
**Archived**: 2026-05-01
**Archive path**: `openspec/changes/archive/2026-05-01-tasas-extraction/`
**Verdict**: PASS WITH WARNINGS — no CRITICAL issues

---

## What Was Built

Full extraction, persistence, verification, and visualization pipeline for tasas (CFTEA con IVA, CFTEA sin IVA, TEA, TNA) from Ualá statement PDFs.

### Capabilities delivered
- **tasas-extraction**: P1 table parser (`_parse_p1_tasas`) + legal block parser (`_parse_legal_tasas`) in `api/extract/process.py`. Always parses both independently — P1 → actual fields, legal → `*_anunciada` fields.
- **tasas-visualization**: `TasasSection` component (values + StatusBadge + verification history table), `CfteaEvolutionChart` (dedicated CFTEA-only chart, `connectNulls=false`), `SummaryCard` CFTEA row, statement detail page, Tasas page, sidebar nav item.
- **tasas-verification**: `computeTasasStatus()` + `formatTasa()` in `lib/tasas.ts`. Compares `current.cftea_con_iva` vs `previous.cftea_con_iva_anunciada`.

---

## Artifact Observation IDs (Engram)

| Artifact | Observation ID |
|----------|---------------|
| proposal | #620 |
| spec | #622 |
| design | #623 |
| tasks | #624 |
| apply-progress | #627 |
| verify-report | #636 |

---

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| tasas-extraction | Created | New spec — updated to reflect always-parse-both strategy, 9 columns (4 actual + 5 anunciada), backfill via re-upload |
| tasas-visualization | Created | New spec — updated to reflect CfteaEvolutionChart, TasasSection with history table, no backfill CTA |
| tasas-verification | Created | New spec — updated to reflect Coincide/No coincide/Sin dato labels, strict equality, lib/tasas.ts location |

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Always parse both P1 and legal block independently | Avoids fallback conflation; P1 = actual, legal = announced. Better accuracy. |
| 5 `*_anunciada` columns added (data model gap fix) | Original design only had 3 actual columns; announced values needed separate storage for verification. |
| Strict equality instead of 0.01 tolerance | Approved during apply — simpler, avoids false positives on rounding. |
| Status labels: Coincide/No coincide/Sin dato | More descriptive in Spanish context than OK/Warning/Unknown. |
| No `backfillTasas()` action | `uploadStatement(forceReplace=true)` already handles re-upload; `version` field tracks replacements. |
| `CfteaEvolutionChart` as dedicated component | Removed CFTEA line from `MonthlyEvolution` to keep concerns separate. |
| `cftea_sin_iva` always null | Not present in current PDF layout; column reserved for future use. |

---

## Deviations from Original Spec/Design

| Item | Original | Actual | Status |
|------|----------|--------|--------|
| Extraction strategy | P1 first, legal fallback when P1 missing | Always parse both independently | Approved — better design |
| Verification tolerance | 0.01 percentage points | Strict equality | Approved |
| Status labels | OK / Warning / Unknown | Coincide / No coincide / Sin dato | Approved — spec updated |
| Backfill action | Separate `backfillTasas()` action + CTA | Re-upload via `uploadStatement(forceReplace=true)` | Approved — simpler |
| Data model | 3 actual columns | 9 columns (4 actual + 5 anunciada) | Gap fix — necessary for verification |

---

## Tasks Summary

**19/21 complete** (2 incomplete — no TS test runner)

| Phase | Complete | Notes |
|-------|----------|-------|
| Phase 1: Foundation | 3/3 ✅ | Schema, Python model, TS types |
| Phase 2: Extraction + Persistence | 5/5 ✅ | Both parsers, wiring, persistence, backfill resolved |
| Phase 3: Queries + Verification | 2/2 ✅ | lib/tasas.ts, queries aligned |
| Phase 4: UI Surfaces | 5/5 ✅ | All components and pages |
| Phase 5: Tests | 3/5 ⚠️ | 5.3 and 5.5 blocked — no TS test runner |
| Phase 6: Backfill Validation | 2/2 ✅ | Resolved by design |
| Data Model Gap Fix | 10/10 ✅ | G.1–G.10 all complete |

---

## Test Results

**Python**: ✅ 20/20 passing (`uv run python -m pytest api/extract/tests/test_extract.py`)
**TypeScript**: ❌ No test runner configured — 0 TS tests

---

## Technical Debt

| Item | Priority | Effort |
|------|----------|--------|
| Add vitest — `lib/tasas.ts` pure functions trivially testable | High | ~1h |
| `SummaryCard` TNA uses raw `${tna}%` while CFTEA uses `formatTasa()` — inconsistency | Medium | ~15min |
| 12 TS/UI spec scenarios remain UNTESTED | High | Blocked on vitest |

---

## Files Changed

| File | Action |
|------|--------|
| `scripts/001_schema.sql` | Modified — 9 tasas NUMERIC columns added |
| `api/extract/process.py` | Modified — `_parse_p1_tasas()`, `_parse_legal_tasas()`, `StatementOut` extended |
| `api/extract/tests/test_extract.py` | Modified — 20 tests (up from 16) |
| `lib/types.ts` | Modified — 9 tasas fields on `Statement` |
| `lib/actions.ts` | Modified — persists all 9 tasas fields on insert/update |
| `lib/tasas.ts` | Created — `computeTasasStatus()`, `formatTasa()` |
| `lib/supabase/queries.ts` | No change — uses `select('*')` |
| `components/dashboard/tasas-section.tsx` | Created — values + StatusBadge + history table |
| `components/dashboard/summary-card.tsx` | Modified — CFTEA con IVA row |
| `components/dashboard/monthly-evolution.tsx` | Modified — CFTEA line removed |
| `components/dashboard/cftea-evolution-chart.tsx` | Created — dedicated CFTEA chart |
| `app/(dashboard)/statements/[id]/page.tsx` | Created — statement detail with TasasSection |
| `app/(dashboard)/tasas/page.tsx` | Created — Tasas overview page |

---

## SDD Cycle Complete

Change fully planned → implemented → verified → archived.
Main specs updated at `openspec/specs/tasas-extraction/`, `openspec/specs/tasas-visualization/`, `openspec/specs/tasas-verification/`.
