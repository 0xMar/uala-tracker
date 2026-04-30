import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function sanitizeRedirect(next: string): string {
  if (!next.startsWith('/') || next.startsWith('//')) return '/'
  try {
    const url = new URL(next, 'http://localhost')
    if (url.origin !== 'http://localhost') return '/'
  } catch {
    return '/'
  }
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = sanitizeRedirect(searchParams.get('next') ?? '/')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
