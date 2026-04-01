import Image from 'next/image'

const TEAM_SHIELD: Record<string, { file: string; ext: string }> = {
  'D. Alavés':          { file: 'alaves',    ext: 'png' },
  'Athletic Club':      { file: 'athletic',  ext: 'gif' },
  'Atlético de Madrid': { file: 'atletico',  ext: 'png' },
  'FC Barcelona':       { file: 'barcelona', ext: 'png' },
  'Real Betis':         { file: 'betis',     ext: 'gif' },
  'RC Celta':           { file: 'celta',     ext: 'gif' },
  'Elche CF':           { file: 'elche',     ext: 'gif' },
  'RCD Espanyol':       { file: 'espanyol',  ext: 'gif' },
  'Getafe CF':          { file: 'getafe',    ext: 'gif' },
  'Girona FC':          { file: 'girona',    ext: 'gif' },
  'Levante UD':         { file: 'levante',   ext: 'gif' },
  'Real Madrid':        { file: 'madrid',    ext: 'png' },
  'RCD Mallorca':       { file: 'mallorca',  ext: 'gif' },
  'CA Osasuna':         { file: 'osasuna',   ext: 'gif' },
  'Real Oviedo':        { file: 'oviedo',    ext: 'gif' },
  'Rayo Vallecano':     { file: 'rayo',      ext: 'gif' },
  'Real Sociedad':      { file: 'sociedad',  ext: 'gif' },
  'Sevilla FC':         { file: 'sevilla',   ext: 'gif' },
  'Valencia CF':        { file: 'valencia',  ext: 'gif' },
  'Villarreal CF':      { file: 'villarreal',ext: 'gif' },
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 24,
  md: 32,
  lg: 40,
}

interface TeamBadgeProps {
  team: string
  size?: 'sm' | 'md' | 'lg'
}

export function TeamBadge({ team, size = 'md' }: TeamBadgeProps) {
  const cfg = TEAM_SHIELD[team]
  if (!cfg) return null

  const px = SIZE_PX[size]

  return (
    <Image
      src={`/escudos/${cfg.file}.${cfg.ext}`}
      alt={`Escudo ${team}`}
      width={px}
      height={px}
      className="shrink-0 object-contain"
      title={team}
      unoptimized
    />
  )
}
