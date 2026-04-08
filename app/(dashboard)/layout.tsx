import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/users'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function isProfileComplete(user: { name: string; surname: string; address: string | null; postal_code: string | null; email: string | null }) {
  return !!(user.name && user.surname && user.address && user.postal_code && user.email)
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = session.role !== 'superadmin' ? await getUserById(session.userId) : null
  const profileIncomplete = user && !isProfileComplete(user)

  return (
    <SidebarProvider>
      <AppSidebar username={session.username} role={session.role} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4 sticky top-0 bg-background z-10">
          <SidebarTrigger />
        </header>

        {profileIncomplete && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3 text-sm">
            <span className="text-amber-700">
              ⚠️ Tu perfil está incompleto. Completa tu dirección y código postal para tener todas las funcionalidades.
            </span>
            <Link
              href="/perfil"
              className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1 transition-colors"
            >
              Completar perfil
            </Link>
          </div>
        )}

        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
