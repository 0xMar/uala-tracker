'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { HttpExtractionGateway } from '@/lib/gateways/extraction-gateway'
import { SupabaseStatementRepository } from '@/lib/repositories/statement-repository'
import { SupabaseTransactionRepository } from '@/lib/repositories/transaction-repository'
import { StatementService } from '@/lib/services/statement-service'
import type { UploadResult } from '@/lib/types'

function buildStatementService(supabase: SupabaseClient) {
  return new StatementService(
    new HttpExtractionGateway(),
    new SupabaseStatementRepository(supabase),
    new SupabaseTransactionRepository(supabase),
  )
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function toggleStatementPaid(statementId: string, isPaid: boolean) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await buildStatementService(supabase).toggleStatementPaid(user.id, statementId, isPaid)

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

  const result = await buildStatementService(supabase).uploadStatement(user.id, file, forceReplace)

  if (result.success) {
    revalidatePath('/dashboard')
    revalidatePath('/statements')
    revalidatePath('/upload')
  }

  return result
}
