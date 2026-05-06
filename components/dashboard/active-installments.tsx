import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/format'
import type { Transaction } from '@/lib/types'

interface ActiveInstallmentsProps {
  transactions: Transaction[]
}

import { groupInstallments } from '@/lib/installments'

export function ActiveInstallments({ transactions }: ActiveInstallmentsProps) {
  const installments = groupInstallments(transactions)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cuotas activas</CardTitle>
      </CardHeader>
      <CardContent>
        {installments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay planes de cuotas activos.</p>
        ) : (
          <div className="space-y-4">
            {installments.slice(0, 5).map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate max-w-[60%]">
                    {item.merchant}
                  </span>
                  <Badge variant="outline">
                    {item.installmentCurrent}/{item.installmentsTotal}
                  </Badge>
                </div>
                <Progress value={item.progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(item.amountPerInstallment)}/mes</span>
                  <span>{formatCurrency(item.totalRemaining)} restante</span>
                </div>
                {item.remainingMonths.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Próximas: {item.remainingMonths.slice(0, 3).join(', ')}
                    {item.remainingMonths.length > 3 && ` +${item.remainingMonths.length - 3} más`}
                  </p>
                )}
              </div>
            ))}
            {installments.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{installments.length - 5} planes de cuotas más
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
