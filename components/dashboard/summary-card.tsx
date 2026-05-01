import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { formatTasa } from '@/lib/tasas'
import type { Statement } from '@/lib/types'

interface SummaryCardProps {
  currentStatement: Statement | null
  previousStatement: Statement | null
}

function calculateDelta(current: number | null, previous: number | null): { value: number; percentage: number } | null {
  if (current === null || previous === null || previous === 0) return null
  const value = current - previous
  const percentage = (value / previous) * 100
  return { value, percentage }
}

export function SummaryCard({ currentStatement, previousStatement }: SummaryCardProps) {
  if (!currentStatement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No statements yet. Upload a PDF to get started.
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
            Statement {currentStatement.period}
          </CardTitle>
          <Badge variant={currentStatement.is_paid ? 'default' : 'secondary'}>
            {currentStatement.is_paid ? 'Paid' : 'Pending'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Debt</p>
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
            <p className="text-sm text-muted-foreground">Minimum Payment</p>
            <p className="text-lg font-semibold">{formatCurrency(currentStatement.minimum_payment)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Previous Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(currentStatement.previous_balance)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className="text-base font-medium">{formatDate(currentStatement.due_date)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Close Date</p>
            <p className="text-base font-medium">{formatDate(currentStatement.close_date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Credit Limit</p>
            <p className="text-base font-medium">{formatCurrency(currentStatement.credit_limit)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available Credit</p>
            <p className="text-base font-medium">
              {currentStatement.credit_limit !== null && currentStatement.total_debt_ars !== null
                ? formatCurrency(currentStatement.credit_limit - currentStatement.total_debt_ars)
                : '-'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">TNA</p>
            <p className="text-base font-medium">
              {currentStatement.tna !== null ? `${currentStatement.tna}%` : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CFTEA con IVA</p>
            <p className="text-base font-medium">
              {formatTasa(currentStatement.cftea_con_iva)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
