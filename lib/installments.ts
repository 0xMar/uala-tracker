import type { Transaction } from '@/lib/types'

export interface InstallmentGroup {
  merchant: string
  originalDate: string
  installmentCurrent: number
  installmentsTotal: number
  amountPerInstallment: number
  totalRemaining: number
  progress: number
  remainingMonths: string[]
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}

export function groupInstallments(transactions: Transaction[]): InstallmentGroup[] {
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
