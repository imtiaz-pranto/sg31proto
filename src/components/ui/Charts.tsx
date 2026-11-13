import { fmtMoney } from '../../lib/derive'

interface WeekBar {
  weekStart: string
  revenue: number
  inCampaign: boolean
}

/** Campaign revenue by week. Weeks inside a campaign window are shaded. */
export function WeeklyBars({ data }: { data: WeekBar[] }) {
  const w = 720
  const h = 160
  const pad = 24
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const bw = (w - pad * 2) / Math.max(1, data.length)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Campaign revenue by week">
      {data.map((d, i) => {
        const x = pad + i * bw
        const bh = ((h - pad * 2) * d.revenue) / max
        return (
          <g key={d.weekStart}>
            {d.inCampaign && <rect x={x} y={pad / 2} width={bw} height={h - pad} fill="#dbeafe" opacity={0.6} />}
            <rect x={x + bw * 0.2} y={h - pad - bh} width={bw * 0.6} height={bh} rx={2} fill="#1d4ed8" />
            {i % 2 === 0 && (
              <text x={x + bw / 2} y={h - 6} textAnchor="middle" fontSize={9} fill="#6b7280">
                {d.weekStart.slice(5)}
              </text>
            )}
          </g>
        )
      })}
      <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#e5e7eb" />
    </svg>
  )
}

/** One column in "Revenue by day". `revenue` is null for a day still to come. */
export interface DayColumn {
  date: string
  label: string
  revenue: number | null
  today: boolean
}

/** Revenue by day inside one campaign: solid bars for past days, a lighter bar for today, dashed placeholders for days to come. */
export function RevenueByDay({ days }: { days: DayColumn[] }) {
  if (days.length === 0 || days.every((d) => d.revenue === null)) return <div className="py-10 text-center text-sm text-[#50575E]">No daily revenue for this campaign.</div>
  const max = Math.max(1, ...days.map((d) => d.revenue ?? 0))
  const dense = days.length > 10
  const every = Math.ceil(days.length / 8)
  const gap = days.length <= 4 ? 24 : dense ? 4 : 10
  return (
    <div role="img" aria-label={`Revenue by day. ${days.filter((d) => d.revenue !== null).map((d) => `${d.label}: ${fmtMoney(d.revenue ?? 0)}`).join(', ')}`}>
      <div className="flex items-end border-b border-[#C3C4C7] px-1" style={{ height: 180, gap }}>
        {days.map((d) =>
          d.revenue === null ? (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="w-full rounded-sm border border-dashed border-[#C3C4C7]" style={{ height: 6 }} />
            </div>
          ) : (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              {!dense && <span className="whitespace-nowrap text-[11px] text-[#50575E]">{fmtMoney(d.revenue)}</span>}
              <div className="w-full rounded-t" style={{ height: Math.max(2, Math.round((d.revenue / max) * 160)), background: d.today ? '#93B4F5' : '#1D4ED8' }} title={`${d.label}: ${fmtMoney(d.revenue)}`} />
            </div>
          ),
        )}
      </div>
      <div className="mt-3 flex px-1 text-[11px] text-[#50575E]" style={{ gap }}>
        {days.map((d, i) => (
          <span key={d.date} className="min-w-0 flex-1 whitespace-nowrap text-center">
            {!dense || i % every === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

/** "What led to the sale": orders per store display, longest bar first, Direct in grey. */
export function LedToSale({ data, label }: { data: Record<string, number>; label: (key: string) => string }) {
  const entries = Object.entries(data).sort((a, b) => (a[0] === 'Direct' ? 1 : b[0] === 'Direct' ? -1 : b[1] - a[1]))
  const max = Math.max(0, ...entries.map(([, v]) => v))
  if (max === 0) return <div className="py-10 text-center text-sm text-[#50575E]">No orders yet</div>
  return (
    <div className="flex flex-col gap-2.5 text-[13px]">
      {entries.map(([name, v]) => (
        <div key={name} className="grid items-center gap-2.5" style={{ gridTemplateColumns: '110px minmax(0, 1fr) 32px' }}>
          <span className="truncate">{label(name)}</span>
          <div className="h-3 rounded-[3px]" style={{ width: `${Math.max(2, Math.round((v / max) * 100))}%`, background: name === 'Direct' ? '#8C8F94' : '#1D4ED8' }} />
          <span className="text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  )
}

/** Horizontal bars with shares, for Analytics: "What led to the sale" across all campaigns. */
export function SurfaceBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <div className="py-10 text-center text-sm text-gray-500">No orders yet</div>
  return (
    <div className="flex flex-col gap-2">
      {entries.map(([name, v]) => (
        <div key={name} className="grid items-center gap-2 text-sm" style={{ gridTemplateColumns: '120px 1fr 64px' }}>
          <span className="truncate text-gray-700">{name}</span>
          <div className="h-3 rounded bg-gray-100">
            <div className="h-3 rounded" style={{ width: `${(v / total) * 100}%`, background: '#1d4ed8' }} />
          </div>
          <span className="text-right text-gray-600">
            {v} · {Math.round((v / total) * 100)}%
          </span>
        </div>
      ))}
    </div>
  )
}
