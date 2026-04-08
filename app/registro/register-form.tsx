'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/

function Field({
  id, label, type = 'text', value, onChange, onBlur, error, hint, suffix,
}: {
  id: string; label: string; type?: string
  value: string; onChange: (v: string) => void; onBlur?: () => void
  error?: string; hint?: string; suffix?: React.ReactNode
}) {
  const [showHint, setShowHint] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium" htmlFor={id}>{label}</label>
        {hint && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowHint(true)}
              onMouseLeave={() => setShowHint(false)}
              onFocus={() => setShowHint(true)}
              onBlur={() => setShowHint(false)}
              className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center hover:bg-orange-100 hover:text-orange-700 transition-colors"
              aria-label="Información"
            >
              i
            </button>
            {showHint && (
              <div className="absolute left-0 top-6 z-20 w-56 rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-md">
                {hint}
              </div>
            )}
          </div>
        )}
        {suffix}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-300' : 'focus:ring-orange-400'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function RegisterForm() {
  const router = useRouter()

  const [form, setForm] = useState({
    username: '', password: '', confirm_password: '', email: '',
  })
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]         = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  function set(field: keyof typeof form) {
    return (value: string) => {
      setForm(prev => ({ ...prev, [field]: value }))
      setErrors(prev => ({ ...prev, [field]: '' }))
      if (field === 'username') setUsernameStatus('idle')
    }
  }

  async function checkUsername() {
    if (form.username.length < 3) return
    setUsernameStatus('checking')
    const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(form.username)}`)
    const { available } = await res.json()
    setUsernameStatus(available ? 'available' : 'taken')
    if (!available) {
      setErrors(prev => ({ ...prev, username: 'Ese nombre de usuario ya está en uso' }))
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (form.username.length < 3)                e.username         = 'Mínimo 3 caracteres'
    if (usernameStatus === 'taken')              e.username         = 'Ese nombre de usuario ya está en uso'
    if (!PASSWORD_RE.test(form.password))        e.password         = 'Mínimo 8 caracteres, una mayúscula y un dígito'
    if (form.password !== form.confirm_password) e.confirm_password = 'Las contraseñas no coinciden'
    if (!EMAIL_RE.test(form.email))              e.email            = 'Email no válido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setServerError('')
    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setServerError(data.error ?? 'Error al registrarse')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Crear cuenta</h1>
          <p className="text-muted-foreground text-sm">Adrenalyn XL LaLiga 2025-26</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6 bg-card">
          <Field
            id="username"
            label="Nombre de usuario"
            value={form.username}
            onChange={set('username')}
            onBlur={checkUsername}
            error={errors.username}
            suffix={
              usernameStatus === 'checking'  ? <span className="text-xs text-muted-foreground ml-1">Comprobando…</span> :
              usernameStatus === 'available' ? <span className="text-xs text-green-600 ml-1">✓ Disponible</span> :
              usernameStatus === 'taken'     ? <span className="text-xs text-red-600 ml-1">✗ No disponible</span> :
              null
            }
          />
          <Field id="email"    label="Email" type="email" value={form.email}   onChange={set('email')}    error={errors.email} />

          <Field
            id="password"
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint="Mínimo 8 caracteres, al menos una letra mayúscula y un dígito."
          />
          <Field
            id="confirm_password"
            label="Verificar contraseña"
            type="password"
            value={form.confirm_password}
            onChange={set('confirm_password')}
            error={errors.confirm_password}
          />

          {serverError && <p className="text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
