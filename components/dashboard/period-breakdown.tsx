import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import type { Transaction } from '@/lib/types'

interface PeriodBreakdownProps {
  transactions: Transaction[]
}

interface TypeBreakdown {
  type: string
  total: number
  count: number
  percentage: number
}

interface MerchantBreakdown {
  merchant: string
  total: number
  count: number
}

function calculateTypeBreakdown(transactions: Transaction[]): TypeBreakdown[] {
  const totals = new Map<string, { total: number; count: number }>()
  let grandTotal = 0

  for (const txn of transactions) {
    const existing = totals.get(txn.type) || { total: 0, count: 0 }
    existing.total += txn.amount_ars
    existing.count += 1
    totals.set(txn.type, existing)
    grandTotal += txn.amount_ars
  }

  return Array.from(totals.entries())
    .map(([type, data]) => ({
      type,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

function calculateTopMerchants(transactions: Transaction[]): MerchantBreakdown[] {
  const totals = new Map<string, { total: number; count: number }>()

  // Only count CONSUMO transactions for top merchants
  const consumoTxns = transactions.filter((t) => t.type === 'CONSUMO')

  for (const txn of consumoTxns) {
    const existing = totals.get(txn.merchant) || { total: 0, count: 0 }
    existing.total += txn.amount_ars
    existing.count += 1
    totals.set(txn.merchant, existing)
  }

  return Array.from(totals.entries())
    .map(([merchant, data]) => ({
      merchant,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

const typeLabels: Record<string, string> = {
  CONSUMO: 'Consumos',
  PAGO: 'Pagos',
  IMPUESTO: 'Impuestos',
}

const typeBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CONSUMO: 'default',
  PAGO: 'secondary',
  IMPUESTO: 'destructive',
}

export function PeriodBreakdown({ transactions }: PeriodBreakdownProps) {
  const typeBreakdown = calculateTypeBreakdown(transactions)
  const topMerchants = calculateTopMerchants(transactions)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          {typeBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay transacciones en este período.</p>
          ) : (
            <div className="space-y-3">
              {typeBreakdown.map((item) => (
                <div key={item.type} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 shrink">
                    <Badge variant={typeBadgeVariants[item.type] || 'outline'} className="shrink-0">
                      {typeLabels[item.type] || item.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ({item.count} mov.)
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium tabular-nums">{formatCurrency(item.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Principales comercios</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay transacciones de consumo.</p>
          ) : (
            <div className="space-y-3 overflow-hidden">
              {topMerchants.map((item, index) => (
                <div key={item.merchant} className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-sm font-medium text-muted-foreground w-5 shrink-0 flex-none">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium truncate min-w-0 break-words">
                      {item.merchant}
                    </span>
                  </div>
                  <div className="text-right shrink-0 flex-none">
                    <p className="font-medium tabular-nums whitespace-nowrap">{formatCurrency(item.total)}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.count} {item.count === 1 ? 'mov.' : 'mov.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
