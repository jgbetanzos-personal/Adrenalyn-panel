'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { DbUser } from '@/lib/users'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CP_RE    = /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/

function Field({
  id, label, type = 'text', value, onChange, error,
}: {
  id: string; label: string; type?: string
  value: string; onChange: (v: string) => void
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 ${
          error ? 'border-red-400 focus:ring-red-300' : 'focus:ring-orange-400'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function PerfilForm({ user }: { user: DbUser }) {
  const router = useRouter()
  const [name,       setName]       = useState(user.name)
  const [surname,    setSurname]    = useState(user.surname)
  const [email,      setEmail]      = useState(user.email ?? '')
  const [address,    setAddress]    = useState(user.address ?? '')
  const [postalCode, setPostalCode] = useState(user.postal_code ?? '')
  const [preview,    setPreview]    = useState<string | null>(user.photo_url)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim())             e.name        = 'Obligatorio'
    if (!surname.trim())          e.surname     = 'Obligatorio'
    if (!EMAIL_RE.test(email))    e.email       = 'Email no válido'
    if (!address.trim())          e.address     = 'Obligatorio'
    if (!CP_RE.test(postalCode))  e.postal_code = 'Código postal español inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setSaved(false)

    const formData = new FormData()
    formData.append('name',        name)
    formData.append('surname',     surname)
    formData.append('email',       email)
    formData.append('address',     address)
    formData.append('postal_code', postalCode)
    if (fileRef.current?.files?.[0]) {
      formData.append('photo', fileRef.current.files[0])
    }

    const res = await fetch('/api/profile', { method: 'PATCH', body: formData })
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
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nombre de usuario</label>
        <div className="w-full rounded-lg border px-3 py-2 text-sm bg-muted text-muted-foreground">
          {user.username}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="name"    label="Nombre"    value={name}    onChange={setName}    error={errors.name} />
        <Field id="surname" label="Apellidos" value={surname} onChange={setSurname} error={errors.surname} />
      </div>

      <Field id="email"   label="Email"        type="email" value={email}      onChange={setEmail}      error={errors.email} />
      <Field id="address" label="Dirección"                 value={address}    onChange={setAddress}    error={errors.address} />
      <Field id="postal"  label="Código postal"             value={postalCode} onChange={setPostalCode} error={errors.postal_code} />

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
