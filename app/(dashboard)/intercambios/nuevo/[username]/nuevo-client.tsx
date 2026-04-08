'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Card } from '@/lib/types'

function CardCheckbox({
  card,
  checked,
  onChange,
}: {
  card: Card
  checked: boolean
  onChange: (id: number, checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(card.id, e.target.checked)}
        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
      />
      <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">
        #{card.number}
      </span>
      <span className="truncate">{card.name}</span>
      <span className="ml-auto text-xs text-muted-foreground shrink-0">{card.team}</span>
    </label>
  )
}

export function NuevoClient({
  receiverId,
  receiverName,
  iCanRequest,
  iCanOffer,
}: {
  receiverId: number
  receiverName: string
  iCanRequest: Card[]
  iCanOffer: Card[]
}) {
  const router = useRouter()
  const [selectedRequest, setSelectedRequest] = useState<Set<number>>(new Set())
  const [selectedOffer, setSelectedOffer] = useState<Set<number>>(new Set())
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleRequest(id: number, checked: boolean) {
    setSelectedRequest(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  function toggleOffer(id: number, checked: boolean) {
    setSelectedOffer(prev => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedRequest.size === 0 && selectedOffer.size === 0) {
      setError('Selecciona al menos un cromo para intercambiar.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          proposerGives: Array.from(selectedOffer),
          receiverGives: Array.from(selectedRequest),
          message: message.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Error al enviar la propuesta')
      }
      const data = await res.json() as { id: number }
      router.push(`/intercambios/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: cards I can offer */}
        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm">
            Cromos que puedo ofrecer
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              (mis repetidos que le faltan a {receiverName})
            </span>
          </h2>
          {iCanOffer.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tienes cromos que ofrecerle.
            </p>
          ) : (
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {iCanOffer.map(card => (
                <CardCheckbox
                  key={card.id}
                  card={card}
                  checked={selectedOffer.has(card.id)}
                  onChange={toggleOffer}
                />
              ))}
            </div>
          )}
          {selectedOffer.size > 0 && (
            <p className="text-xs text-orange-600 font-medium mt-2">
              {selectedOffer.size} seleccionado{selectedOffer.size !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Right: cards I can request */}
        <div className="border rounded-xl p-4">
          <h2 className="font-semibold mb-3 text-sm">
            Cromos que puedo pedir
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              (sus repetidos que me faltan a mí)
            </span>
          </h2>
          {iCanRequest.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay cromos que puedas pedirle.
            </p>
          ) : (
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {iCanRequest.map(card => (
                <CardCheckbox
                  key={card.id}
                  card={card}
                  checked={selectedRequest.has(card.id)}
                  onChange={toggleRequest}
                />
              ))}
            </div>
          )}
          {selectedRequest.size > 0 && (
            <p className="text-xs text-orange-600 font-medium mt-2">
              {selectedRequest.size} seleccionado{selectedRequest.size !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="message">
          Mensaje (opcional)
        </label>
        <textarea
          id="message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Añade un mensaje para acompañar tu propuesta..."
          className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar propuesta'}
        </button>
      </div>
    </form>
  )
}
