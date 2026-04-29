import { AppSidebar } from '@/components/dashboard/app-sidebar'

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar userEmail="demo@example.com" />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
