import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { neon } from '@neondatabase/serverless'

function sql() {
  return neon(process.env.DATABASE_URL!)
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: 'Falta el usuario' }, { status: 400 })

  const db = sql()
  const [user] = await db`SELECT id, role FROM users WHERE username = ${username} LIMIT 1`

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (user.role === 'superadmin') return NextResponse.json({ error: 'No se puede borrar al superadmin' }, { status: 403 })

  // Borrar en orden por dependencias de FK
  await db`DELETE FROM exchange_ratings WHERE rater_id = ${user.id} OR rated_id = ${user.id}`
  await db`DELETE FROM exchange_cards WHERE exchange_id IN (SELECT id FROM exchanges WHERE proposer_id = ${user.id} OR receiver_id = ${user.id})`
  await db`DELETE FROM exchanges WHERE proposer_id = ${user.id} OR receiver_id = ${user.id}`
  await db`DELETE FROM messages WHERE from_user_id = ${user.id} OR to_user_id = ${user.id}`
  await db`DELETE FROM user_cards WHERE user_id = ${user.id}`
  await db`DELETE FROM users WHERE id = ${user.id}`

  return NextResponse.json({ ok: true })
}
