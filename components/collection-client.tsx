'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { CardItem } from '@/components/card-item'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TYPE_CONFIG } from '@/components/type-label'
import type { Card, CardType } from '@/lib/types'

// ─── Grupos y su orden de presentación ────────────────────────────────────────

const SECTIONS = [
  // Regular por equipo
  'D. Alavés', 'Athletic Club', 'Atlético de Madrid', 'FC Barcelona',
  'Real Betis', 'RC Celta', 'Elche CF', 'RCD Espanyol',
  'Getafe CF', 'Girona FC', 'Levante UD', 'Real Madrid',
  'RCD Mallorca', 'CA Osasuna', 'Real Oviedo', 'Rayo Vallecano',
  'Real Sociedad', 'Sevilla FC', 'Valencia CF', 'Villarreal CF',
] as const

const SPECIAL_TYPES: CardType[] = [
  'VAMOS', 'GUANTES_ORO', 'KRYPTONITA', 'DIAMANTE', 'INFLUENCER', 'PROTA',
  'SUPER_CRACK', 'BALON_ORO', 'BALON_ORO_EXCELLENCE', 'CARD_CHAMPIONS',
  'CARD_ATOMICA', 'CARD_INVENCIBLE', 'CAMPEON_CARD',
]

const PLUS_TYPES: CardType[] = [
  'ENTRENADOR', 'NUEVO_GUANTES_ORO', 'NUEVO_KRYPTONITA', 'NUEVO_DIAMANTE',
  'NUEVO_PROTA', 'NUEVO_SUPER_CRACK', 'ESPECIAL_AUTOGRAFO',
]

type FilterMode = 'all' | 'missing' | 'collected'

interface Props {
  initialCards: Card[]
}

export function CollectionClient({ initialCards }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showBis, setShowBis] = useState(true)
  const [showPlus, setShowPlus] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initialCards.filter((c) => {
      if (filter === 'missing' && c.collected) return false
      if (filter === 'collected' && !c.collected) return false
      if (!showBis && c.type === 'BIS') return false
      if (!showPlus && c.is_plus) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.team.toLowerCase().includes(q) && !c.number.includes(q)) return false
      return true
    })
  }, [initialCards, search, filter, showBis, showPlus])

  function sectionCards(teamOrType: string, isType = false) {
    if (isType) {
      return filtered.filter((c) => c.type === teamOrType)
    }
    return filtered.filter((c) => c.team === teamOrType && (c.type === 'REGULAR' || c.type === 'ESCUDO'))
  }

  function typeCards(type: CardType) {
    return filtered.filter((c) => c.type === type)
  }

  function sectionProgress(cards: Card[]) {
    if (!cards.length) return { collected: 0, total: 0, pct: 0 }
    const collected = cards.filter((c) => c.collected).length
    const total = cards.length
    return { collected, total, pct: Math.round((collected / total) * 100) }
  }

  const bisCards = filtered.filter((c) => c.type === 'BIS')

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Colección</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filtered.length} cromos · haz clic para marcar como conseguido
        </p>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, equipo o número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Filtro conseguidos */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          {(['all', 'missing', 'collected'] as FilterMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-2 transition-colors ${
                filter === m ? 'bg-orange-500 text-white' : 'hover:bg-muted'
              }`}
            >
              {m === 'all' ? 'Todos' : m === 'missing' ? 'Faltan' : 'Conseguidos'}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showBis} onChange={(e) => setShowBis(e.target.checked)} className="accent-orange-500" />
            <span>BIS</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showPlus} onChange={(e) => setShowPlus(e.target.checked)} className="accent-orange-500" />
            <span>Plus Tienes</span>
          </label>
        </div>
      </div>

      {/* ── Cromos regulares por equipo ───────────────────────────────────────── */}
      <SectionBlock title="Cromos Regulares por Equipo">
        {SECTIONS.map((team) => {
          const cards = sectionCards(team)
          if (!cards.length) return null
          const prog = sectionProgress(cards)
          return (
            <TeamSection key={team} team={team} cards={cards} prog={prog} />
          )
        })}
      </SectionBlock>

      <Separator />

      {/* ── Especiales Trading Card Game ──────────────────────────────────────── */}
      <SectionBlock title="Trading Card Game">
        {SPECIAL_TYPES.map((type) => {
          const cards = typeCards(type)
          if (!cards.length) return null
          const prog = sectionProgress(cards)
          const cfg = TYPE_CONFIG[type]
          return (
            <TeamSection key={type} team={cfg?.label ?? type} cards={cards} prog={prog} colorClass={cfg?.color} />
          )
        })}
      </SectionBlock>

      <Separator />

      {/* ── BIS ───────────────────────────────────────────────────────────────── */}
      {showBis && bisCards.length > 0 && (
        <>
          <SectionBlock title="Cards BIS (Stadium Cards)">
            {/* Agrupamos BIS por equipo */}
            {SECTIONS.map((team) => {
              const cards = bisCards.filter((c) => c.team === team)
              if (!cards.length) return null
              const prog = sectionProgress(cards)
              return (
                <TeamSection key={team} team={`${team} BIS`} cards={cards} prog={prog} />
              )
            })}
          </SectionBlock>
          <Separator />
        </>
      )}

      {/* ── Plus Tienes ───────────────────────────────────────────────────────── */}
      {showPlus && (
        <SectionBlock title="Plus Tienes (99 nuevas cards)">
          {PLUS_TYPES.map((type) => {
            const cards = typeCards(type)
            if (!cards.length) return null
            const prog = sectionProgress(cards)
            const cfg = TYPE_CONFIG[type]
            return (
              <TeamSection key={type} team={cfg?.label ?? type} cards={cards} prog={prog} colorClass={cfg?.color} />
            )
          })}
        </SectionBlock>
      )}
    </div>
  )
}

// ─── Bloque de sección ────────────────────────────────────────────────────────

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ─── Sección de equipo / tipo ─────────────────────────────────────────────────

function TeamSection({
  team, cards, prog, colorClass,
}: {
  team: string
  cards: Card[]
  prog: { collected: number; total: number; pct: number }
  colorClass?: string
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass ?? 'bg-slate-100 text-slate-700'}`}>
          {prog.collected}/{prog.total}
        </span>
        <span className="font-medium text-sm flex-1">{team}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Progress value={prog.pct} className="w-20 h-1.5" />
          <span className="text-xs text-muted-foreground w-8 text-right">{prog.pct}%</span>
          <span className="text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Grid de cromos */}
      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {cards.map((c) => (
            <CardItem key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  )
}
