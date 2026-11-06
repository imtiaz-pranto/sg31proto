import { AlertTriangle, Lock } from 'lucide-react'
import type { CampaignStatus, CouponStatus } from '../../types'

const campaignStatusStyle: Record<CampaignStatus, { bg: string; fg: string; label: string }> = {
  running: { bg: '#d1fae5', fg: '#065f46', label: 'Running' },
  scheduled: { bg: '#dbeafe', fg: '#1e3a8a', label: 'Scheduled' },
  draft: { bg: '#fef3c7', fg: '#92400e', label: 'Draft' },
  paused: { bg: '#fef3c7', fg: '#92400e', label: 'Paused' },
  ended: { bg: '#f3f4f6', fg: '#374151', label: 'Ended' },
}

export function StatusChip({ status }: { status: CampaignStatus }) {
  const s = campaignStatusStyle[status]
  return (
    <span className="chip" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

const couponStatusStyle: Record<CouponStatus, { bg: string; fg: string; label: string }> = {
  active: { bg: '#d1fae5', fg: '#065f46', label: 'Active' },
  scheduled: { bg: '#dbeafe', fg: '#1e3a8a', label: 'Scheduled' },
  inactive: { bg: '#f3f4f6', fg: '#374151', label: 'Inactive' },
  expired: { bg: '#f3f4f6', fg: '#374151', label: 'Expired' },
}

export function CouponStatusChip({ status }: { status: CouponStatus }) {
  const s = couponStatusStyle[status]
  return (
    <span className="chip" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  )
}

/** One style everywhere: small grey pill with the module name. */
export function ModuleChip({ name }: { name: string }) {
  return <span className="chip chip-module">{name}</span>
}

export function ProChip() {
  return (
    <span className="chip chip-pro">
      <Lock size={10} /> Pro
    </span>
  )
}

export function WarnChip({ text }: { text: string }) {
  return (
    <span className="chip chip-warn">
      <AlertTriangle size={11} /> {text}
    </span>
  )
}
