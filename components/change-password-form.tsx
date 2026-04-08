'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export function ChangePasswordForm({ username }: { username: string }) {
  const [open,     setOpen]     = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!PASSWORD_RE.test(password)) {
      setError('Mínimo 8 caracteres, una mayúscula y un dígito')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    setLoading(false)

    if (res.ok) {
      setSuccess(true)
      setPassword('')
      setConfirm('')
      setTimeout(() => { setOpen(false); setSuccess(false) }, 1500)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al cambiar la contraseña')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border text-xs font-medium px-3 py-1.5 transition-colors hover:bg-muted flex items-center gap-1.5"
      >
        <KeyRound className="w-3 h-3" />
        Cambiar contraseña
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">Nueva contraseña para <span className="text-foreground">@{username}</span></p>

      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={e => { setPassword(e.target.value); setError('') }}
        required
        className="w-full rounded-lg border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
      />
      <input
        type="password"
        placeholder="Verificar contraseña"
        value={confirm}
        onChange={e => { setConfirm(e.target.value); setError('') }}
        required
        className="w-full rounded-lg border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
      />

      {error   && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">¡Contraseña actualizada!</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(''); setPassword(''); setConfirm('') }}
          className="rounded-lg border text-xs font-medium px-3 py-1.5 hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
