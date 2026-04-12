'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Grid3X3, LogOut, Eye, Users,
  Search, ArrowLeftRight, MessageSquare, Upload,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
} from '@/components/ui/sidebar'

const ADMIN_NAV = [
  { href: '/admin', label: 'Usuarios', icon: Users },
]

const ADMIN_NAV_STATIC = [
  { href: '/',          label: 'Resumen',   icon: LayoutDashboard },
  { href: '/coleccion', label: 'Colección', icon: Grid3X3 },
  { href: '/buscar',    label: 'Buscar intercambios', icon: Search },
]

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export function AppSidebar({
  username,
  role,
  exchangeCount = 0,
  messageCount = 0,
}: {
  username: string
  role: string
  exchangeCount?: number
  messageCount?: number
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navItems: NavItem[] = role === 'superadmin'
    ? ADMIN_NAV
    : [
        { href: '/',              label: 'Resumen',             icon: LayoutDashboard },
        { href: '/coleccion',     label: 'Colección',           icon: Grid3X3 },
        { href: '/buscar',        label: 'Buscar intercambios', icon: Search },
        { href: '/intercambios',  label: 'Mis intercambios',    icon: ArrowLeftRight, badge: exchangeCount },
        { href: '/mensajes',      label: 'Mensajes',            icon: MessageSquare,  badge: messageCount },
        { href: '/importar',      label: 'Importar colección',  icon: Upload },
      ]

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex flex-col gap-1.5">
          <img src="/logo-miscromos-transparente.png" alt="MisCromos" style={{ height: 80, width: 'auto', display: 'block', margin: '0 auto' }} />
          {role === 'superadmin' && (
            <p className="text-xs text-muted-foreground text-center">{username}</p>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon, badge }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={<Link href={href} />}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1">{label}</span>
                    {badge != null && badge > 0 && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-medium">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 space-y-1">
        <SidebarMenu>
          {role !== 'superadmin' && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href={`/ver/${username}`} target="_blank" />}>
                  <Eye className="w-4 h-4" />
                  <span>Mi página pública</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/perfil" />}>
                  <Grid3X3 className="w-4 h-4" />
                  <span>Mi perfil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
