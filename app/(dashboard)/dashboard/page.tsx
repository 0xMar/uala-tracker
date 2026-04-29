import { getStatements, getLatestStatement, getAllTransactions } from '@/lib/supabase/queries'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { ActiveInstallments } from '@/components/dashboard/active-installments'
import { PeriodBreakdown } from '@/components/dashboard/period-breakdown'
import { MonthlyEvolution } from '@/components/dashboard/monthly-evolution'
import { TransactionsTable } from '@/components/dashboard/transactions-table'
import { StatementsList } from '@/components/dashboard/statements-list'

export default async function DashboardPage() {
  // Fetch all data server-side in parallel
  const [statements, latestStatement, allTransactions] = await Promise.all([
    getStatements(),
    getLatestStatement(),
    getAllTransactions(),
  ])

  // Get previous statement for delta calculation
  const previousStatement = statements.length > 1 ? statements[1] : null

  // Filter transactions for the latest statement
  const latestTransactions = latestStatement
    ? allTransactions.filter((t) => t.statement_id === latestStatement.id)
    : []

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
