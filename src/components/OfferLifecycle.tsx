import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { FREE_LIMITS, campaignById, effectiveOffer, fmtShortDateTime, freeLimitPaused, freeLimitPool, offerName, timelineChip, type AnyOffer } from '../lib/derive'
import { useStore } from '../store/store'
import type { FreeLimitModule, OfferKey } from '../types'
import { Modal } from './ui/Overlay'

/** Timeline chip (brief section 5). Hover shows every window. */
export function TimelineChip({ k }: { k: OfferKey }) {
  const { state } = useStore()
  const chip = timelineChip(state, k)
  if (!chip) return null
  return (
    <span className="chip" style={{ background: '#eff6ff', color: '#1d4ed8' }} title={chip.title}>
      <CalendarClock size={11} /> {chip.text}
    </span>
  )
}

/** Module page banner while a running campaign controls an everyday offer. */
export function ControllingBanner({ k, offer, onEditVersion }: { k: OfferKey; offer: AnyOffer; onEditVersion: (campaignId: string) => void }) {
  const { state } = useStore()
  const e = effectiveOffer(state, k, offer)
  if (e.version !== 'campaign' || offer.origin !== 'everyday' || !e.campaign) return null
  const c = e.campaign
  const until = c.end ? `until ${fmtShortDateTime(c.end)}` : 'while it runs'
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: '#dbeafe', color: '#1e3a8a' }}>
      <span className="flex-1">
        {c.name} is controlling {offerName(offer)} {until}. Changes here apply after it ends.
      </span>
      <button type="button" className="font-medium underline" onClick={() => onEditVersion(c.id)}>
        Edit {c.name} version
      </button>
    </div>
  )
}

export function OfferTag({ offer }: { offer: AnyOffer }) {
  return <span className="chip chip-module">{offer.origin === 'campaignOnly' ? 'Campaign-only' : 'Attached'}</span>
}

/** "Campaign-only: [campaign]" chip for module pages. */
export function CampaignOnlyChip({ offer }: { offer: AnyOffer }) {
  const { state } = useStore()
  if (offer.origin !== 'campaignOnly') return null
  return <span className="chip chip-module">Campaign-only: {campaignById(state, offer.campaignOnlyOf)?.name ?? 'deleted campaign'}</span>
}

export function FreeLimitChip() {
  return <span className="chip chip-warn">Paused: over Free limit</span>
}

const MODULE_TITLE: Record<FreeLimitModule, string> = { 'smart-coupons': 'Smart Coupons', 'order-bump': 'Order Bumps', 'cart-rewards': 'Cart Rewards milestones' }

/** Rule 8 notice with "Choose offers". Shown on a module page when that module is over the Free limit. */
export function FreeLimitNotice({ module }: { module: FreeLimitModule }) {
  const { state, actions } = useStore()
  const [open, setOpen] = useState(false)
  const paused = freeLimitPaused(state, module)
  const pool = freeLimitPool(state, module)
  const limit = FREE_LIMITS[module]
  const [picked, setPicked] = useState<string[]>([])
  if (paused.size === 0) return null
  const start = () => {
    setPicked(pool.filter((p) => !paused.has(p.id)).map((p) => p.id))
    setOpen(true)
  }
  const toggle = (id: string) => setPicked((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : ps.length >= limit ? [...ps.slice(1), id] : [...ps, id]))
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: '#fef3c7', color: '#92400e' }} role="status">
        <span className="flex-1">You have more offers than the Free plan allows. Choose which stay on.</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={start}>
          Choose offers
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Choose ${MODULE_TITLE[module]} to keep on`} width={520}>
        <div className="flex flex-col gap-2 text-sm">
          <div className="text-xs text-gray-600">The Free plan keeps {limit} on. The rest pause until you upgrade.</div>
          {pool.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.name}
            </label>
          ))}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-blue btn-sm"
              disabled={picked.length === 0}
              onClick={() => {
                actions.setFreeKeep(module, picked)
                setOpen(false)
              }}
            >
              Keep these on
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
