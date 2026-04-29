import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { logout } from '@/lib/actions'
import Link from 'next/link'

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
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b px-4 py-4">
            <h2 className="text-lg font-bold">UALA Tracker</h2>
          </SidebarHeader>
          <SidebarContent className="flex flex-col justify-between">
            <nav className="space-y-2 px-2 py-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start">
                  Dashboard
                </Button>
              </Link>
              <Link href="/statements">
                <Button variant="ghost" className="w-full justify-start">
                  Statements
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant="ghost" className="w-full justify-start">
                  Upload PDF
                </Button>
              </Link>
            </nav>
            <div className="space-y-2 border-t px-2 py-4">
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              <form action={logout}>
                <Button type="submit" variant="outline" className="w-full">
                  Sign Out
                </Button>
              </form>
            </div>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  )
}
