import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ControllingBanner, FreeLimitChip, FreeLimitNotice, TimelineChip } from '../components/OfferLifecycle'
import { CouponStatusChip, ModuleChip } from '../components/ui/Chip'
import { UpgradeCard } from '../components/ui/UpgradeCard'
import { campaignById, couponDetail, couponStatus, fmtMoney, freeLimitPaused, lockReason, windowCampaigns } from '../lib/derive'
import { useStore } from '../store/store'
import type { SmartCoupon } from '../types'

const TYPE_LABEL = { percentage: 'Percentage', fixed: 'Fixed amount', tiers: 'Buy more save more', buyXGetY: 'Buy X get Y' }
const METHOD_LABEL = { automatic: 'Automatic', code: 'Discount code', link: 'Link' }

/** S4. Smart Coupons list. Status is the everyday status; the timeline chip and banner show campaign control. */
export function SmartCouponsList() {
  const { state } = useStore()
  const nav = useNavigate()
  const proLocked = lockReason(state, { pro: true }) === 'pro'
  const expired = state.licence === 'proExpired'
  const [showUpgrade, setShowUpgrade] = useState(false)
  const paused = freeLimitPaused(state, 'smart-coupons')
  const activeEveryday = state.coupons.filter((c) => c.origin === 'everyday' && couponStatus(state, c) === 'active').length

  const onNew = () => {
    if (proLocked && activeEveryday >= 1) setShowUpgrade(true)
    else nav('/modules/smart-coupons/new')
  }

  const usedIn = (c: SmartCoupon) => {
    if (c.origin === 'campaignOnly') {
      const cmp = campaignById(state, c.campaignOnlyOf)
      return (
        <span>
          Campaign-only:{' '}
          {cmp ? (
            <Link to={`/campaigns/${cmp.id}`} className="text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>
              {cmp.name}
            </Link>
          ) : (
            'deleted campaign'
          )}
        </span>
      )
    }
    const cmps = windowCampaigns(state, { moduleId: 'smart-coupons', offerId: c.id })
    if (cmps.length === 0) return <span className="text-gray-500">Everyday</span>
    return (
      <span>
        Everyday +{' '}
        <Link to={`/campaigns/${cmps[0].id}`} className="text-blue-700 hover:underline" onClick={(e) => e.stopPropagation()}>
          {cmps[0].name}
        </Link>
        {cmps.length > 1 && ` +${cmps.length - 1} more`}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-xs text-gray-500">
        <Link to="/modules" className="hover:underline">
          Modules
        </Link>{' '}
        / Smart Coupons
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Smart Coupons</h1>
          <p className="text-sm text-gray-600">Code and link coupons also appear in WooCommerce &gt; Coupons, marked Managed by Smart Coupons.</p>
          {proLocked && <p className="text-xs text-gray-500">Free includes one active everyday coupon.</p>}
        </div>
        <button type="button" className="btn btn-orange" onClick={onNew}>
          New coupon
        </button>
      </div>

      <FreeLimitNotice module="smart-coupons" />
      {state.coupons.map((c) => (
        <ControllingBanner key={c.id} k={{ moduleId: 'smart-coupons', offerId: c.id }} offer={c} onEditVersion={(cid) => nav(`/modules/smart-coupons/${c.id}?version=${cid}`)} />
      ))}

      <section className="card">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Method</th>
              <th>Status</th>
              <th>Used in</th>
              <th className="text-right">Uses</th>
              <th className="text-right">Discount given</th>
            </tr>
          </thead>
          <tbody>
            {state.coupons.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-gray-50" tabIndex={0} onClick={() => nav(`/modules/smart-coupons/${c.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/modules/smart-coupons/${c.id}`)}>
                <td className="font-medium">
                  {c.title}
                  <div className="text-xs font-normal text-gray-500">{couponDetail(c, state)}</div>
                  <div className="mt-0.5 font-normal">
                    <TimelineChip k={{ moduleId: 'smart-coupons', offerId: c.id }} />
                  </div>
                </td>
                <td>
                  <span className="flex items-center gap-1.5">
                    {TYPE_LABEL[c.type]}
                    {c.type === 'buyXGetY' && <ModuleChip name="BOGO module" />}
                  </span>
                </td>
                <td>
                  {METHOD_LABEL[c.method]}
                  {c.method === 'code' && <span className="ml-1 rounded bg-gray-100 px-1 font-mono text-xs">{c.code}</span>}
                </td>
                <td>
                  <span className="flex flex-wrap items-center gap-1">
                    <CouponStatusChip status={couponStatus(state, c)} />
                    {paused.has(c.id) && <FreeLimitChip />}
                  </span>
                </td>
                <td>{usedIn(c)}</td>
                <td className="text-right">{c.uses}</td>
                <td className="text-right">{fmtMoney(c.discountGiven)}</td>
              </tr>
            ))}
            {showUpgrade && proLocked && (
              <tr>
                <td colSpan={7} className="py-3">
                  <UpgradeCard name={expired ? 'Renew licence to add more coupons' : 'Upgrade to add more coupons'} sentence="Free includes one active Smart Coupon. Pro removes the limit." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
