'use server'

import { createClient } from '@/lib/supabase/server'
import { randomBytes, createHmac } from 'crypto'

export type ApiKey = {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

export type CreateApiKeyResult = {
  success: boolean
  key?: string
  error?: string
}

function generateApiKey(): string {
  const randomPart = randomBytes(24).toString('hex')
  return `uala_${randomPart}`
}

const MAX_KEY_NAME_LENGTH = 100
const MAX_ACTIVE_KEYS = 10

function hashApiKey(key: string): string {
  const secret = process.env.API_KEY_HMAC_SECRET
  if (!secret) throw new Error('API_KEY_HMAC_SECRET environment variable is required')
  return createHmac('sha256', secret).update(key).digest('hex')
}

export async function createApiKey(name: string): Promise<CreateApiKeyResult> {
  const sanitizedName = name.trim()
  if (!sanitizedName || sanitizedName.length > MAX_KEY_NAME_LENGTH) {
    return {
      success: false,
      error: `El nombre debe tener entre 1 y ${MAX_KEY_NAME_LENGTH} caracteres`,
    }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check max active keys
  const { count } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null)

  if (count !== null && count >= MAX_ACTIVE_KEYS) {
    return {
      success: false,
      error: `Máximo ${MAX_ACTIVE_KEYS} keys activas permitidas`,
    }
  }

  const key = generateApiKey()
  const keyHash = hashApiKey(key)
  const keyPrefix = key.substring(0, 13) // "uala_" + 8 chars

  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name: sanitizedName,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })

  if (error) {
    return { success: false, error: 'Failed to create API key' }
  }

  return { success: true, key }
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, last_used_at, created_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return []

  return data as ApiKey[]
}

export async function revokeApiKey(keyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: 'Failed to revoke API key' }
  }

  return { success: true }
}
