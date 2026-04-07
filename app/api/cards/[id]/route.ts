import { NextRequest, NextResponse } from 'next/server'
import { toggleCard } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const field = body?.field === 'repeated' ? 'repeated' : 'collected'

  try {
    const card = await toggleCard(session.userId, numId, field)
    return NextResponse.json(card)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error toggling card' }, { status: 500 })
  }
}
