import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Transaction } from '@/lib/types'

interface PeriodBreakdownProps {
  transactions: Transaction[]
}

function formatCurrency(amount: number): string {
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
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
  CONSUMO: 'Purchases',
  PAGO: 'Payments',
  IMPUESTO: 'Taxes',
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
          <CardTitle className="text-lg">Spending by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {typeBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions in this period.</p>
          ) : (
            <div className="space-y-3">
              {typeBreakdown.map((item) => (
                <div key={item.type} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 shrink">
                    <Badge variant={typeBadgeVariants[item.type] || 'outline'} className="shrink-0">
                      {typeLabels[item.type] || item.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      ({item.count} txns)
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Merchants</CardTitle>
        </CardHeader>
        <CardContent>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase transactions.</p>
          ) : (
            <div className="space-y-3">
              {topMerchants.map((item, index) => (
                <div key={item.merchant} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-muted-foreground w-5 shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium truncate">
                      {item.merchant}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium tabular-nums">{formatCurrency(item.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} {item.count === 1 ? 'txn' : 'txns'}
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
