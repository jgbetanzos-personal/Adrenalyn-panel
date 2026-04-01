import { Badge } from '@/components/ui/badge'
import type { CardType } from '@/lib/types'

const TYPE_CONFIG: Record<CardType, { label: string; color: string }> = {
  REGULAR:               { label: 'Regular',            color: 'bg-slate-100 text-slate-700' },
  ESCUDO:                { label: 'Escudo',             color: 'bg-slate-200 text-slate-600' },
  VAMOS:                 { label: '¡Vamos!',            color: 'bg-blue-100 text-blue-700' },
  GUANTES_ORO:           { label: 'Guantes de Oro',     color: 'bg-yellow-100 text-yellow-700' },
  KRYPTONITA:            { label: 'Kryptonita',         color: 'bg-green-100 text-green-700' },
  DIAMANTE:              { label: 'Diamante',           color: 'bg-cyan-100 text-cyan-700' },
  INFLUENCER:            { label: 'Influencer',         color: 'bg-purple-100 text-purple-700' },
  PROTA:                 { label: 'Prota',              color: 'bg-indigo-100 text-indigo-700' },
  SUPER_CRACK:           { label: 'Super Crack',        color: 'bg-orange-100 text-orange-700' },
  BALON_ORO:             { label: 'Balón de Oro',       color: 'bg-amber-100 text-amber-700' },
  BALON_ORO_EXCELLENCE:  { label: 'B.O. Excellence',    color: 'bg-amber-200 text-amber-800' },
  CARD_CHAMPIONS:        { label: 'Champions',          color: 'bg-violet-100 text-violet-700' },
  CARD_ATOMICA:          { label: 'Atómica',            color: 'bg-red-100 text-red-700' },
  CARD_INVENCIBLE:       { label: 'Invencible',         color: 'bg-rose-100 text-rose-700' },
  CAMPEON_CARD:          { label: 'Campeón',            color: 'bg-pink-100 text-pink-700' },
  ENTRENADOR:            { label: 'Entrenador',         color: 'bg-teal-100 text-teal-700' },
  NUEVO_GUANTES_ORO:     { label: 'New Guantes Oro',    color: 'bg-yellow-200 text-yellow-800' },
  NUEVO_KRYPTONITA:      { label: 'New Kryptonita',     color: 'bg-green-200 text-green-800' },
  NUEVO_DIAMANTE:        { label: 'New Diamante',       color: 'bg-cyan-200 text-cyan-800' },
  NUEVO_PROTA:           { label: 'New Prota',          color: 'bg-indigo-200 text-indigo-800' },
  NUEVO_SUPER_CRACK:     { label: 'New Super Crack',    color: 'bg-orange-200 text-orange-800' },
  ESPECIAL_AUTOGRAFO:    { label: 'Autógrafo',          color: 'bg-fuchsia-100 text-fuchsia-700' },
  BIS:                   { label: 'BIS',                color: 'bg-lime-100 text-lime-700' },
}

export function TypeLabel({ type }: { type: CardType }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, color: 'bg-slate-100 text-slate-700' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export function TypeBadge({ type }: { type: CardType }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, color: '' }
  return <Badge variant="outline">{cfg.label}</Badge>
}

export { TYPE_CONFIG }
