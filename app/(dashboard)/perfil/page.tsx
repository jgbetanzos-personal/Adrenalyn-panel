import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/users'
import { redirect } from 'next/navigation'
import { PerfilForm } from './perfil-form'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = await getUserById(session.userId)
  if (!user) redirect('/login')

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">Nombre, apellidos y foto de perfil</p>
      </div>
      <PerfilForm user={user} />
    </div>
  )
}
