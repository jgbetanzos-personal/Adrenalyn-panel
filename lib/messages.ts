import { neon } from '@neondatabase/serverless'
import type { DbUser } from './users'

function sql() {
  return neon(process.env.DATABASE_URL!)
}

export interface Message {
  id: number
  from_user_id: number
  to_user_id: number
  content: string
  read_at: string | null
  created_at: string
}

export interface Conversation {
  user: DbUser
  lastMessage: string
  lastAt: string
  unread: number
}

export async function initMessages(): Promise<void> {
  const db = sql()
  await db`
    CREATE TABLE IF NOT EXISTS messages (
      id           SERIAL PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id   INTEGER NOT NULL REFERENCES users(id),
      content      TEXT NOT NULL,
      read_at      TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
}

export async function getConversations(userId: number): Promise<Conversation[]> {
  const db = sql()

  const rows = await db`
    SELECT
      other_user.id,
      other_user.username,
      other_user.name,
      other_user.surname,
      other_user.photo_url,
      other_user.role,
      other_user.email,
      other_user.address,
      other_user.postal_code,
      last_msg.content AS last_message,
      last_msg.created_at AS last_at,
      COUNT(unread.id)::int AS unread
    FROM (
      SELECT DISTINCT
        CASE WHEN from_user_id = ${userId} THEN to_user_id ELSE from_user_id END AS other_id
      FROM messages
      WHERE from_user_id = ${userId} OR to_user_id = ${userId}
    ) convo
    JOIN users other_user ON other_user.id = convo.other_id
    JOIN LATERAL (
      SELECT content, created_at
      FROM messages
      WHERE (from_user_id = ${userId} AND to_user_id = convo.other_id)
         OR (from_user_id = convo.other_id AND to_user_id = ${userId})
      ORDER BY created_at DESC
      LIMIT 1
    ) last_msg ON TRUE
    LEFT JOIN messages unread ON unread.to_user_id = ${userId}
      AND unread.from_user_id = convo.other_id
      AND unread.read_at IS NULL
    GROUP BY other_user.id, other_user.username, other_user.name, other_user.surname,
             other_user.photo_url, other_user.role, other_user.email,
             other_user.address, other_user.postal_code,
             last_msg.content, last_msg.created_at
    ORDER BY last_msg.created_at DESC
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
    lastMessage: r.last_message as string,
    lastAt: r.last_at as string,
    unread: Number(r.unread),
  }))
}

export async function getMessages(userId: number, otherUserId: number): Promise<Message[]> {
  const db = sql()

  // Mark as read
  await db`
    UPDATE messages
    SET read_at = NOW()
    WHERE to_user_id = ${userId} AND from_user_id = ${otherUserId} AND read_at IS NULL
  `

  const rows = await db`
    SELECT id, from_user_id, to_user_id, content, read_at, created_at
    FROM messages
    WHERE (from_user_id = ${userId} AND to_user_id = ${otherUserId})
       OR (from_user_id = ${otherUserId} AND to_user_id = ${userId})
    ORDER BY created_at ASC
  `

  return rows as unknown as Message[]
}

export async function sendMessage(fromId: number, toId: number, content: string): Promise<Message> {
  const db = sql()
  const [row] = await db`
    INSERT INTO messages (from_user_id, to_user_id, content)
    VALUES (${fromId}, ${toId}, ${content})
    RETURNING id, from_user_id, to_user_id, content, read_at, created_at
  `
  return row as unknown as Message
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const db = sql()
  const [row] = await db`
    SELECT COUNT(*)::int AS count
    FROM messages
    WHERE to_user_id = ${userId} AND read_at IS NULL
  `
  return row?.count ?? 0
}
