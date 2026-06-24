import type { SupabaseClient } from '@supabase/supabase-js'

export interface NewTransactionData {
  user_id: string
  statement_id: string
  transaction_date: string
  merchant: string
  amount_ars: number
  installment_current: number | null
  installments_total: number | null
  coupon_number: string | null
  type: 'CONSUMO' | 'PAGO' | 'IMPUESTO'
}

export interface ITransactionRepository {
  insertMany(transactions: NewTransactionData[]): Promise<void>
}

export class SupabaseTransactionRepository implements ITransactionRepository {
  constructor(private supabase: SupabaseClient) {}

  async insertMany(transactions: NewTransactionData[]): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .insert(transactions)

    if (error) throw new Error('Failed to save transactions')
  }
}
