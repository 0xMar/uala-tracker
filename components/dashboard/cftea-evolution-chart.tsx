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
import { formatTasa } from '@/lib/tasas'
import type { Statement } from '@/lib/types'

interface CfteaEvolutionChartProps {
  statements: Statement[]
}

interface ChartData {
  period: string
  cftea_con_iva: number | null
}

function prepareChartData(statements: Statement[]): ChartData[] {
  const sorted = [...statements].sort((a, b) => a.period.localeCompare(b.period))
  return sorted.map((s) => ({
    period: s.period,
    cftea_con_iva: s.cftea_con_iva,
  }))
}

export function CfteaEvolutionChart({ statements }: CfteaEvolutionChartProps) {
  const chartData = prepareChartData(statements)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolución CFTEA con IVA</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos disponibles. Subí resúmenes para ver la evolución.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolución CFTEA con IVA</CardTitle>
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
                tickFormatter={(value) => formatTasa(value)}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => [formatTasa(value), 'CFTEA con IVA']}
                labelFormatter={(label) => `Período: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cftea_con_iva"
                name="CFTEA con IVA"
                stroke="var(--chart-3)"
                strokeWidth={2}
                strokeDasharray="3 3"
                connectNulls={false}
                dot={{
                  fill: 'var(--chart-3)',
                  stroke: 'var(--card)',
                  strokeWidth: 2,
                  r: 4,
                }}
                activeDot={{ r: 6, fill: 'var(--chart-3)', stroke: 'var(--card)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
