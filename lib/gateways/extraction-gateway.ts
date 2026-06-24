import { getBaseUrl } from '@/lib/url'
import type { ExtractResponse } from '@/lib/types'

export interface IExtractionGateway {
  extract(file: File): Promise<ExtractResponse>
}

export class HttpExtractionGateway implements IExtractionGateway {
  private readonly TIMEOUT_MS = 30_000

  async extract(file: File): Promise<ExtractResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS)

    try {
      const response = await fetch(`${getBaseUrl()}/api/extract`, {
        method: 'POST',
        headers: { 'X-API-Key': process.env.EXTRACT_API_SECRET ?? '' },
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Extraction failed: ${response.statusText}`)
      }

      return response.json()
    } finally {
      clearTimeout(timeout)
    }
  }
}
