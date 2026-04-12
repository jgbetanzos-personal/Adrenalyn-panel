'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type DefaultState = 'collected' | 'repeated' | 'missing'
type Mode = 'merge' | 'replace'
type Source = 'manual' | 'cromosrepes'

type PreviewEntry = { number: string | number; collected: boolean; repeated: boolean }

type Preview = {
  entries: PreviewEntry[]
  unrecognized: string[]
  faltasCount?: number
  repesCount?: number
}

const STATE_OPTIONS: { value: DefaultState; label: string; description: string }[] = [
  { value: 'collected', label: 'Los tengo',   description: 'Marcar todos como conseguidos' },
  { value: 'repeated',  label: 'Repetidos',   description: 'Marcar todos como repetidos' },
  { value: 'missing',   label: 'Me faltan',   description: 'Solo registrar que faltan (no se marcan como tenidos ni repetidos)' },
]

export function ImportForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState<Source>('manual')
  const [text, setText] = useState('')
  const [defaultState, setDefaultState] = useState<DefaultState>('collected')
  const [mode, setMode] = useState<Mode>('merge')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; notFound: string[]; unrecognized: string[] } | null>(null)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setText(content)
    setPreview(null)
    setResult(null)
  }

  async function handlePreview() {
    setError('')
    setPreview(null)
    setResult(null)
    setLoading(true)

    const res = await fetch('/api/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, defaultState, mode, source, confirm: false }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al analizar')
      return
    }

    const data = await res.json()
    setPreview(data)
  }

  const [completing, setCompleting] = useState(false)
  const [completedResult, setCompletedResult] = useState<{ marked: number } | null>(null)

  async function handleMarkRest() {
    setCompleting(true)
    const res = await fetch('/api/importar/completar', { method: 'POST' })
    setCompleting(false)
    if (res.ok) {
      const data = await res.json()
      setCompletedResult(data)
      router.refresh()
    }
  }

  async function handleConfirm() {
    setError('')
    setLoading(true)

    const res = await fetch('/api/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, defaultState, mode, source, confirm: true }),
    })
    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Error al importar')
      return
    }

    const data = await res.json()
    setResult(data)
    setPreview(null)
    router.refresh()
  }

  const collectedCount = preview?.entries.filter(e => e.collected).length ?? 0
  const repeatedCount  = preview?.entries.filter(e => e.repeated).length ?? 0
  const missingCount   = preview?.entries.filter(e => !e.collected && !e.repeated).length ?? 0

  return (
    <div className="space-y-6">

      {/* Step 1: State (solo para lista manual) */}
      {source !== 'cromosrepes' && (
        <div className="rounded-xl border p-5 space-y-3 bg-card">
          <h2 className="font-semibold text-sm">1. ¿Qué estás importando?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STATE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setDefaultState(opt.value); setPreview(null); setResult(null) }}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  defaultState === opt.value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'hover:border-orange-300'
                }`}
              >
                <p className="font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Source */}
      <div className="rounded-xl border p-5 space-y-3 bg-card">
        <h2 className="font-semibold text-sm">2. ¿Desde dónde importas?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setSource('manual'); setPreview(null); setResult(null) }}
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
              source === 'manual' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'hover:border-orange-300'
            }`}
          >
            <p className="font-medium">Lista manual</p>
            <p className="text-xs text-muted-foreground mt-0.5">Números separados por comas, rangos, CSV…</p>
          </button>
          <button
            type="button"
            onClick={() => { setSource('cromosrepes'); setPreview(null); setResult(null) }}
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
              source === 'cromosrepes' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'hover:border-orange-300'
            }`}
          >
            <p className="font-medium">Desde CromosRepes</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pega la lista copiada de cromosrepes.com</p>
          </button>
        </div>

        {/* Aviso CromosRepes */}
        {source === 'cromosrepes' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">⚠️ Antes de copiar, sigue estos pasos:</p>
            <ol className="text-xs text-amber-700 space-y-1.5 list-decimal list-inside">
              <li>Entra en tu lista en <strong>cromosrepes.com</strong></li>
              <li>
                En la sección de Faltas o Repes, busca el texto{' '}
                <strong>&quot;Tachado: esperando recibir. Ocultar&quot;</strong>{' '}
                y pulsa <strong>Ocultar</strong> — así los cromos que estás esperando no se incluirán en la exportación
              </li>
              <li>Selecciona y copia toda la lista de números</li>
              <li>Pégala en el área de texto de abajo</li>
            </ol>
          </div>
        )}
      </div>

      {/* Step 3: Data input */}
      <div className="rounded-xl border p-5 space-y-3 bg-card">
        <h2 className="font-semibold text-sm">3. Introduce los datos</h2>

        <div className="space-y-1">
          {source === 'manual' ? (
            <p className="text-xs text-muted-foreground">
              Números separados por comas, espacios o saltos de línea. También rangos como <code className="bg-muted px-1 rounded">45-50</code>.
              Prefijos opcionales: <code className="bg-muted px-1 rounded">tengo:</code>, <code className="bg-muted px-1 rounded">repes:</code>, <code className="bg-muted px-1 rounded">faltan:</code>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pega directamente la lista copiada de CromosRepes. Se reconocerán automáticamente números normales, BIS, Estadio BIS y New Master.
              Las cards especiales (AO, EDL, MOM…) que no existen en nuestro catálogo aparecerán como no reconocidas.
            </p>
          )}
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setPreview(null); setResult(null) }}
            placeholder={source === 'cromosrepes'
              ? '1 Escudo , 9 Blanco , 37 Bis Stadium Card - Riyadh Air… , NM 08 Santamaría…'
              : 'Ejemplos:\n45, 46, 47\n100-120\ntengo: 1,2,3\nrepes: 50, 51'
            }
            rows={8}
            className="w-full rounded-lg border px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
          />
        </div>

        {source === 'manual' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">O sube un archivo CSV o TXT:</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Seleccionar archivo
            </button>
          </div>
        )}
      </div>

      {/* Step 3: Mode */}
      {source !== 'cromosrepes' && (
        <div className="rounded-xl border p-5 space-y-3 bg-card">
          <h2 className="font-semibold text-sm">4. Modo de importación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('merge')}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                mode === 'merge' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'hover:border-orange-300'
              }`}
            >
              <p className="font-medium">Combinar</p>
              <p className="text-xs text-muted-foreground mt-0.5">Añade a lo que ya tienes sin borrar nada</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                mode === 'replace' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'hover:border-orange-300'
              }`}
            >
              <p className="font-medium">Reemplazar</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sustituye el estado de los cromos importados</p>
            </button>
          </div>
        </div>
      )}

      {/* Analyze button */}
      {!preview && !result && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={loading || !text.trim()}
          className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-50"
        >
          {loading ? 'Analizando…' : 'Analizar lista'}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Preview */}
      {preview && (
        <div className="rounded-xl border p-5 space-y-4 bg-card">
          <h2 className="font-semibold text-sm">Previsualización</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total reconocidos" value={preview.entries.length} color="text-foreground" />
            {source === 'cromosrepes' ? (
              <>
                {(preview.faltasCount ?? 0) > 0 && <Stat label="Faltan" value={preview.faltasCount!} color="text-orange-600" />}
                {(preview.repesCount  ?? 0) > 0 && <Stat label="Repetidos" value={preview.repesCount!} color="text-blue-600" />}
              </>
            ) : (
              <>
                {collectedCount > 0 && <Stat label="Tengo"      value={collectedCount} color="text-green-600"  />}
                {repeatedCount  > 0 && <Stat label="Repetidos"  value={repeatedCount}  color="text-blue-600"   />}
                {missingCount   > 0 && <Stat label="Me faltan"  value={missingCount}   color="text-orange-600" />}
              </>
            )}
          </div>

          {preview.unrecognized.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
              <p className="font-medium">⚠ {preview.unrecognized.length} entradas no reconocidas (se ignorarán):</p>
              <p className="font-mono">{preview.unrecognized.slice(0, 20).join(', ')}{preview.unrecognized.length > 20 ? '…' : ''}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Importando…' : `Confirmar importación de ${preview.entries.length} cromos`}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3">
            <p className="font-semibold text-green-800">✓ Importación completada</p>
            <p className="text-sm text-green-700">{result.imported} cromos importados correctamente.</p>
            {result.notFound.length > 0 && (
              <p className="text-xs text-amber-700">
                {result.notFound.length} números no encontrados en el catálogo: {result.notFound.slice(0, 20).join(', ')}
              </p>
            )}
            <button
              type="button"
              onClick={() => { setResult(null); setText(''); setPreview(null); setCompletedResult(null) }}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-white transition-colors"
            >
              Nueva importación
            </button>
          </div>

          {/* Opción A: marcar el resto como conseguidos (solo CromosRepes) */}
          {source === 'cromosrepes' && !completedResult && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
              <p className="font-semibold text-blue-800">¿Ya has importado tus Faltas y Repes?</p>
              <p className="text-sm text-blue-700">
                Si has terminado de importar ambas listas de CromosRepes, pulsa el botón para marcar automáticamente todos los cromos restantes como <strong>conseguidos</strong>.
                Los que ya están marcados como falta o repetido no se modifican.
              </p>
              <button
                type="button"
                onClick={handleMarkRest}
                disabled={completing}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
              >
                {completing ? 'Marcando…' : '✓ Marcar el resto como conseguidos'}
              </button>
            </div>
          )}

          {completedResult && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">✓ ¡Colección completada!</p>
              <p className="text-sm text-green-700 mt-1">
                {completedResult.marked} cromos marcados como conseguidos. Tu colección está al día.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}
