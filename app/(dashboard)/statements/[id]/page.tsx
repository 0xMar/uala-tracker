import { getStatements, getStatement, getTransactions } from '@/lib/supabase/queries'
import { TasasSection } from '@/components/dashboard/tasas-section'
import { TransactionsTable } from '@/components/dashboard/transactions-table'
import { formatCurrency, formatDate } from '@/lib/format'
import { notFound } from 'next/navigation'

interface StatementDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function StatementDetailPage({ params }: StatementDetailPageProps) {
  const { id } = await params
  const [statement, statements, transactions] = await Promise.all([
    getStatement(id),
    getStatements(),
    getTransactions(id),
  ])

  if (!statement) {
    notFound()
  }

  // Find the previous statement (the one immediately before this one by period)
  const sorted = [...statements].sort((a, b) => b.period.localeCompare(a.period))
  const currentIndex = sorted.findIndex((s) => s.id === id)
  const previousStatement = currentIndex >= 0 && currentIndex < sorted.length - 1
    ? sorted[currentIndex + 1]
    : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Statement {statement.period}</h1>
        <p className="text-muted-foreground">
          {formatDate(statement.period_from)} – {formatDate(statement.period_to)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Statement summary */}
        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <h2 className="font-semibold">Summary</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total Debt</p>
                <p className="font-medium">{formatCurrency(statement.total_debt_ars)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Minimum Payment</p>
                <p className="font-medium">{formatCurrency(statement.minimum_payment)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(statement.due_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Close Date</p>
                <p className="font-medium">{formatDate(statement.close_date)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tasas section */}
        <TasasSection
          currentStatement={statement}
          previousStatement={previousStatement}
        />
      </div>

      {/* Transactions */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Transactions</h2>
        <p className="text-muted-foreground text-sm">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} in this period
        </p>
      </div>
      <TransactionsTable transactions={transactions} />
    </div>
  )
}
