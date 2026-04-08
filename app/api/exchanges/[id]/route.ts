import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getExchange, acceptExchange, rejectExchange, markSent, markReceived } from '@/lib/exchanges'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const exchange = await getExchange(id, session.userId)
  if (!exchange) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(exchange)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json() as { action: string }
  const { action } = body

  switch (action) {
    case 'accept':
      await acceptExchange(id, session.userId)
      break
    case 'reject':
      await rejectExchange(id, session.userId)
      break
    case 'mark-sent':
      await markSent(id, session.userId)
      break
    case 'mark-received':
      await markReceived(id, session.userId)
      break
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
