import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { SmartCouponForm } from '../components/SmartCouponForm'
import { useStore } from '../store/store'
import type { SmartCoupon } from '../types'

/** S5 as a full page. The same form also opens inside a campaign drawer. */
export function SmartCouponFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { state, actions } = useStore()
  const existing = id ? state.coupons.find((c) => c.id === id) : null
  const preset = params.get('type') === 'buyXGetY' ? ({ type: 'buyXGetY', title: '', code: '', method: 'code' } as Partial<SmartCoupon>) : undefined
  const versionCampaignId = params.get('version')
  const versionCampaign = versionCampaignId ? state.campaigns.find((c) => c.id === versionCampaignId) : null

  if (id && !existing) {
    return <div className="text-sm text-gray-600">That coupon no longer exists.</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-gray-500">
        <Link to="/modules" className="hover:underline">
          Modules
        </Link>{' '}
        /{' '}
        <Link to="/modules/smart-coupons" className="hover:underline">
          Smart Coupons
        </Link>{' '}
        / {existing ? existing.title : 'New coupon'}
      </div>
      <h1 className="text-xl font-semibold">
        {existing ? existing.title : 'New coupon'}
        {versionCampaign && <span className="ml-2 text-sm font-normal text-gray-500">{versionCampaign.name} version</span>}
      </h1>
      <SmartCouponForm
        key={`${id ?? 'new'}-${versionCampaignId ?? ''}`}
        couponId={id ?? null}
        versionCampaignId={versionCampaignId}
        initial={preset}
        focusRulePicker={!!preset}
        onDone={(saved, c) => {
          if (saved && c) actions.toast(`Saved ${c.title}.`)
          nav('/modules/smart-coupons')
        }}
      />
    </div>
  )
}
