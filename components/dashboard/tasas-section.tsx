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
  if (status === 'Coincide') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 font-medium">
        ✓ Coincide
      </Badge>
    )
  }
  if (status === 'No coincide') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 font-medium">
        ⚠ No coincide
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="font-medium text-muted-foreground">
      ⏺ Sin dato
    </Badge>
  )
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
  const historyRows =
    statements && statements.length > 0 ? buildVerificationHistory(statements) : null

  if (!historyRows || historyRows.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Verificación histórica</CardTitle>
        <p className="text-xs text-muted-foreground">
          Compara la CFTEA con IVA efectiva contra la anunciada en el resumen anterior
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">CFTEA actual</TableHead>
              <TableHead className="text-right">CFTEA anunciada</TableHead>
              <TableHead className="text-right">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyRows.map((row) => (
              <TableRow key={row.period}>
                <TableCell className="font-medium tabular-nums">{row.period}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatTasa(row.cftea_actual)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
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
  )
}
