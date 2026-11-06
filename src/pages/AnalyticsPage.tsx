import { SurfaceBars } from '../components/ui/Charts'
import { fmtMoney, fmtPct } from '../lib/derive'
import { useStore } from '../store/store'

/** Analytics. Surface totals across every campaign that has reported orders. */
export function AnalyticsPage() {
  const { state } = useStore()
  const bySurface: Record<string, number> = {}
  for (const c of state.campaigns) {
    if (!c.metrics) continue
    for (const [k, v] of Object.entries(c.metrics.bySurface)) bySurface[k] = (bySurface[k] ?? 0) + v
  }
  const reported = state.campaigns.filter((c) => c.metrics && c.metrics.orders > 0)
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-gray-600">Which surfaces led to sales across all campaigns.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Which surface led to the sale</h2>
          <SurfaceBars data={bySurface} />
          <div className="mt-2 text-[11px] text-gray-500">Last surface clicked before a campaign product was added. None counts as Direct.</div>
        </section>
        <section className="card">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Campaign</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Orders</th>
                <th className="text-right">AOV lift</th>
              </tr>
            </thead>
            <tbody>
              {reported.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="text-right">{fmtMoney(c.metrics!.revenue)}</td>
                  <td className="text-right">{c.metrics!.orders}</td>
                  <td className="text-right">{fmtPct(c.metrics!.aovLift)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
