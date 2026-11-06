import { AlertTriangle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TemplatePicker } from '../components/TemplatePicker'
import { WeeklyBars } from '../components/ui/Charts'
import { ModuleChip, StatusChip } from '../components/ui/Chip'
import { ProActionButton, UpgradeCard } from '../components/ui/UpgradeCard'
import { overallStats } from '../data/seed'
import { campaignHasWarning, campaignInRange, campaignOffers, effectiveStatus, fmtMoney, fmtPct, fmtRange, revenueNote, stoppedByLicence, surfaceCount, weeklyRevenue, type RangeKey } from '../lib/derive'
import { useStore } from '../store/store'
import type { CampaignStatus } from '../types'

type Tab = 'All' | 'Running' | 'Scheduled' | 'Ended'

/** S1. Campaigns list with stats, chart, tabs and table. Free licence sees it as a locked preview. */
export function CampaignsList() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const isFree = state.licence !== 'pro'
  const expired = state.licence === 'proExpired'
  const [range, setRange] = useState<RangeKey>('Last 90 days')
  const [tab, setTab] = useState<Tab>('All')
  const [q, setQ] = useState('')
  const [picker, setPicker] = useState(false)

  const stats = overallStats[range]
  const weeks = useMemo(() => weeklyRevenue(state, range), [state, range])
  const withStatus = state.campaigns.map((c) => ({ c, st: effectiveStatus(state, c) }))
  const inRange = withStatus.filter(({ c, st }) => st === 'draft' || st === 'scheduled' || campaignInRange(state, c, range))
  const tabMatch = (s: CampaignStatus, t: Tab) =>
    t === 'All' || (t === 'Running' && (s === 'running' || s === 'paused')) || (t === 'Scheduled' && (s === 'scheduled' || s === 'draft')) || (t === 'Ended' && s === 'ended')
  const counts: Record<Tab, number> = {
    All: inRange.length,
    Running: inRange.filter(({ st }) => tabMatch(st, 'Running')).length,
    Scheduled: inRange.filter(({ st }) => tabMatch(st, 'Scheduled')).length,
    Ended: inRange.filter(({ st }) => tabMatch(st, 'Ended')).length,
  }
  const rows = inRange.filter(({ c, st }) => tabMatch(st, tab) && c.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="flex flex-col gap-5">
      {isFree && (
        <div className="card flex items-center gap-4 p-4" style={{ borderColor: '#d1d5db', background: '#f9fafb' }}>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {expired ? 'Your StoreGrowth Pro licence has expired, so your campaigns are stopped. Renew it to run them again.' : 'Campaigns is a StoreGrowth Pro feature. This is a preview with sample data.'}
            </div>
            {!expired && <div className="mt-1 text-xs text-gray-600">Group offers, a campaign price and surfaces from your modules under one schedule, one product scope and one report card.</div>}
          </div>
          <ProActionButton />
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Campaigns</h1>
          <p className="text-sm text-gray-600">Every promotion you have run, with what it earned</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="range">
            Date range
          </label>
          <select id="range" className="input w-auto" value={range} disabled={isFree} onChange={(e) => setRange(e.target.value as RangeKey)}>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
            <option>This year</option>
          </select>
          <button type="button" className="btn btn-blue" disabled={isFree} onClick={() => setPicker(true)}>
            New campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Campaign revenue" value={fmtMoney(stats.revenue)} sub={`${stats.storeShare}% of store revenue in the period`} note={revenueNote(state.settings.attributionWindowDays)} />
        <Stat label="Campaign orders" value={String(stats.orders)} sub={`across ${counts.All} campaigns`} note="Same rule as revenue" />
        <Stat label="AOV lift during campaigns" value={fmtPct(stats.aovLift)} sub="vs non-campaign days" note="Campaign orders vs the 30 days before" positive={stats.aovLift >= 0} />
        <Stat label="Best surface" value={stats.bestSurface} sub={`led ${stats.bestSurfaceShare}% of campaign orders`} note="Last surface clicked before a campaign product was added" />
      </div>

      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Campaign revenue by week</h2>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: '#dbeafe' }} /> Campaign window
          </span>
        </div>
        <WeeklyBars data={weeks} />
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex gap-1" role="tablist" aria-label="Status">
            {(['All', 'Running', 'Scheduled', 'Ended'] as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                disabled={isFree}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {t} <span className="ml-1 opacity-70">{counts[t]}</span>
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Search campaigns</span>
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input className="input w-56 pl-8" placeholder="Search" value={q} disabled={isFree} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Runs</th>
              <th>Offers</th>
              <th>Surfaces</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Orders</th>
              <th className="text-right">AOV lift</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, st }) => {
              const offers = campaignOffers(state, c)
              const warn = campaignHasWarning(state, c)
              const lift = c.metrics && st !== 'scheduled' && st !== 'draft' ? c.metrics.aovLift : null
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => nav(`/campaigns/${c.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && nav(`/campaigns/${c.id}`)}
                  tabIndex={0}
                >
                  <td className="font-medium">
                    <span className="flex items-center gap-2">
                      {c.name}
                      {stoppedByLicence(state, c) && <span className="chip chip-warn">Stopped: licence expired</span>}
                      {warn && (
                        <span className="chip chip-warn" title="A module this campaign uses is off">
                          <AlertTriangle size={11} /> Module off
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <StatusChip status={st} />
                  </td>
                  <td className="text-gray-600">{fmtRange(c.start, c.end)}</td>
                  <td>
                    <span className="flex items-center gap-1">
                      {offers.length}
                      {offers.slice(0, 3).map((o) => (
                        <ModuleChip key={o.ref.offerId} name={o.chip} />
                      ))}
                    </span>
                  </td>
                  <td>{surfaceCount(c)}</td>
                  <td className="text-right">{c.metrics && st !== 'scheduled' ? fmtMoney(c.metrics.revenue) : '--'}</td>
                  <td className="text-right">{c.metrics && st !== 'scheduled' ? c.metrics.orders : '--'}</td>
                  <td className="text-right">
                    {lift === null ? (
                      <span className="text-gray-400">--</span>
                    ) : (
                      <span style={{ color: lift >= 0 ? '#065f46' : '#b91c1c' }}>{fmtPct(lift)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500">
                  No campaigns match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {isFree && !expired && <UpgradeCard name="Campaigns" sentence="Run promotions across every module with one schedule and one report card." />}

      <TemplatePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(t) => {
          const id = actions.createCampaign(t)
          setPicker(false)
          nav(`/campaigns/${id}`)
        }}
      />
    </div>
  )
}

function Stat({ label, value, sub, note, positive }: { label: string; value: string; sub: string; note: string; positive?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={positive === undefined ? undefined : { color: positive ? '#065f46' : '#b91c1c' }}>
        {value}
      </div>
      <div className="text-xs text-gray-600">{sub}</div>
      <div className="mt-2 border-t pt-2 text-[11px] leading-snug text-gray-500" style={{ borderColor: '#e5e7eb' }}>
        {note}
      </div>
    </div>
  )
}
