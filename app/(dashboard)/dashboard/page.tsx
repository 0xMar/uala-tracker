import { getStatements, getLatestStatement, getAllTransactions, getTransactionsByStatementId } from '@/lib/supabase/queries'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { ActiveInstallments } from '@/components/dashboard/active-installments'
import { PeriodBreakdown } from '@/components/dashboard/period-breakdown'
import { MonthlyEvolution } from '@/components/dashboard/monthly-evolution'
import { TransactionsTable } from '@/components/dashboard/transactions-table'
import { StatementsList } from '@/components/dashboard/statements-list'
import { groupInstallments } from '@/lib/installments'

export default async function DashboardPage() {
  // Fetch all data server-side in parallel
  const [statements, latestStatement, allTransactions] = await Promise.all([
    getStatements(),
    getLatestStatement(),
    getAllTransactions(),
  ])

  // Get previous statement for delta calculation
  const previousStatement = statements.length > 1 ? statements[1] : null

  // Fetch latest statement transactions directly (no client-side filter)
  const latestTransactions = latestStatement
    ? await getTransactionsByStatementId(latestStatement.id)
    : []

  // Calculate active installments remaining debt
  const installments = groupInstallments(allTransactions)
  const activeInstallmentsDebt = installments.reduce((acc, item) => acc + item.totalRemaining, 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Tus resúmenes y transacciones de tarjeta de crédito
        </p>
      </div>

      {/* Top row: Summary + Installments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryCard 
          currentStatement={latestStatement} 
          previousStatement={previousStatement} 
          activeInstallmentsDebt={activeInstallmentsDebt}
        />
        <ActiveInstallments transactions={allTransactions} />
      </div>

      {/* Period Breakdown */}
      <PeriodBreakdown transactions={latestTransactions} />

      {/* Monthly Evolution Chart */}
      <MonthlyEvolution statements={statements} />

      {/* Transactions Table */}
      <TransactionsTable transactions={latestTransactions} />

      {/* Statements List */}
      <StatementsList statements={statements} />
    </div>
  )
}
