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

interface TransactionsTableProps {
  transactions: Transaction[]
}

function formatCurrency(amount: number): string {
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })
}

const typeLabels: Record<string, string> = {
  CONSUMO: 'Purchase',
  PAGO: 'Payment',
  IMPUESTO: 'Tax',
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
        <CardTitle className="text-lg">Transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search merchant..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-xs"
          />
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="CONSUMO">Purchases</SelectItem>
              <SelectItem value="PAGO">Payments</SelectItem>
              <SelectItem value="IMPUESTO">Taxes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paginatedTransactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {transactions.length === 0 ? 'No transactions found.' : 'No matching transactions.'}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Installments</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(txn.transaction_date)}
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
                  Showing {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
                  {filteredTransactions.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
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
