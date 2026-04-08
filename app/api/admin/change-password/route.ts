import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateUserPassword, getUserByUsername } from '@/lib/users'
import { initDb } from '@/lib/db'

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }
  if (!PASSWORD_RE.test(password)) {
    return NextResponse.json({ error: 'Mínimo 8 caracteres, una mayúscula y un dígito' }, { status: 400 })
  }

  await initDb()
  const user = await getUserByUsername(username)
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  await updateUserPassword(user.id, password)
  return NextResponse.json({ ok: true })
}
