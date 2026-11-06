import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BogoRuleDrawer } from '../components/BogoRuleDrawer'
import { CampaignOnlyChip, ControllingBanner, TimelineChip } from '../components/OfferLifecycle'
import { ModuleChip } from '../components/ui/Chip'
import { bogoOnlyWithCoupon, bogoStatus, scopeLabel } from '../lib/derive'
import { useStore } from '../store/store'

/** S6. BOGO module page. Status is the everyday status; the timeline chip shows campaign control. */
export function BogoPage() {
  const { state } = useStore()
  const nav = useNavigate()
  const [drawer, setDrawer] = useState<{ open: boolean; ruleId: string | null; version: string | null }>({ open: false, ruleId: null, version: null })
  const bogo = state.modules.find((m) => m.id === 'bogo')!

  return (
    <div className="flex flex-col gap-5">
      <div className="text-xs text-gray-500">
        <Link to="/modules" className="hover:underline">
          Modules
        </Link>{' '}
        / BOGO
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">BOGO</h1>
          <p className="text-sm text-gray-600">Buy X get Y deals. This module owns the deal math.</p>
        </div>
        <button type="button" className="btn btn-blue" onClick={() => setDrawer({ open: true, ruleId: null, version: null })}>
          New rule
        </button>
      </div>

      {!bogo.active && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">The BOGO module is off. Rules stay saved but do not apply in the store.</div>}

      {state.bogoRules.map((r) => (
        <ControllingBanner key={r.id} k={{ moduleId: 'bogo', offerId: r.id }} offer={r} onEditVersion={(cid) => setDrawer({ open: true, ruleId: r.id, version: cid })} />
      ))}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="text-sm">Need a code, a link or usage limits on a BOGO deal? Create it as a Smart Coupon.</div>
        <button type="button" className="btn btn-orange btn-sm" onClick={() => nav('/modules/smart-coupons/new?type=buyXGetY')}>
          Create Smart Coupon
        </button>
      </div>

      <section className="card">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>Buy</th>
              <th>Get</th>
              <th>Status</th>
              <th>Chips</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.bogoRules.map((r) => {
              const coupon = r.usedByCouponId ? state.coupons.find((c) => c.id === r.usedByCouponId) : null
              const onlyWith = bogoOnlyWithCoupon(state, r)
              const status = bogoStatus(state, r)
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td>{r.level === 'storeWide' ? 'Store-wide' : 'Product'}</td>
                  <td>
                    {r.buyQty} × {scopeLabel(state, r.buyScope)}
                  </td>
                  <td>
                    {r.getQty} × {scopeLabel(state, r.getScope)} {r.getDiscount === 'free' ? 'free' : `at ${r.getPercent}% off`}
                  </td>
                  <td>
                    {r.origin === 'campaignOnly' ? (
                      <span className="text-xs text-gray-500">From campaign</span>
                    ) : (
                      <span className="chip" style={status === 'active' ? { background: '#d1fae5', color: '#065f46' } : status === 'paused' ? { background: '#fef3c7', color: '#92400e' } : { background: '#f3f4f6', color: '#374151' }}>
                        {status === 'active' ? 'Active' : status === 'paused' ? 'Paused' : 'Off'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {coupon && !onlyWith && <ModuleChip name={`Used by coupon: ${coupon.title}`} />}
                      {onlyWith && <ModuleChip name={`Only with coupon: ${onlyWith.title}`} />}
                      {status === 'paused' && <span className="chip chip-warn">Paused: needs Smart Coupons</span>}
                      {r.owner === 'vendor' && <ModuleChip name={`Vendor: ${r.vendorName}`} />}
                      <TimelineChip k={{ moduleId: 'bogo', offerId: r.id }} />
                      <CampaignOnlyChip offer={r} />
                    </span>
                  </td>
                  <td className="text-right">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDrawer({ open: true, ruleId: r.id, version: null })}>
                      {r.owner === 'vendor' ? 'View' : 'Edit'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <BogoRuleDrawer open={drawer.open} ruleId={drawer.ruleId} versionCampaignId={drawer.version} onClose={() => setDrawer({ open: false, ruleId: null, version: null })} />
    </div>
  )
}
