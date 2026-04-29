import { SummaryCard } from '@/components/dashboard/summary-card'
import { ActiveInstallments } from '@/components/dashboard/active-installments'
import { PeriodBreakdown } from '@/components/dashboard/period-breakdown'
import { MonthlyEvolution } from '@/components/dashboard/monthly-evolution'
import { TransactionsTable } from '@/components/dashboard/transactions-table'
import { StatementsList } from '@/components/dashboard/statements-list'
import type { Statement, Transaction } from '@/lib/types'

// Hardcoded demo data for screenshots
const DEMO_STATEMENTS: Statement[] = [
  {
    id: 'demo-1',
    user_id: 'demo-user',
    period: '2026-04',
    version: 1,
    is_paid: false,
    total_debt_ars: 487523.45,
    minimum_payment: 48752.35,
    previous_balance: 425890.12,
    credit_limit: 1500000,
    tna: 182.5,
    close_date: '2026-04-15',
    due_date: '2026-04-28',
    next_close_date: '2026-05-15',
    next_due_date: '2026-05-28',
    period_from: '2026-03-16',
    period_to: '2026-04-15',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'demo-2',
    user_id: 'demo-user',
    period: '2026-03',
    version: 1,
    is_paid: true,
    total_debt_ars: 425890.12,
    minimum_payment: 42589.01,
    previous_balance: 398234.56,
    credit_limit: 1500000,
    tna: 180.0,
    close_date: '2026-03-15',
    due_date: '2026-03-28',
    next_close_date: '2026-04-15',
    next_due_date: '2026-04-28',
    period_from: '2026-02-16',
    period_to: '2026-03-15',
    created_at: '2026-03-16T10:00:00Z',
  },
  {
    id: 'demo-3',
    user_id: 'demo-user',
    period: '2026-02',
    version: 1,
    is_paid: true,
    total_debt_ars: 398234.56,
    minimum_payment: 39823.46,
    previous_balance: 352180.90,
    credit_limit: 1500000,
    tna: 178.0,
    close_date: '2026-02-15',
    due_date: '2026-02-28',
    next_close_date: '2026-03-15',
    next_due_date: '2026-03-28',
    period_from: '2026-01-16',
    period_to: '2026-02-15',
    created_at: '2026-02-16T10:00:00Z',
  },
  {
    id: 'demo-4',
    user_id: 'demo-user',
    period: '2026-01',
    version: 1,
    is_paid: true,
    total_debt_ars: 352180.90,
    minimum_payment: 35218.09,
    previous_balance: 310456.78,
    credit_limit: 1200000,
    tna: 175.0,
    close_date: '2026-01-15',
    due_date: '2026-01-28',
    next_close_date: '2026-02-15',
    next_due_date: '2026-02-28',
    period_from: '2025-12-16',
    period_to: '2026-01-15',
    created_at: '2026-01-16T10:00:00Z',
  },
  {
    id: 'demo-5',
    user_id: 'demo-user',
    period: '2025-12',
    version: 1,
    is_paid: true,
    total_debt_ars: 310456.78,
    minimum_payment: 31045.68,
    previous_balance: 245890.34,
    credit_limit: 1200000,
    tna: 172.0,
    close_date: '2025-12-15',
    due_date: '2025-12-28',
    next_close_date: '2026-01-15',
    next_due_date: '2026-01-28',
    period_from: '2025-11-16',
    period_to: '2025-12-15',
    created_at: '2025-12-16T10:00:00Z',
  },
  {
    id: 'demo-6',
    user_id: 'demo-user',
    period: '2025-11',
    version: 1,
    is_paid: true,
    total_debt_ars: 245890.34,
    minimum_payment: 24589.03,
    previous_balance: 198765.12,
    credit_limit: 1000000,
    tna: 168.0,
    close_date: '2025-11-15',
    due_date: '2025-11-28',
    next_close_date: '2025-12-15',
    next_due_date: '2025-12-28',
    period_from: '2025-10-16',
    period_to: '2025-11-15',
    created_at: '2025-11-16T10:00:00Z',
  },
  {
    id: 'demo-7',
    user_id: 'demo-user',
    period: '2025-10',
    version: 1,
    is_paid: true,
    total_debt_ars: 198765.12,
    minimum_payment: 19876.51,
    previous_balance: 156234.89,
    credit_limit: 1000000,
    tna: 165.0,
    close_date: '2025-10-15',
    due_date: '2025-10-28',
    next_close_date: '2025-11-15',
    next_due_date: '2025-11-28',
    period_from: '2025-09-16',
    period_to: '2025-10-15',
    created_at: '2025-10-16T10:00:00Z',
  },
]

