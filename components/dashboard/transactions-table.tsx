'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Transaction } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/format'

interface TransactionsTableProps {
  transactions: Transaction[]
}

const typeLabels: Record<string, string> = {
  CONSUMO: 'Consumo',
  PAGO: 'Pago',
  IMPUESTO: 'Impuesto',
}

const typeBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CONSUMO: 'default',
  PAGO: 'secondary',
  IMPUESTO: 'destructive',
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch = txn.merchant.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || txn.type === typeFilter
      return matchesSearch && matchesType
    })
  }, [transactions, search, typeFilter])

  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transacciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Buscar comercio…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            name="search"
            autoComplete="off"
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CONSUMO">Consumos</SelectItem>
                <SelectItem value="PAGO">Pagos</SelectItem>
                <SelectItem value="IMPUESTO">Impuestos</SelectItem>
              </SelectContent>
          </Select>
        </div>

        {paginatedTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {transactions.length === 0 ? 'No hay transacciones.' : 'No hay transacciones que coincidan.'}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comercio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cuotas</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(txn.transaction_date, { year: false })}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {txn.merchant}
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeBadgeVariants[txn.type] || 'outline'}>
                        {typeLabels[txn.type] || txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {txn.installments_total && txn.installments_total > 1 ? (
                        <span className="text-sm">
                          {txn.installment_current}/{txn.installments_total}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(txn.amount_ars)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredTransactions.length)} de{' '}
                  {filteredTransactions.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
