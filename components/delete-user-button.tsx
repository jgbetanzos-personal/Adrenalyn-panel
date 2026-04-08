'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function DeleteUserButton({ username, name }: { username: string; name: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/delete-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Error al borrar')
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 space-y-2 mt-1">
        <p className="text-xs text-red-700">
          ¿Borrar a <strong>{name}</strong>? Esta acción no se puede deshacer.
        </p>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {loading ? 'Borrando…' : 'Sí, borrar'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border text-xs font-medium px-3 py-1.5 hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-1.5 transition-colors flex items-center gap-1.5 w-full justify-center"
    >
      <Trash2 className="w-3 h-3" />
      Borrar usuario
    </button>
  )
}
