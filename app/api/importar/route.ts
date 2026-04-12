import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { bulkImport } from '@/lib/db'
import { parseImportText } from '@/lib/import-parser'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as {
    text: string
    defaultState: 'collected' | 'repeated' | 'missing'
    mode: 'merge' | 'replace'
    confirm?: boolean
  }

  const { text, defaultState, mode, confirm = false } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No hay datos para importar' }, { status: 400 })
  }

  const { entries, unrecognized } = parseImportText(text, defaultState)

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No se reconoció ningún número de cromo' }, { status: 400 })
  }

  // Preview mode: just return what was parsed without saving
  if (!confirm) {
    return NextResponse.json({ preview: true, entries, unrecognized })
  }

  // Confirmed: save to DB
  const result = await bulkImport(session.userId, entries, mode)
  return NextResponse.json({ success: true, ...result, unrecognized })
}
