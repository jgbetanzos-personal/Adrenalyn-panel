import { neon } from '@neondatabase/serverless'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

function sql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
  return neon(process.env.DATABASE_URL)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':')
  const hashBuffer = Buffer.from(hash, 'hex')
  const supplied = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(hashBuffer, supplied)
}

export async function getUserByUsername(username: string): Promise<DbUser & { password_hash: string } | null> {
  const db = sql()
  const rows = await db`SELECT * FROM users WHERE username = ${username} LIMIT 1`
  return (rows[0] ?? null) as unknown as (DbUser & { password_hash: string }) | null
}

export async function getUserById(id: number): Promise<DbUser | null> {
  const db = sql()
  const rows = await db`SELECT id, username, name, surname, photo_url, role FROM users WHERE id = ${id} LIMIT 1`
  return (rows[0] ?? null) as unknown as DbUser | null
}

export type DbUser = {
  id: number
  username: string
  name: string
  surname: string
  photo_url: string | null
  role: string
}

export async function getAllUsers(): Promise<DbUser[]> {
  const db = sql()
  const rows = await db`SELECT id, username, name, surname, photo_url, role FROM users WHERE role = 'user' ORDER BY id`
  return rows as unknown as DbUser[]
}

export async function updateUserProfile(id: number, data: { name: string; surname: string; photo_url?: string }) {
  const db = sql()
  if (data.photo_url !== undefined) {
    await db`UPDATE users SET name = ${data.name}, surname = ${data.surname}, photo_url = ${data.photo_url} WHERE id = ${id}`
  } else {
    await db`UPDATE users SET name = ${data.name}, surname = ${data.surname} WHERE id = ${id}`
  }
}
