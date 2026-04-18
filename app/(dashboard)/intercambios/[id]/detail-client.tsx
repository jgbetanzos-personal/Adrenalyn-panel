'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Exchange } from '@/lib/exchanges'
import type { Card } from '@/lib/types'

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'accepted': return 'Aceptada'
    case 'rejected': return 'Rechazada'
    case 'completed': return 'Completada'
    default: return status
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700'
    case 'accepted': return 'bg-blue-100 text-blue-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    case 'completed': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function CardList({ cards, title }: { cards: Card[]; title: string }) {
  return (
    <div className="border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title} ({cards.length})</h3>
      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ningún cromo</p>
      ) : (
        <ul className="space-y-1">
          {cards.map(c => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground w-8 shrink-0">
                #{c.number}
              </span>
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{c.team}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-2xl leading-none hover:scale-110 transition-transform"
        >
          {n <= value ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}

function RateSection({
  exchangeId,
  ratedId,
  ratedName,
}: {
  exchangeId: number
  ratedId: number
  ratedName: string
}) {
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (score === 0) return
    setLoading(true)
    const res = await fetch(`/api/exchanges/${exchangeId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratedId, score, comment: comment.trim() || undefined }),
    })
    if (res.ok) setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="border rounded-xl p-4 text-sm text-green-700 bg-green-50">
        ¡Gracias por tu valoración!
      </div>
    )
  }

  return (
    <div id="valorar" className="border rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-sm">Valorar a {ratedName}</h3>
      <StarRating value={score} onChange={setScore} />
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={2}
        placeholder="Comentario (opcional)..."
        className="w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <button
        onClick={submit}
        disabled={score === 0 || loading}
        className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {loading ? 'Enviando...' : 'Enviar valoración'}
      </button>
    </div>
  )
}

export function ExchangeDetailClient({
  exchange,
  currentUserId,
  profileComplete,
}: {
  exchange: Exchange
  currentUserId: number
  profileComplete: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isProposer = exchange.proposer_id === currentUserId
  const other = isProposer ? exchange.receiver : exchange.proposer
  const myCards = isProposer ? exchange.proposer_gives : exchange.receiver_gives
  const theirCards = isProposer ? exchange.receiver_gives : exchange.proposer_gives
  const mySent = isProposer ? exchange.proposer_sent : exchange.receiver_sent
  const myReceived = isProposer ? exchange.proposer_received : exchange.receiver_received

  async function action(act: string) {
    await fetch(`/api/exchanges/${exchange.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6 max-w-2xl" style={{ opacity: isPending ? 0.6 : 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {isProposer ? 'Propuesta a' : 'Propuesta de'}{' '}
            <span className="font-medium text-foreground">
              {other.name} {other.surname}
            </span>{' '}
            (@{other.username})
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(exchange.created_at).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(exchange.status)}`}>
          {statusLabel(exchange.status)}
        </span>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <CardList cards={myCards} title="Yo doy" />
        <CardList cards={theirCards} title="Yo recibo" />
      </div>

      {/* Message */}
      {exchange.message && (
        <div className="border rounded-xl p-4 bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground mb-1">Mensaje</p>
          <p className="text-sm">{exchange.message}</p>
        </div>
      )}

      {/* Addresses (only when accepted) */}
      {exchange.status === 'accepted' && (
        <div className="border rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-sm">Direcciones de envío</h3>
          {isProposer ? (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Tu dirección: </span>
                {exchange.proposer_address ?? 'No disponible'}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Su dirección: </span>
                {exchange.receiver_address ?? 'No disponible'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Tu dirección: </span>
                {exchange.receiver_address ?? 'No disponible'}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Su dirección: </span>
                {exchange.proposer_address ?? 'No disponible'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Tracking */}
      {exchange.status === 'accepted' && (
        <div className="border rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-sm">Estado del envío</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Propuesta enviada</p>
              <p>{exchange.proposer_sent ? '✅ Sí' : '⏳ No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Receptor enviado</p>
              <p>{exchange.receiver_sent ? '✅ Sí' : '⏳ No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Propuesta recibida</p>
              <p>{exchange.proposer_received ? '✅ Sí' : '⏳ No'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Receptor recibido</p>
              <p>{exchange.receiver_received ? '✅ Sí' : '⏳ No'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {exchange.status === 'pending' && !isProposer && !profileComplete && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Para aceptar este intercambio necesitas tener completos tu <strong>nombre, apellidos, dirección y código postal</strong>.{' '}
            <a href="/perfil" className="underline font-medium hover:text-amber-900">Completar perfil →</a>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {exchange.status === 'pending' && !isProposer && (
            <>
              <button
                onClick={() => action('accept')}
                disabled={!profileComplete}
                title={!profileComplete ? 'Completa tu perfil para aceptar' : undefined}
                className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                Aceptar
              </button>
              <button
                onClick={() => action('reject')}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Rechazar
              </button>
            </>
          )}
          {exchange.status === 'accepted' && !mySent && (
            <button
              onClick={() => action('mark-sent')}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Marcar como enviado
            </button>
          )}
          {exchange.status === 'accepted' && mySent && !myReceived && (
            <button
              onClick={() => action('mark-received')}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
            >
              Marcar como recibido
            </button>
          )}
        </div>
      </div>

      {/* Rating */}
      {exchange.status === 'completed' && (
        <RateSection
          exchangeId={exchange.id}
          ratedId={other.id}
          ratedName={`${other.name} ${other.surname}`}
        />
      )}
    </div>
  )
}
