'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Exchange } from '@/lib/exchanges'

type Tab = 'recibidas' | 'enviadas' | 'en_curso' | 'completadas'

const TAB_LABELS: { id: Tab; label: string }[] = [
  { id: 'recibidas', label: 'Recibidas' },
  { id: 'enviadas', label: 'Enviadas' },
  { id: 'en_curso', label: 'En curso' },
  { id: 'completadas', label: 'Completadas' },
]

function filterExchanges(exchanges: Exchange[], tab: Tab, userId: number): Exchange[] {
  switch (tab) {
    case 'recibidas':
      return exchanges.filter(e => e.receiver_id === userId && e.status === 'pending')
    case 'enviadas':
      return exchanges.filter(e => e.proposer_id === userId && e.status === 'pending')
    case 'en_curso':
      return exchanges.filter(e => e.status === 'accepted')
    case 'completadas':
      return exchanges.filter(e => e.status === 'completed' || e.status === 'rejected')
  }
}

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

function ExchangeCard({
  exchange,
  currentUserId,
  onAction,
}: {
  exchange: Exchange
  currentUserId: number
  onAction: (action: string) => void
}) {
  const isProposer = exchange.proposer_id === currentUserId
  const other = isProposer ? exchange.receiver : exchange.proposer
  const myCards = isProposer ? exchange.proposer_gives : exchange.receiver_gives
  const theirCards = isProposer ? exchange.receiver_gives : exchange.proposer_gives

  const mySent = isProposer ? exchange.proposer_sent : exchange.receiver_sent
  const myReceived = isProposer ? exchange.proposer_received : exchange.receiver_received

  return (
    <div className="border rounded-xl p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {isProposer ? 'Propuesta a' : 'Propuesta de'}{' '}
            <span className="text-orange-600">
              {other.name} {other.surname}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(exchange.created_at).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(exchange.status)}`}>
          {statusLabel(exchange.status)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-medium mb-1 text-muted-foreground">Yo doy ({myCards.length})</p>
          <div className="space-y-0.5">
            {myCards.slice(0, 3).map(c => (
              <p key={c.id} className="truncate">#{c.number} {c.name}</p>
            ))}
            {myCards.length > 3 && (
              <p className="text-muted-foreground">+{myCards.length - 3} más</p>
            )}
          </div>
        </div>
        <div>
          <p className="font-medium mb-1 text-muted-foreground">Yo recibo ({theirCards.length})</p>
          <div className="space-y-0.5">
            {theirCards.slice(0, 3).map(c => (
              <p key={c.id} className="truncate">#{c.number} {c.name}</p>
            ))}
            {theirCards.length > 3 && (
              <p className="text-muted-foreground">+{theirCards.length - 3} más</p>
            )}
          </div>
        </div>
      </div>

      {exchange.message && (
        <p className="text-xs text-muted-foreground italic border-t pt-2">
          &ldquo;{exchange.message}&rdquo;
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href={`/intercambios/${exchange.id}`}
          className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors"
        >
          Ver detalle
        </Link>

        {exchange.status === 'pending' && !isProposer && (
          <>
            <button
              onClick={() => onAction('accept')}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
            >
              Aceptar
            </button>
            <button
              onClick={() => onAction('reject')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              Rechazar
            </button>
          </>
        )}

        {exchange.status === 'accepted' && (
          <>
            {!mySent && (
              <button
                onClick={() => onAction('mark-sent')}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                Marcar como enviado
              </button>
            )}
            {mySent && !myReceived && (
              <button
                onClick={() => onAction('mark-received')}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
              >
                Marcar como recibido
              </button>
            )}
          </>
        )}

        {exchange.status === 'completed' && (
          <Link
            href={`/intercambios/${exchange.id}#valorar`}
            className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
          >
            Valorar
          </Link>
        )}
      </div>
    </div>
  )
}

export function IntercambiosClient({
  exchanges,
  currentUserId,
}: {
  exchanges: Exchange[]
  currentUserId: number
}) {
  const [activeTab, setActiveTab] = useState<Tab>('recibidas')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const visible = filterExchanges(exchanges, activeTab, currentUserId)

  async function handleAction(exchangeId: number, action: string) {
    await fetch(`/api/exchanges/${exchangeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    startTransition(() => router.refresh())
  }

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b">
        {TAB_LABELS.map(({ id, label }) => {
          const count = filterExchanges(exchanges, id, currentUserId).length
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No hay intercambios en esta categoría.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" style={{ opacity: isPending ? 0.6 : 1 }}>
          {visible.map(ex => (
            <ExchangeCard
              key={ex.id}
              exchange={ex}
              currentUserId={currentUserId}
              onAction={(action) => handleAction(ex.id, action)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
