'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { HttpExtractionGateway } from '@/lib/gateways/extraction-gateway'
import { SupabaseStatementRepository } from '@/lib/repositories/statement-repository'
import { SupabaseTransactionRepository } from '@/lib/repositories/transaction-repository'
import { StatementService } from '@/lib/services/statement-service'
import type { UploadResult } from '@/lib/types'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function toggleStatementPaid(statementId: string, isPaid: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const stmtRepo = new SupabaseStatementRepository(supabase)
  const txnRepo = new SupabaseTransactionRepository(supabase)
  const gateway = new HttpExtractionGateway()
  const service = new StatementService(gateway, stmtRepo, txnRepo)

  await service.toggleStatementPaid(user.id, statementId, isPaid)

  revalidatePath('/dashboard')
  revalidatePath('/statements')
}

export async function uploadStatement(
  formData: FormData,
  forceReplace = false,
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

  const gateway = new HttpExtractionGateway()
  const stmtRepo = new SupabaseStatementRepository(supabase)
  const txnRepo = new SupabaseTransactionRepository(supabase)
  const service = new StatementService(gateway, stmtRepo, txnRepo)

  const result = await service.uploadStatement(user.id, file, forceReplace)

  if (result.success) {
    revalidatePath('/dashboard')
    revalidatePath('/statements')
    revalidatePath('/upload')
  }

  return result
}
