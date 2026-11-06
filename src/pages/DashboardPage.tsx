import { Link } from 'react-router-dom'
import { StatusChip } from '../components/ui/Chip'
import { overallStats } from '../data/seed'
import { effectiveStatus, fmtMoney, fmtPct } from '../lib/derive'
import { useStore } from '../store/store'

/** Dashboard. A short landing page pointing into Campaigns and Modules. */
export function DashboardPage() {
  const { state } = useStore()
  const live = state.campaigns.filter((c) => ['running', 'paused'].includes(effectiveStatus(state, c)))
  const stats = overallStats['Last 30 days']
  const onCount = state.modules.filter((m) => m.active).length
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-600">What StoreGrowth did for your store in the last 30 days.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs text-gray-500">Campaign revenue</div>
          <div className="text-2xl font-semibold">{fmtMoney(stats.revenue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Campaign orders</div>
          <div className="text-2xl font-semibold">{stats.orders}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">AOV lift</div>
          <div className="text-2xl font-semibold">{fmtPct(stats.aovLift)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500">Modules on</div>
          <div className="text-2xl font-semibold">
            {onCount} <span className="text-sm font-normal text-gray-500">of {state.modules.length}</span>
          </div>
        </div>
      </div>
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Live campaigns</h2>
          <Link to="/campaigns" className="text-sm text-blue-700 hover:underline">
            All campaigns
          </Link>
        </div>
        <div className="flex flex-col divide-y" style={{ borderColor: '#e5e7eb' }}>
          {live.map((c) => (
            <Link key={c.id} to={`/campaigns/${c.id}`} className="flex items-center justify-between py-2 text-sm hover:bg-gray-50">
              <span className="font-medium">{c.name}</span>
              <span className="flex items-center gap-3 text-gray-600">
                {c.metrics && fmtMoney(c.metrics.revenue)}
                <StatusChip status={effectiveStatus(state, c)} />
              </span>
            </Link>
          ))}
          {live.length === 0 && <div className="py-4 text-sm text-gray-500">No campaign is running.</div>}
        </div>
      </section>
    </div>
  )
}
