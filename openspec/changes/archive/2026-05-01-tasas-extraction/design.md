# Design: Tasas + CFTEA extraction & tracking

## Technical Approach

Extend the PDF extractor to pull tasas from page 1’s “Tasas” table, with a fallback parser over the “Legales” block on the last page. Persist new tasas columns on `statements`, surface them in new UI components (statement details + Tasas page + CFTEA chart), and compute verification status by comparing current actual vs previous announced values with a defined tolerance. Provide an assisted backfill flow that updates only tasas fields for an existing statement.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Parse P1 “Tasas” table first, then legal block fallback | Best accuracy, slightly more code paths | **Chosen**: P1 is canonical; legal block only when P1 missing.
| Store tasas in `statements` vs separate `tasas` table | Simpler reads; limited historical metadata | **Chosen**: columns on `statements` (aligns with existing model).
| Compute verification in UI vs store precomputed status | UI recompute is cheap; no extra columns | **Chosen**: compute in UI/server helper per request.
| Assisted backfill via re-upload updating only tasas | Requires new action and UI CTA | **Chosen**: avoids touching transactions, matches spec.

## Data Flow

```
PDF Upload
  └─ /api/extract (FastAPI)
        ├─ process.py: parse P1 tasas
        ├─ fallback: parse last-page Legales
        └─ response.statement.{tna, tea, cftea_*}
              │
              ▼
        lib/actions.ts upload/backfill
              │
              ▼
        statements table (new tasas columns)
              │
              ▼
        UI (Statement details, Dashboard Summary, Tasas page)
              └─ verification helper compares current vs previous
```

## Data Model Changes

- `statements` table: add numeric columns `tea`, `cftea_con_iva`, `cftea_sin_iva`.
- Keep `tna` as-is.

## Extraction Pipeline Changes

1. **P1 Tasas table parser** (in `api/extract/process.py`):
   - Read `p1` text.
   - Locate “Tasas” section (regex header), then extract numeric percentages for TEA, CFTEA con IVA, CFTEA sin IVA, and TNA.
   - Normalize values to float (same style as `_parse_amount`, but for percentages).
2. **Legal block fallback**:
   - If P1 table missing or incomplete, parse `reader.pages[-1]` text.
   - Match patterns like “CFTEA CON IVA XX,XX%”, “CFTEA SIN IVA XX,XX%”, “TEA XX,XX%”, “TNA XX,XX%”.
3. **Return values** in `StatementOut` and `ExtractResponse` (Python), then map to TS interfaces and persistence.

## UI Components / Pages

- **Statement Details page** (new): `app/(dashboard)/statements/[id]/page.tsx`.
  - Uses `getStatement` + `getTransactions`.
  - Renders new `TasasSection` with values + verification badge.
  - Adds “Re-upload to fill tasas” CTA if tasas missing.
- **Tasas page** (new): `app/(dashboard)/tasas/page.tsx`.
  - Shows latest tasas + `CfteaEvolutionChart`.
- **Dashboard updates**:
  - `SummaryCard` adds CFTEA con IVA (latest) with “No disponible” fallback.
  - New chart component or adaptation of `MonthlyEvolution` to plot CFTEA con IVA with gaps.

## Verification Logic

Create `lib/tasas.ts` helper:
- `computeTasasStatus(current: Statement | null, previous: Statement | null): 'Coincide' | 'No coincide' | 'Sin dato'`.
- Sin dato if any required value is null or previous statement missing.
- Coincide if all comparable fields match within tolerance; otherwise No coincide.
- Tolerance: 0.01 (percentage points) to absorb rounding.

## Interfaces / Contracts

**Python (api/extract/process.py)**
```py
class StatementOut(BaseModel):
    # existing fields...
    tna: float | None
    tea: float | None
    cftea_con_iva: float | None
    cftea_sin_iva: float | None
```

**TypeScript (lib/types.ts)**
```ts
export interface Statement {
  // existing fields...
  tna: number | null
  tea: number | null
  cftea_con_iva: number | null
  cftea_sin_iva: number | null
}
```

## File Changes

| File | Action | Description |
|---|---|---|
| `api/extract/process.py` | Modify | P1 tasas parser + legal block fallback; extend StatementOut. |
| `api/extract/tests/test_extract.py` | Modify | Add tests for tasas extraction and fallback. |
| `lib/actions.ts` | Modify | Persist tasas on insert/update; add backfill action (tasas-only). |
| `lib/types.ts` | Modify | Add tasas fields to `Statement`. |
| `lib/supabase/queries.ts` | Modify | No change to select; reuse `*` but update types. |
| `components/dashboard/summary-card.tsx` | Modify | Render CFTEA con IVA and status badge. |
| `components/dashboard/monthly-evolution.tsx` | Modify | Add CFTEA series or create new chart component. |
| `components/dashboard/tasas-section.tsx` | Create | Tasas display + verification badge + backfill CTA. |
| `app/(dashboard)/statements/[id]/page.tsx` | Create | Statement details page with tasas. |
| `app/(dashboard)/tasas/page.tsx` | Create | Tasas overview page with chart. |
| `scripts/001_schema.sql` | Modify | Add `tea`, `cftea_con_iva`, `cftea_sin_iva` columns. |

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | P1 table regex parser | New test vectors in `test_extract.py`. |
| Unit | Legal block fallback parsing | New fixtures from PDFs with missing P1. |
| Unit | Verification status | Add tests for Coincide/No coincide/Sin dato in `lib/tasas.ts`. |
| Integration | /api/extract response includes tasas | Extend existing API tests. |
| UI | Tasas rendering with missing values | Component tests (if available) or manual smoke plan. |

## Migration / Rollout

- **Schema**: add columns in Supabase via SQL (update `scripts/001_schema.sql` and run migration in DB).
- **Backfill**: no automatic job; the existing `uploadStatement(formData, forceReplace=true)` flow handles re-upload. The `version` field on statements tracks replacements.
- **Rollout**: deploy extractor + schema first, then UI. If extractor runs before migration, guard by ignoring tasas persistence (log + continue).

## Open Questions

- [ ] Confirm exact P1 “Tasas” table labels across PDF samples to finalize regex patterns.
- [ ] Should verification compare all three tasas or only CFTEA con IVA (spec says “tasas values”; clarify)?
