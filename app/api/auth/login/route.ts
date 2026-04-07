import { NextResponse } from 'next/server'
import { getUserByUsername, verifyPassword } from '@/lib/users'
import { createSession } from '@/lib/session'
import { initDb } from '@/lib/db'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  await initDb()
  const user = await getUserByUsername(username)
  if (!user) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const token = await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  const res = NextResponse.json({ ok: true, role: user.role })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
