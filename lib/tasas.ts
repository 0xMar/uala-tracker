import type { Statement } from '@/lib/types'

export type TasasStatus = 'Coincide' | 'No coincide' | 'Sin dato'

/**
 * Compare current statement's actual CFTEA con IVA against the previous
 * statement's ANNOUNCED CFTEA con IVA (cftea_con_iva_anunciada).
 *
 * Rules (per spec):
 * - "Sin dato" when either value is null or previous statement is missing.
 * - "Coincide" when values match exactly (no tolerance — spec says strict).
 * - "No coincide" otherwise.
 */
export function computeTasasStatus(
  current: Statement | null,
  previous: Statement | null
): TasasStatus {
  if (!current || !previous) return 'Sin dato'
  if (current.cftea_con_iva === null || previous.cftea_con_iva_anunciada === null) return 'Sin dato'
  return current.cftea_con_iva === previous.cftea_con_iva_anunciada ? 'Coincide' : 'No coincide'
}

/**
 * Format a percentage value for display.
 * Returns "No disponible" when the value is null.
 */
export function formatTasa(value: number | null): string {
  if (value === null) return 'No disponible'
  return `${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}
