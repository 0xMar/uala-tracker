export function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export function formatDate(dateStr: string | null, options?: { year?: boolean }): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    ...(options?.year !== false && { year: 'numeric' }),
  })
}
