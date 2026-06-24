import type { SupabaseClient } from '@supabase/supabase-js'

export interface ExistingStatement {
  id: string
  version: number
}

export interface NewStatementData {
  user_id: string
  period: string
  version: number
  is_paid: boolean
  total_debt_ars: number | null
  minimum_payment: number | null
  previous_balance: number | null
  credit_limit: number | null
  tna: number | null
  tea: number | null
  cftea_con_iva: number | null
  cftna_con_iva: number | null
  tna_anunciada: number | null
  tea_anunciada: number | null
  tem_anunciada: number | null
  cftea_con_iva_anunciada: number | null
  cftna_con_iva_anunciada: number | null
  close_date: string | null
  due_date: string | null
  next_close_date: string | null
  next_due_date: string | null
  period_from: string | null
  period_to: string | null
}

export interface StatementUpdateData {
  version: number
  is_paid: boolean
  total_debt_ars: number | null
  minimum_payment: number | null
  previous_balance: number | null
  credit_limit: number | null
  tna: number | null
  tea: number | null
  cftea_con_iva: number | null
  cftna_con_iva: number | null
  tna_anunciada: number | null
  tea_anunciada: number | null
  tem_anunciada: number | null
  cftea_con_iva_anunciada: number | null
  cftna_con_iva_anunciada: number | null
  close_date: string | null
  due_date: string | null
  next_close_date: string | null
  next_due_date: string | null
  period_from: string | null
  period_to: string | null
}

export interface IStatementRepository {
  findByPeriod(userId: string, period: string): Promise<ExistingStatement | null>
  create(data: NewStatementData): Promise<string>
  update(id: string, data: StatementUpdateData): Promise<void>
  updatePaidStatus(id: string, userId: string, isPaid: boolean): Promise<boolean>
  deleteTransactions(statementId: string): Promise<void>
}

export class SupabaseStatementRepository implements IStatementRepository {
  constructor(private supabase: SupabaseClient) {}

  async findByPeriod(userId: string, period: string): Promise<ExistingStatement | null> {
    const { data } = await this.supabase
      .from('statements')
      .select('id, version')
      .eq('user_id', userId)
      .eq('period', period)
      .single()
    return data
  }

  async create(data: NewStatementData): Promise<string> {
    const { data: newStatement, error } = await this.supabase
      .from('statements')
      .insert(data)
      .select('id')
      .single()

    if (error) throw error
    return newStatement.id
  }

  async update(id: string, data: StatementUpdateData): Promise<void> {
    const { error } = await this.supabase
      .from('statements')
      .update(data)
      .eq('id', id)

    if (error) throw new Error('Failed to update statement')
  }

  async updatePaidStatus(id: string, userId: string, isPaid: boolean): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('statements')
      .update({ is_paid: isPaid })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')

    if (error) throw new Error('Failed to update statement')
    return data && data.length > 0
  }

  async deleteTransactions(statementId: string): Promise<void> {
    const { error } = await this.supabase
      .from('transactions')
      .delete()
      .eq('statement_id', statementId)

    if (error) throw new Error('Failed to replace existing statement')
  }
}
