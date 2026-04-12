import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { markUntouchedAsCollected } from '@/lib/db'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const marked = await markUntouchedAsCollected(session.userId)
  return NextResponse.json({ success: true, marked })
}
