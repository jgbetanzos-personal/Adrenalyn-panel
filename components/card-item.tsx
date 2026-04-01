'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import { TypeLabel } from '@/components/type-label'
import type { Card } from '@/lib/types'

interface CardItemProps {
  card: Card
}

export function CardItem({ card: initial }: CardItemProps) {
  const [card, setCard] = useState(initial)
  const [pendingCollected, startCollected] = useTransition()
  const [pendingRepeated, startRepeated] = useTransition()
  const router = useRouter()

  function toggle(field: 'collected' | 'repeated') {
    const start = field === 'collected' ? startCollected : startRepeated
    start(async () => {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field }),
      })
      if (res.ok) {
        setCard(await res.json())
        router.refresh()
      }
    })
  }

  return (
    <div
      className={`
        relative w-full rounded-lg border px-3 py-2 transition-all
        ${card.collected
          ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700'
          : 'bg-background border-border opacity-60 hover:opacity-100'}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox conseguido */}
        <button
          onClick={() => toggle('collected')}
          disabled={pendingCollected}
          title={card.collected ? 'Marcar como no conseguido' : 'Marcar como conseguido'}
          className={`
            mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer
            ${card.collected ? 'bg-orange-500 border-orange-500 text-white' : 'border-muted-foreground/40 hover:border-orange-400'}
            ${pendingCollected ? 'opacity-50' : ''}
          `}
        >
          {card.collected && <Check className="w-3 h-3" strokeWidth={3} />}
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground shrink-0">#{card.number}</span>
            <span className={`text-sm font-medium truncate ${card.collected ? '' : 'text-muted-foreground'}`}>
              {card.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {card.position !== '-' && (
              <span className="text-xs text-muted-foreground font-mono">{card.position}</span>
            )}
            <TypeLabel type={card.type} />
          </div>
        </div>

        {/* Botón repetido */}
        <button
          onClick={() => toggle('repeated')}
          disabled={pendingRepeated}
          title={card.repeated ? 'Quitar repetido' : 'Marcar como repetido'}
          className={`
            mt-0.5 shrink-0 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium transition-colors cursor-pointer
            ${card.repeated
              ? 'bg-purple-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-purple-100 hover:text-purple-700'}
            ${pendingRepeated ? 'opacity-50' : ''}
          `}
        >
          <Copy className="w-3 h-3" />
          {card.repeated && <span>x2</span>}
        </button>
      </div>
    </div>
  )
}
