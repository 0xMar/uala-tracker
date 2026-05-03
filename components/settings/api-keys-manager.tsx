'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createApiKey, listApiKeys, revokeApiKey, type ApiKey } from '@/lib/api-keys'
import { Copy, Key, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    setIsLoading(true)
    const data = await listApiKeys()
    setKeys(data)
    setIsLoading(false)
  }

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }

    setIsCreating(true)
    const result = await createApiKey(newKeyName.trim())
    setIsCreating(false)

    if (result.success && result.key) {
      setGeneratedKey(result.key)
      setNewKeyName('')
      await loadKeys()
      toast.success('API key created successfully')
    } else {
      toast.error(result.error || 'Failed to create API key')
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    const result = await revokeApiKey(keyId)
    if (result.success) {
      await loadKeys()
      toast.success('API key revoked')
    } else {
      toast.error(result.error || 'Failed to revoke API key')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6">
      {/* Generated key alert */}
      {generatedKey && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-green-900 dark:text-green-100">
              API key created successfully
            </p>
            <p className="text-sm text-green-800 dark:text-green-200">
              Copy this key now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded border text-xs break-all">
                {generatedKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(generatedKey)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGeneratedKey(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create new key */}
      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
          <CardDescription>
            Generate a new API key for automation (e.g., Make.com workflows)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g., Make.com automation)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing keys */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            Manage your existing API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {key.key_prefix}...
                        {key.revoked_at ? (
                          <span className="ml-2 text-red-600">• Revoked</span>
                        ) : key.last_used_at ? (
                          <span className="ml-2">
                            • Last used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="ml-2">• Never used</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!key.revoked_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <p className="font-semibold mb-1">How to use API keys</p>
          <p>
            Include your API key in the <code className="px-1 py-0.5 bg-muted rounded">X-API-Key</code> header
            when making requests to <code className="px-1 py-0.5 bg-muted rounded">/api/ingest</code>.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
