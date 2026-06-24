import { getBaseUrl } from '@/lib/url'
import type { ExtractResponse } from '@/lib/types'

export interface IExtractionGateway {
  extract(file: File): Promise<ExtractResponse>
}

export class HttpExtractionGateway implements IExtractionGateway {
  async extract(file: File): Promise<ExtractResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${getBaseUrl()}/api/extract`, {
      method: 'POST',
      headers: { 'X-API-Key': process.env.EXTRACT_API_SECRET ?? '' },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Extraction failed: ${response.statusText}`)
    }

    return response.json()
  }
}
