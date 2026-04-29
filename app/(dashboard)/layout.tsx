import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppSidebarProvider } from '@/components/dashboard/app-sidebar'

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
    <AppSidebarProvider userEmail={user.email ?? ''}>
      {children}
    </AppSidebarProvider>
  )
}
