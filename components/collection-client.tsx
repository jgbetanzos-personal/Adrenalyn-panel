'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckCheck, X } from 'lucide-react'
import { CardItem } from '@/components/card-item'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { TYPE_CONFIG } from '@/components/type-label'
import { TeamBadge } from '@/components/team-badge'
import type { Card, CardType } from '@/lib/types'

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

type FilterMode = 'all' | 'missing' | 'collected' | 'repeated'

export function CollectionClient({ initialCards }: { initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [showBis, setShowBis] = useState(true)
  const [showPlus, setShowPlus] = useState(true)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cards.filter((c) => {
      if (filter === 'missing'   && c.collected) return false
      if (filter === 'collected' && !c.collected) return false
      if (filter === 'repeated'  && !c.repeated) return false
      if (!showBis  && c.type === 'BIS') return false
      if (!showPlus && c.is_plus) return false
      if (q && !c.name.toLowerCase().includes(q) && !c.team.toLowerCase().includes(q) && !c.number.includes(q)) return false
      return true
    })
  }, [cards, search, filter, showBis, showPlus])

  // Called by TeamSection after a bulk toggle
  function onBulkUpdate(ids: number[], collected: boolean) {
    setCards(prev => prev.map(c => ids.includes(c.id) ? { ...c, collected } : c))
  }

  function sectionProgress(sectionCards: Card[]) {
    const collected = sectionCards.filter(c => c.collected).length
    const total     = sectionCards.length
    return { collected, total, pct: total > 0 ? Math.round((collected / total) * 100) : 0 }
  }

  const totalRepeated = cards.filter(c => c.repeated).length

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Colección</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filtered.length} cromos · {totalRepeated > 0 && <span className="text-purple-600 font-medium">{totalRepeated} repetidos</span>}
        </p>
      </div>

      {/* Controles */}
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
            ['missing',   'Faltan'],
            ['collected', 'Conseguidos'],
            ['repeated',  'Repetidos'],
          ] as [FilterMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setFilter(m)}
              className={`px-3 py-2 transition-colors ${
                filter === m
                  ? m === 'repeated' ? 'bg-purple-500 text-white' : 'bg-orange-500 text-white'
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

      {/* Regulares por equipo (incluye Estadio BIS tras el escudo) */}
      <SectionBlock title="Cromos Regulares por Equipo">
        {SECTIONS.map((team) => {
          const isTeamCard = (c: Card) => c.team === team && (c.type === 'REGULAR' || c.type === 'ESCUDO' || c.type === 'ESTADIO_BIS')
          const teamCards = filtered.filter(isTeamCard).sort((a, b) => {
            const order = (c: Card) => c.type === 'ESCUDO' ? 0 : c.type === 'ESTADIO_BIS' ? 1 : 2
            return order(a) - order(b) || a.id - b.id
          })
          if (!teamCards.length) return null
          return (
            <TeamSection
              key={team}
              title={team}
              cards={teamCards}
              prog={sectionProgress(teamCards)}
              showTeamBadge
              allCardsForTeam={cards.filter(isTeamCard)}
              onBulkUpdate={onBulkUpdate}
            />
          )
        })}
      </SectionBlock>

      <Separator />

      {/* Trading Card Game */}
      <SectionBlock title="Trading Card Game">
        {SPECIAL_TYPES.map((type) => {
          const typeCards = filtered.filter(c => c.type === type)
          if (!typeCards.length) return null
          const cfg = TYPE_CONFIG[type]
          return (
            <TeamSection
              key={type}
              title={cfg?.label ?? type}
              cards={typeCards}
              prog={sectionProgress(typeCards)}
              colorClass={cfg?.color}
              allCardsForTeam={cards.filter(c => c.type === type)}
              onBulkUpdate={onBulkUpdate}
            />
          )
        })}
      </SectionBlock>

      <Separator />

      {/* BIS */}
      {showBis && (
        <SectionBlock title="Cards BIS (Stadium Cards)">
          {SECTIONS.map((team) => {
            const bisCards = filtered.filter(c => c.team === team && c.type === 'BIS')
            if (!bisCards.length) return null
            return (
              <TeamSection
                key={team}
                title={`${team} BIS`}
                cards={bisCards}
                prog={sectionProgress(bisCards)}
                showTeamBadge
                allCardsForTeam={cards.filter(c => c.team === team && c.type === 'BIS')}
                onBulkUpdate={onBulkUpdate}
              />
            )
          })}
        </SectionBlock>
      )}

      <Separator />

      {/* New Master */}
      <SectionBlock title="New Master">
        {(() => {
          const nmCards = filtered.filter(c => c.type === 'NEW_MASTER')
          if (!nmCards.length) return null
          return (
            <TeamSection
              title="New Master"
              cards={nmCards}
              prog={sectionProgress(nmCards)}
              colorClass="bg-emerald-600 text-white"
              allCardsForTeam={cards.filter(c => c.type === 'NEW_MASTER')}
              onBulkUpdate={onBulkUpdate}
            />
          )
        })()}
      </SectionBlock>

      <Separator />

      {/* Plus Tienes */}
      {showPlus && (
        <SectionBlock title="Plus Tienes (99 nuevas cards)">
          {PLUS_TYPES.map((type) => {
            const typeCards = filtered.filter(c => c.type === type)
            if (!typeCards.length) return null
            const cfg = TYPE_CONFIG[type]
            return (
              <TeamSection
                key={type}
                title={cfg?.label ?? type}
                cards={typeCards}
                prog={sectionProgress(typeCards)}
                colorClass={cfg?.color}
                allCardsForTeam={cards.filter(c => c.type === type)}
                onBulkUpdate={onBulkUpdate}
              />
            )
          })}
        </SectionBlock>
      )}

    </div>
  )
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function TeamSection({
  title, cards, prog, colorClass, showTeamBadge = false,
  allCardsForTeam, onBulkUpdate,
}: {
  title: string
  cards: Card[]
  prog: { collected: number; total: number; pct: number }
  colorClass?: string
  showTeamBadge?: boolean
  allCardsForTeam: Card[]
  onBulkUpdate: (ids: number[], collected: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const allCollected = allCardsForTeam.every(c => c.collected)

  function bulkToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const targetState = !allCollected
    const ids = allCardsForTeam.map(c => c.id)
    startTransition(async () => {
      const res = await fetch('/api/cards/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, collected: targetState }),
      })
      if (res.ok) {
        onBulkUpdate(ids, targetState)
        router.refresh()
      }
    })
  }

  // Extract team name for badge (strip " BIS" suffix if present)
  const teamName = title.replace(/ BIS$/, '')

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors">
        {/* Badge equipo */}
        {showTeamBadge && <TeamBadge team={teamName} size="sm" />}

        {/* Contador */}
        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass ?? 'bg-slate-100 text-slate-700'}`}>
          {prog.collected}/{prog.total}
        </span>

        {/* Título (clickable para colapsar) */}
        <button
          onClick={() => setOpen(v => !v)}
          className="font-medium text-sm flex-1 text-left"
        >
          {title}
        </button>

        {/* Progress + % */}
        <div className="flex items-center gap-2 shrink-0">
          <Progress value={prog.pct} className="w-20 h-1.5" />
          <span className="text-xs text-muted-foreground w-8 text-right">{prog.pct}%</span>
        </div>

        {/* Select all / deselect all */}
        <button
          onClick={bulkToggle}
          disabled={pending}
          title={allCollected ? 'Desmarcar todos' : 'Marcar todos como conseguidos'}
          className={`
            shrink-0 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors cursor-pointer
            ${allCollected
              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              : 'bg-muted text-muted-foreground hover:bg-orange-100 hover:text-orange-700'}
            ${pending ? 'opacity-50' : ''}
          `}
        >
          {allCollected ? <X className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />}
          <span className="hidden sm:inline">{allCollected ? 'Desmarcar' : 'Todos'}</span>
        </button>

        {/* Colapsar */}
        <button onClick={() => setOpen(v => !v)} className="text-muted-foreground text-xs cursor-pointer">
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {cards.map((c) => <CardItem key={c.id} card={c} />)}
        </div>
      )}
    </div>
  )
}
