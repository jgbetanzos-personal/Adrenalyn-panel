'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { TypeLabel } from '@/components/type-label'
import type { Card } from '@/lib/types'

interface CardItemProps {
  card: Card
}

export function CardItem({ card: initial }: CardItemProps) {
  const [card, setCard] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await fetch(`/api/cards/${card.id}`, { method: 'PATCH' })
      if (res.ok) {
        const updated = await res.json()
        setCard(updated)
      }
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`
        relative w-full text-left rounded-lg border px-3 py-2 transition-all
        hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400
        ${card.collected
          ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700'
          : 'bg-background border-border opacity-60 hover:opacity-100'}
        ${pending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Checkbox visual */}
        <span className={`
          mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded
          border transition-colors
          ${card.collected ? 'bg-orange-500 border-orange-500 text-white' : 'border-muted-foreground/40'}
        `}>
          {card.collected && <Check className="w-3 h-3" strokeWidth={3} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              #{card.number}
            </span>
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
      </div>
    </button>
  )
}
