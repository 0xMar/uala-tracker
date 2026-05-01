# Proposal: Tasas + CFTEA extraction & tracking

## Intent

Expose and persist CFTEA con IVA (y otras tasas) from Ualá statements to enable a new “Tasas” section, a CFTEA evolution chart, and verification of current actual rates vs previously announced rates.

## Scope

### In Scope
- Extract tasas from PDF (P1 table prioritized, legal block fallback).
- Persist tasas in `statements` (new columns).
- New “Tasas” section in statement details.
- CFTEA con IVA evolution chart across statements.
- Verification logic: current actual vs previous statement announced, with status indicator.
- Assisted backfill mode (user re-uploads PDF to enrich missing tasas via existing upload flow with forceReplace).

### Out of Scope
- OCR for image-only PDFs.
- Recomputing CFTEA (only extract what statement declares).
- Automated bulk backfill without user input.
- Notifications/alerts beyond UI status.

## Capabilities

### New Capabilities
- `tasas-extraction`: Extract CFTEA/TEA/TNA-related values from statements and store them.
- `tasas-visualization`: Show Tasas section + CFTEA evolution chart.
- `tasas-verification`: Compare current actual vs previous announced tasas.

### Modified Capabilities
None.

## Approach

- Parse P1 “Tasas” table via regex; if missing, parse “Legales” block on last page.
- Extend `statements` with numeric columns: `tea`, `cftea_con_iva`, `cftea_sin_iva` (TNA already exists).
- Verification uses prior statement values (no new table): current actual vs previous announced → badge (Coincide/No coincide/Sin dato).
- Re-upload via existing `uploadStatement(forceReplace=true)` flow handles backfill; `version` field tracks replacements.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `api/extract/process.py` | Modified | Extract tasas from P1/legal block and return in statement payload. |
| `scripts/001_schema.sql` (or migration) | Modified | Add tasas columns to `statements`. |
| `lib/actions.ts` | Modified | Persist tasas on insert/update. |
| `components/dashboard/*` | New/Modified | Tasas section + CFTEA chart UI. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PDF formats vary; missing tasas | Med | Fallback to legal block; mark unknown. |
| False verification flags | Med | Tolerance + explicit “unknown” state. |
| Backfill friction | Med | Clear CTA + minimal re-upload flow. |

## Rollback Plan

Disable Tasas UI and verification; keep columns unused. Revert extraction changes; existing statements remain valid without tasas.

## Dependencies

- Supabase migration to add tasas columns.
- Sample PDFs with/without P1 tasas table for validation.

## Success Criteria

- [ ] Tasas values (CFTEA con IVA, CFTEA sin IVA, TEA) are stored per statement when present.
- [ ] “Tasas” section renders with extracted values or “No disponible”.
- [ ] CFTEA con IVA evolution chart shows historical series for ≥2 statements.
- [ ] Verification status compares current actual vs previous announced and surfaces Coincide/No coincide/Sin dato.
- [ ] Re-upload via existing upload flow (forceReplace=true) updates all statement fields including tasas.
