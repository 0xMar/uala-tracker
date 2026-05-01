import { getStatements, getAllTransactions } from '@/lib/supabase/queries'
import { StatementsList } from '@/components/dashboard/statements-list'
import { TransactionsTable } from '@/components/dashboard/transactions-table'

export default async function StatementsPage() {
  const [statements, allTransactions] = await Promise.all([
    getStatements(),
    getAllTransactions(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Resúmenes</h1>
        <p className="text-muted-foreground">
          Visualizá y gestioná tus resúmenes de tarjeta de crédito
        </p>
      </div>

      <StatementsList statements={statements} />

      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Todas las transacciones</h2>
        <p className="text-muted-foreground text-sm">
          Navegá todas las transacciones de todos los resúmenes
        </p>
      </div>

      <TransactionsTable transactions={allTransactions} />
    </div>
  )
}
