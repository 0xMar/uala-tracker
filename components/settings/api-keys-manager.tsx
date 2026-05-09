'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createApiKey, listApiKeys, revokeApiKey, type ApiKey } from '@/lib/api-keys'
import { Copy, Key, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface RevokeDialogState {
  open: boolean
  keyId: string | null
  keyName: string
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [revokeDialog, setRevokeDialog] = useState<RevokeDialogState>({
    open: false,
    keyId: null,
    keyName: '',
  })

  const loadKeys = useCallback(async () => {
    setIsLoading(true)
    const data = await listApiKeys()
    setKeys(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error('Ingresá un nombre para la API key')
      return
    }

    setIsCreating(true)
    const result = await createApiKey(newKeyName.trim())
    setIsCreating(false)

    if (result.success && result.key) {
      setGeneratedKey(result.key)
      setNewKeyName('')
      await loadKeys()
      toast.success('API key creada correctamente')
    } else {
      toast.error(result.error || 'Error al crear la API key')
    }
  }

  function openRevokeDialog(keyId: string, keyName: string) {
    setRevokeDialog({ open: true, keyId, keyName })
  }

  async function handleRevoke() {
    if (!revokeDialog.keyId) return

    const result = await revokeApiKey(revokeDialog.keyId)
    setRevokeDialog({ open: false, keyId: null, keyName: '' })

    if (result.success) {
      await loadKeys()
      toast.success('API key revocada')
    } else {
      toast.error(result.error || 'Error al revocar la API key')
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }

  return (
    <div className="space-y-6">
      {/* Generated key alert */}
      {generatedKey && (
        <Alert className="border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription className="space-y-2">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              API key creada correctamente
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              Copiá esta key ahora — no se mostrará de nuevo.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 p-2 bg-background rounded border text-xs break-all font-mono">
                {generatedKey}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(generatedKey)}
                aria-label="Copiar API key"
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
              Cerrar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create new key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crear API Key</CardTitle>
          <CardDescription>
            Generá una nueva API key para automatización (ej: workflows de Make.com)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nombre de la key (ej: Automatización Make.com)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              name="key-name"
              autoComplete="off"
            />
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creando…' : 'Crear'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tus API Keys</CardTitle>
          <CardDescription>
            Administrá tus API keys existentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay API keys</p>
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
                          <span className="ml-2 text-destructive">• Revocada</span>
                        ) : key.last_used_at ? (
                          <span className="ml-2">
                            • Último uso: {new Date(key.last_used_at).toLocaleDateString('es-AR')}
                          </span>
                        ) : (
                          <span className="ml-2">• Sin usar</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!key.revoked_at && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openRevokeDialog(key.id, key.name)}
                      aria-label={`Revocar API key ${key.name}`}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
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
          <p className="font-semibold mb-1">Cómo usar las API keys</p>
          <p>
            Incluí tu API key en el header <code className="px-1 py-0.5 bg-muted rounded font-mono text-xs">X-API-Key</code>{' '}
            al hacer requests a <code className="px-1 py-0.5 bg-muted rounded font-mono text-xs">/api/ingest</code>.
          </p>
        </AlertDescription>
      </Alert>

      {/* Revoke confirmation dialog */}
      <AlertDialog
        open={revokeDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeDialog({ open: false, keyId: null, keyName: '' })
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás por revocar la API key &quot;{revokeDialog.keyName}&quot;. Esta acción no se puede deshacer
              y las automatizaciones que usen esta key dejarán de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
