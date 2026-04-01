export type CardType =
  | 'REGULAR'
  | 'ESCUDO'
  | 'VAMOS'
  | 'GUANTES_ORO'
  | 'KRYPTONITA'
  | 'DIAMANTE'
  | 'INFLUENCER'
  | 'PROTA'
  | 'SUPER_CRACK'
  | 'BALON_ORO'
  | 'BALON_ORO_EXCELLENCE'
  | 'CARD_CHAMPIONS'
  | 'CARD_ATOMICA'
  | 'CARD_INVENCIBLE'
  | 'CAMPEON_CARD'
  | 'ENTRENADOR'
  | 'NUEVO_GUANTES_ORO'
  | 'NUEVO_KRYPTONITA'
  | 'NUEVO_DIAMANTE'
  | 'NUEVO_PROTA'
  | 'NUEVO_SUPER_CRACK'
  | 'ESPECIAL_AUTOGRAFO'
  | 'BIS'

export type Position = 'P' | 'D' | 'M' | 'DE' | 'C' | '-'

export interface Card {
  id: number
  number: string        // e.g. "1", "7 BIS"
  name: string
  team: string
  position: Position
  type: CardType
  collected: boolean
  repeated: boolean
  is_plus: boolean      // true = PLUS TIENES section (479+)
}

export interface Stats {
  total: number
  collected: number
  missing: number
  pct: number
  byType: { type: CardType; total: number; collected: number }[]
  byTeam: { team: string; total: number; collected: number }[]
}
