'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Grid3X3, LogOut, Eye, Users, ShieldCheck } from 'lucide-react'
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

const USER_NAV = [
  { href: '/',          label: 'Resumen',   icon: LayoutDashboard },
  { href: '/coleccion', label: 'Colección', icon: Grid3X3 },
]

const ADMIN_NAV = [
  { href: '/admin', label: 'Usuarios', icon: Users },
]

export function AppSidebar({ username, role }: { username: string; role: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const navItems = role === 'superadmin' ? ADMIN_NAV : USER_NAV

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            {role === 'superadmin' ? <ShieldCheck className="w-4 h-4" /> : 'AX'}
          </div>
          <div className="leading-tight">
            <p className="font-semibold text-sm">
              {role === 'superadmin' ? 'Superadmin' : 'Adrenalyn XL'}
            </p>
            <p className="text-xs text-muted-foreground">
              {role === 'superadmin' ? username : 'LaLiga 2025-26'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname === href}
                    render={<Link href={href} />}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
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
