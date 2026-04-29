import { AppSidebarProvider } from '@/components/dashboard/app-sidebar'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSidebarProvider userEmail="demo@example.com" isDemo>
      {children}
    </AppSidebarProvider>
  )
}
