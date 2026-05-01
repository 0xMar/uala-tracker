import { getStatements } from '@/lib/supabase/queries'
import { formatTasa } from '@/lib/tasas'
import { TasasSection } from '@/components/dashboard/tasas-section'
import { CfteaEvolutionChart } from '@/components/dashboard/cftea-evolution-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TasaRow {
  label: string
  value: number | null
}

function TasasGrid({ rows }: { rows: TasaRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{formatTasa(value)}</p>
        </div>
      ))}
    </div>
  )
}

export default async function TasasPage() {
  const statements = await getStatements()

  // Sorted descending — latest first
  const sorted = [...statements].sort((a, b) => b.period.localeCompare(a.period))
  const latestStatement = sorted[0] ?? null
  const previousStatement = sorted[1] ?? null

  const announcedAllNull =
    latestStatement === null ||
    (latestStatement.tna_anunciada === null &&
      latestStatement.tea_anunciada === null &&
      latestStatement.cftea_con_iva_anunciada === null &&
      latestStatement.cftna_con_iva_anunciada === null)

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Tasas</h1>
        <p className="text-sm text-muted-foreground">
          Evolución de tasas de financiación de tu tarjeta Ualá
        </p>
      </div>

      {latestStatement ? (
        <>
          {/* Section 1 — Tasas del ciclo actual */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Tasas del ciclo actual
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {latestStatement.period}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TasasGrid
                rows={[
                  { label: 'TNA', value: latestStatement.tna },
                  { label: 'TEA', value: latestStatement.tea },
                  { label: 'CFTEA con IVA', value: latestStatement.cftea_con_iva },
                  { label: 'CFTNA con IVA', value: latestStatement.cftna_con_iva },
                ]}
              />
            </CardContent>
          </Card>

          {/* Section 2 — Tasas anunciadas (próximo ciclo) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tasas anunciadas</CardTitle>
              <p className="text-xs text-muted-foreground">Tasas informadas para el próximo ciclo</p>
            </CardHeader>
            <CardContent>
              {announcedAllNull ? (
                <p className="text-sm text-muted-foreground">
                  No hay tasas anunciadas para el próximo ciclo.
                </p>
              ) : (
                <TasasGrid
                  rows={[
                    { label: 'TNA anunciada', value: latestStatement.tna_anunciada },
                    { label: 'TEA anunciada', value: latestStatement.tea_anunciada },
                    { label: 'CFTEA con IVA anunciada', value: latestStatement.cftea_con_iva_anunciada },
                    { label: 'CFTNA con IVA anunciada', value: latestStatement.cftna_con_iva_anunciada },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Chart evolución CFTEA con IVA */}
          <CfteaEvolutionChart statements={statements} />

          {/* Section 4 — Verificación histórica */}
          <TasasSection
            currentStatement={latestStatement}
            previousStatement={previousStatement}
            statements={statements}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay resúmenes cargados. Subí un PDF para ver las tasas.
        </p>
      )}
    </div>
  )
}
