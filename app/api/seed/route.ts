import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { initDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/seed — truncates cards and re-seeds from scratch
export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 })
  }
  try {
    const db = neon(process.env.DATABASE_URL)
    await db`TRUNCATE TABLE cards RESTART IDENTITY`
    await initDb()
    const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM cards`
    return NextResponse.json({ ok: true, total: count })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
