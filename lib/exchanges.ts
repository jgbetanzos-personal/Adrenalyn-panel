import { neon } from '@neondatabase/serverless'
import type { Card } from './types'
import type { DbUser } from './users'

function sql() {
  return neon(process.env.DATABASE_URL!)
}

export type ExchangeStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

export interface Exchange {
  id: number
  proposer_id: number
  receiver_id: number
  status: ExchangeStatus
  message: string | null
  proposer_address: string | null
  receiver_address: string | null
  created_at: string
  accepted_at: string | null
  completed_at: string | null
  proposer_sent: boolean
  receiver_sent: boolean
  proposer_received: boolean
  receiver_received: boolean
  proposer: DbUser
  receiver: DbUser
  proposer_gives: Card[]
  receiver_gives: Card[]
}

export interface MatchUser {
  user: DbUser
  canRequest: number
  canOffer: number
}

export async function initExchanges(): Promise<void> {
  const db = sql()

  await db`
    CREATE TABLE IF NOT EXISTS exchanges (
      id               SERIAL PRIMARY KEY,
      proposer_id      INTEGER NOT NULL REFERENCES users(id),
      receiver_id      INTEGER NOT NULL REFERENCES users(id),
      status           TEXT NOT NULL DEFAULT 'pending',
      message          TEXT,
      proposer_address TEXT,
      receiver_address TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      accepted_at      TIMESTAMPTZ,
      completed_at     TIMESTAMPTZ
    )
  `

  await db`ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS proposer_sent     BOOLEAN DEFAULT FALSE`
  await db`ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS receiver_sent     BOOLEAN DEFAULT FALSE`
  await db`ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS proposer_received BOOLEAN DEFAULT FALSE`
  await db`ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS receiver_received BOOLEAN DEFAULT FALSE`

  await db`
    CREATE TABLE IF NOT EXISTS exchange_cards (
      id          SERIAL PRIMARY KEY,
      exchange_id INTEGER NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
      card_id     INTEGER NOT NULL REFERENCES cards(id),
      direction   TEXT NOT NULL
    )
  `

  await db`
    CREATE TABLE IF NOT EXISTS exchange_ratings (
      id          SERIAL PRIMARY KEY,
      exchange_id INTEGER NOT NULL REFERENCES exchanges(id),
      rater_id    INTEGER NOT NULL REFERENCES users(id),
      rated_id    INTEGER NOT NULL REFERENCES users(id),
      score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
      comment     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(exchange_id, rater_id)
    )
  `
}

export async function findMatches(userId: number): Promise<MatchUser[]> {
  const db = sql()

  // Cards I'm missing (not collected by me)
  // Cards they have repeated
  // canRequest: they have repeated cards that I'm missing
  // canOffer: I have repeated cards that they're missing

  const rows = await db`
    SELECT
      u.id,
      u.username,
      u.name,
      u.surname,
      u.photo_url,
      u.role,
      u.email,
      u.address,
      u.postal_code,
      COUNT(DISTINCT req.card_id) AS can_request,
      COUNT(DISTINCT off.card_id) AS can_offer
    FROM users u
    -- cards I can request: they have repeated, I'm missing
    LEFT JOIN user_cards them_r ON them_r.user_id = u.id AND them_r.repeated = TRUE
    LEFT JOIN user_cards me_r ON me_r.user_id = ${userId} AND me_r.card_id = them_r.card_id
    LEFT JOIN LATERAL (
      SELECT them_r.card_id
      WHERE (me_r.collected IS NULL OR me_r.collected = FALSE)
    ) req ON TRUE
    -- cards I can offer: I have repeated, they're missing
    LEFT JOIN user_cards my_rep ON my_rep.user_id = ${userId} AND my_rep.repeated = TRUE
    LEFT JOIN user_cards them_c ON them_c.user_id = u.id AND them_c.card_id = my_rep.card_id
    LEFT JOIN LATERAL (
      SELECT my_rep.card_id
      WHERE (them_c.collected IS NULL OR them_c.collected = FALSE)
    ) off ON TRUE
    WHERE u.id != ${userId}
      AND u.role = 'user'
    GROUP BY u.id, u.username, u.name, u.surname, u.photo_url, u.role, u.email, u.address, u.postal_code
    HAVING COUNT(DISTINCT req.card_id) > 0 OR COUNT(DISTINCT off.card_id) > 0
    ORDER BY (COUNT(DISTINCT req.card_id) + COUNT(DISTINCT off.card_id)) DESC
  `

  return rows.map((r) => ({
    user: {
      id: r.id as number,
      username: r.username as string,
      name: r.name as string,
      surname: r.surname as string,
      photo_url: r.photo_url as string | null,
      role: r.role as string,
      email: r.email as string | null,
      address: r.address as string | null,
      postal_code: r.postal_code as string | null,
    },
    canRequest: Number(r.can_request),
    canOffer: Number(r.can_offer),
  }))
}

