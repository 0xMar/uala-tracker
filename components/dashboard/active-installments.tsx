import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Transaction } from '@/lib/types'

interface ActiveInstallmentsProps {
  transactions: Transaction[]
}

function formatCurrency(amount: number): string {
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

interface InstallmentGroup {
  merchant: string
  originalDate: string
  installmentCurrent: number
  installmentsTotal: number
  amountPerInstallment: number
  totalRemaining: number
  progress: number
  remainingMonths: string[]
}

function groupInstallments(transactions: Transaction[]): InstallmentGroup[] {
  // Filter only transactions with installments > 1
  const installmentTxns = transactions.filter(
    (t) => t.installments_total !== null && t.installments_total > 1
  )

  // Group by (merchant, amount_ars, installments_total, transaction_date) to identify unique purchases
  const groups = new Map<string, {
    merchant: string
    originalDate: string
    installmentsTotal: number
    amountPerInstallment: number
    maxInstallmentCurrent: number
  }>()

  for (const txn of installmentTxns) {
    // Group by merchant + installments_total only — tolerant to minor amount
    // variations across statements (rounding differences between periods)
    const key = `${txn.merchant}-${txn.installments_total}`
    
    const existing = groups.get(key)
    const current = txn.installment_current ?? 1
    
    if (!existing) {
      groups.set(key, {
        merchant: txn.merchant,
        originalDate: txn.transaction_date,
        installmentsTotal: txn.installments_total ?? 1,
        amountPerInstallment: txn.amount_ars,
        maxInstallmentCurrent: current,
      })
    } else {
      // Take MAX(installment_current) to know where we are today
      existing.maxInstallmentCurrent = Math.max(existing.maxInstallmentCurrent, current)
    }
  }

  // Convert to InstallmentGroup with remaining calculations
  const result: InstallmentGroup[] = []
  
  for (const group of groups.values()) {
    const remaining = group.installmentsTotal - group.maxInstallmentCurrent
    
    // Skip if already fully paid
    if (remaining <= 0) continue
    
    // Calculate projected months for remaining installments
    const remainingMonths: string[] = []
    const today = new Date()
    for (let i = 1; i <= remaining; i++) {
      const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1)
      remainingMonths.push(formatMonth(futureDate))
    }
    
    result.push({
      merchant: group.merchant,
      originalDate: group.originalDate,
      installmentCurrent: group.maxInstallmentCurrent,
      installmentsTotal: group.installmentsTotal,
      amountPerInstallment: group.amountPerInstallment,
      totalRemaining: group.amountPerInstallment * remaining,
      progress: (group.maxInstallmentCurrent / group.installmentsTotal) * 100,
      remainingMonths,
    })
  }

  // Sort by remaining amount (highest first)
  return result.sort((a, b) => b.totalRemaining - a.totalRemaining)
}

export function ActiveInstallments({ transactions }: ActiveInstallmentsProps) {
  const installments = groupInstallments(transactions)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Active Installments</CardTitle>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active installment plans.</p>
        ) : (
          <div className="space-y-4">
            {installments.slice(0, 5).map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate max-w-[60%]">
                    {item.merchant}
                  </span>
                  <Badge variant="outline">
                    {item.installmentCurrent}/{item.installmentsTotal}
                  </Badge>
                </div>
                <Progress value={item.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(item.amountPerInstallment)}/month</span>
                  <span>{formatCurrency(item.totalRemaining)} remaining</span>
                </div>
                {item.remainingMonths.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Next: {item.remainingMonths.slice(0, 3).join(', ')}
                    {item.remainingMonths.length > 3 && ` +${item.remainingMonths.length - 3} more`}
                  </p>
                )}
              </div>
            ))}
            {installments.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{installments.length - 5} more installment plans
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
