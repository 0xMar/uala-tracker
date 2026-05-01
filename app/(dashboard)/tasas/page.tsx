import { getStatements } from '@/lib/supabase/queries'
import { TasasSection } from '@/components/dashboard/tasas-section'
import { CfteaEvolutionChart } from '@/components/dashboard/cftea-evolution-chart'

export default async function TasasPage() {
  const statements = await getStatements()

  // Sorted descending — latest first
  const sorted = [...statements].sort((a, b) => b.period.localeCompare(a.period))
  const latestStatement = sorted[0] ?? null
  const previousStatement = sorted[1] ?? null

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Tasas</h1>
        <p className="text-muted-foreground">
          Evolución de tasas de financiación de tu tarjeta Ualá
        </p>
      </div>

      {latestStatement ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <TasasSection
              currentStatement={latestStatement}
              previousStatement={previousStatement}
              statements={statements}
            />
          </div>

          <CfteaEvolutionChart statements={statements} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay resúmenes cargados. Subí un PDF para ver las tasas.
        </p>
      )}
    </div>
  )
}
