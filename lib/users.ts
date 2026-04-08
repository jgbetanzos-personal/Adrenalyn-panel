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
  const rows = await db`SELECT id, username, name, surname, photo_url, role, email, address, postal_code FROM users WHERE id = ${id} LIMIT 1`
  return (rows[0] ?? null) as unknown as DbUser | null
}

export type DbUser = {
  id: number
  username: string
  name: string
  surname: string
  photo_url: string | null
  role: string
  email: string | null
  address: string | null
  postal_code: string | null
}

export async function getAllUsers(): Promise<DbUser[]> {
  const db = sql()
  const rows = await db`SELECT id, username, name, surname, photo_url, role, email, address, postal_code FROM users WHERE role = 'user' ORDER BY id`
  return rows as unknown as DbUser[]
}

export async function createUser(data: {
  username: string
  password: string
  name: string
  surname: string
  email: string
  address: string
  postal_code: string
}): Promise<DbUser> {
  const db = sql()
  const password_hash = await hashPassword(data.password)
  const rows = await db`
    INSERT INTO users (username, password_hash, name, surname, email, address, postal_code, role)
    VALUES (${data.username}, ${password_hash}, ${data.name}, ${data.surname}, ${data.email}, ${data.address}, ${data.postal_code}, 'user')
    RETURNING id, username, name, surname, photo_url, role, email, address, postal_code
  `
  return rows[0] as unknown as DbUser
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const db = sql()
  const rows = await db`SELECT 1 FROM users WHERE username = ${username} LIMIT 1`
  return rows.length > 0
}

export async function isEmailTaken(email: string): Promise<boolean> {
  const db = sql()
  const rows = await db`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`
  return rows.length > 0
}

export async function updateUserPassword(id: number, newPassword: string): Promise<void> {
  const db = sql()
  const password_hash = await hashPassword(newPassword)
  await db`UPDATE users SET password_hash = ${password_hash} WHERE id = ${id}`
}

export async function updateUserProfile(id: number, data: {
  name: string
  surname: string
  email: string
  address: string
  postal_code: string
  photo_url?: string
}) {
  const db = sql()
  if (data.photo_url !== undefined) {
    await db`
      UPDATE users SET name = ${data.name}, surname = ${data.surname},
        email = ${data.email}, address = ${data.address}, postal_code = ${data.postal_code},
        photo_url = ${data.photo_url}
      WHERE id = ${id}
    `
  } else {
    await db`
      UPDATE users SET name = ${data.name}, surname = ${data.surname},
        email = ${data.email}, address = ${data.address}, postal_code = ${data.postal_code}
      WHERE id = ${id}
    `
  }
}
