'use client'

import { useState, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/theme-provider'
import { logout } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

// Minimal inline icons to avoid adding a new icon library dependency
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
}
function IconStatements() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
function IconTasas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}
function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
function IconLogOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// Context for managing mobile drawer state
type SidebarContextType = {
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  isDemo: boolean
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within an AppSidebarProvider')
  }
  return context
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { href: '/statements', label: 'Resúmenes', Icon: IconStatements },
  { href: '/tasas', label: 'Tasas', Icon: IconTasas },
  { href: '/upload', label: 'Subir PDF', Icon: IconUpload },
  { href: '/settings', label: 'Configuración', Icon: IconSettings },
]

interface AppSidebarProps {
  userEmail: string
}

// Shared sidebar content component used in both desktop and mobile views
function SidebarContent({
  userEmail,
  collapsed = false,
  onNavClick,
  onToggleCollapse,
  showCollapseButton = true,
}: {
  userEmail: string
  collapsed?: boolean
  onNavClick?: () => void
  onToggleCollapse?: () => void
  showCollapseButton?: boolean
}) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { isDemo } = useSidebar()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn('flex items-center border-b border-border px-3 py-4', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight truncate">UALA Tracker</span>
        )}
        {showCollapseButton && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors border border-transparent hover:border-border"
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href || (isDemo && href === '/dashboard')
          const className = cn(
            'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors border',
            active
              ? 'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary'
              : 'text-sidebar-foreground/80 border-transparent hover:bg-sidebar-accent hover:text-sidebar-foreground hover:border-border',
            collapsed && 'justify-center px-0',
            isDemo && !active && 'opacity-50 cursor-not-allowed',
          )
          return isDemo ? (
            <span key={href} className={className} title={collapsed ? label : undefined}>
              <Icon />
              {!collapsed && <span>{label}</span>}
            </span>
          ) : (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={className}
              title={collapsed ? label : undefined}
            >
              <Icon />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-border px-2 py-3">
        {/* Dark mode toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle dark mode"
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors border border-transparent hover:bg-sidebar-accent hover:border-border text-sidebar-foreground/80 hover:text-sidebar-foreground',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? (resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
        >
          {resolvedTheme === 'dark' ? <IconSun /> : <IconMoon />}
          {!collapsed && <span>{resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>

        {/* User email */}
        {!collapsed && (
          <p className="truncate px-2.5 text-xs text-sidebar-foreground/50">{userEmail}</p>
        )}

        {/* Sign out */}
        <form action={logout}>
          <button
            type="submit"
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 text-sidebar-foreground/70',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Cerrar sesión' : undefined}
          >
            <IconLogOut />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </div>
  )
}

// Provider component that wraps the layout and manages mobile state
export function AppSidebarProvider({
  children,
  userEmail,
  isDemo = false,
}: {
  children: React.ReactNode
  userEmail: string
  isDemo?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen, isDemo }}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Desktop Sidebar - hidden on mobile */}
        <DesktopSidebar userEmail={userEmail} />
        
        {/* Mobile Drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-sidebar text-sidebar-foreground [&>button]:hidden"
            onFocusOutside={(e) => e.preventDefault()}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Menú de navegación</SheetTitle>
              <SheetDescription>Navegación principal de UALA Tracker</SheetDescription>
            </SheetHeader>
            <SidebarContent
              userEmail={userEmail}
              collapsed={false}
              onNavClick={() => setMobileOpen(false)}
              showCollapseButton={false}
            />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header with hamburger */}
          <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="shrink-0"
              >
                <IconMenu />
              </Button>
              <span className="text-base font-bold tracking-tight">UALA Tracker</span>
            </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}

// Desktop sidebar component - hidden on mobile
function DesktopSidebar({ userEmail }: { userEmail: string }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative hidden md:flex flex-col h-screen border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      <SidebarContent
        userEmail={userEmail}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        showCollapseButton={true}
      />
    </aside>
  )
}

// Legacy export for backwards compatibility - wraps existing component
export function AppSidebar({ userEmail }: AppSidebarProps) {
  return <DesktopSidebar userEmail={userEmail} />
}

// Mobile trigger button for use in other components
export function MobileSidebarTrigger() {
  const { setMobileOpen } = useSidebar()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMobileOpen(true)}
      aria-label="Open navigation menu"
      className="md:hidden"
    >
      <IconMenu />
    </Button>
  )
}
