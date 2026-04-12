import type { ImportEntry } from './db'

/**
 * Parses a raw text/CSV string into ImportEntry[]
 *
 * Supported formats:
 *   - Comma/semicolon/space separated numbers:  1, 2, 3  |  1;2;3  |  1 2 3
 *   - One per line:  45\n46\n47
 *   - Ranges:  45-50
 *   - With state prefix:  tengo: 1,2,3  |  repes: 4,5  |  faltan: 6,7
 *   - CSV with header:  numero,estado  (estado = tengo|repetido|falta)
 *   - Mixed
 *
 * The `defaultState` is used when no state label is present.
 */
export function parseImportText(
  raw: string,
  defaultState: 'collected' | 'repeated' | 'missing'
): { entries: ImportEntry[]; unrecognized: string[] } {
  const entries: ImportEntry[] = []
  const unrecognized: string[] = []
  const seen = new Set<number>()

  function addNumber(n: number, state: 'collected' | 'repeated' | 'missing') {
    if (n < 1 || n > 9999 || seen.has(n)) return
    seen.add(n)
    entries.push({
      number: n,
      collected: state === 'collected',
      repeated: state === 'repeated',
    })
  }

  // Detect CSV with header row
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const firstLine = lines[0]?.toLowerCase() ?? ''
  const isCSV = firstLine.includes('numero') || firstLine.includes('número') || firstLine.includes('number')

  if (isCSV) {
    // Find column indices
    const headers = firstLine.split(/[,;]/).map(h => h.trim())
    const numIdx = headers.findIndex(h => /num/i.test(h))
    const stateIdx = headers.findIndex(h => /estado|state|tipo|type/i.test(h))

    for (const line of lines.slice(1)) {
      const cols = line.split(/[,;]/).map(c => c.trim())
      const numStr = numIdx >= 0 ? cols[numIdx] : cols[0]
      const stateStr = stateIdx >= 0 ? cols[stateIdx]?.toLowerCase() : ''
      const n = parseInt(numStr, 10)
      if (isNaN(n)) { unrecognized.push(line); continue }
      const state = resolveState(stateStr, defaultState)
      addNumber(n, state)
    }
    return { entries, unrecognized }
  }

  // Free-text parsing
  let currentState = defaultState

  for (const line of lines) {
    // State label detection: "tengo: ..." / "repes: ..." / "faltan: ..."
    const labelMatch = line.match(/^(tengo|tenidos|conseguidos|collected|repetidos?|repes?|faltan?|missing|falta)[:\s]+(.*)$/i)
    if (labelMatch) {
      currentState = resolveState(labelMatch[1].toLowerCase(), defaultState)
      const rest = labelMatch[2]
      if (rest) processSegment(rest, currentState)
      continue
    }

    processSegment(line, currentState)
  }

  function processSegment(segment: string, state: 'collected' | 'repeated' | 'missing') {
    // Split by comma, semicolon, or whitespace
    const tokens = segment.split(/[,;\s]+/).filter(Boolean)
    for (const token of tokens) {
      // Range: 45-50
      const rangeMatch = token.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        const from = parseInt(rangeMatch[1], 10)
        const to = parseInt(rangeMatch[2], 10)
        if (!isNaN(from) && !isNaN(to) && to >= from && to - from < 200) {
          for (let i = from; i <= to; i++) addNumber(i, state)
        } else {
          unrecognized.push(token)
        }
        continue
      }

      // Plain number
      const n = parseInt(token, 10)
      if (!isNaN(n) && token.match(/^\d+$/)) {
        addNumber(n, state)
      } else if (token.length > 0) {
        unrecognized.push(token)
      }
    }
  }

  return { entries, unrecognized }
}

function resolveState(
  label: string,
  fallback: 'collected' | 'repeated' | 'missing'
): 'collected' | 'repeated' | 'missing' {
  if (/tengo|tenido|consegu|collected/i.test(label)) return 'collected'
  if (/repe|repetido/i.test(label)) return 'repeated'
  if (/falta|missing/i.test(label)) return 'missing'
  return fallback
}
