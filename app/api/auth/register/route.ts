import { NextResponse } from 'next/server'
import { createUser, isUsernameTaken, isEmailTaken } from '@/lib/users'
import { createSession } from '@/lib/session'
import { initDb } from '@/lib/db'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const body = await req.json()
  const { username, password, email } = body

  if (!username || !password || !email) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
  }
  if (username.length < 3) {
    return NextResponse.json({ error: 'El usuario debe tener al menos 3 caracteres' }, { status: 400 })
  }
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
    return NextResponse.json({ error: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un dígito' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
  }

  await initDb()

  if (await isUsernameTaken(username)) {
    return NextResponse.json({ error: 'Ese nombre de usuario ya está en uso' }, { status: 409 })
  }
  if (await isEmailTaken(email)) {
    return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 })
  }

  const user = await createUser({ username, password, name: '', surname: '', email, address: '', postal_code: '' })

  const token = await createSession({
    userId: user.id,
    username: user.username,
    role: 'user',
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return res
}
