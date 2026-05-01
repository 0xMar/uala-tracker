'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTasa, computeTasasStatus, type TasasStatus } from '@/lib/tasas'
import type { Statement } from '@/lib/types'

interface TasasSectionProps {
  currentStatement: Statement
  previousStatement: Statement | null
  statements?: Statement[]
}

function StatusBadge({ status }: { status: TasasStatus }) {
  const variant =
    status === 'Coincide'
      ? 'default'
      : status === 'No coincide'
        ? 'destructive'
        : 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}

interface HistoryRow {
  period: string
  cftea_actual: number | null
  cftea_anunciada: number | null
  status: TasasStatus
}

function buildVerificationHistory(statements: Statement[]): HistoryRow[] {
  const sorted = [...statements].sort((a, b) => b.period.localeCompare(a.period))
  return sorted.map((stmt, idx) => {
    const previous = sorted[idx + 1] ?? null
    return {
      period: stmt.period,
      cftea_actual: stmt.cftea_con_iva,
      cftea_anunciada: previous?.cftea_con_iva_anunciada ?? null,
      status: computeTasasStatus(stmt, previous),
    }
  })
}

export function TasasSection({
  currentStatement,
  previousStatement,
  statements,
}: TasasSectionProps) {
  const status = computeTasasStatus(currentStatement, previousStatement)
  const hasTasas =
    currentStatement.tna !== null ||
    currentStatement.tea !== null ||
    currentStatement.cftea_con_iva !== null

  const historyRows = statements && statements.length > 0
    ? buildVerificationHistory(statements)
    : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tasas</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasTasas && (
            <p className="text-sm text-muted-foreground">
              No hay tasas disponibles para este resumen.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">TNA</p>
              <p className="text-base font-medium">{formatTasa(currentStatement.tna)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">TEA</p>
              <p className="text-base font-medium">{formatTasa(currentStatement.tea)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CFTEA con IVA</p>
              <p className="text-base font-medium">{formatTasa(currentStatement.cftea_con_iva)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CFTEA sin IVA</p>
              <p className="text-base font-medium">{formatTasa(currentStatement.cftea_sin_iva)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {historyRows && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Historial de verificación</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">CFTEA con IVA actual</TableHead>
                  <TableHead className="text-right">CFTEA con IVA anunciada</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyRows.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="font-medium">{row.period}</TableCell>
                    <TableCell className="text-right">
                      {formatTasa(row.cftea_actual)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatTasa(row.cftea_anunciada)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
