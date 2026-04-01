import { NextRequest, NextResponse } from 'next/server'
import { bulkSetCollected } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const { ids, collected } = await req.json()
    if (!Array.isArray(ids) || typeof collected !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    await bulkSetCollected(ids, collected)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error bulk updating cards' }, { status: 500 })
  }
}
