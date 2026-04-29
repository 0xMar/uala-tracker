'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { Statement } from '@/lib/types'

interface MonthlyEvolutionProps {
  statements: Statement[]
}

interface ChartData {
  period: string
  totalDebt: number
  minimumPayment: number
}

function formatCurrency(value: number): string {
  return `$ ${value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function prepareChartData(statements: Statement[]): ChartData[] {
  // Sort by period ascending for the chart
  const sorted = [...statements].sort((a, b) => a.period.localeCompare(b.period))
  
  return sorted.map((s) => ({
    period: s.period,
    totalDebt: s.total_debt_ars ?? 0,
    minimumPayment: s.minimum_payment ?? 0,
  }))
}

export function MonthlyEvolution({ statements }: MonthlyEvolutionProps) {
  const chartData = prepareChartData(statements)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Evolution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data available. Upload statements to see the evolution chart.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Evolution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Period: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalDebt"
                name="Total Debt"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ 
                  fill: 'var(--chart-1)',
                  stroke: 'var(--card)',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{ r: 6, fill: 'var(--chart-1)', stroke: 'var(--card)', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="minimumPayment"
                name="Minimum Payment"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ 
                  fill: 'var(--chart-2)',
                  stroke: 'var(--card)',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{ r: 6, fill: 'var(--chart-2)', stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
