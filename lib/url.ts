/**
 * Returns the base URL for internal API calls.
 * Uses VERCEL_PROJECT_PRODUCTION_URL to avoid preview deployment auth issues.
 * DO NOT use VERCEL_URL — it points to the specific deployment URL which
 * requires Vercel authentication on preview deployments.
 */
export function getBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}
