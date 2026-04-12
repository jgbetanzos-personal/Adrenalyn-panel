'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { TypeLabel } from '@/components/type-label'
import { TeamBadge } from '@/components/team-badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TYPE_CONFIG } from '@/components/type-label'
import type { Card, CardType } from '@/lib/types'
import { Check, Copy } from 'lucide-react'

const SECTIONS = [
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
  'NUEVO_PROTA', 'NUEVO_SUPER_CRACK', 'MASTER_MISTER', 'NUEVO_BALON_ORO',
  'CARD_FANTASTICA', 'ESPECIAL_AUTOGRAFO',
]

type FilterMode = 'all' | 'collected' | 'repeated' | 'missing'

export function CollectionPublic({ cards }: { cards: Card[] }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showBis, setShowBis] = useState(true)
  const [showPlus, setShowPlus] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cards.filter((c) => {
      if (filter === 'collected' && !c.collected) return false
      if (filter === 'repeated' && !c.repeated) return false
      if (filter === 'missing' && c.collected) return false
      if (!showBis && c.type === 'BIS') return false
      if (!showPlus && c.is_plus) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.team.toLowerCase().includes(q) && !c.number.includes(q)) return false
      return true
    })
  }, [cards, search, filter, showBis, showPlus])

  const totalCollected = cards.filter(c => c.collected).length
  const totalRepeated = cards.filter(c => c.repeated).length
  const pct = Math.round((totalCollected / cards.length) * 100)

  function sectionProgress(sectionCards: Card[]) {
    const collected = sectionCards.filter(c => c.collected).length
    const total = sectionCards.length
    return { collected, total, pct: total > 0 ? Math.round((collected / total) * 100) : 0 }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Colección Adrenalyn XL LaLiga 2025-26</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-muted-foreground text-sm">
            {totalCollected} / {cards.length} cromos conseguidos
          </p>
          {totalRepeated > 0 && (
            <span className="text-sm text-purple-600 font-medium">{totalRepeated} repetidos</span>
          )}
        </div>
        <Progress value={pct} className="h-2 max-w-xs mt-2" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
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

        <div className="flex rounded-lg border overflow-hidden text-sm">
          {([
            ['all',       'Todos'],
            ['collected', 'Conseguidos'],
            ['missing',   'Faltan'],
            ['repeated',  'Repetidos'],
          ] as [FilterMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-2 transition-colors ${
                filter === m
                  ? m === 'repeated' ? 'bg-purple-500 text-white'
                  : m === 'missing'  ? 'bg-slate-600 text-white'
                  : 'bg-orange-500 text-white'
                  : 'hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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

      {/* Regulares por equipo */}
      <PublicSectionBlock title="Cromos Regulares por Equipo">
        {SECTIONS.map((team) => {
          const isTeamCard = (c: Card) => c.team === team && (c.type === 'REGULAR' || c.type === 'ESCUDO' || c.type === 'ESTADIO_BIS')
          const teamCards = filtered.filter(isTeamCard).sort((a, b) => {
            const order = (c: Card) => c.type === 'ESCUDO' ? 0 : c.type === 'ESTADIO_BIS' ? 1 : 2
            return order(a) - order(b) || a.id - b.id
          })
          if (!teamCards.length) return null
          return (
            <PublicTeamSection
              key={team}
              title={team}
              cards={teamCards}
              prog={sectionProgress(teamCards)}
              showTeamBadge
            />
          )
        })}
      </PublicSectionBlock>

      <Separator />

      <PublicSectionBlock title="Trading Card Game">
        {SPECIAL_TYPES.map((type) => {
          const typeCards = filtered.filter(c => c.type === type)
          if (!typeCards.length) return null
          const cfg = TYPE_CONFIG[type]
          return (
            <PublicTeamSection
              key={type}
              title={cfg?.label ?? type}
              cards={typeCards}
              prog={sectionProgress(typeCards)}
              colorClass={cfg?.color}
            />
          )
        })}
      </PublicSectionBlock>

      <Separator />

      {showBis && (
        <PublicSectionBlock title="Cards BIS (Stadium Cards)">
          {SECTIONS.map((team) => {
            const bisCards = filtered.filter(c => c.team === team && c.type === 'BIS')
            if (!bisCards.length) return null
            return (
              <PublicTeamSection
                key={team}
                title={`${team} BIS`}
                cards={bisCards}
                prog={sectionProgress(bisCards)}
                showTeamBadge
              />
            )
          })}
        </PublicSectionBlock>
      )}

      <Separator />

      <PublicSectionBlock title="New Master">
        {(() => {
          const nmCards = filtered.filter(c => c.type === 'NEW_MASTER')
          if (!nmCards.length) return null
          return (
            <PublicTeamSection
              title="New Master"
              cards={nmCards}
              prog={sectionProgress(nmCards)}
              colorClass="bg-emerald-600 text-white"
            />
          )
        })()}
      </PublicSectionBlock>

      <Separator />

      {showPlus && (
        <PublicSectionBlock title="Plus Tienes (99 nuevas cards)">
          {PLUS_TYPES.map((type) => {
            const typeCards = filtered.filter(c => c.type === type)
            if (!typeCards.length) return null
            const cfg = TYPE_CONFIG[type]
            return (
              <PublicTeamSection
                key={type}
                title={cfg?.label ?? type}
                cards={typeCards}
                prog={sectionProgress(typeCards)}
                colorClass={cfg?.color}
              />
            )
          })}
        </PublicSectionBlock>
      )}

    </div>
  )
}

function PublicSectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function PublicTeamSection({
  title, cards, prog, colorClass, showTeamBadge = false,
}: {
  title: string
  cards: Card[]
  prog: { collected: number; total: number; pct: number }
  colorClass?: string
  showTeamBadge?: boolean
}) {
  const [open, setOpen] = useState(false)
  const teamName = title.replace(/ BIS$/, '')

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40">
        {showTeamBadge && <TeamBadge team={teamName} size="sm" />}

        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass ?? 'bg-slate-100 text-slate-700'}`}>
          {prog.collected}/{prog.total}
        </span>

        <button
          onClick={() => setOpen(v => !v)}
          className="font-medium text-sm flex-1 text-left"
        >
          {title}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <Progress value={prog.pct} className="w-20 h-1.5" />
          <span className="text-xs text-muted-foreground w-8 text-right">{prog.pct}%</span>
        </div>

        <button onClick={() => setOpen(v => !v)} className="text-muted-foreground text-xs cursor-pointer">
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {cards.map((c) => <PublicCardItem key={c.id} card={c} />)}
        </div>
      )}
    </div>
  )
}

function PublicCardItem({ card }: { card: Card }) {
  return (
    <div
      className={`
        relative w-full rounded-lg border px-3 py-2
        ${card.collected
          ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700'
          : 'bg-background border-border opacity-60'}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Indicador conseguido (solo visual, no clickable) */}
        <div className={`
          mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border
          ${card.collected ? 'bg-orange-500 border-orange-500 text-white' : 'border-muted-foreground/40'}
        `}>
          {card.collected && <Check className="w-3 h-3" strokeWidth={3} />}
        </div>

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

        {/* Indicador repetido (solo visual) */}
        {card.repeated && (
          <div className="mt-0.5 shrink-0 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-purple-500 text-white">
            <Copy className="w-3 h-3" />
            <span>x2</span>
          </div>
        )}
      </div>
    </div>
  )
}
