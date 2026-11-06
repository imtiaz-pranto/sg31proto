import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BumpDrawer } from '../components/OfferDrawers'
import { CampaignOnlyChip, ControllingBanner, FreeLimitChip, FreeLimitNotice, TimelineChip } from '../components/OfferLifecycle'
import { UpgradeCard } from '../components/ui/UpgradeCard'
import { freeLimitPaused, lockReason, scopeLabel } from '../lib/derive'
import { useStore } from '../store/store'

/** S6b. Upsell Order Bump module page. Free allows two active everyday bumps; a third shows S9 inline. */
export function OrderBumpPage() {
  const { state, actions } = useStore()
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null; version: string | null }>({ open: false, id: null, version: null })
  const [showUpgrade, setShowUpgrade] = useState(false)
  const proLocked = lockReason(state, { pro: true }) === 'pro'
  const module = state.modules.find((m) => m.id === 'order-bump')!
  const everydayCount = state.orderBumps.filter((b) => b.origin === 'everyday' && b.status === 'active').length
  const paused = freeLimitPaused(state, 'order-bump')

  const onNew = () => {
    if (proLocked && everydayCount >= 2) setShowUpgrade(true)
    else setDrawer({ open: true, id: null, version: null })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-xs text-gray-500">
        <Link to="/modules" className="hover:underline">
          Modules
        </Link>{' '}
        / Upsell Order Bump
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Upsell Order Bump</h1>
          <p className="text-sm text-gray-600">A one-click add-on at checkout. The bump discount applies only to the bump line.</p>
          {proLocked && <p className="text-xs text-gray-500">Free includes two active everyday bumps.</p>}
        </div>
        <button type="button" className="btn btn-blue" onClick={onNew}>
          New bump
        </button>
      </div>

      {!module.active && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">The Upsell Order Bump module is off. Bumps stay saved but do not show at checkout.</div>}
      <FreeLimitNotice module="order-bump" />
      {state.orderBumps.map((b) => (
        <ControllingBanner key={b.id} k={{ moduleId: 'order-bump', offerId: b.id }} offer={b} onEditVersion={(cid) => setDrawer({ open: true, id: b.id, version: cid })} />
      ))}

      <section className="card">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Targets</th>
              <th>Offer product</th>
              <th>Discount</th>
              <th>Status</th>
              <th>Chips</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.orderBumps.map((b) => {
              const offer = state.products.find((p) => p.id === b.offerProductId)
              return (
                <tr key={b.id}>
                  <td className="font-medium">{b.name}</td>
                  <td>{[...b.targets.categories, ...b.targets.products.map((id) => scopeLabel(state, id))].join(', ') || 'Any product'}</td>
                  <td>{offer?.name}</td>
                  <td>{b.discountPercent}% off</td>
                  <td>
                    {b.origin === 'campaignOnly' ? (
                      <span className="text-xs text-gray-500">From campaign</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="chip" style={b.status === 'active' ? { background: '#d1fae5', color: '#065f46' } : { background: '#f3f4f6', color: '#374151' }}>
                          {b.status === 'active' ? 'Active' : 'Off'}
                        </span>
                        {paused.has(b.id) && <FreeLimitChip />}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      <TimelineChip k={{ moduleId: 'order-bump', offerId: b.id }} />
                      <CampaignOnlyChip offer={b} />
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="flex justify-end gap-1">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDrawer({ open: true, id: b.id, version: null })}>
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.removeBump(b.id)}>
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              )
            })}
            {showUpgrade && proLocked && (
              <tr>
                <td colSpan={7} className="py-3">
                  <UpgradeCard name="More order bumps" sentence="Free includes two active everyday bumps. Pro removes the limit." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <BumpDrawer open={drawer.open} bumpId={drawer.id} versionCampaignId={drawer.version} onClose={() => setDrawer({ open: false, id: null, version: null })} />
    </div>
  )
}
