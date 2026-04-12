import { getStats } from '@/lib/db'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/users'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/kpi-card'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TYPE_CONFIG } from '@/components/type-label'
import type { CardType } from '@/lib/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [stats, user] = await Promise.all([
    getStats(session.userId),
    session.role !== 'superadmin' ? getUserById(session.userId) : null,
  ])

  const isNewUser = stats.collected === 0
  const profileIncomplete = user && !(user.name && user.surname && user.address && user.postal_code)

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Banner de bienvenida para usuarios nuevos */}
      {isNewUser && (
        <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold">¡Bienvenido a MisCromos! 👋</h2>
            <p className="text-orange-100 text-sm mt-1">
              Empieza registrando tu colección para ver el progreso, encontrar repetidos e intercambiar con otros usuarios.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/importar"
              className="flex-1 rounded-lg bg-white text-orange-600 font-semibold px-4 py-3 text-sm text-center hover:bg-orange-50 transition-colors"
            >
              📥 Importar mi colección
              <span className="block text-xs font-normal text-orange-500 mt-0.5">Pega una lista o sube un CSV</span>
            </Link>
            <Link
              href="/coleccion"
              className="flex-1 rounded-lg bg-orange-400 hover:bg-orange-300 text-white font-semibold px-4 py-3 text-sm text-center transition-colors"
            >
              ✏️ Marcar uno a uno
              <span className="block text-xs font-normal text-orange-100 mt-0.5">Navega por el catálogo completo</span>
            </Link>
          </div>
        </div>
      )}

      {/* Banner perfil incompleto */}
      {!isNewUser && profileIncomplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-medium text-amber-800 text-sm">Completa tu perfil para poder intercambiar</p>
            <p className="text-xs text-amber-600 mt-0.5">Necesitas dirección y código postal para que otros usuarios puedan enviarte cromos.</p>
          </div>
          <Link
            href="/perfil"
            className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 text-center transition-colors"
          >
            Completar perfil →
          </Link>
        </div>
      )}

      {/* Acceso rápido para usuarios con colección pero que quieren importar más */}
      {!isNewUser && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Resumen de la Colección</h1>
            <p className="text-muted-foreground text-sm mt-1">Adrenalyn XL LaLiga 2025-26</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/importar"
              className="rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 font-medium px-4 py-2 text-sm transition-colors"
            >
              📥 Importar
            </Link>
            <Link
              href="/coleccion"
              className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 text-sm transition-colors"
            >
              Completar colección →
            </Link>
          </div>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Total cromos" value={stats.total} />
        <KpiCard
          title="Conseguidos"
          value={stats.collected}
          sub={`${stats.pct}% completado`}
          progress={stats.pct}
        />
        <KpiCard title="Faltan" value={stats.missing} />
        <KpiCard title="% Completado" value={`${stats.pct}%`} progress={stats.pct} />
      </div>

      <Separator />

      {/* Por tipo */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Por tipo de cromo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stats.byType.map((t) => {
            const cfg = TYPE_CONFIG[t.type as CardType]
            const pct = t.total > 0 ? Math.round((t.collected / t.total) * 100) : 0
            return (
              <div key={t.type} className="flex items-center gap-3 rounded-lg border p-3">
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.color ?? 'bg-slate-100 text-slate-700'}`}>
                  {cfg?.label ?? t.type}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.collected} / {t.total}</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Por equipo */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Por equipo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.byTeam.map((t) => {
            const pct = t.total > 0 ? Math.round((t.collected / t.total) * 100) : 0
            return (
              <Card key={t.team} className="py-3">
                <CardHeader className="pb-1 px-4 pt-0">
                  <CardTitle className="text-sm font-medium">{t.team}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t.collected} / {t.total} cromos</span>
                    <span className="font-medium text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
