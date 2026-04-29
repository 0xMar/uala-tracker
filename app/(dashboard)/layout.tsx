import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/app-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