export async function getCompatibleCards(
  userId: number,
  otherUserId: number,
): Promise<{ iCanRequest: Card[]; iCanOffer: Card[] }> {
  const db = sql()

  const requestRows = await db`
    SELECT c.id, c.number, c.name, c.team, c.position, c.type, c.is_plus,
           FALSE AS collected, FALSE AS repeated
    FROM cards c
    JOIN user_cards them ON them.card_id = c.id AND them.user_id = ${otherUserId} AND them.repeated = TRUE
    LEFT JOIN user_cards me ON me.card_id = c.id AND me.user_id = ${userId}
    WHERE (me.collected IS NULL OR me.collected = FALSE)
    ORDER BY c.is_plus ASC, c.id ASC
  `

  const offerRows = await db`
    SELECT c.id, c.number, c.name, c.team, c.position, c.type, c.is_plus,
           FALSE AS collected, FALSE AS repeated
    FROM cards c
    JOIN user_cards me ON me.card_id = c.id AND me.user_id = ${userId} AND me.repeated = TRUE
    LEFT JOIN user_cards them ON them.card_id = c.id AND them.user_id = ${otherUserId}
    WHERE (them.collected IS NULL OR them.collected = FALSE)
    ORDER BY c.is_plus ASC, c.id ASC
  `

  return {
    iCanRequest: requestRows as unknown as Card[],
    iCanOffer: offerRows as unknown as Card[],
  }
}

export async function createExchange(
  proposerId: number,
  receiverId: number,
  proposerGives: number[],
  receiverGives: number[],
  message?: string,
): Promise<number> {
  const db = sql()

  const [ex] = await db`
    INSERT INTO exchanges (proposer_id, receiver_id, message)
    VALUES (${proposerId}, ${receiverId}, ${message ?? null})
    RETURNING id
  `
  const exchangeId = ex.id as number

  for (const cardId of proposerGives) {
    await db`
      INSERT INTO exchange_cards (exchange_id, card_id, direction)
      VALUES (${exchangeId}, ${cardId}, 'proposer_gives')
    `
  }
  for (const cardId of receiverGives) {
    await db`
      INSERT INTO exchange_cards (exchange_id, card_id, direction)
      VALUES (${exchangeId}, ${cardId}, 'receiver_gives')
    `
  }

  return exchangeId
}

async function hydrateExchanges(rows: Record<string, unknown>[]): Promise<Exchange[]> {
  const db = sql()
  const result: Exchange[] = []

  for (const row of rows) {
    const id = row.id as number

    const cardRows = await db`
      SELECT c.id, c.number, c.name, c.team, c.position, c.type, c.is_plus,
             FALSE AS collected, FALSE AS repeated,
             ec.direction
      FROM exchange_cards ec
      JOIN cards c ON c.id = ec.card_id
      WHERE ec.exchange_id = ${id}
    `

    const proposerGives = cardRows
      .filter((c) => c.direction === 'proposer_gives')
      .map((c) => c as unknown as Card)

    const receiverGives = cardRows
      .filter((c) => c.direction === 'receiver_gives')
      .map((c) => c as unknown as Card)

    result.push({
      id,
      proposer_id: row.proposer_id as number,
      receiver_id: row.receiver_id as number,
      status: row.status as ExchangeStatus,
      message: row.message as string | null,
      proposer_address: row.proposer_address as string | null,
      receiver_address: row.receiver_address as string | null,
      created_at: row.created_at as string,
      accepted_at: row.accepted_at as string | null,
      completed_at: row.completed_at as string | null,
      proposer_sent: row.proposer_sent as boolean,
      receiver_sent: row.receiver_sent as boolean,
      proposer_received: row.proposer_received as boolean,
      receiver_received: row.receiver_received as boolean,
      proposer: {
        id: row.prop_id as number,
        username: row.prop_username as string,
        name: row.prop_name as string,
        surname: row.prop_surname as string,
        photo_url: row.prop_photo_url as string | null,
        role: row.prop_role as string,
        email: row.prop_email as string | null,
        address: row.prop_address as string | null,
        postal_code: row.prop_postal_code as string | null,
      },
      receiver: {
        id: row.recv_id as number,
        username: row.recv_username as string,
        name: row.recv_name as string,
        surname: row.recv_surname as string,
        photo_url: row.recv_photo_url as string | null,
        role: row.recv_role as string,
        email: row.recv_email as string | null,
        address: row.recv_address as string | null,
        postal_code: row.recv_postal_code as string | null,
      },
      proposer_gives: proposerGives,
      receiver_gives: receiverGives,
    })
  }

  return result
}

const EXCHANGE_SELECT = `
  e.id, e.proposer_id, e.receiver_id, e.status, e.message,
  e.proposer_address, e.receiver_address, e.created_at, e.accepted_at, e.completed_at,
  e.proposer_sent, e.receiver_sent, e.proposer_received, e.receiver_received,
  p.id AS prop_id, p.username AS prop_username, p.name AS prop_name, p.surname AS prop_surname,
  p.photo_url AS prop_photo_url, p.role AS prop_role, p.email AS prop_email,
  p.address AS prop_address, p.postal_code AS prop_postal_code,
  r.id AS recv_id, r.username AS recv_username, r.name AS recv_name, r.surname AS recv_surname,
  r.photo_url AS recv_photo_url, r.role AS recv_role, r.email AS recv_email,
  r.address AS recv_address, r.postal_code AS recv_postal_code
`

