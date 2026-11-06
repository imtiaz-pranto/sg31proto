import { Lock, ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { campaignById, couponDetail, couponStatus, fmtMoney, fmtRange, lockReason, refIn, withOverride } from '../lib/derive'
import { blankCouponFor, useStore } from '../store/store'
import type { CouponEditable, CouponType, SmartCoupon } from '../types'
import { VersionHeader } from './ui/VersionHeader'
import { BogoRuleDrawer } from './BogoRuleDrawer'
import { CouponStatusChip, ModuleChip, ProChip } from './ui/Chip'
import { Card, Field } from './ui/Field'
import { UpgradeCard } from './ui/UpgradeCard'

interface Props {
  couponId?: string | null
  /** Edit the campaign version of an attached coupon. */
  versionCampaignId?: string | null
  /** Create a campaign-only coupon inside this campaign. */
  campaignOnlyOf?: string | null
  startCustomising?: boolean
  initial?: Partial<SmartCoupon>
  focusRulePicker?: boolean
  onDone: (saved: boolean, coupon?: SmartCoupon) => void
  inDrawer?: boolean
}

/** S5. One card per section, right rail with summary and shopper preview. */
export function SmartCouponForm({ couponId, versionCampaignId = null, campaignOnlyOf = null, startCustomising = false, initial, focusRulePicker, onDone, inDrawer }: Props) {
  const { state, actions } = useStore()
  const existing = couponId ? state.coupons.find((c) => c.id === couponId) : null
  const vc = campaignById(state, versionCampaignId)
  const ref = vc && existing ? refIn(vc, { moduleId: 'smart-coupons', offerId: existing.id }) : undefined
  const [c, setC] = useState<SmartCoupon>(() => (existing ? { ...withOverride(existing, ref) } : { ...blankCouponFor(campaignOnlyOf, state.now), ...initial }))
  const [customising, setCustomising] = useState(startCustomising)
  const asIs = !!vc && !!existing && (ref?.override ?? null) === null && !customising
  /** In a campaign version, method and code are read-only. A different code needs a campaign-only coupon. */
  const methodLocked = !!versionCampaignId
  const [proNudge, setProNudge] = useState<string | null>(null)
  const [ruleDrawer, setRuleDrawer] = useState<{ open: boolean; ruleId: string | null }>({ open: false, ruleId: null })
  const [error, setError] = useState<string | null>(null)
  const rulePickerRef = useRef<HTMLSelectElement>(null)
  const isFree = lockReason(state, { pro: true }) === 'pro'
  const bogoOn = lockReason(state, { moduleId: 'bogo' }) === null
  const onlyWithCoupon = c.type === 'buyXGetY' && c.method !== 'automatic'
  const set = (patch: Partial<SmartCoupon>) => setC((x) => ({ ...x, ...patch }))

  // Re-sync when the underlying coupon changes elsewhere (e.g. removed from a campaign).
  useEffect(() => {
    if (existing) setC((prev) => ({ ...prev, origin: existing.origin, campaignOnlyOf: existing.campaignOnlyOf, dates: existing.dates }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.origin, existing?.campaignOnlyOf])

  useEffect(() => {
    if (focusRulePicker && bogoOn) rulePickerRef.current?.focus()
  }, [focusRulePicker, bogoOn])

  const campaign = campaignById(state, versionCampaignId ?? c.campaignOnlyOf)
  const rule = c.bogoRuleId ? state.bogoRules.find((r) => r.id === c.bogoRuleId) : null
  const status = couponStatus(state, existing ?? c)

  const typeCards: { id: CouponType; label: string; pro?: boolean }[] = [
    { id: 'percentage', label: 'Percentage' },
    { id: 'fixed', label: 'Fixed amount' },
    { id: 'tiers', label: 'Buy more save more', pro: true },
    { id: 'buyXGetY', label: 'Buy X get Y' },
  ]

  const summary = useMemo(() => buildSummary(c, state), [c, state])

  const save = () => {
    if (!c.title.trim()) {
      setError('Give the coupon a title.')
      return
    }
    if (c.type === 'buyXGetY' && !c.bogoRuleId) {
      setError('Choose a BOGO rule for the Buy X get Y deal.')
      return
    }
    if (versionCampaignId && existing) {
      // Only what the campaign changes. Method and code never change in a campaign version.
      const keys: (keyof CouponEditable)[] = ['title', 'type', 'value', 'tiers', 'bogoRuleId', 'appliesTo', 'minimum', 'eligibility', 'usesPerCustomer', 'totalUses', 'excludeOnSale', 'combinable']
      const override: Record<string, unknown> = {}
      for (const k of keys) if (JSON.stringify(c[k]) !== JSON.stringify(existing[k])) override[k] = c[k]
      actions.saveCampaignVersion(versionCampaignId, { moduleId: 'smart-coupons', offerId: existing.id }, Object.keys(override).length ? override : null)
    } else {
      actions.saveCoupon(c)
    }
    onDone(true, c)
  }

  if (asIs) {
    return (
      <div className="flex flex-col gap-3">
        <VersionHeader versionCampaignId={versionCampaignId} campaignOnlyOf={null} />
        <div className="text-sm text-gray-600">{campaign?.name} uses this coupon as is. The everyday version applies during the campaign window, with the campaign's dates.</div>
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <div className="font-medium">{c.title}</div>
          <div className="text-xs text-gray-500">{couponDetail(c, state)}</div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => onDone(false)}>
            Close
          </button>
          <button type="button" className="btn btn-orange" onClick={() => setCustomising(true)}>
            Customise for this campaign
          </button>
        </div>
      </div>
    )
  }

  const previewProduct = pickPreviewProduct(c, state)

  return (
    <div className={`grid gap-4 ${inDrawer ? 'grid-cols-1 xl:grid-cols-[1fr_300px]' : 'grid-cols-1 lg:grid-cols-[1fr_320px]'}`}>
      <div className="flex flex-col gap-4">
        <VersionHeader versionCampaignId={versionCampaignId} campaignOnlyOf={versionCampaignId ? null : c.campaignOnlyOf} />
        {/* 1. Method */}
        <Card title="Method">
          <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: '#e5e7eb' }} role="radiogroup" aria-label="Method">
            {(['automatic', 'code', 'link'] as const).map((m) => {
              const locked = m === 'link' && isFree
              const active = c.method === m
              if (methodLocked && !active) return null
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={methodLocked}
                  onClick={() => (locked ? setProNudge('Link method') : set({ method: m }))}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${active ? 'bg-gray-900 text-white' : locked ? 'text-gray-500' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {locked && <Lock size={12} />}
                  {m === 'automatic' ? 'Automatic' : m === 'code' ? 'Discount code' : 'Link'}
                  {locked && <ProChip />}
                </button>
              )
            })}
          </div>
          {c.method === 'code' && (
            <div className="mt-3 max-w-xs">
              <Field label="Discount code" htmlFor="coupon-code">
                <input id="coupon-code" className="input uppercase" value={c.code} readOnly={methodLocked} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="SAVE20" />
              </Field>
            </div>
          )}
          {c.method === 'link' && <div className="mt-3 text-xs text-gray-500">Shoppers who open the coupon link get the discount applied automatically.</div>}
          {methodLocked && <div className="mt-2 text-xs text-gray-500">Method and code are read-only in a campaign version. A different code needs a campaign-only coupon.</div>}
          {proNudge === 'Link method' && (
            <div className="mt-3">
              <UpgradeCard name="Link method" sentence="Apply a coupon from a URL you share in ads, email or Texty." compact />
            </div>
          )}
        </Card>

        {/* 2. Title */}
        <Card title="Title">
          <Field label="Title" htmlFor="coupon-title" help="Shoppers see this in their cart and at checkout.">
            <input id="coupon-title" className="input" value={c.title} onChange={(e) => set({ title: e.target.value })} placeholder="30% off Outerwear" />
          </Field>
        </Card>

        {/* 3. Discount value */}
        <Card title="Discount value">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="radiogroup" aria-label="Discount type">
            {typeCards.map((t) => {
              const proLocked = !!t.pro && isFree
              const bogoLocked = t.id === 'buyXGetY' && !bogoOn
              const locked = proLocked || bogoLocked
              const active = c.type === t.id
              return (
                <div
                  key={t.id}
                  role="radio"
                  aria-checked={active}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (proLocked) setProNudge(t.label)
                      else if (!bogoLocked) set({ type: t.id })
                    }
                  }}
                  onClick={() => {
                    if (proLocked) setProNudge(t.label)
                    else if (!bogoLocked) set({ type: t.id })
                  }}
                  className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left text-sm ${active ? 'border-orange-700 ring-1 ring-orange-700' : ''} ${locked ? 'locked bg-gray-50' : 'hover:bg-gray-50'}`}
                  style={{ borderColor: active ? '#c2410c' : '#e5e7eb' }}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {locked && <Lock size={13} className="text-gray-500" />}
                    {t.label}
                    {proLocked && <ProChip />}
                  </div>
                  {t.id === 'buyXGetY' && (
                    <>
                      <span className="chip chip-module w-fit">{bogoOn ? 'uses the BOGO module' : 'BOGO module is off'}</span>
                      {bogoLocked && (
                        <button
                          type="button"
                          className="btn btn-grey btn-sm mt-1 w-fit"
                          onClick={(e) => {
                            e.stopPropagation()
                            actions.setModuleActive('bogo', true)
                          }}
                        >
                          Enable BOGO
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
          {proNudge && proNudge !== 'Link method' && (
            <div className="mt-3">
              <UpgradeCard name={proNudge} sentence="Quantity tiers that raise the discount as shoppers add more." compact />
            </div>
          )}

          {(c.type === 'percentage' || c.type === 'fixed') && (
            <div className="mt-3 max-w-xs">
              <Field label={c.type === 'percentage' ? 'Percent off' : 'Amount off'} htmlFor="coupon-value">
                <div className="flex items-center gap-2">
                  {c.type === 'fixed' && <span className="text-sm text-gray-500">$</span>}
                  <input id="coupon-value" type="number" min={0} className="input" value={c.value} onChange={(e) => set({ value: Number(e.target.value) })} />
                  {c.type === 'percentage' && <span className="text-sm text-gray-500">%</span>}
                </div>
                {c.type === 'fixed' && <div className="text-xs text-gray-500">Taken off the cart, split across eligible products by price.</div>}
              </Field>
            </div>
          )}

          {c.type === 'tiers' && (
            <div className="mt-3">
              <table className="w-full max-w-md text-sm">
                <thead>
                  <tr>
                    <th>Quantity</th>
                    <th>Percent off</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {c.tiers.map((t, i) => (
                    <tr key={i}>
                      <td>
                        <input type="number" min={1} className="input w-24" value={t.qty} aria-label={`Tier ${i + 1} quantity`} onChange={(e) => set({ tiers: c.tiers.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)) })} />
                      </td>
                      <td>
                        <input type="number" min={1} max={100} className="input w-24" value={t.percent} aria-label={`Tier ${i + 1} percent`} onChange={(e) => set({ tiers: c.tiers.map((x, j) => (j === i ? { ...x, percent: Number(e.target.value) } : x)) })} />
                      </td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ tiers: c.tiers.filter((_, j) => j !== i) })}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => set({ tiers: [...c.tiers, { qty: (c.tiers[c.tiers.length - 1]?.qty ?? 2) + 2, percent: (c.tiers[c.tiers.length - 1]?.percent ?? 10) + 5 }] })}>
                Add row
              </button>
            </div>
          )}

          {c.type === 'buyXGetY' && bogoOn && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="max-w-xs flex-1">
                  <Field label="BOGO rule" htmlFor="coupon-rule">
                    <select
                      id="coupon-rule"
                      ref={rulePickerRef}
                      className="input"
                      value={c.bogoRuleId ?? ''}
                      onChange={(e) => set({ bogoRuleId: e.target.value || null })}
                    >
                      <option value="">Choose a BOGO rule</option>
                      {state.bogoRules.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setRuleDrawer({ open: true, ruleId: null })}>
                  Create one
                </button>
              </div>
              {rule && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <ModuleChip name="BOGO" />
                  <span>Deal defined by BOGO rule: {rule.name}</span>
                  <button type="button" className="font-medium text-blue-700 underline" onClick={() => setRuleDrawer({ open: true, ruleId: rule.id })}>
                    Edit deal
                  </button>
                </div>
              )}
              {rule && onlyWithCoupon && <div className="text-xs text-gray-600">This BOGO rule will only apply when shoppers use this coupon.</div>}
            </div>
          )}
        </Card>

        {/* 4. Applies to */}
        <Card title="Applies to">
          <div className="max-w-xs">
            <Field label="Products" htmlFor="coupon-applies">
              <select id="coupon-applies" className="input" value={c.appliesTo.kind} onChange={(e) => set({ appliesTo: { ...c.appliesTo, kind: e.target.value as SmartCoupon['appliesTo']['kind'] } })}>
                <option value="categories">Specific categories</option>
                <option value="products">Specific products</option>
                <option value="store">Entire store</option>
              </select>
            </Field>
          </div>
          {c.appliesTo.kind === 'categories' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {state.categories.map((cat) => {
                const on = c.appliesTo.categories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ appliesTo: { ...c.appliesTo, categories: on ? c.appliesTo.categories.filter((x) => x !== cat) : [...c.appliesTo.categories, cat] } })}
                    className={`chip border ${on ? 'border-orange-700 bg-orange-50 text-orange-900' : 'border-gray-200 bg-white text-gray-700'}`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          )}
          {c.appliesTo.kind === 'products' && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {state.products.map((p) => {
                const on = c.appliesTo.products.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ appliesTo: { ...c.appliesTo, products: on ? c.appliesTo.products.filter((x) => x !== p.id) : [...c.appliesTo.products, p.id] } })}
                    className={`chip border ${on ? 'border-orange-700 bg-orange-50 text-orange-900' : 'border-gray-200 bg-white text-gray-700'}`}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* 5. Minimum purchase */}
        <Card title="Minimum purchase">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Minimum purchase</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="minimum" checked={c.minimum.kind === 'none'} onChange={() => set({ minimum: { ...c.minimum, kind: 'none' } })} />
              No minimum
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="minimum" checked={c.minimum.kind === 'subtotal'} onChange={() => set({ minimum: { ...c.minimum, kind: 'subtotal' } })} />
              Cart subtotal of at least
              <span className="text-gray-500">$</span>
              <input type="number" min={0} className="input w-24" value={c.minimum.value} aria-label="Minimum subtotal" disabled={c.minimum.kind !== 'subtotal'} onChange={(e) => set({ minimum: { ...c.minimum, value: Number(e.target.value) } })} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="minimum" checked={c.minimum.kind === 'quantity'} onChange={() => set({ minimum: { ...c.minimum, kind: 'quantity' } })} />
              Minimum quantity
              <input type="number" min={1} className="input w-24" value={c.minimum.kind === 'quantity' ? c.minimum.value : 2} aria-label="Minimum quantity" disabled={c.minimum.kind !== 'quantity'} onChange={(e) => set({ minimum: { ...c.minimum, value: Number(e.target.value) } })} />
            </label>
          </fieldset>
        </Card>

        {/* 6. Eligibility */}
        <Card title="Eligibility">
          <div className="max-w-xs">
            <Field label="Customers" htmlFor="coupon-eligibility">
              <select
                id="coupon-eligibility"
                className="input"
                value={c.eligibility}
                onChange={(e) => {
                  const v = e.target.value as SmartCoupon['eligibility']
                  if (v !== 'all' && isFree) setProNudge('Customer eligibility')
                  else set({ eligibility: v })
                }}
              >
                <option value="all">All customers</option>
                <option value="firstTime">First-time customers{isFree ? ' (Pro)' : ''}</option>
                <option value="returning">Returning customers{isFree ? ' (Pro)' : ''}</option>
                <option value="roles">Specific roles{isFree ? ' (Pro)' : ''}</option>
              </select>
            </Field>
          </div>
          {proNudge === 'Customer eligibility' && (
            <div className="mt-3">
              <UpgradeCard name="Customer eligibility" sentence="Limit a coupon to first-time or returning customers, or to roles." compact />
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={c.usesPerCustomer} onChange={(e) => set({ usesPerCustomer: e.target.checked })} />
              One use per customer
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={c.excludeOnSale} onChange={(e) => set({ excludeOnSale: e.target.checked })} />
              Skip products already on sale
              <span className="text-xs text-gray-500">Countdown prices count as on sale.</span>
            </label>
          </div>
        </Card>

        {/* 7. Combinations */}
        <Card title="Combinations">
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={c.combinable.withStoreGrowthDeals} onChange={(e) => set({ combinable: { ...c.combinable, withStoreGrowthDeals: e.target.checked } })} />
              <span>
                Can combine with other StoreGrowth deals
                <span className="block text-xs text-gray-500">Other Smart Coupons and BOGO deals. Countdown prices always combine.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={c.combinable.withOtherCoupons} onChange={(e) => set({ combinable: { ...c.combinable, withOtherCoupons: e.target.checked } })} />
              <span>
                Allow with other coupons
                <span className="block text-xs text-gray-500">Coupons from outside StoreGrowth.</span>
              </span>
            </label>
          </div>
          <div className="mt-2 text-xs text-gray-500">When deals can't combine, the shopper gets the larger one.</div>
        </Card>

        {/* 8. Active dates */}
        <Card title="Active dates">
          {campaign ? (
            <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm" style={{ background: '#dbeafe', color: '#1e3a8a' }}>
              <div className="flex items-center gap-2">
                <Lock size={14} />
                <span>
                  Set by campaign: {campaign.name}, {fmtRange(campaign.start, campaign.end)} ({state.settings.siteTimezone})
                </span>
              </div>
              <Link to={`/campaigns/${campaign.id}`} className="flex items-center gap-1 font-medium underline" onClick={() => onDone(false)}>
                Open campaign <ExternalLink size={12} />
              </Link>
            </div>
          ) : (
            <div className="grid max-w-md grid-cols-2 gap-3">
              <Field label="Start" htmlFor="coupon-start">
                <input id="coupon-start" type="datetime-local" className="input" value={c.dates.start ?? ''} onChange={(e) => set({ dates: { ...c.dates, start: e.target.value || null } })} />
              </Field>
              <Field label="End" htmlFor="coupon-end">
                <input id="coupon-end" type="datetime-local" className="input" value={c.dates.end ?? ''} onChange={(e) => set({ dates: { ...c.dates, end: e.target.value || null } })} />
              </Field>
              <div className="col-span-2 text-xs text-gray-500">Timezone: {state.settings.siteTimezone}</div>
              {!c.dates.start && !c.dates.end && <div className="col-span-2 text-xs text-gray-500">The coupon stays Inactive until dates are set.</div>}
            </div>
          )}
        </Card>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex items-center justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => onDone(false)}>
            Discard
          </button>
          <button type="button" className="btn btn-orange" onClick={save}>
            Save{versionCampaignId ? ' campaign version' : ''}
          </button>
        </div>
      </div>

      {/* Rail */}
      <div className="flex flex-col gap-4">
        <Card title="Summary" right={<CouponStatusChip status={status} />}>
          <ul className="list-disc pl-4 text-sm text-gray-700">
            {summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card title="Shoppers will see">
          <ShopperPreview coupon={c} productName={previewProduct.name} price={previewProduct.price} />
        </Card>
      </div>

      <BogoRuleDrawer
        open={ruleDrawer.open}
        ruleId={ruleDrawer.ruleId}
        onClose={(saved) => {
          setRuleDrawer({ open: false, ruleId: null })
          if (saved) set({ bogoRuleId: saved.id })
        }}
      />
    </div>
  )
}

function pickPreviewProduct(c: SmartCoupon, state: ReturnType<typeof useStore>['state']) {
  if (c.appliesTo.kind === 'products' && c.appliesTo.products[0]) {
    return state.products.find((p) => p.id === c.appliesTo.products[0]) ?? state.products[0]
  }
  if (c.appliesTo.kind === 'categories' && c.appliesTo.categories[0]) {
    return state.products.find((p) => p.category === c.appliesTo.categories[0]) ?? state.products[0]
  }
  return state.products[0]
}

function buildSummary(c: SmartCoupon, state: ReturnType<typeof useStore>['state']): string[] {
  const out: string[] = []
  out.push(c.method === 'automatic' ? 'Applies automatically' : c.method === 'code' ? `Code ${c.code || '(not set)'}` : 'Applies from a link')
  out.push(couponDetail(c, state))
  if (c.appliesTo.kind === 'store') out.push('Entire store')
  else if (c.appliesTo.kind === 'categories') out.push(c.appliesTo.categories.length ? `Categories: ${c.appliesTo.categories.join(', ')}` : 'No categories chosen yet')
  else out.push(c.appliesTo.products.length ? `Products: ${c.appliesTo.products.map((id) => state.products.find((p) => p.id === id)?.name).join(', ')}` : 'No products chosen yet')
  if (c.minimum.kind === 'subtotal') out.push(`Minimum subtotal ${fmtMoney(c.minimum.value)}`)
  if (c.minimum.kind === 'quantity') out.push(`Minimum quantity ${c.minimum.value}`)
  if (c.eligibility !== 'all') out.push({ firstTime: 'First-time customers only', returning: 'Returning customers only', roles: 'Specific roles only' }[c.eligibility])
  if (c.usesPerCustomer) out.push('One use per customer')
  if (c.excludeOnSale) out.push('Skips products already on sale')
  if (c.combinable.withStoreGrowthDeals) out.push('Can combine with other StoreGrowth deals')
  if (c.combinable.withOtherCoupons) out.push('Allowed with other coupons')
  if (c.type === 'buyXGetY' && c.method !== 'automatic' && c.bogoRuleId) out.push('The BOGO rule only applies with this coupon')
  if (c.campaignOnlyOf) {
    const cmp = state.campaigns.find((x) => x.id === c.campaignOnlyOf)
    if (cmp) out.push(`Campaign-only, dates set by ${cmp.name}`)
  } else if (c.dates.start || c.dates.end) out.push(fmtRange(c.dates.start, c.dates.end))
  else out.push('No dates set')
  return out
}

function ShopperPreview({ coupon, productName, price }: { coupon: SmartCoupon; productName: string; price: number }) {
  const title = coupon.title || 'Your coupon'
  let discounted = price
  let badge = ''
  if (coupon.type === 'percentage') {
    discounted = price * (1 - coupon.value / 100)
    badge = `${coupon.value}% off`
  } else if (coupon.type === 'fixed') {
    discounted = Math.max(0, price - coupon.value)
    badge = `${fmtMoney(coupon.value)} off`
  } else if (coupon.type === 'tiers') {
    badge = `Buy ${coupon.tiers[0]?.qty ?? 3}, save ${coupon.tiers[0]?.percent ?? 15}%`
  } else {
    badge = 'Buy X get Y'
  }
  const qty = coupon.type === 'tiers' ? coupon.tiers[0]?.qty ?? 3 : 1
  const lineTotal = coupon.type === 'tiers' ? price * qty * (1 - (coupon.tiers[0]?.percent ?? 0) / 100) : discounted
  const lineDiscount = price * qty - lineTotal
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Product page</div>
        <div className="font-medium">{productName}</div>
        <div className="flex items-center gap-2">
          {coupon.type !== 'buyXGetY' && coupon.type !== 'tiers' ? (
            <>
              <span className="text-gray-400 line-through">{fmtMoney(price)}</span>
              <span className="font-semibold">{fmtMoney(Math.round(discounted * 100) / 100)}</span>
            </>
          ) : (
            <span className="font-semibold">{fmtMoney(price)}</span>
          )}
          <span className="chip" style={{ background: '#c2410c', color: '#fff' }}>
            {badge}
          </span>
        </div>
      </div>
      <div className="rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
        <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Cart</div>
        <div className="flex justify-between">
          <span>
            {productName} × {qty}
          </span>
          <span>{fmtMoney(price * qty)}</span>
        </div>
        {lineDiscount > 0 && (
          <div className="flex justify-between text-green-700">
            <span>{title}</span>
            <span>-{fmtMoney(Math.round(lineDiscount * 100) / 100)}</span>
          </div>
        )}
        {coupon.type === 'buyXGetY' && (
          <div className="flex justify-between text-green-700">
            <span>{title}</span>
            <span>Free item added</span>
          </div>
        )}
      </div>
      {coupon.minimum.kind === 'subtotal' && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Add {fmtMoney(20)} more to unlock {coupon.type === 'percentage' ? `${coupon.value}% off` : title}
          <span className="ml-1 text-amber-700/70">(sample nudge, shown when the cart is under {fmtMoney(coupon.minimum.value)})</span>
        </div>
      )}
    </div>
  )
}
