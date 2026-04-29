'use server'

import { createClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/url'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function toggleStatementPaid(statementId: string, isPaid: boolean) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('statements')
    .update({ is_paid: isPaid })
    .eq('id', statementId)

  if (error) {
    throw new Error('Failed to update statement')
  }

  revalidatePath('/dashboard')
}

export type UploadResult = {
  success: boolean
  error?: string
  duplicatePeriod?: string
  statementId?: string
}

// Expected response structure from /api/extract
interface ExtractedStatement {
  period: string
  total_debt_ars: number | null
  minimum_payment: number | null
  previous_balance: number | null
  credit_limit: number | null
  tna: number | null
  close_date: string | null
  due_date: string | null
  next_close_date: string | null
  next_due_date: string | null
  period_from: string | null
  period_to: string | null
}

interface ExtractedTransaction {
  transaction_date: string
  merchant: string
  amount_ars: number
  installment_current: number | null
  installments_total: number | null
  coupon_number: string | null
  type: 'CONSUMO' | 'PAGO' | 'IMPUESTO'
}

interface ExtractResponse {
  statement: ExtractedStatement
  transactions: ExtractedTransaction[]
}

export async function uploadStatement(
  formData: FormData,
  forceReplace = false
): Promise<UploadResult> {
  const supabase = await createClient()

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const file = formData.get('file') as File | null

  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file size (5MB max)
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'File size exceeds 5MB limit' }
  }

  // Validate file type
  if (file.type !== 'application/pdf') {
    return { success: false, error: 'Only PDF files are allowed' }
  }

  try {
    // Step 1: Forward the PDF to /api/extract for parsing
    const extractFormData = new FormData()
    extractFormData.append('file', file)

    const response = await fetch(`${getBaseUrl()}/api/extract`, {
      method: 'POST',
      body: extractFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.error || `Extraction failed: ${response.statusText}`,
      }
    }

    const extractedData: ExtractResponse = await response.json()
    const { statement: extractedStatement, transactions: extractedTransactions } = extractedData

    // Step 2: Check if statement for this period already exists
    const { data: existingStatement } = await supabase
      .from('statements')
      .select('id, version')
      .eq('user_id', user.id)
      .eq('period', extractedStatement.period)
      .single()

    if (existingStatement && !forceReplace) {
      // Duplicate period - need user confirmation
      return {
        success: false,
        duplicatePeriod: extractedStatement.period,
        error: 'A statement for this period already exists',
      }
    }

    let statementId: string

    if (existingStatement && forceReplace) {
      // Step 3a: Replace existing statement - increment version and update
      // First, delete old transactions for this statement
      const { error: deleteTransactionsError } = await supabase
        .from('transactions')
        .delete()
        .eq('statement_id', existingStatement.id)

      if (deleteTransactionsError) {
        return {
          success: false,
          error: `Failed to delete old transactions: ${deleteTransactionsError.message}`,
        }
      }

      // Update the statement with new data and increment version
      const { error: updateError } = await supabase
        .from('statements')
        .update({
          version: existingStatement.version + 1,
          total_debt_ars: extractedStatement.total_debt_ars,
          minimum_payment: extractedStatement.minimum_payment,
          previous_balance: extractedStatement.previous_balance,
          credit_limit: extractedStatement.credit_limit,
          tna: extractedStatement.tna,
          close_date: extractedStatement.close_date,
          due_date: extractedStatement.due_date,
          next_close_date: extractedStatement.next_close_date,
          next_due_date: extractedStatement.next_due_date,
          period_from: extractedStatement.period_from,
          period_to: extractedStatement.period_to,
          // Reset is_paid when replacing
          is_paid: false,
        })
        .eq('id', existingStatement.id)

      if (updateError) {
        return {
          success: false,
          error: `Failed to update statement: ${updateError.message}`,
        }
      }

      statementId = existingStatement.id
    } else {
      // Step 3b: Insert new statement
      const { data: newStatement, error: insertError } = await supabase
        .from('statements')
        .insert({
          user_id: user.id,
          period: extractedStatement.period,
          version: 1,
          is_paid: false,
          total_debt_ars: extractedStatement.total_debt_ars,
          minimum_payment: extractedStatement.minimum_payment,
          previous_balance: extractedStatement.previous_balance,
          credit_limit: extractedStatement.credit_limit,
          tna: extractedStatement.tna,
          close_date: extractedStatement.close_date,
          due_date: extractedStatement.due_date,
          next_close_date: extractedStatement.next_close_date,
          next_due_date: extractedStatement.next_due_date,
          period_from: extractedStatement.period_from,
          period_to: extractedStatement.period_to,
        })
        .select('id')
        .single()

      if (insertError) {
        // Check for unique constraint violation (race condition)
        if (insertError.code === '23505') {
          return {
            success: false,
            duplicatePeriod: extractedStatement.period,
            error: 'A statement for this period already exists',
          }
        }
        return {
          success: false,
          error: `Failed to insert statement: ${insertError.message}`,
        }
      }

      statementId = newStatement.id
    }

    // Step 4: Insert all transactions
    if (extractedTransactions.length > 0) {
      const transactionsToInsert = extractedTransactions.map((txn) => ({
        user_id: user.id,
        statement_id: statementId,
        transaction_date: txn.transaction_date,
        merchant: txn.merchant,
        amount_ars: txn.amount_ars,
        installment_current: txn.installment_current,
        installments_total: txn.installments_total,
        coupon_number: txn.coupon_number,
        type: txn.type,
      }))

      const { error: transactionsError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)

      if (transactionsError) {
        return {
          success: false,
          error: `Failed to insert transactions: ${transactionsError.message}`,
        }
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/statements')
    revalidatePath('/upload')

    return {
      success: true,
      statementId,
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload statement',
    }
  }
}
