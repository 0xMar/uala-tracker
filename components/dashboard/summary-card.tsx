import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { formatTasa, computeTasasStatus, type TasasStatus } from '@/lib/tasas'
import type { Statement } from '@/lib/types'

interface SummaryCardProps {
  currentStatement: Statement | null
  previousStatement: Statement | null
  activeInstallmentsDebt?: number
}

/**
 * Renders a badge indicating whether the current statement's rates (Tasas) match the previous one.
 * 
 * @param props - Component properties containing the Tasas status.
 * @returns The rendered badge component.
 */
function TasasStatusBadge({ status }: { status: TasasStatus }) {
  if (status === 'Coincide') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 font-medium">
        ✓ Coincide
      </Badge>
    )
  }
  if (status === 'No coincide') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 font-medium">
        ⚠ No coincide
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="font-medium">
      Sin dato
    </Badge>
  )
}

/**
 * Calculates the absolute value and percentage difference between the current and previous values.
 * 
 * @param current - The current numeric value.
 * @param previous - The previous numeric value to compare against.
 * @returns An object containing the difference value and percentage, or null if either value is null/zero.
 */
function calculateDelta(current: number | null, previous: number | null): { value: number; percentage: number } | null {
  if (current === null || previous === null || previous === 0) return null
  const value = current - previous
  const percentage = (value / previous) * 100
  return { value, percentage }
}

/**
 * SummaryCard component displaying the core financials of the most recent statement.
 * Calculates and shows the real available credit by subtracting both the statement debt 
 * and the active installments future debt from the credit limit.
 * 
 * @param props - Component properties containing statement data and the active installments debt.
 * @returns The rendered SummaryCard.
 */
export function SummaryCard({ currentStatement, previousStatement, activeInstallmentsDebt = 0 }: SummaryCardProps) {
  if (!currentStatement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen actual</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todavía no hay resúmenes. Subí un PDF para empezar.
          </p>
        </CardContent>
      </Card>
    )
  }

  const delta = calculateDelta(currentStatement.total_debt_ars, previousStatement?.total_debt_ars ?? null)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Resumen {currentStatement.period}
          </CardTitle>
          <Badge variant={currentStatement.is_paid ? 'default' : 'secondary'}>
            {currentStatement.is_paid ? 'Pagado' : 'Pendiente'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Deuda total</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatCurrency(currentStatement.total_debt_ars)}
            </span>
            {delta && (
              <span className={`text-sm font-medium ${delta.value > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {delta.value > 0 ? '+' : ''}{delta.percentage.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pago mínimo</p>
            <p className="text-lg font-semibold">{formatCurrency(currentStatement.minimum_payment)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo anterior</p>
            <p className="text-lg font-semibold">{formatCurrency(currentStatement.previous_balance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Fecha de vencimiento</p>
            <p className="text-base font-medium">{formatDate(currentStatement.due_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de cierre</p>
            <p className="text-base font-medium">{formatDate(currentStatement.close_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Límite de crédito</p>
            <p className="text-base font-medium">{formatCurrency(currentStatement.credit_limit)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Crédito disponible</p>
            <p className="text-base font-medium">
              {currentStatement.credit_limit !== null && currentStatement.total_debt_ars !== null
                ? formatCurrency(currentStatement.credit_limit - currentStatement.total_debt_ars - activeInstallmentsDebt)
                : '-'}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Tasas</p>
            <TasasStatusBadge status={computeTasasStatus(currentStatement, previousStatement)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">TNA</p>
              <p className="text-base font-medium">{formatTasa(currentStatement.tna)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CFTEA con IVA</p>
              <p className="text-base font-medium">{formatTasa(currentStatement.cftea_con_iva)}</p>
            </div>
          </div>
          <Link
            href="/tasas"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Ver historial de tasas →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