const DEMO_TRANSACTIONS: Transaction[] = [
  // Current statement transactions (demo-1)
  {
    id: 'txn-1',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-04-10',
    merchant: 'Mercado Libre',
    amount_ars: 45890.00,
    installment_current: 1,
    installments_total: 6,
    coupon_number: '001234',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-2',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-04-08',
    merchant: 'Carrefour',
    amount_ars: 28456.78,
    installment_current: null,
    installments_total: null,
    coupon_number: '001235',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-3',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-04-05',
    merchant: 'Spotify',
    amount_ars: 4299.00,
    installment_current: null,
    installments_total: null,
    coupon_number: '001236',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-4',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-04-03',
    merchant: 'Garbarino',
    amount_ars: 89990.00,
    installment_current: 3,
    installments_total: 12,
    coupon_number: '001237',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-5',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-28',
    merchant: 'YPF',
    amount_ars: 35000.00,
    installment_current: null,
    installments_total: null,
    coupon_number: '001238',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-6',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-25',
    merchant: 'Netflix',
    amount_ars: 8999.00,
    installment_current: null,
    installments_total: null,
    coupon_number: '001239',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-7',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-22',
    merchant: 'Farmacity',
    amount_ars: 12340.50,
    installment_current: null,
    installments_total: null,
    coupon_number: '001240',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-8',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-20',
    merchant: 'Fravega',
    amount_ars: 156780.00,
    installment_current: 2,
    installments_total: 18,
    coupon_number: '001241',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-9',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-18',
    merchant: 'Rappi',
    amount_ars: 8765.00,
    installment_current: null,
    installments_total: null,
    coupon_number: '001242',
    type: 'CONSUMO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-10',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-15',
    merchant: 'IVA Compras',
    amount_ars: 15678.90,
    installment_current: null,
    installments_total: null,
    coupon_number: null,
    type: 'IMPUESTO',
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 'txn-11',
    user_id: 'demo-user',
    statement_id: 'demo-1',
    transaction_date: '2026-03-15',
    merchant: 'Pago Recibido - Gracias',
    amount_ars: -425890.12,
    installment_current: null,
    installments_total: null,
    coupon_number: null,
    type: 'PAGO',
    created_at: '2026-04-16T10:00:00Z',
  },
  // All transactions for active installments tracking
  {
    id: 'txn-12',
    user_id: 'demo-user',
    statement_id: 'demo-2',
    transaction_date: '2026-03-03',
    merchant: 'Garbarino',
    amount_ars: 89990.00,
    installment_current: 2,
    installments_total: 12,
    coupon_number: '001137',
    type: 'CONSUMO',
    created_at: '2026-03-16T10:00:00Z',
  },
  {
    id: 'txn-13',
    user_id: 'demo-user',
    statement_id: 'demo-2',
    transaction_date: '2026-02-20',
    merchant: 'Fravega',
    amount_ars: 156780.00,
    installment_current: 1,
    installments_total: 18,
    coupon_number: '001141',
    type: 'CONSUMO',
    created_at: '2026-03-16T10:00:00Z',
  },
  {
    id: 'txn-14',
    user_id: 'demo-user',
    statement_id: 'demo-3',
    transaction_date: '2026-02-03',
    merchant: 'Garbarino',
    amount_ars: 89990.00,
    installment_current: 1,
    installments_total: 12,
    coupon_number: '001037',
    type: 'CONSUMO',
    created_at: '2026-02-16T10:00:00Z',
  },
]

export default function DemoPage() {
  const latestStatement = DEMO_STATEMENTS[0]
  const previousStatement = DEMO_STATEMENTS[1]
  const latestTransactions = DEMO_TRANSACTIONS.filter(
    (t) => t.statement_id === latestStatement.id
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          View your credit card statements and transactions
        </p>
      </div>

      {/* Top row: Summary + Installments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryCard
          currentStatement={latestStatement}
          previousStatement={previousStatement}
        />
        <ActiveInstallments transactions={DEMO_TRANSACTIONS} />
      </div>

      {/* Period Breakdown */}
      <PeriodBreakdown transactions={latestTransactions} />

      {/* Monthly Evolution Chart */}
      <MonthlyEvolution statements={DEMO_STATEMENTS} />

      {/* Transactions Table */}
      <TransactionsTable transactions={latestTransactions} />

      {/* Statements List */}
      <StatementsList statements={DEMO_STATEMENTS} />
    </div>
  )
}
