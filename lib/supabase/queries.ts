import { createClient } from '@/lib/supabase/server'
import type { Statement, Transaction } from '@/lib/types'

export async function getStatements(): Promise<Statement[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .order('period', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getStatement(id: string): Promise<Statement | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('statements').select('*').eq('id', id).single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getLatestStatement(): Promise<Statement | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('statements')
    .select('*')
    .order('period', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function getTransactions(statementId: string): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('statement_id', statementId)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTransactionsByStatementId(statementId: string): Promise<Transaction[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('statement_id', statementId)
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}
