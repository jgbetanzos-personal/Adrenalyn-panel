import { NextRequest, NextResponse } from 'next/server'
import { bulkSetCollected } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { ids, collected } = await req.json()
    if (!Array.isArray(ids) || typeof collected !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    await bulkSetCollected(session.userId, ids, collected)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error bulk updating cards' }, { status: 500 })
  }
}
