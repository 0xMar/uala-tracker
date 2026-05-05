import { ApiKeysManager } from '@/components/settings/api-keys-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Configuración - Ualá Tracker',
  description: 'Administrá tus API keys para automatización',
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Administrá tus API keys para automatización
        </p>
      </div>

      <ApiKeysManager />
    </div>
  )
}
