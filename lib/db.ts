import { neon } from '@neondatabase/serverless'
import type { Card, CardType, Position } from './types'
import { hashPassword } from './users'

function sql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

// ── Schema + Seed ─────────────────────────────────────────────────────────────

export async function initDb() {
  const db = sql()

  // Cards catalog (collected/repeated kept for legacy migration)
  await db`
    CREATE TABLE IF NOT EXISTS cards (
      id        SERIAL PRIMARY KEY,
      number    TEXT NOT NULL,
      name      TEXT NOT NULL,
      team      TEXT NOT NULL DEFAULT '',
      position  TEXT NOT NULL DEFAULT '-',
      type      TEXT NOT NULL,
      collected BOOLEAN NOT NULL DEFAULT FALSE,
      repeated  BOOLEAN NOT NULL DEFAULT FALSE,
      is_plus   BOOLEAN NOT NULL DEFAULT FALSE
    )
  `

  // Users table
  await db`
    CREATE TABLE IF NOT EXISTS users (
      id           SERIAL PRIMARY KEY,
      username     TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name         TEXT NOT NULL DEFAULT '',
      surname      TEXT NOT NULL DEFAULT '',
      photo_url    TEXT,
      role         TEXT NOT NULL DEFAULT 'user'
    )
  `

  // Per-user collection state
  await db`
    CREATE TABLE IF NOT EXISTS user_cards (
      user_id   INTEGER NOT NULL REFERENCES users(id),
      card_id   INTEGER NOT NULL REFERENCES cards(id),
      collected BOOLEAN NOT NULL DEFAULT FALSE,
      repeated  BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (user_id, card_id)
    )
  `

  // Legacy migrations
  await db`ALTER TABLE cards ADD COLUMN IF NOT EXISTS repeated BOOLEAN NOT NULL DEFAULT FALSE`
  await db`
    UPDATE cards SET name='Hansi Flick', team='FC Barcelona', position='-', type='MASTER_MISTER'
    WHERE number='518' AND name != 'Hansi Flick'
  `
  await db`
    UPDATE cards SET name='Marcelino García', team='Villarreal CF', position='-', type='MASTER_MISTER'
    WHERE number='519' AND name != 'Marcelino García'
  `
  await db`
    INSERT INTO cards (number, name, team, position, type, is_plus)
    SELECT '520', 'Card Fantástica', '-', '-', 'CARD_FANTASTICA', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM cards WHERE number = '520')
  `
  await db`
    INSERT INTO cards (number, name, team, position, type, is_plus)
    SELECT '521', 'Courtois', 'Real Madrid', 'P', 'NUEVO_BALON_ORO', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM cards WHERE number = '521')
  `

  // Seed cards catalog
  const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM cards`
  if (count === 0) {
    await seedCards()
  }

  // Seed users
  await seedUsers()

  // Migrate existing collected/repeated data from old cards table to gorka's user_cards
  await db`
    INSERT INTO user_cards (user_id, card_id, collected, repeated)
    SELECT u.id, c.id, c.collected, c.repeated
    FROM cards c
    CROSS JOIN (SELECT id FROM users WHERE username = 'gorka') u
    WHERE c.collected = TRUE OR c.repeated = TRUE
    ON CONFLICT (user_id, card_id) DO NOTHING
  `
}

async function seedUsers() {
  const db = sql()
  const [{ count }] = await db`SELECT COUNT(*)::int AS count FROM users`
  if (count > 0) return

  const [superHash, gorkaHash, hugoHash] = await Promise.all([
    hashPassword('sup3r4admin31'),
    hashPassword('g0rk42015'),
    hashPassword('hugo2015'),
  ])

  await db`
    INSERT INTO users (username, password_hash, name, surname, role) VALUES
    ('superadmin', ${superHash}, 'Super', 'Admin', 'superadmin'),
    ('gorka',      ${gorkaHash}, 'Gorka', 'De Los Ríos', 'user'),
    ('hugo',       ${hugoHash},  'Hugo',  'Bartolomé',   'user')
  `
}

async function seedCards() {
  const db = sql()
  const BATCH = 100
  for (let i = 0; i < ALL_CARDS.length; i += BATCH) {
    const batch = ALL_CARDS.slice(i, i + BATCH)
    const numbers   = batch.map(c => c.number)
    const names     = batch.map(c => c.name)
    const teams     = batch.map(c => c.team)
    const positions = batch.map(c => c.position)
    const types     = batch.map(c => c.type)
    const isPlus    = batch.map(c => c.is_plus)
    await db`
      INSERT INTO cards (number, name, team, position, type, collected, is_plus)
      SELECT * FROM unnest(
        ${numbers}::text[],
        ${names}::text[],
        ${teams}::text[],
        ${positions}::text[],
        ${types}::text[],
        ARRAY(SELECT false FROM generate_series(1, ${batch.length}))::boolean[],
        ${isPlus}::boolean[]
      )
    `
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllCards(userId: number): Promise<Card[]> {
  await initDb()
  const db = sql()
  const rows = await db`
    SELECT c.id, c.number, c.name, c.team, c.position, c.type, c.is_plus,
           COALESCE(uc.collected, FALSE) AS collected,
           COALESCE(uc.repeated,  FALSE) AS repeated
    FROM cards c
    LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = ${userId}
    ORDER BY c.is_plus ASC, c.id ASC
  `
  return rows.map(toCard)
}

export async function toggleCard(
  userId: number,
  cardId: number,
  field: 'collected' | 'repeated' = 'collected'
): Promise<Card> {
  await initDb()
  const db = sql()

  if (field === 'repeated') {
    await db`
      INSERT INTO user_cards (user_id, card_id, collected, repeated)
      VALUES (${userId}, ${cardId}, FALSE, TRUE)
      ON CONFLICT (user_id, card_id) DO UPDATE SET repeated = NOT user_cards.repeated
    `
  } else {
    await db`
      INSERT INTO user_cards (user_id, card_id, collected, repeated)
      VALUES (${userId}, ${cardId}, TRUE, FALSE)
      ON CONFLICT (user_id, card_id) DO UPDATE SET collected = NOT user_cards.collected
    `
  }

  const [row] = await db`
    SELECT c.id, c.number, c.name, c.team, c.position, c.type, c.is_plus,
           COALESCE(uc.collected, FALSE) AS collected,
           COALESCE(uc.repeated,  FALSE) AS repeated
    FROM cards c
    LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = ${userId}
    WHERE c.id = ${cardId}
  `
  return toCard(row)
}

export async function bulkSetCollected(userId: number, ids: number[], collected: boolean): Promise<void> {
  await initDb()
  const db = sql()
  await db`
    INSERT INTO user_cards (user_id, card_id, collected, repeated)
    SELECT ${userId}, unnest(${ids}::int[]), ${collected}, FALSE
    ON CONFLICT (user_id, card_id) DO UPDATE SET collected = ${collected}
  `
}

export async function getStats(userId: number) {
  await initDb()
  const db = sql()

  const [{ total }] = await db`SELECT COUNT(*)::int AS total FROM cards`
  const [{ collected }] = await db`
    SELECT COUNT(*)::int AS collected FROM user_cards
    WHERE user_id = ${userId} AND collected = TRUE
  `

  const byType = await db`
    SELECT c.type,
           COUNT(*)::int AS total,
           SUM(CASE WHEN uc.collected THEN 1 ELSE 0 END)::int AS collected
    FROM cards c
    LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = ${userId}
    GROUP BY c.type ORDER BY c.type
  `

  const byTeam = await db`
    SELECT c.team,
           COUNT(*)::int AS total,
           SUM(CASE WHEN uc.collected THEN 1 ELSE 0 END)::int AS collected
    FROM cards c
    LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = ${userId}
    WHERE c.team != '-'
    GROUP BY c.team ORDER BY c.team
  `

  return {
    total,
    collected,
    missing: total - collected,
    pct: total > 0 ? Math.round((collected / total) * 100) : 0,
    byType: byType as { type: CardType; total: number; collected: number }[],
    byTeam: byTeam as { team: string; total: number; collected: number }[],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCard(row: any): Card {
  return {
    id:        row.id,
    number:    row.number,
    name:      row.name,
    repeated:  row.repeated === true || row.repeated === 1,
    team:      row.team,
    position:  row.position as Position,
    type:      row.type as CardType,
    collected: row.collected === true || row.collected === 1,
    is_plus:   row.is_plus === true || row.is_plus === 1,
  }
}

type SeedCard = {
  number: string
  name: string
  team: string
  position: Position
  type: CardType
  is_plus: boolean
}

function r(number: number, name: string, team: string, position: Position, type: CardType = 'REGULAR'): SeedCard {
  return { number: String(number), name, team, position, type, is_plus: false }
}
function plus(number: number, name: string, team: string, position: Position, type: CardType): SeedCard {
  return { number: String(number), name, team, position, type, is_plus: true }
}
function bis(number: number, name: string, team: string, position: Position): SeedCard {
  return { number: `${number} BIS`, name, team, position, type: 'BIS', is_plus: false }
}

const ALL_CARDS: SeedCard[] = [
  // ─── D. ALAVÉS (1-18) ───────────────────────────────────────────────────────
  r(1,  'Escudo',           'D. Alavés', '-', 'ESCUDO'),
  r(2,  'Sivera',           'D. Alavés', 'P'),
  r(3,  'Raúl Fernández',   'D. Alavés', 'P'),
  r(4,  'Jonny',            'D. Alavés', 'D'),
  r(5,  'Tenaglia',         'D. Alavés', 'D'),
  r(6,  'Pacheco',          'D. Alavés', 'D'),
  r(7,  'Parada',           'D. Alavés', 'D'),
  r(8,  'Moussa Diarra',    'D. Alavés', 'D'),
  r(9,  'Blanco',           'D. Alavés', 'M'),
  r(10, 'Guevara',          'D. Alavés', 'M'),
  r(11, 'Guridi',           'D. Alavés', 'M'),
  r(12, 'Aleñá',            'D. Alavés', 'M'),
  r(13, 'Pablo Ibáñez',     'D. Alavés', 'M'),
  r(14, 'Denis Suárez',     'D. Alavés', 'M'),
  r(15, 'Carlos Vicente',   'D. Alavés', 'DE'),
  r(16, 'Toni Martínez',    'D. Alavés', 'DE'),
  r(17, 'Boyé',             'D. Alavés', 'DE'),
  r(18, 'Mariano',          'D. Alavés', 'DE'),

  // ─── ATHLETIC CLUB (19-36) ───────────────────────────────────────────────────
  r(19, 'Escudo',             'Athletic Club', '-', 'ESCUDO'),
  r(20, 'Unai Simón',         'Athletic Club', 'P'),
  r(21, 'Padilla',            'Athletic Club', 'P'),
  r(22, 'Areso',              'Athletic Club', 'D'),
  r(23, 'Vivian',             'Athletic Club', 'D'),
  r(24, 'Paredes',            'Athletic Club', 'D'),
  r(25, 'Laporte',            'Athletic Club', 'D'),
  r(26, 'Yuri',               'Athletic Club', 'D'),
  r(27, 'Ruiz de Galarreta',  'Athletic Club', 'M'),
  r(28, 'Jauregizar',         'Athletic Club', 'M'),
  r(29, 'Vesga',              'Athletic Club', 'M'),
  r(30, 'Unai Gómez',         'Athletic Club', 'M'),
  r(31, 'Sancet',             'Athletic Club', 'M'),
  r(32, 'Berenguer',          'Athletic Club', 'DE'),
  r(33, 'Williams',           'Athletic Club', 'DE'),
  r(34, 'Maroan',             'Athletic Club', 'DE'),
  r(35, 'Guruzeta',           'Athletic Club', 'DE'),
  r(36, 'Nico Williams',      'Athletic Club', 'DE'),

  // ─── ATLÉTICO DE MADRID (37-54) ─────────────────────────────────────────────
  r(37, 'Escudo',          'Atlético de Madrid', '-', 'ESCUDO'),
  r(38, 'Oblak',           'Atlético de Madrid', 'P'),
  r(39, 'Musso',           'Atlético de Madrid', 'P'),
  r(40, 'Marcos Llorente', 'Atlético de Madrid', 'D'),
  r(41, 'Le Normand',      'Atlético de Madrid', 'D'),
  r(42, 'Lenglet',         'Atlético de Madrid', 'D'),
  r(43, 'Hancko',          'Atlético de Madrid', 'D'),
  r(44, 'Ruggeri',         'Atlético de Madrid', 'D'),
  r(45, 'Koke',            'Atlético de Madrid', 'M'),
  r(46, 'Barrios',         'Atlético de Madrid', 'M'),
  r(47, 'Gallagher',       'Atlético de Madrid', 'M'),
  r(48, 'Álex Baena',      'Atlético de Madrid', 'M'),
  r(49, 'Almada',          'Atlético de Madrid', 'M'),
  r(50, 'Nico González',   'Atlético de Madrid', 'M'),
  r(51, 'Giuliano',        'Atlético de Madrid', 'DE'),
  r(52, 'Julián Álvarez',  'Atlético de Madrid', 'DE'),
  r(53, 'Sorloth',         'Atlético de Madrid', 'DE'),
  r(54, 'Griezmann',       'Atlético de Madrid', 'DE'),

  // ─── FC BARCELONA (55-72) ────────────────────────────────────────────────────
  r(55, 'Escudo',         'FC Barcelona', '-', 'ESCUDO'),
  r(56, 'Joan García',    'FC Barcelona', 'P'),
  r(57, 'Szczesny',       'FC Barcelona', 'P'),
  r(58, 'Koundé',         'FC Barcelona', 'D'),
  r(59, 'Cubarsí',        'FC Barcelona', 'D'),
  r(60, 'Eric García',    'FC Barcelona', 'D'),
  r(61, 'Araújo',         'FC Barcelona', 'D'),
  r(62, 'Baldé',          'FC Barcelona', 'D'),
  r(63, 'De Jong',        'FC Barcelona', 'M'),
  r(64, 'Gavi',           'FC Barcelona', 'M'),
  r(65, 'Pedri',          'FC Barcelona', 'M'),
  r(66, 'Fermín',         'FC Barcelona', 'M'),
  r(67, 'Dani Olmo',      'FC Barcelona', 'M'),
  r(68, 'Raphinha',       'FC Barcelona', 'DE'),
  r(69, 'Lamine Yamal',   'FC Barcelona', 'DE'),
  r(70, 'Ferran Torres',  'FC Barcelona', 'DE'),
  r(71, 'Lewandowski',    'FC Barcelona', 'DE'),
  r(72, 'Rashford',       'FC Barcelona', 'DE'),

  // ─── REAL BETIS (73-90) ──────────────────────────────────────────────────────
  r(73, 'Escudo',          'Real Betis', '-', 'ESCUDO'),
  r(74, 'Pau López',       'Real Betis', 'P'),
  r(75, 'Valles',          'Real Betis', 'P'),
  r(76, 'Bellerín',        'Real Betis', 'D'),
  r(77, 'Bartra',          'Real Betis', 'D'),
  r(78, 'Diego Llorente',  'Real Betis', 'D'),
  r(79, 'Natan',           'Real Betis', 'D'),
  r(80, 'Valentín Gómez',  'Real Betis', 'D'),
  r(81, 'Junior',          'Real Betis', 'D'),
  r(82, 'Altimira',        'Real Betis', 'M'),
  r(83, 'Amrabat',         'Real Betis', 'M'),
  r(84, 'Pablo Fornals',   'Real Betis', 'M'),
  r(85, 'Lo Celso',        'Real Betis', 'M'),
  r(86, 'Isco',            'Real Betis', 'M'),
  r(87, 'Antony',          'Real Betis', 'DE'),
  r(88, 'Cucho Hernández', 'Real Betis', 'DE'),
  r(89, 'Riquelme',        'Real Betis', 'DE'),
  r(90, 'Abde',            'Real Betis', 'DE'),

  // ─── RC CELTA (91-108) ───────────────────────────────────────────────────────
  r(91,  'Escudo',         'RC Celta', '-', 'ESCUDO'),
  r(92,  'Radu',           'RC Celta', 'P'),
  r(93,  'Iván Villar',    'RC Celta', 'P'),
  r(94,  'Javi Rueda',     'RC Celta', 'D'),
  r(95,  'Javi Rodríguez', 'RC Celta', 'D'),
  r(96,  'Starfelt',       'RC Celta', 'D'),
  r(97,  'Marcos Alonso',  'RC Celta', 'D'),
  r(98,  'Mingueza',       'RC Celta', 'D'),
  r(99,  'Carreira',       'RC Celta', 'D'),
  r(100, 'Ilaix Moriba',   'RC Celta', 'M'),
  r(101, 'Fran Beltrán',   'RC Celta', 'M'),
  r(102, 'Sotelo',         'RC Celta', 'M'),
  r(103, 'Hugo Álvarez',   'RC Celta', 'M'),
  r(104, 'Swedberg',       'RC Celta', 'M'),
  r(105, 'Bryan Zaragoza', 'RC Celta', 'DE'),
  r(106, 'Iago Aspas',     'RC Celta', 'DE'),
  r(107, 'Borja Iglesias', 'RC Celta', 'DE'),
  r(108, 'Jutglà',         'RC Celta', 'DE'),

  // ─── ELCHE CF (109-126) ──────────────────────────────────────────────────────
  r(109, 'Escudo',            'Elche CF', '-', 'ESCUDO'),
  r(110, 'Iñaki Peña',        'Elche CF', 'P'),
  r(111, 'Dituro',            'Elche CF', 'P'),
  r(112, 'Álvaro Núñez',      'Elche CF', 'D'),
  r(113, 'Chust',             'Elche CF', 'D'),
  r(114, 'Bigas',             'Elche CF', 'D'),
  r(115, 'Affengruber',       'Elche CF', 'D'),
  r(116, 'Pedrosa',           'Elche CF', 'D'),
  r(117, 'Fede Redondo',      'Elche CF', 'M'),
  r(118, 'Germán Valera',     'Elche CF', 'M'),
  r(119, 'Martim Neto',       'Elche CF', 'M'),
  r(120, 'Febas',             'Elche CF', 'M'),
  r(121, 'Marc Aguado',       'Elche CF', 'M'),
  r(122, 'Rodri Mendoza',     'Elche CF', 'M'),
  r(123, 'Josan',             'Elche CF', 'M'),
  r(124, 'Álvaro Rodríguez',  'Elche CF', 'DE'),
  r(125, 'André Silva',       'Elche CF', 'DE'),
  r(126, 'Rafa Mir',          'Elche CF', 'DE'),

  // ─── RCD ESPANYOL (127-144) ──────────────────────────────────────────────────
  r(127, 'Escudo',             'RCD Espanyol', '-', 'ESCUDO'),
  r(128, 'Dmitrovic',          'RCD Espanyol', 'P'),
  r(129, 'Fortuño',            'RCD Espanyol', 'P'),
  r(130, 'El Hilali',          'RCD Espanyol', 'D'),
  r(131, 'Calero',             'RCD Espanyol', 'D'),
  r(132, 'Riedel',             'RCD Espanyol', 'D'),
  r(133, 'Cabrera',            'RCD Espanyol', 'D'),
  r(134, 'Carlos Romero',      'RCD Espanyol', 'D'),
  r(135, 'Pol Lozano',         'RCD Espanyol', 'M'),
  r(136, 'Urko',               'RCD Espanyol', 'M'),
  r(137, 'Edu Expósito',       'RCD Espanyol', 'M'),
  r(138, 'Terrats',            'RCD Espanyol', 'M'),
  r(139, 'Antoniu Roca',       'RCD Espanyol', 'M'),
  r(140, 'Dolan',              'RCD Espanyol', 'DE'),
  r(141, 'Roberto Fernández',  'RCD Espanyol', 'DE'),
  r(142, 'Kike García',        'RCD Espanyol', 'DE'),
  r(143, 'Puado',              'RCD Espanyol', 'DE'),
  r(144, 'Pere Milla',         'RCD Espanyol', 'DE'),

  // ─── GETAFE CF (145-162) ─────────────────────────────────────────────────────
  r(145, 'Escudo',           'Getafe CF', '-', 'ESCUDO'),
  r(146, 'David Soria',      'Getafe CF', 'P'),
  r(147, 'Letacek',          'Getafe CF', 'P'),
  r(148, 'Iglesias',         'Getafe CF', 'D'),
  r(149, 'Kiko Femenía',     'Getafe CF', 'D'),
  r(150, 'Djené',            'Getafe CF', 'D'),
  r(151, 'Domingos Duarte',  'Getafe CF', 'D'),
  r(152, 'Abqar',            'Getafe CF', 'D'),
  r(153, 'Diego Rico',       'Getafe CF', 'D'),
  r(154, 'Davinchi',         'Getafe CF', 'D'),
  r(155, 'Mario Martín',     'Getafe CF', 'M'),
  r(156, 'Arambarri',        'Getafe CF', 'M'),
  r(157, 'Milla',            'Getafe CF', 'M'),
  r(158, 'Neyou',            'Getafe CF', 'M'),
  r(159, 'Javi Muñoz',       'Getafe CF', 'M'),
  r(160, 'Borja Mayoral',    'Getafe CF', 'DE'),
  r(161, 'Liso',             'Getafe CF', 'DE'),
  r(162, 'Coba',             'Getafe CF', 'DE'),

  // ─── GIRONA FC (163-180) ─────────────────────────────────────────────────────
  r(163, 'Escudo',        'Girona FC', '-', 'ESCUDO'),
  r(164, 'Gazzaniga',     'Girona FC', 'P'),
  r(165, 'Livakovic',     'Girona FC', 'P'),
  r(166, 'Arnau',         'Girona FC', 'D'),
  r(167, 'Hugo Rincón',   'Girona FC', 'D'),
  r(168, 'Vitor Reis',    'Girona FC', 'D'),
  r(169, 'Blind',         'Girona FC', 'D'),
  r(170, 'Francés',       'Girona FC', 'D'),
  r(171, 'Álex Moreno',   'Girona FC', 'D'),
  r(172, 'Witsel',        'Girona FC', 'M'),
  r(173, 'Ounahi',        'Girona FC', 'M'),
  r(174, 'Iván Martín',   'Girona FC', 'M'),
  r(175, 'Yáser Asprilla','Girona FC', 'M'),
  r(176, 'Joel Roca',     'Girona FC', 'M'),
  r(177, 'Tsygankov',     'Girona FC', 'DE'),
  r(178, 'Vanat',         'Girona FC', 'DE'),
  r(179, 'Stuani',        'Girona FC', 'DE'),
  r(180, 'Bryan Gil',     'Girona FC', 'DE'),

  // ─── LEVANTE UD (181-198) ────────────────────────────────────────────────────
  r(181, 'Escudo',          'Levante UD', '-', 'ESCUDO'),
  r(182, 'Ryan',            'Levante UD', 'P'),
  r(183, 'Pablo Campos',    'Levante UD', 'P'),
  r(184, 'Toljan',          'Levante UD', 'D'),
  r(185, 'Dela',            'Levante UD', 'D'),
  r(186, 'Elgezabal',       'Levante UD', 'D'),
  r(187, 'Matías Moreno',   'Levante UD', 'D'),
  r(188, 'Manu Sánchez',    'Levante UD', 'D'),
  r(189, 'Pampín',          'Levante UD', 'D'),
  r(190, 'Oriol Rey',       'Levante UD', 'M'),
  r(191, 'Pablo Martínez',  'Levante UD', 'M'),
  r(192, 'Olasagasti',      'Levante UD', 'M'),
  r(193, 'Vencedor',        'Levante UD', 'M'),
  r(194, 'Carlos Álvarez',  'Levante UD', 'DE'),
  r(195, 'Morales',         'Levante UD', 'DE'),
  r(196, 'Brugué',          'Levante UD', 'DE'),
  r(197, 'Iván Romero',     'Levante UD', 'DE'),
  r(198, 'Etta Eyong',      'Levante UD', 'DE'),

  // ─── REAL MADRID (199-216) ───────────────────────────────────────────────────
  r(199, 'Escudo',       'Real Madrid', '-', 'ESCUDO'),
  r(200, 'Courtois',     'Real Madrid', 'P'),
  r(201, 'Lunin',        'Real Madrid', 'P'),
  r(202, 'Carvajal',     'Real Madrid', 'D'),
  r(203, 'Trent',        'Real Madrid', 'D'),
  r(204, 'Militão',      'Real Madrid', 'D'),
  r(205, 'Huijsen',      'Real Madrid', 'D'),
  r(206, 'Rüdiger',      'Real Madrid', 'D'),
  r(207, 'Carreras',     'Real Madrid', 'D'),
  r(208, 'Tchouaméni',   'Real Madrid', 'M'),
  r(209, 'Fede Valverde','Real Madrid', 'M'),
  r(210, 'Bellingham',   'Real Madrid', 'M'),
  r(211, 'Güler',        'Real Madrid', 'M'),
  r(212, 'Mastantuono',  'Real Madrid', 'M'),
  r(213, 'Rodrygo',      'Real Madrid', 'DE'),
  r(214, 'Mbappé',       'Real Madrid', 'DE'),
  r(215, 'Gonzalo',      'Real Madrid', 'DE'),
  r(216, 'Vinícius',     'Real Madrid', 'DE'),

  // ─── RCD MALLORCA (217-234) ──────────────────────────────────────────────────
  r(217, 'Escudo',          'RCD Mallorca', '-', 'ESCUDO'),
  r(218, 'Leo Román',       'RCD Mallorca', 'P'),
  r(219, 'Bergström',       'RCD Mallorca', 'P'),
  r(220, 'Morey',           'RCD Mallorca', 'D'),
  r(221, 'Maffeo',          'RCD Mallorca', 'D'),
  r(222, 'Valjent',         'RCD Mallorca', 'D'),
  r(223, 'Raíllo',          'RCD Mallorca', 'D'),
  r(224, 'Kumbulla',        'RCD Mallorca', 'D'),
  r(225, 'Mojica',          'RCD Mallorca', 'D'),
  r(226, 'Samú Costa',      'RCD Mallorca', 'M'),
  r(227, 'Antonio Sánchez', 'RCD Mallorca', 'M'),
  r(228, 'Darder',          'RCD Mallorca', 'M'),
  r(229, 'Morlanes',        'RCD Mallorca', 'M'),
  r(230, 'Pablo Torre',     'RCD Mallorca', 'M'),
  r(231, 'Asano',           'RCD Mallorca', 'DE'),
  r(232, 'Muriqi',          'RCD Mallorca', 'DE'),
  r(233, 'Mateo Joseph',    'RCD Mallorca', 'DE'),
  r(234, 'Jan Virgili',     'RCD Mallorca', 'DE'),

  // ─── CA OSASUNA (235-252) ────────────────────────────────────────────────────
  r(235, 'Escudo',         'CA Osasuna', '-', 'ESCUDO'),
  r(236, 'Sergio Herrera', 'CA Osasuna', 'P'),
  r(237, 'Aitor Fernández','CA Osasuna', 'P'),
  r(238, 'Rosier',         'CA Osasuna', 'D'),
  r(239, 'Boyomo',         'CA Osasuna', 'D'),
  r(240, 'Catena',         'CA Osasuna', 'D'),
  r(241, 'Herrando',       'CA Osasuna', 'D'),
  r(242, 'Juan Cruz',      'CA Osasuna', 'D'),
  r(243, 'Abel Bretones',  'CA Osasuna', 'D'),
  r(244, 'Torró',          'CA Osasuna', 'M'),
  r(245, 'Moncayola',      'CA Osasuna', 'M'),
  r(246, 'Moi Gómez',      'CA Osasuna', 'M'),
  r(247, 'Rubén García',   'CA Osasuna', 'M'),
  r(248, 'Aimar Oroz',     'CA Osasuna', 'M'),
  r(249, 'Víctor Muñoz',   'CA Osasuna', 'DE'),
  r(250, 'Raúl García',    'CA Osasuna', 'DE'),
  r(251, 'Budimir',        'CA Osasuna', 'DE'),
  r(252, 'Becker',         'CA Osasuna', 'DE'),

  // ─── REAL OVIEDO (253-270) ───────────────────────────────────────────────────
  r(253, 'Escudo',           'Real Oviedo', '-', 'ESCUDO'),
  r(254, 'Aarón Escandell',  'Real Oviedo', 'P'),
  r(255, 'Moldovan',         'Real Oviedo', 'P'),
  r(256, 'Nacho Vidal',      'Real Oviedo', 'D'),
  r(257, 'Eric Bailly',      'Real Oviedo', 'D'),
  r(258, 'David Carmo',      'Real Oviedo', 'D'),
  r(259, 'Dani Calvo',       'Real Oviedo', 'D'),
  r(260, 'Rahim Alhassane',  'Real Oviedo', 'D'),
  r(261, 'Colombatto',       'Real Oviedo', 'M'),
  r(262, 'Reina',            'Real Oviedo', 'M'),
  r(263, 'Dendoncker',       'Real Oviedo', 'M'),
  r(264, 'Cazorla',          'Real Oviedo', 'M'),
  r(265, 'Ilic',             'Real Oviedo', 'M'),
  r(266, 'Hassan',           'Real Oviedo', 'DE'),
  r(267, 'Brekalo',          'Real Oviedo', 'DE'),
  r(268, 'Ilyas Chaira',     'Real Oviedo', 'DE'),
  r(269, 'Fede Viñas',       'Real Oviedo', 'DE'),
  r(270, 'Rondón',           'Real Oviedo', 'DE'),

  // ─── RAYO VALLECANO (271-288) ────────────────────────────────────────────────
  r(271, 'Escudo',         'Rayo Vallecano', '-', 'ESCUDO'),
  r(272, 'Batalla',        'Rayo Vallecano', 'P'),
  r(273, 'Cárdenas',       'Rayo Vallecano', 'P'),
  r(274, 'Ratiu',          'Rayo Vallecano', 'D'),
  r(275, 'Balliu',         'Rayo Vallecano', 'D'),
  r(276, 'Lejeune',        'Rayo Vallecano', 'D'),
  r(277, 'Luiz Felipe',    'Rayo Vallecano', 'D'),
  r(278, 'Pep Chavarría',  'Rayo Vallecano', 'D'),
  r(279, 'Pathé Ciss',     'Rayo Vallecano', 'M'),
  r(280, 'Unai López',     'Rayo Vallecano', 'M'),
  r(281, 'Óscar Valentín', 'Rayo Vallecano', 'M'),
  r(282, 'Isi',            'Rayo Vallecano', 'M'),
  r(283, 'Pedro Díaz',     'Rayo Vallecano', 'M'),
  r(284, 'Álvaro García',  'Rayo Vallecano', 'DE'),
  r(285, 'Fran Pérez',     'Rayo Vallecano', 'DE'),
  r(286, 'Camello',        'Rayo Vallecano', 'DE'),
  r(287, 'De Frutos',      'Rayo Vallecano', 'DE'),
  r(288, 'Alemao',         'Rayo Vallecano', 'DE'),

  // ─── REAL SOCIEDAD (289-306) ─────────────────────────────────────────────────
  r(289, 'Escudo',           'Real Sociedad', '-', 'ESCUDO'),
  r(290, 'Remiro',           'Real Sociedad', 'P'),
  r(291, 'Marrero',          'Real Sociedad', 'P'),
  r(292, 'Aramburu',         'Real Sociedad', 'D'),
  r(293, 'Aritz Elustondo',  'Real Sociedad', 'D'),
  r(294, 'Zubeldia',         'Real Sociedad', 'D'),
  r(295, 'Caleta-Car',       'Real Sociedad', 'D'),
  r(296, 'Sergio Gómez',     'Real Sociedad', 'D'),
  r(297, 'Gorrotxategi',     'Real Sociedad', 'M'),
  r(298, 'Turrientes',       'Real Sociedad', 'M'),
  r(299, 'Pablo Marín',      'Real Sociedad', 'M'),
  r(300, 'Carlos Soler',     'Real Sociedad', 'M'),
  r(301, 'Brais Méndez',     'Real Sociedad', 'M'),
  r(302, 'Kubo',             'Real Sociedad', 'M'),
  r(303, 'Barrenetxea',      'Real Sociedad', 'DE'),
  r(304, 'Oyarzabal',        'Real Sociedad', 'DE'),
  r(305, 'Óskarsson',        'Real Sociedad', 'DE'),
  r(306, 'Guedes',           'Real Sociedad', 'DE'),

  // ─── SEVILLA FC (307-324) ────────────────────────────────────────────────────
  r(307, 'Escudo',        'Sevilla FC', '-', 'ESCUDO'),
  r(308, 'Vlachodimos',   'Sevilla FC', 'P'),
  r(309, 'Nyland',        'Sevilla FC', 'P'),
  r(310, 'Carmona',       'Sevilla FC', 'D'),
  r(311, 'Juanlu',        'Sevilla FC', 'D'),
  r(312, 'Azpilicueta',   'Sevilla FC', 'D'),
  r(313, 'Kike Salas',    'Sevilla FC', 'D'),
  r(314, 'Marcao',        'Sevilla FC', 'D'),
  r(315, 'Suazo',         'Sevilla FC', 'D'),
  r(316, 'Gudelj',        'Sevilla FC', 'M'),
  r(317, 'Agoumé',        'Sevilla FC', 'M'),
  r(318, 'Sow',           'Sevilla FC', 'M'),
  r(319, 'Batista Mendy', 'Sevilla FC', 'M'),
  r(320, 'Vargas',        'Sevilla FC', 'M'),
  r(321, 'Ejuke',         'Sevilla FC', 'DE'),
  r(322, 'Isaac Romero',  'Sevilla FC', 'DE'),
  r(323, 'Akor Adams',    'Sevilla FC', 'DE'),
  r(324, 'Alexis Sánchez','Sevilla FC', 'DE'),

  // ─── VALENCIA CF (325-342) ───────────────────────────────────────────────────
  r(325, 'Escudo',         'Valencia CF', '-', 'ESCUDO'),
  r(326, 'Agirrezabala',   'Valencia CF', 'P'),
  r(327, 'Dimitrievski',   'Valencia CF', 'P'),
  r(328, 'Foulquier',      'Valencia CF', 'D'),
  r(329, 'Correia',        'Valencia CF', 'D'),
  r(330, 'Tárrega',        'Valencia CF', 'D'),
  r(331, 'Copete',         'Valencia CF', 'D'),
  r(332, 'Diakhaby',       'Valencia CF', 'D'),
  r(333, 'Gayà',           'Valencia CF', 'D'),
  r(334, 'Pepelu',         'Valencia CF', 'M'),
  r(335, 'Santamaria',     'Valencia CF', 'M'),
  r(336, 'Javi Guerra',    'Valencia CF', 'M'),
  r(337, 'André Almeida',  'Valencia CF', 'M'),
  r(338, 'Luis Rioja',     'Valencia CF', 'DE'),
  r(339, 'Diego López',    'Valencia CF', 'DE'),
  r(340, 'Ramazani',       'Valencia CF', 'DE'),
  r(341, 'Danjuma',        'Valencia CF', 'DE'),
  r(342, 'Hugo Duro',      'Valencia CF', 'DE'),

  // ─── VILLARREAL CF (343-360) ─────────────────────────────────────────────────
  r(343, 'Escudo',         'Villarreal CF', '-', 'ESCUDO'),
  r(344, 'Luiz Júnior',    'Villarreal CF', 'P'),
  r(345, 'Arnau Tenas',    'Villarreal CF', 'P'),
  r(346, 'Mouriño',        'Villarreal CF', 'D'),
  r(347, 'Foyth',          'Villarreal CF', 'D'),
  r(348, 'Rafa Marín',     'Villarreal CF', 'D'),
  r(349, 'Renato Veiga',   'Villarreal CF', 'D'),
  r(350, 'Sergi Cardona',  'Villarreal CF', 'D'),
  r(351, 'Santi Comesaña', 'Villarreal CF', 'M'),
  r(352, 'Pape Gueye',     'Villarreal CF', 'M'),
  r(353, 'Parejo',         'Villarreal CF', 'M'),
  r(354, 'Thomas',         'Villarreal CF', 'M'),
  r(355, 'Moleiro',        'Villarreal CF', 'M'),
  r(356, 'Buchanan',       'Villarreal CF', 'DE'),
  r(357, 'Mikautadze',     'Villarreal CF', 'DE'),
  r(358, 'Pépé',           'Villarreal CF', 'DE'),
  r(359, 'Oluwaseyi',      'Villarreal CF', 'DE'),
  r(360, 'Ayoze',          'Villarreal CF', 'DE'),

  // ─── ¡VAMOS! (361-380) ───────────────────────────────────────────────────────
  r(361, '¡Vamos! D. Alavés',          'D. Alavés',       '-', 'VAMOS'),
  r(362, '¡Vamos! Athletic Club',      'Athletic Club',   '-', 'VAMOS'),
  r(363, '¡Vamos! Atlético de Madrid', 'Atlético de Madrid', '-', 'VAMOS'),
  r(364, '¡Vamos! FC Barcelona',       'FC Barcelona',    '-', 'VAMOS'),
  r(365, '¡Vamos! Real Betis',         'Real Betis',      '-', 'VAMOS'),
  r(366, '¡Vamos! RC Celta',           'RC Celta',        '-', 'VAMOS'),
  r(367, '¡Vamos! Elche CF',           'Elche CF',        '-', 'VAMOS'),
  r(368, '¡Vamos! RCD Espanyol',       'RCD Espanyol',    '-', 'VAMOS'),
  r(369, '¡Vamos! Getafe CF',          'Getafe CF',       '-', 'VAMOS'),
  r(370, '¡Vamos! Girona FC',          'Girona FC',       '-', 'VAMOS'),
  r(371, '¡Vamos! Levante UD',         'Levante UD',      '-', 'VAMOS'),
  r(372, '¡Vamos! Real Madrid',        'Real Madrid',     '-', 'VAMOS'),
  r(373, '¡Vamos! RCD Mallorca',       'RCD Mallorca',    '-', 'VAMOS'),
  r(374, '¡Vamos! CA Osasuna',         'CA Osasuna',      '-', 'VAMOS'),
  r(375, '¡Vamos! Real Oviedo',        'Real Oviedo',     '-', 'VAMOS'),
  r(376, '¡Vamos! Rayo Vallecano',     'Rayo Vallecano',  '-', 'VAMOS'),
  r(377, '¡Vamos! Real Sociedad',      'Real Sociedad',   '-', 'VAMOS'),
  r(378, '¡Vamos! Sevilla FC',         'Sevilla FC',      '-', 'VAMOS'),
  r(379, '¡Vamos! Valencia CF',        'Valencia CF',     '-', 'VAMOS'),
  r(380, '¡Vamos! Villarreal CF',      'Villarreal CF',   '-', 'VAMOS'),

  // ─── GUANTES DE ORO (381-387) ────────────────────────────────────────────────
  r(381, 'Sivera',         'D. Alavés',      'P', 'GUANTES_ORO'),
  r(382, 'Joan García',    'FC Barcelona',   'P', 'GUANTES_ORO'),
  r(383, 'David Soria',    'Getafe CF',      'P', 'GUANTES_ORO'),
  r(384, 'Sergio Herrera', 'CA Osasuna',     'P', 'GUANTES_ORO'),
  r(385, 'Batalla',        'Rayo Vallecano', 'P', 'GUANTES_ORO'),
  r(386, 'Remiro',         'Real Sociedad',  'P', 'GUANTES_ORO'),
  r(387, 'Agirrezabala',   'Valencia CF',    'P', 'GUANTES_ORO'),

  // ─── KRYPTONITA (388-396) ────────────────────────────────────────────────────
  r(388, 'Laporte',    'Athletic Club',       'D', 'KRYPTONITA'),
  r(389, 'Vivian',     'Athletic Club',       'D', 'KRYPTONITA'),
  r(390, 'Le Normand', 'Atlético de Madrid',  'D', 'KRYPTONITA'),
  r(391, 'Affengruber','Elche CF',            'D', 'KRYPTONITA'),
  r(392, 'Cabrera',    'RCD Espanyol',        'D', 'KRYPTONITA'),
  r(393, 'Militão',    'Real Madrid',         'D', 'KRYPTONITA'),
  r(394, 'Lejeune',    'Rayo Vallecano',      'D', 'KRYPTONITA'),
  r(395, 'Tárrega',    'Valencia CF',         'D', 'KRYPTONITA'),
  r(396, 'Mouriño',    'Villarreal CF',       'D', 'KRYPTONITA'),

  // ─── DIAMANTES (397-414) ─────────────────────────────────────────────────────
  r(397, 'Rego',          'Athletic Club',      'M',  'DIAMANTE'),
  r(398, 'Dro',           'FC Barcelona',       'M',  'DIAMANTE'),
  r(399, 'Valentín Gómez','Real Betis',         'D',  'DIAMANTE'),
  r(400, 'Pablo García',  'Real Betis',         'DE', 'DIAMANTE'),
  r(401, 'Rodri Mendoza', 'Elche CF',           'M',  'DIAMANTE'),
  r(402, 'Riedel',        'RCD Espanyol',       'D',  'DIAMANTE'),
  r(403, 'Davinchi',      'Getafe CF',          'D',  'DIAMANTE'),
  r(404, 'Liso',          'Getafe CF',          'DE', 'DIAMANTE'),
  r(405, 'Vitor Reis',    'Girona FC',          'D',  'DIAMANTE'),
  r(406, 'Joel Roca',     'Girona FC',          'M',  'DIAMANTE'),
  r(407, 'Carlos Álvarez','Levante UD',         'DE', 'DIAMANTE'),
  r(408, 'Etta Eyong',    'Levante UD',         'DE', 'DIAMANTE'),
  r(409, 'Fran González', 'Real Madrid',        'P',  'DIAMANTE'),
  r(410, 'Gonzalo',       'Real Madrid',        'DE', 'DIAMANTE'),
  r(411, 'Jan Virgili',   'RCD Mallorca',       'DE', 'DIAMANTE'),
  r(412, 'Mateo Joseph',  'RCD Mallorca',       'DE', 'DIAMANTE'),
  r(413, 'Víctor Muñoz',  'CA Osasuna',         'DE', 'DIAMANTE'),
  r(414, 'Renato Veiga',  'Villarreal CF',      'D',  'DIAMANTE'),

  // ─── INFLUENCERS (415-423) ───────────────────────────────────────────────────
  r(415, 'Barrios',     'Atlético de Madrid', 'M', 'INFLUENCER'),
  r(416, 'Sotelo',      'RC Celta',           'M', 'INFLUENCER'),
  r(417, 'Febas',       'Elche CF',           'M', 'INFLUENCER'),
  r(418, 'Edu Expósito','RCD Espanyol',       'M', 'INFLUENCER'),
  r(419, 'Milla',       'Getafe CF',          'M', 'INFLUENCER'),
  r(420, 'Darder',      'RCD Mallorca',       'M', 'INFLUENCER'),
  r(421, 'Cazorla',     'Real Oviedo',        'M', 'INFLUENCER'),
  r(422, 'Aimar Oroz',  'CA Osasuna',         'M', 'INFLUENCER'),
  r(423, 'Unai López',  'Rayo Vallecano',     'M', 'INFLUENCER'),

  // ─── PROTAS (424-441) ────────────────────────────────────────────────────────
  r(424, 'Tenaglia',       'D. Alavés',       'D',  'PROTA'),
  r(425, 'Carlos Vicente', 'D. Alavés',       'DE', 'PROTA'),
  r(426, 'Eric García',    'FC Barcelona',    'D',  'PROTA'),
  r(427, 'Cucho Hernández','Real Betis',      'DE', 'PROTA'),
  r(428, 'Borja Iglesias', 'RC Celta',        'DE', 'PROTA'),
  r(429, 'Dolan',          'RCD Espanyol',    'DE', 'PROTA'),
  r(430, 'Vanat',          'Girona FC',       'DE', 'PROTA'),
  r(431, 'Manu Sánchez',   'Levante UD',      'D',  'PROTA'),
  r(432, 'Tchouaméni',     'Real Madrid',     'M',  'PROTA'),
  r(433, 'Leo Román',      'RCD Mallorca',    'P',  'PROTA'),
  r(434, 'Aarón Escandell','Real Oviedo',     'P',  'PROTA'),
  r(435, 'Hassan',         'Real Oviedo',     'DE', 'PROTA'),
  r(436, 'Carlos Soler',   'Real Sociedad',   'M',  'PROTA'),
  r(437, 'Gorrotxategi',   'Real Sociedad',   'M',  'PROTA'),
  r(438, 'Batista Mendy',  'Sevilla FC',      'M',  'PROTA'),
  r(439, 'Alexis Sánchez', 'Sevilla FC',      'DE', 'PROTA'),
  r(440, 'Danjuma',        'Valencia CF',     'DE', 'PROTA'),
  r(441, 'Buchanan',       'Villarreal CF',   'DE', 'PROTA'),

  // ─── SUPER CRACKS (442-467) ──────────────────────────────────────────────────
  r(442, 'Unai Simón',      'Athletic Club',       'P',  'SUPER_CRACK'),
  r(443, 'Jauregizar',      'Athletic Club',       'M',  'SUPER_CRACK'),
  r(444, 'Oblak',           'Atlético de Madrid',  'P',  'SUPER_CRACK'),
  r(445, 'Marcos Llorente', 'Atlético de Madrid',  'D',  'SUPER_CRACK'),
  r(446, 'Álex Baena',      'Atlético de Madrid',  'M',  'SUPER_CRACK'),
  r(447, 'Almada',          'Atlético de Madrid',  'M',  'SUPER_CRACK'),
  r(448, 'Griezmann',       'Atlético de Madrid',  'DE', 'SUPER_CRACK'),
  r(449, 'Koundé',          'FC Barcelona',        'D',  'SUPER_CRACK'),
  r(450, 'Baldé',           'FC Barcelona',        'D',  'SUPER_CRACK'),
  r(451, 'Raphinha',        'FC Barcelona',        'DE', 'SUPER_CRACK'),
  r(452, 'Lewandowski',     'FC Barcelona',        'DE', 'SUPER_CRACK'),
  r(453, 'Rashford',        'FC Barcelona',        'DE', 'SUPER_CRACK'),
  r(454, 'Isco',            'Real Betis',          'M',  'SUPER_CRACK'),
  r(455, 'Lo Celso',        'Real Betis',          'M',  'SUPER_CRACK'),
  r(456, 'Antony',          'Real Betis',          'DE', 'SUPER_CRACK'),
  r(457, 'Courtois',        'Real Madrid',         'P',  'SUPER_CRACK'),
  r(458, 'Carreras',        'Real Madrid',         'D',  'SUPER_CRACK'),
  r(459, 'Fede Valverde',   'Real Madrid',         'M',  'SUPER_CRACK'),
  r(460, 'Mastantuono',     'Real Madrid',         'M',  'SUPER_CRACK'),
  r(461, 'Budimir',         'CA Osasuna',          'DE', 'SUPER_CRACK'),
  r(462, 'Isi',             'Rayo Vallecano',      'M',  'SUPER_CRACK'),
  r(463, 'Kubo',            'Real Sociedad',       'M',  'SUPER_CRACK'),
  r(464, 'Vargas',          'Sevilla FC',          'M',  'SUPER_CRACK'),
  r(465, 'Javi Guerra',     'Valencia CF',         'M',  'SUPER_CRACK'),
  r(466, 'Moleiro',         'Villarreal CF',       'M',  'SUPER_CRACK'),
  r(467, 'Pépé',            'Villarreal CF',       'DE', 'SUPER_CRACK'),

  // ─── CARD CHAMPIONS (468) ────────────────────────────────────────────────────
  r(468, 'Card Champions', '-', '-', 'CARD_CHAMPIONS'),

  // ─── BALÓN DE ORO (469-474) ──────────────────────────────────────────────────
  r(469, 'Nico Williams',  'Athletic Club',      'DE', 'BALON_ORO'),
  r(470, 'Julián Álvarez', 'Atlético de Madrid', 'DE', 'BALON_ORO'),
  r(471, 'Pedri',          'FC Barcelona',       'M',  'BALON_ORO'),
  r(472, 'Lamine Yamal',   'FC Barcelona',       'DE', 'BALON_ORO'),
  r(473, 'Vinícius',       'Real Madrid',        'DE', 'BALON_ORO'),
  r(474, 'Mbappé',         'Real Madrid',        'DE', 'BALON_ORO'),

  // ─── ESPECIALES ──────────────────────────────────────────────────────────────
  r(475, 'Balón de Oro Excellence', '-', '-', 'BALON_ORO_EXCELLENCE'),
  r(476, 'Card Atómica',            '-', '-', 'CARD_ATOMICA'),
  r(477, 'Card Invencible',         '-', '-', 'CARD_INVENCIBLE'),
  r(478, 'Campeón Card',            '-', '-', 'CAMPEON_CARD'),

  // ─── PLUS: ENTRENADORES (479-498) ────────────────────────────────────────────
  plus(479, 'Eduardo Coudet',       'D. Alavés',       '-', 'ENTRENADOR'),
  plus(480, 'Ernesto Valverde',     'Athletic Club',   '-', 'ENTRENADOR'),
  plus(481, 'Diego Pablo Simeone', 'Atlético de Madrid', '-', 'ENTRENADOR'),
  plus(482, 'Hansi Flick',          'FC Barcelona',    '-', 'ENTRENADOR'),
  plus(483, 'Manuel Pellegrini',    'Real Betis',      '-', 'ENTRENADOR'),
  plus(484, 'Claudio Giráldez',     'RC Celta',        '-', 'ENTRENADOR'),
  plus(485, 'Eder Sarabia',         'Elche CF',        '-', 'ENTRENADOR'),
  plus(486, 'Manolo González',      'RCD Espanyol',    '-', 'ENTRENADOR'),
  plus(487, 'José Bordalás',        'Getafe CF',       '-', 'ENTRENADOR'),
  plus(488, 'Míchel',               'Girona FC',       '-', 'ENTRENADOR'),
  plus(489, 'Luís Castro',          'Levante UD',      '-', 'ENTRENADOR'),
  plus(490, 'Álvaro Arbeloa',       'Real Madrid',     '-', 'ENTRENADOR'),
  plus(491, 'Jagoba Arrasate',      'RCD Mallorca',    '-', 'ENTRENADOR'),
  plus(492, 'Alessio Lisci',        'CA Osasuna',      '-', 'ENTRENADOR'),
  plus(493, 'Guillermo Almada',     'Real Oviedo',     '-', 'ENTRENADOR'),
  plus(494, 'Íñigo Pérez',          'Rayo Vallecano',  '-', 'ENTRENADOR'),
  plus(495, 'Pellegrino Matarazzo', 'Real Sociedad',   '-', 'ENTRENADOR'),
  plus(496, 'Matías Almeyda',       'Sevilla FC',      '-', 'ENTRENADOR'),
  plus(497, 'Carlos Corberán',      'Valencia CF',     '-', 'ENTRENADOR'),
  plus(498, 'Marcelino García',     'Villarreal CF',   '-', 'ENTRENADOR'),

  // ─── PLUS: NUEVO GUANTES DE ORO (499-500) ────────────────────────────────────
  plus(499, 'Dmitrovic',  'RCD Espanyol', 'P', 'NUEVO_GUANTES_ORO'),
  plus(500, 'Ter Stegen', 'Girona FC',    'P', 'NUEVO_GUANTES_ORO'),

  // ─── PLUS: NUEVO KRYPTONITA (501-503) ────────────────────────────────────────
  plus(501, 'Pubill',        'Atlético de Madrid', 'D', 'NUEVO_KRYPTONITA'),
  plus(502, 'Gerard Martín', 'FC Barcelona',       'D', 'NUEVO_KRYPTONITA'),
  plus(503, 'Asencio',       'Real Madrid',        'D', 'NUEVO_KRYPTONITA'),

  // ─── PLUS: NUEVO DIAMANTE (504-508) ──────────────────────────────────────────
  plus(504, 'Selton',        'Athletic Club',   'M',  'NUEVO_DIAMANTE'),
  plus(505, 'El-Abdellaoui', 'RC Celta',        'D',  'NUEVO_DIAMANTE'),
  plus(506, 'Echeverri',     'Girona FC',       'M',  'NUEVO_DIAMANTE'),
  plus(507, 'Nobel Mendy',   'Rayo Vallecano',  'M',  'NUEVO_DIAMANTE'),
  plus(508, 'Oso',           'Sevilla FC',      'DE', 'NUEVO_DIAMANTE'),

  // ─── PLUS: NUEVO PROTAS (509-513) ────────────────────────────────────────────
  plus(509, 'Rodri Mendoza', 'Atlético de Madrid', 'M',  'NUEVO_PROTA'),
  plus(510, 'Aitor Ruibal',  'Real Betis',         'DE', 'NUEVO_PROTA'),
  plus(511, 'Miguel Román',  'RC Celta',           'D',  'NUEVO_PROTA'),
  plus(512, 'Carlos Romero', 'RCD Espanyol',       'D',  'NUEVO_PROTA'),
  plus(513, 'Maupay',        'Sevilla FC',         'DE', 'NUEVO_PROTA'),

  // ─── PLUS: NUEVO SUPER CRACK (514-519) ───────────────────────────────────────
  plus(514, 'Giuliano',      'Atlético de Madrid', 'DE', 'NUEVO_SUPER_CRACK'),
  plus(515, 'Joao Cancelo',  'FC Barcelona',       'D',  'NUEVO_SUPER_CRACK'),
  plus(516, 'Rodrygo',       'Real Madrid',        'DE', 'NUEVO_SUPER_CRACK'),
  plus(517, 'Guedes',        'Real Sociedad',      'DE', 'NUEVO_SUPER_CRACK'),
  plus(518, 'Hansi Flick',      'FC Barcelona',  '-', 'MASTER_MISTER'),
  plus(519, 'Marcelino García', 'Villarreal CF', '-', 'MASTER_MISTER'),

  // ─── PLUS: CARD FANTÁSTICA (520) ─────────────────────────────────────────────
  plus(520, 'Card Fantástica', '-', '-', 'CARD_FANTASTICA'),

  // ─── PLUS: NUEVO BALÓN DE ORO (521) ──────────────────────────────────────────
  plus(521, 'Courtois', 'Real Madrid', 'P', 'NUEVO_BALON_ORO'),

  // ─── PLUS: ESPECIAL AUTÓGRAFO (522) ──────────────────────────────────────────
  plus(522, 'Pedri (Autógrafo)', 'FC Barcelona', 'M', 'ESPECIAL_AUTOGRAFO'),

  // ─── BIS ─────────────────────────────────────────────────────────────────────
  bis(7,   'Garcés',           'D. Alavés',          '-'),
  bis(12,  'Ángel Pérez',      'D. Alavés',          '-'),
  bis(22,  'Gorosabel',        'Athletic Club',      'D'),
  bis(41,  'Pubill',           'Atlético de Madrid', 'D'),
  bis(46,  'Obed Vargas',      'Atlético de Madrid', 'M'),
  bis(48,  'Rodri Mendoza',    'Atlético de Madrid', 'M'),
  bis(54,  'Lookman',          'Atlético de Madrid', 'DE'),
  bis(58,  'Joao Cancelo',     'FC Barcelona',       'D'),
  bis(76,  'Aitor Ruibal',     'Real Betis',         'DE'),
  bis(84,  'Fidalgo',          'Real Betis',         'M'),
  bis(94,  'Álvaro Núñez',     'RC Celta',           'D'),
  bis(101, 'Miguel Román',     'RC Celta',           'D'),
  bis(102, 'Vecino',           'RC Celta',           'M'),
  bis(104, 'Fer López',        'RC Celta',           'M'),
  bis(117, 'Gonzalo Villar',   'Elche CF',           'M'),
  bis(122, 'Morente',          'Elche CF',           'M'),
  bis(123, 'Cepeda',           'Elche CF',           'DE'),
  bis(139, 'Jofre',            'RCD Espanyol',       'M'),
  bis(143, 'Ngonge',           'RCD Espanyol',       'DE'),
  bis(152, 'Zaid Romero',      'Getafe CF',          'D'),
  bis(153, 'Boselli',          'Getafe CF',          'DE'),
  bis(160, 'Luis Vázquez',     'Getafe CF',          'DE'),
  bis(161, 'Satriano',         'Getafe CF',          'DE'),
  bis(165, 'Ter Stegen',       'Girona FC',          'P'),
  bis(172, 'Fran Beltrán',     'Girona FC',          'M'),
  bis(174, 'Echeverri',        'Girona FC',          'M'),
  bis(190, 'Raghouber',        'Levante UD',         'DE'),
  bis(195, 'Paco Cortés',      'Levante UD',         'D'),
  bis(207, 'Fran García',      'Real Madrid',        'D'),
  bis(233, 'Luvumbo',          'RCD Mallorca',       'DE'),
  bis(243, 'Galán',            'CA Osasuna',         'D'),
  bis(252, 'Raúl Moro',        'CA Osasuna',         'DE'),
  bis(263, 'Sibo',             'Real Oviedo',        'M'),
  bis(265, 'Nico Fonseca',     'Real Oviedo',        'M'),
  bis(267, 'Thiago Fernández', 'Real Oviedo',        'DE'),
  bis(277, 'Nobel Mendy',      'Rayo Vallecano',     'M'),
  bis(285, 'Carlos Martín',    'Rayo Vallecano',     'DE'),
  bis(288, 'Ilias',            'Rayo Vallecano',     'DE'),
  bis(293, 'Jon Martín',       'Real Sociedad',      'M'),
  bis(305, 'Wesley',           'Real Sociedad',      'DE'),
  bis(314, 'Oso',              'Sevilla FC',         'DE'),
  bis(324, 'Maupay',           'Sevilla FC',         'DE'),
  bis(332, 'Nuñez',            'Valencia CF',        'D'),
  bis(334, 'Guido Rodríguez',  'Valencia CF',        'M'),
  bis(341, 'Sadiq',            'Valencia CF',        'DE'),
  bis(346, 'Freeman',          'Villarreal CF',      'DE'),
  bis(350, 'Pedraza',          'Villarreal CF',      'D'),
  bis(355, 'Alfon',            'Villarreal CF',      'M'),
]
