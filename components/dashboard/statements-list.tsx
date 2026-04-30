'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import type { Statement } from '@/lib/types'
import { toggleStatementPaid } from '@/lib/actions'
import { formatCurrency, formatDate } from '@/lib/format'

interface StatementItemProps {
  statement: Statement
}

function StatementItem({ statement }: StatementItemProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticPaid, setOptimisticPaid] = useState(statement.is_paid)

  const handleToggle = () => {
    const newValue = !optimisticPaid
    setOptimisticPaid(newValue)
    
    startTransition(async () => {
      try {
        await toggleStatementPaid(statement.id, newValue)
      } catch {
        // Revert on error
        setOptimisticPaid(!newValue)
      }
    })
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Top row: period + badges on left, toggle on right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="font-semibold">{statement.period}</span>
          <Badge variant={optimisticPaid ? 'default' : 'secondary'}>
            {optimisticPaid ? 'Paid' : 'Pending'}
          </Badge>
          {statement.version > 1 && (
            <Badge variant="outline">v{statement.version}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPending && <Spinner className="h-4 w-4" />}
          <span className="text-sm text-muted-foreground whitespace-nowrap">Mark paid</span>
          <Switch
            checked={optimisticPaid}
            onCheckedChange={handleToggle}
            disabled={isPending}
          />
        </div>
      </div>
      {/* Bottom row: total + due date */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Total: {formatCurrency(statement.total_debt_ars)}</span>
        <span>Due: {formatDate(statement.due_date)}</span>
      </div>
    </div>
  )
}

export function StatementsList({ statements }: StatementsListProps) {
  const [showAll, setShowAll] = useState(false)
  
  const displayedStatements = showAll ? statements : statements.slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">All Statements</CardTitle>
      </CardHeader>
      <CardContent>
        {statements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No statements yet. Upload a PDF to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {displayedStatements.map((statement) => (
              <StatementItem key={statement.id} statement={statement} />
            ))}
            
            {statements.length > 5 && (
              <div className="pt-2 text-center">
                <Button
                  variant="ghost"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? 'Show Less' : `Show All (${statements.length})`}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
