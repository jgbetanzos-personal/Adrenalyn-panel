'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  name: string
  surname: string
  photo_url: string | null
  username: string
}

export function PerfilForm({ user }: { user: User }) {
  const router = useRouter()
  const [name, setName]       = useState(user.name)
  const [surname, setSurname] = useState(user.surname)
  const [preview, setPreview] = useState<string | null>(user.photo_url)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const formData = new FormData()
    formData.append('name', name)
    formData.append('surname', surname)
    if (fileRef.current?.files?.[0]) {
      formData.append('photo', fileRef.current.files[0])
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      body: formData,
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border p-6 bg-card">
      {/* Foto */}
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 relative group cursor-pointer"
        >
          {preview ? (
            <Image
              src={preview}
              alt="Foto de perfil"
              width={80}
              height={80}
              className="rounded-full object-cover w-20 h-20"
              unoptimized
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-3xl">
              {name.charAt(0) || '?'}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-xs font-medium">Cambiar</span>
          </div>
        </button>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Foto de perfil</p>
          <p>JPG, PNG o GIF · máx. 4 MB</p>
          <p>Se mostrará en tu página pública</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="name">Nombre</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Apellidos */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="surname">Apellidos</label>
        <input
          id="surname"
          type="text"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          required
          className="w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="text-sm text-green-600">¡Guardado!</span>}
      </div>
    </form>
  )
}
