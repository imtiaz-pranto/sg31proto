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

/** Revenue by day inside one campaign. */
export function DayBars({ data }: { data: { date: string; revenue: number }[] }) {
  const w = 420
  const h = 150
  const pad = 20
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const bw = (w - pad * 2) / Math.max(1, data.length)
  if (data.length === 0) return <div className="py-10 text-center text-sm text-gray-500">No orders yet</div>
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Revenue by day">
      {data.map((d, i) => {
        const x = pad + i * bw
        const bh = ((h - pad * 2) * d.revenue) / max
        return (
          <g key={d.date}>
            <rect x={x + bw * 0.2} y={h - pad - bh} width={bw * 0.6} height={bh} rx={3} fill="#1d4ed8" />
            <text x={x + bw / 2} y={h - pad - bh - 4} textAnchor="middle" fontSize={10} fill="#374151">
              {fmtMoney(d.revenue)}
            </text>
            <text x={x + bw / 2} y={h - 5} textAnchor="middle" fontSize={10} fill="#6b7280">
              {d.date.slice(5)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Horizontal bars for "Which surface led to the sale". */
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
