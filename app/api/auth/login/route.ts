import { NextResponse } from 'next/server'
import { CREDENTIALS, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  if (username !== CREDENTIALS.username || password !== CREDENTIALS.password) {
    return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const secret = process.env.AUTH_SECRET ?? 'adrenalyn-panel-secret-2025'
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
