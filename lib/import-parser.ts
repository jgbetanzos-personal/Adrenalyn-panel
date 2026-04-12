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
// Special non-numeric card number formats
const SPECIAL_NUMBER_RE = /^(NM\s*\d{1,2}|\d+\s+BIS)$/i

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
      number: String(n),
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

/**
 * Parses a CromosRepes copy-paste export.
 *
 * CromosRepes exports two sections separated by comma+space: ", "
 * Each token starts with the card number/identifier followed by descriptive text.
 *
 * Recognized number formats:
 *   123          → plain number
 *   123 BIS      → BIS card (jugador o estadio)
 *   123 Bis Stadium Card - Name  → Estadio BIS (same as "123 BIS")
 *   NM 08        → New Master
 *   AO01 / EDL01 / MOM / etc. → not in our catalog → unrecognized
 */
/**
 * Extracts card tokens from a comma-separated CromosRepes list segment.
 * Returns { entries, unrecognized } with the given state applied to all.
 */
function parseCromosRepesSegment(
  segment: string,
  state: 'collected' | 'repeated' | 'missing',
  seen: Set<string>,
  unrecognized: string[]
): ImportEntry[] {
  const entries: ImportEntry[] = []

  const tokens = segment.split(/\s*,\s*/).map(t => t.trim()).filter(Boolean)

  for (const token of tokens) {
    // Skip asterisked items (tachados/esperando)
    if (token.trimEnd().endsWith('*')) continue

    // Skip UI/header tokens
    if (/^(Logo|CromosRepes|Repes|Faltas|Editar|Notas|Ayuda|Aviso|Privacidad|Cookies|Tachado|Ocultar|Checklist|Volver|Colecciones|Correo|Cambios|Listas|Buscar|Inicio)/i.test(token)) continue

    // NM 08 / NM 03
    const nmMatch = token.match(/^NM\s*(\d{1,2})\b/i)
    if (nmMatch) {
      const num = `NM ${nmMatch[1].padStart(2, '0')}`
      if (!seen.has(num)) { seen.add(num); entries.push({ number: num, collected: state === 'collected' || state === 'repeated', repeated: state === 'repeated' }) }
      continue
    }

    // 123 Bis Stadium Card / 54 BIS Lookman
    const bisMatch = token.match(/^(\d+)\s+[Bb][Ii][Ss]\b/)
    if (bisMatch) {
      const num = `${bisMatch[1]} BIS`
      if (!seen.has(num)) { seen.add(num); entries.push({ number: num, collected: state === 'collected' || state === 'repeated', repeated: state === 'repeated' }) }
      continue
    }

    // 176-. Joel Roca / 127-. Escudo / 309 Nyland / 471 BO Pedri
    const numMatch = token.match(/^(\d+)[.\-]*\s/) || token.match(/^(\d+)[.\-]*$/)
    if (numMatch) {
      const num = numMatch[1]
      if (!seen.has(num)) { seen.add(num); entries.push({ number: num, collected: state === 'collected' || state === 'repeated', repeated: state === 'repeated' }) }
      continue
    }

    // Everything else (AO, EDL, MOM, Cajas…) → unrecognized
    const display = token.replace(/\s+/g, ' ').trim()
    if (display.length > 1) unrecognized.push(display.length > 45 ? display.slice(0, 45) + '…' : display)
  }

  return entries
}

/**
 * Parses a full CromosRepes copy-paste (may include both Faltas and Repes sections).
 * Auto-detects each section and assigns the correct state.
 * Asterisked items (tachados) are ignored automatically.
 */
export function parseCromosRepes(raw: string): { entries: ImportEntry[]; unrecognized: string[]; faltasCount: number; repesCount: number } {
  const unrecognized: string[] = []
  const seen = new Set<string>()
  let faltasEntries: ImportEntry[] = []
  let repesEntries: ImportEntry[] = []

  const lines = raw.split(/\r?\n/).map(l => l.trim())

  // Find section boundaries
  let faltasLine = -1
  let repesLine = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^Faltas\b/i.test(lines[i])) faltasLine = i
    if (/^Repes\b/i.test(lines[i]))  repesLine  = i
  }

  // Extract the long comma-separated lines (card lists)
  // They're the lines with the most commas in each section
  function findCardLine(fromLine: number, toLine: number): string {
    const slice = lines.slice(fromLine, toLine === -1 ? undefined : toLine)
    // The card list line has lots of commas
    return slice.sort((a, b) => b.split(',').length - a.split(',').length)[0] ?? ''
  }

  if (faltasLine !== -1) {
    const segment = findCardLine(faltasLine + 1, repesLine !== -1 ? repesLine : -1)
    faltasEntries = parseCromosRepesSegment(segment, 'missing', seen, unrecognized)
  }

  if (repesLine !== -1) {
    const segment = findCardLine(repesLine + 1, -1)
    repesEntries = parseCromosRepesSegment(segment, 'repeated', seen, unrecognized)
  }

  // Fallback: if no sections detected, parse everything as-is with no state assumption
  if (faltasLine === -1 && repesLine === -1) {
    const cardLine = findCardLine(0, -1)
    faltasEntries = parseCromosRepesSegment(cardLine, 'missing', seen, unrecognized)
  }

  return {
    entries: [...faltasEntries, ...repesEntries],
    unrecognized,
    faltasCount: faltasEntries.length,
    repesCount: repesEntries.length,
  }
}