export async function getExchanges(userId: number): Promise<Exchange[]> {
  const db = sql()
  const rows = await db`
    SELECT ${db.unsafe(EXCHANGE_SELECT)}
    FROM exchanges e
    JOIN users p ON p.id = e.proposer_id
    JOIN users r ON r.id = e.receiver_id
    WHERE e.proposer_id = ${userId} OR e.receiver_id = ${userId}
    ORDER BY e.created_at DESC
  `
  return hydrateExchanges(rows as unknown as Record<string, unknown>[])
}

export async function getExchange(id: number, userId: number): Promise<Exchange | null> {
  const db = sql()
  const rows = await db`
    SELECT ${db.unsafe(EXCHANGE_SELECT)}
    FROM exchanges e
    JOIN users p ON p.id = e.proposer_id
    JOIN users r ON r.id = e.receiver_id
    WHERE e.id = ${id}
      AND (e.proposer_id = ${userId} OR e.receiver_id = ${userId})
  `
  if (rows.length === 0) return null
  const hydrated = await hydrateExchanges(rows as unknown as Record<string, unknown>[])
  return hydrated[0] ?? null
}

export async function acceptExchange(id: number, userId: number): Promise<void> {
  const db = sql()
  // Get user address to copy
  const [user] = await db`SELECT address, postal_code FROM users WHERE id = ${userId}`

  // Determine if user is receiver
  const [ex] = await db`SELECT proposer_id, receiver_id FROM exchanges WHERE id = ${id}`
  if (!ex) return

  const addressStr = [user?.address, user?.postal_code].filter(Boolean).join(', ')

  if (ex.receiver_id === userId) {
    await db`
      UPDATE exchanges
      SET status = 'accepted', accepted_at = NOW(), receiver_address = ${addressStr}
      WHERE id = ${id} AND receiver_id = ${userId} AND status = 'pending'
    `
    // Also copy proposer address
    const [prop] = await db`SELECT address, postal_code FROM users WHERE id = ${ex.proposer_id}`
    const propAddr = [prop?.address, prop?.postal_code].filter(Boolean).join(', ')
    await db`UPDATE exchanges SET proposer_address = ${propAddr} WHERE id = ${id}`
  }
}

export async function rejectExchange(id: number, userId: number): Promise<void> {
  const db = sql()
  await db`
    UPDATE exchanges
    SET status = 'rejected'
    WHERE id = ${id} AND receiver_id = ${userId} AND status = 'pending'
  `
}

export async function markSent(id: number, userId: number): Promise<void> {
  const db = sql()
  const [ex] = await db`SELECT proposer_id, receiver_id FROM exchanges WHERE id = ${id}`
  if (!ex) return

  if (ex.proposer_id === userId) {
    await db`UPDATE exchanges SET proposer_sent = TRUE WHERE id = ${id}`
  } else if (ex.receiver_id === userId) {
    await db`UPDATE exchanges SET receiver_sent = TRUE WHERE id = ${id}`
  }
}

export async function markReceived(id: number, userId: number): Promise<void> {
  const db = sql()
  const [ex] = await db`SELECT proposer_id, receiver_id, proposer_received, receiver_received FROM exchanges WHERE id = ${id}`
  if (!ex) return

  if (ex.proposer_id === userId) {
    await db`UPDATE exchanges SET proposer_received = TRUE WHERE id = ${id}`
  } else if (ex.receiver_id === userId) {
    await db`UPDATE exchanges SET receiver_received = TRUE WHERE id = ${id}`
  }

  // Check if both have received
  const [updated] = await db`SELECT proposer_received, receiver_received FROM exchanges WHERE id = ${id}`
  if (updated?.proposer_received && updated?.receiver_received) {
    await db`UPDATE exchanges SET status = 'completed', completed_at = NOW() WHERE id = ${id}`
  }
}

export async function rateExchange(
  exchangeId: number,
  raterId: number,
  ratedId: number,
  score: number,
  comment?: string,
): Promise<void> {
  const db = sql()
  await db`
    INSERT INTO exchange_ratings (exchange_id, rater_id, rated_id, score, comment)
    VALUES (${exchangeId}, ${raterId}, ${ratedId}, ${score}, ${comment ?? null})
    ON CONFLICT (exchange_id, rater_id) DO NOTHING
  `
}

export async function getUserRating(userId: number): Promise<{ avg: number; count: number }> {
  const db = sql()
  const [row] = await db`
    SELECT ROUND(AVG(score)::numeric, 1) AS avg, COUNT(*) AS count
    FROM exchange_ratings
    WHERE rated_id = ${userId}
  `
  return {
    avg: row?.avg ? Number(row.avg) : 0,
    count: row?.count ? Number(row.count) : 0,
  }
}

export async function getUnreadExchangeCount(userId: number): Promise<number> {
  const db = sql()
  const [row] = await db`
    SELECT COUNT(*)::int AS count
    FROM exchanges
    WHERE receiver_id = ${userId} AND status = 'pending'
  `
  return row?.count ?? 0
}
