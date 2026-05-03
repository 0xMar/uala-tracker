import { ApiKeysManager } from '@/components/settings/api-keys-manager'

export default function SettingsPage() {
  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your API keys for automation
      </p>
      <ApiKeysManager />
    </div>
  )
}
