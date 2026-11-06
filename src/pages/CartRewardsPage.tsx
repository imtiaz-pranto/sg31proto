import { AlertTriangle, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProChip } from '../components/ui/Chip'
import { Card, Field } from '../components/ui/Field'
import { UpgradeCard } from '../components/ui/UpgradeCard'
import { fmtMoney, freeLimitPaused, lockReason, rewardLabel } from '../lib/derive'
import { FreeLimitChip, FreeLimitNotice } from '../components/OfferLifecycle'
import { useStore } from '../store/store'
import type { Milestone } from '../types'

/** S7. Cart Rewards module page: milestones, bar copy, placement, live bar preview and the zone warning. */
export function CartRewardsPage() {
  const { state, actions } = useStore()
  const proLocked = lockReason(state, { pro: true }) === 'pro'
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [previewSubtotal, setPreviewSubtotal] = useState(65)
  const cfg = state.cartRewards
  const milestones = [...cfg.milestones].sort((a, b) => a.threshold - b.threshold)
  const zonesWithoutFree = cfg.shippingZones.filter((z) => !z.hasFreeShippingMethod)
  const hasFreeShippingReward = milestones.some((m) => m.reward.kind === 'freeShipping')
  const paused = freeLimitPaused(state, 'cart-rewards')

  const onAdd = () => {
    if (proLocked && milestones.length >= 1) setShowUpgrade(true)
    else actions.addMilestone()
  }

  const next = milestones.find((m) => m.threshold > previewSubtotal)
  const barText = next ? cfg.barCopy.replace('{remaining}', fmtMoney(next.threshold - previewSubtotal)).replace('{reward}', rewardLabel(state, next.reward)) : 'All rewards unlocked'
  const pct = next ? Math.min(100, (previewSubtotal / next.threshold) * 100) : 100

  return (
    <div className="flex flex-col gap-5">
      <div className="text-xs text-gray-500">
        <Link to="/modules" className="hover:underline">
          Modules
        </Link>{' '}
        / Cart Rewards
      </div>
      <div>
        <h1 className="text-xl font-semibold">Cart Rewards</h1>
        <p className="text-sm text-gray-600">Milestones shoppers unlock as the cart grows, with a progress bar. Campaigns show this bar as a surface with their own copy.</p>
      </div>

      <FreeLimitNotice module="cart-rewards" />
      {hasFreeShippingReward &&
        zonesWithoutFree.map((z) => (
          <div key={z.name} className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
            <AlertTriangle size={14} />
            <span className="flex-1">Your {z.name} zone has no Free shipping method, so this reward won't apply there.</span>
            <button type="button" className="font-medium underline" onClick={() => actions.toast('Prototype: WooCommerce shipping settings are out of scope.')}>
              Open shipping settings
            </button>
          </div>
        ))}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card
            title="Milestones"
            right={
              <button type="button" className="btn btn-blue btn-sm" onClick={onAdd}>
                Add milestone
              </button>
            }
          >
            <div className="flex flex-col divide-y" style={{ borderColor: '#e5e7eb' }}>
              {milestones.map((m, i) => (
                <MilestoneRow key={m.id} m={m} locked={paused.has(m.id)} index={i} />
              ))}
            </div>
            {showUpgrade && proLocked && (
              <div className="mt-3">
                <UpgradeCard name="More milestones" sentence="Stack free shipping, gifts and coupons at different cart totals." />
              </div>
            )}
            <div className="mt-3 text-xs text-gray-500">Thresholds use the cart subtotal after discounts, with or without tax as your store shows prices.</div>
            <div className="mt-1 text-xs text-gray-500">Existing Free Shipping Rules became milestone 1.</div>
          </Card>

          <Card title="Bar">
            <div className="grid max-w-xl grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Bar copy" htmlFor="bar-copy" help="Placeholders: {remaining} and {reward}">
                <input id="bar-copy" className="input" value={cfg.barCopy} onChange={(e) => actions.updateCartRewards({ barCopy: e.target.value })} />
              </Field>
              <Field label="Placement" htmlFor="bar-placement">
                <select id="bar-placement" className="input" value={cfg.placement} onChange={(e) => actions.updateCartRewards({ placement: e.target.value as typeof cfg.placement })}>
                  <option value="flyCart">Fly cart</option>
                  <option value="cartPage">Cart page</option>
                  <option value="both">Both</option>
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Shipping zones">
            <div className="flex flex-col divide-y text-sm" style={{ borderColor: '#e5e7eb' }}>
              {cfg.shippingZones.map((z) => (
                <div key={z.name} className="flex items-center justify-between py-2">
                  <span>{z.name}</span>
                  <span className={z.hasFreeShippingMethod ? 'text-green-700' : 'text-amber-800'}>{z.hasFreeShippingMethod ? 'Has a Free shipping method' : 'No Free shipping method'}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">Read from WooCommerce shipping settings. Sample data in this prototype.</div>
          </Card>
        </div>

        <Card title="Live bar preview">
          <Field label={`Sample cart subtotal: ${fmtMoney(previewSubtotal)}`} htmlFor="preview-subtotal">
            <input id="preview-subtotal" type="range" min={0} max={250} step={5} value={previewSubtotal} onChange={(e) => setPreviewSubtotal(Number(e.target.value))} className="w-full" />
          </Field>
          <div className="mt-4 rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
            <div className="mb-1.5 text-sm font-medium">{barText}</div>
            <div className="h-2 rounded bg-gray-100">
              <div className="h-2 rounded" style={{ width: `${pct}%`, background: '#1d4ed8' }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-gray-500">
              {milestones.map((m) => (
                <span key={m.id} className={`chip ${m.threshold <= previewSubtotal ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {fmtMoney(m.threshold)} · {rewardLabel(state, m.reward)}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function MilestoneRow({ m, locked, index }: { m: Milestone; locked: boolean; index: number }) {
  const { state, actions } = useStore()
  const kind = m.reward.kind
  return (
    <div className={`flex flex-wrap items-center gap-3 py-3 ${locked ? 'locked' : ''}`}>
      <span className="w-6 text-xs text-gray-500">{index + 1}</span>
      {locked && <Lock size={14} className="text-gray-500" />}
      {locked && <FreeLimitChip />}
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-500">$</span>
        <input type="number" min={0} className="input w-24" value={m.threshold} disabled={locked} aria-label="Threshold" onChange={(e) => actions.updateMilestone(m.id, { threshold: Number(e.target.value) })} />
      </label>
      <select
        className="input w-40"
        value={kind}
        disabled={locked}
        aria-label="Reward"
        onChange={(e) => {
          const k = e.target.value
          if (k === 'freeShipping') actions.updateMilestone(m.id, { reward: { kind: 'freeShipping' } })
          if (k === 'gift') actions.updateMilestone(m.id, { reward: { kind: 'gift', productId: state.products[0].id } })
          if (k === 'coupon') actions.updateMilestone(m.id, { reward: { kind: 'coupon', couponId: state.coupons[0].id } })
        }}
      >
        <option value="freeShipping">Free shipping</option>
        <option value="coupon">Smart Coupon</option>
        <option value="gift">Free gift</option>
      </select>
      {m.reward.kind === 'gift' && (
        <select className="input w-44" value={m.reward.productId} disabled={locked} aria-label="Gift product" onChange={(e) => actions.updateMilestone(m.id, { reward: { kind: 'gift', productId: e.target.value } })}>
          {state.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      {m.reward.kind === 'coupon' && (
        <select className="input w-44" value={m.reward.couponId} disabled={locked} aria-label="Smart Coupon" onChange={(e) => actions.updateMilestone(m.id, { reward: { kind: 'coupon', couponId: e.target.value } })}>
          {state.coupons.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      )}
      {kind === 'coupon' && <span className="chip chip-module">Smart Coupon</span>}
      {m.reward.kind === 'coupon' && (() => {
        const rc = m.reward.couponId
        const k = state.coupons.find((c) => c.id === rc)
        return k && k.method !== 'automatic' ? <span className="text-xs text-gray-500">Shoppers see "You unlocked {k.title}: {k.code}"</span> : null
      })()}
      {kind === 'coupon' && state.licence !== 'pro' && <ProChip />}
      <button type="button" className="btn btn-ghost btn-sm ml-auto" disabled={locked} onClick={() => actions.removeMilestone(m.id)}>
        Remove
      </button>
    </div>
  )
}
