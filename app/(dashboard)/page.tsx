import { getStats } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/kpi-card'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TYPE_CONFIG } from '@/components/type-label'
import type { CardType } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const stats = await getStats(session.userId)

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Resumen de la Colección</h1>
        <p className="text-muted-foreground text-sm mt-1">Adrenalyn XL LaLiga 2025-26</p>
      </div>

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
