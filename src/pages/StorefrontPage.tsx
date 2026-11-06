import { ArrowLeft, Clock, ShoppingBag, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TimePill } from '../components/PrototypeControls'
import { basePrice, livePriceCampaigns, priceCart, round2, type PriceStep } from '../lib/arbiter'
import { campaignById, campaignOffers, campaignScope, daysBetween, effectiveCoupon, effectiveStatus, fmtMoney, isCampaignLive, isModuleOn, nowOf, scopeProductIds } from '../lib/derive'
import { useStore } from '../store/store'
import type { Campaign, ModuleId } from '../types'

/** The coupon the preview toggle forces on for the arbiter demo. */
const FORCED_COUPON_ID = 'c-outerwear'

/** S8. Product page, floating bar, fly cart with checkout step, sales pop. The cart lives in the store. */
export function StorefrontPage() {
  const { state, actions } = useStore()
  const [params, setParams] = useSearchParams()
  const campaignId = params.get('campaign') ?? state.campaigns.find((c) => isCampaignLive(state, c))?.id ?? state.campaigns[0]?.id
  const campaign = state.campaigns.find((c) => c.id === campaignId) ?? state.campaigns[0]
  const [selectedProduct, setSelectedProduct] = useState('p-jacket')
  const [popOpen, setPopOpen] = useState(true)
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const cartState = state.preview
  const forcedCoupon = state.coupons.find((c) => c.id === FORCED_COUPON_ID)

  const opts = useMemo(() => ({ forcedCouponIds: cartState.forceOuterwear && forcedCoupon ? [FORCED_COUPON_ID] : [], tickedBumpIds: cartState.tickedBumpIds, codes: cartState.codes }), [cartState.forceOuterwear, cartState.tickedBumpIds, cartState.codes, forcedCoupon])
  const cart = useMemo(() => priceCart(state, cartState.lines, opts), [state, cartState.lines, opts])

  // Cart notices (brief 3e): compare what the cart last showed with what applies now.
  const liveNow = livePriceCampaigns(state)
  const giftsNow = cart.bonusLines.filter((b) => b.campaignId).map((b) => ({ title: b.title, campaignId: b.campaignId! }))
  const liveKey = liveNow.map((c) => c.id).join(',') + '|' + giftsNow.map((g) => g.title).join(',')
  useEffect(() => {
    const seen = cartState.seen
    const current = { live: liveNow, gifts: giftsNow }
    if (!seen || cartState.lines.length === 0) {
      if (JSON.stringify(seen) !== JSON.stringify(current)) actions.cartSync(current, [])
      return
    }
    const notices: string[] = []
    for (const was of seen.live) {
      if (liveNow.some((c) => c.id === was.id)) continue
      const c = campaignById(state, was.id)
      const ended = c && state.licence === 'pro' && effectiveStatus(state, c) === 'ended'
      notices.push(ended ? `${was.name} ended. Prices updated.` : `${was.name} deal is no longer available. Prices updated.`)
    }
    for (const now of liveNow) if (!seen.live.some((c) => c.id === now.id)) notices.push(`${now.name} price applied.`)
    for (const g of seen.gifts) {
      if (giftsNow.some((x) => x.title === g.title)) continue
      if (liveNow.some((c) => c.id === g.campaignId)) continue
      notices.push(`${g.title} ended. Your free item was removed.`)
    }
    if (JSON.stringify(seen) !== JSON.stringify(current)) actions.cartSync(current, notices)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveKey, cartState.seen === null, cartState.lines.length])

  // Coupon rules 4 and 9: drop rejected codes, with their notices.
  const rejectedKey = cart.rejected.map((r) => r.code).join(',')
  useEffect(() => {
    if (cart.rejected.length) actions.rejectCodes(cart.rejected.map((r) => r.code), cart.rejected.map((r) => r.notice))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectedKey])

  const product = state.products.find((p) => p.id === selectedProduct)!
  const inScope = campaign ? scopeProductIds(state, campaignScope(state, campaign)).includes(product.id) : false
  const live = campaign ? isCampaignLive(state, campaign) : false
  const surfaceOn = (id: keyof Campaign['surfaces'], moduleId: ModuleId | null) => !!campaign && live && !!campaign.surfaces[id]?.enabled && (moduleId === null || isModuleOn(state, moduleId))
  const showBar = surfaceOn('floatingBar', 'floating-bar')
  const showCountdown = surfaceOn('countdown', 'countdown') && campaign?.end
  const showBadge = surfaceOn('badge', null) && inScope
  const showPop = surfaceOn('salesPop', 'sales-pop') && popOpen
  const showRewardsBar = isModuleOn(state, 'cart-rewards') && (state.cartRewards.placement !== 'cartPage' || !!campaign?.surfaces.cartRewardsBar?.enabled)
  const rewardsBarCopy = surfaceOn('cartRewardsBar', 'cart-rewards') ? campaign!.message : null
  const flyCartMessage = surfaceOn('flyCart', 'fly-cart') ? campaign!.message : ''

  const single = priceCart(state, [{ productId: product.id, qty: 1 }], { ...opts, tickedBumpIds: [], codes: [] }).lines[0]
  const base = basePrice(state, product)
  const badgeText = single.applied[0]?.title ?? (campaign ? campaignOffers(state, campaign)[0]?.detail : null) ?? (campaign?.campaignPrice ? `${campaign.campaignPrice.percent}% off` : campaign?.name)
  const tiersCoupon = state.coupons.find((c) => c.type === 'tiers' && single.applied.some((a) => a.id === `coupon:${c.id}`))

  const applyCode = () => {
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    const match = isModuleOn(state, 'smart-coupons') ? state.coupons.find((c) => c.method !== 'automatic' && c.code.toUpperCase() === code && effectiveCoupon(state, c).live) : null
    if (!match) {
      setCodeError(`${code} isn't a valid coupon right now.`)
      return
    }
    setCodeError(null)
    setCodeInput('')
    actions.applyCode(code)
  }

  return (
    <div className="min-h-full" style={{ background: '#fff' }}>
      <div className="flex flex-wrap items-center gap-3 border-b bg-gray-900 px-4 py-2 text-sm text-white" style={{ borderColor: '#111827' }}>
        <Link to={campaign ? `/campaigns/${campaign.id}` : '/campaigns'} className="flex items-center gap-1 text-gray-300 hover:text-white">
          <ArrowLeft size={14} /> Back to campaign
        </Link>
        <span className="text-gray-500">|</span>
        <span className="text-gray-300">Storefront preview</span>
        <label className="flex items-center gap-2">
          <span className="text-gray-400">Campaign</span>
          <select className="rounded-md bg-gray-800 px-2 py-1 text-sm text-white" value={campaign?.id} onChange={(e) => setParams({ campaign: e.target.value })}>
            {state.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({effectiveStatus(state, c)}
                {state.licence !== 'pro' && ['running', 'scheduled'].includes(effectiveStatus(state, c)) ? ', stopped: licence' : ''})
              </option>
            ))}
          </select>
        </label>
        {forcedCoupon && (
          <label className="flex items-center gap-2 rounded-md bg-gray-800 px-2 py-1">
            <input type="checkbox" checked={cartState.forceOuterwear} disabled={!isModuleOn(state, 'smart-coupons')} onChange={(e) => actions.setForceOuterwear(e.target.checked)} />
            <span>Also apply {forcedCoupon.title}</span>
          </label>
        )}
        {campaign && !live && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">This campaign is not in effect, so its surfaces are hidden.</span>}
        <span className="ml-auto">
          <TimePill />
        </span>
      </div>

      {showBar && (
        <div className="px-4 py-2 text-center text-sm font-medium text-white" style={{ background: '#1d4ed8' }}>
          {campaign!.surfaces.floatingBar?.messageOverride ?? campaign!.message}
          <span className="ml-2 text-[11px] text-blue-200">Floating Notification Bar</span>
        </div>
      )}

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border p-5" style={{ borderColor: '#e5e7eb' }}>
            <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-500">Product page</div>
            {showCountdown && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Clock size={14} /> Ends in {Math.max(0, daysBetween(nowOf(state), campaign!.end!))} days
                <span className="ml-auto text-[11px] text-amber-700/70">Countdown Timer · ends at campaign end</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[200px_1fr]">
              <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <ShoppingBag size={40} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">{product.name}</h1>
                  {showBadge && (
                    <span className="chip" style={{ background: '#c2410c', color: '#fff' }}>
                      {badgeText}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {product.category}
                  {product.vendor && ` · Sold by ${product.vendor}`}
                </div>
                <div className="mt-3 flex flex-wrap items-baseline gap-2">
                  {single.unit < product.price ? (
                    <>
                      <span className="text-lg text-gray-400 line-through">{fmtMoney(product.price)}</span>
                      <span className="text-2xl font-semibold">{fmtMoney(single.unit)}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-semibold">{fmtMoney(product.price)}</span>
                  )}
                </div>
                {single.unit < product.price && <div className="text-xs text-gray-500">{[base.label, ...single.applied.filter((a) => !a.bonus).map((a) => a.title)].filter(Boolean).join(' · ')}</div>}
                {tiersCoupon && (
                  <table className="mt-3 w-full max-w-xs text-sm">
                    <thead>
                      <tr>
                        <th>Buy</th>
                        <th>Save</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiersCoupon.tiers.map((t) => (
                        <tr key={t.qty}>
                          <td>{t.qty}+</td>
                          <td>{t.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button type="button" className="btn btn-blue mt-4" onClick={() => actions.addToCart(product.id)}>
                  Add to cart
                </button>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">Shop</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {state.products.map((p) => {
                const b = basePrice(state, p)
                return (
                  <div key={p.id} className={`flex flex-col gap-1 rounded-lg border p-3 ${p.id === product.id ? 'ring-1 ring-blue-600' : ''}`} style={{ borderColor: '#e5e7eb' }}>
                    <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => setSelectedProduct(p.id)}>
                      {p.name}
                    </button>
                    <div className="text-xs text-gray-500">
                      {b.label ? (
                        <>
                          <span className="line-through">{fmtMoney(p.price)}</span> {fmtMoney(b.unit)}
                        </>
                      ) : (
                        fmtMoney(p.price)
                      )}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm mt-1 w-fit" onClick={() => actions.addToCart(p.id)}>
                      Add to cart
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="flex h-fit flex-col rounded-xl border shadow-lg" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#e5e7eb' }}>
            <div className="text-sm font-semibold">Your cart</div>
            <span className="text-[11px] text-gray-500">Fly Cart</span>
          </div>
          {flyCartMessage && (
            <div className="border-b bg-blue-50 px-4 py-2 text-xs text-blue-900" style={{ borderColor: '#e5e7eb' }}>
              {flyCartMessage}
            </div>
          )}
          <div className="flex flex-col gap-3 px-4 py-3 text-sm">
            {cartState.notices.length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg px-3 py-2 text-xs" style={{ background: '#fef3c7', color: '#92400e' }} role="status">
                {cartState.notices.map((n, i) => (
                  <div key={i}>{n}</div>
                ))}
                <button type="button" className="w-fit font-medium underline" onClick={() => actions.dismissCartNotices()}>
                  OK
                </button>
              </div>
            )}
            {cart.lines.length === 0 && <div className="py-6 text-center text-gray-500">Cart is empty. Add products to see deals apply.</div>}
            {cart.lines.map((l) => (
              <div key={l.product.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.product.name}</span>
                  <span>{fmtMoney(l.net)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <button type="button" className="btn btn-ghost btn-sm px-2" aria-label={`Remove one ${l.product.name}`} onClick={() => actions.setQty(l.product.id, l.qty - 1)}>
                    −
                  </button>
                  <span>{l.qty}</span>
                  <button type="button" className="btn btn-ghost btn-sm px-2" aria-label={`Add one ${l.product.name}`} onClick={() => actions.setQty(l.product.id, l.qty + 1)}>
                    +
                  </button>
                  <Steps steps={l.steps} />
                </div>
                {l.applied
                  .filter((a) => !a.bonus)
                  .map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-green-700">
                      <span>
                        {a.title} <span className="chip chip-module">{a.moduleName}</span>
                      </span>
                      <span>-{fmtMoney(a.discount)}</span>
                    </div>
                  ))}
                {l.caption && (
                  <div className="text-[11px] text-gray-500">
                    {l.caption}
                    {l.losers.length > 0 && `. Not applied: ${l.losers.join(', ')}`}
                  </div>
                )}
              </div>
            ))}
            {cart.bonusLines.map((b, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded-lg bg-green-50 px-2 py-1.5">
                <div className="flex items-center justify-between text-green-800">
                  <span>
                    {b.product.name} × {b.qty}
                  </span>
                  <span>{fmtMoney(b.unit * b.qty)}</span>
                </div>
                <div className="text-[11px] text-green-700">
                  {b.percentOff === 100 ? 'Free' : `${b.percentOff}% off`} with {b.title} <span className="chip chip-module">{b.moduleName}</span>
                  {b.campaignName && ` · from ${b.campaignName}`}
                </div>
              </div>
            ))}
            {cart.gifts.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-lg bg-green-50 px-2 py-1.5 text-green-800">
                <span>
                  {g.name} × 1 <span className="chip chip-module">Cart Rewards</span>
                </span>
                <span>{fmtMoney(0)}</span>
              </div>
            ))}
            {cart.nudges.map((n) => (
              <div key={n} className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                {n}
              </div>
            ))}
            {showRewardsBar && cart.barText && (
              <div className="rounded-lg border p-2.5" style={{ borderColor: '#e5e7eb' }}>
                {rewardsBarCopy && <div className="mb-1 text-xs text-blue-900">{rewardsBarCopy}</div>}
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{cart.barText}</span>
                  <span className="chip chip-module">Cart Rewards</span>
                </div>
                <div className="h-2 rounded bg-gray-100">
                  <div className="h-2 rounded" style={{ width: `${cart.barPct}%`, background: '#1d4ed8' }} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
                  {[...state.cartRewards.milestones]
                    .sort((a, b) => a.threshold - b.threshold)
                    .map((m) => (
                      <span key={m.id} className={`chip ${cart.reached.includes(m) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {fmtMoney(m.threshold)} {cart.reached.includes(m) ? 'reached' : ''}
                      </span>
                    ))}
                </div>
              </div>
            )}
            {cart.unlockedCoupons.map((c) => (
              <div key={c.id} className="text-xs text-green-700">
                You unlocked {c.title}: {c.code} <span className="chip chip-module">Cart Rewards</span>
              </div>
            ))}

            {cart.lines.length > 0 && (
              <div className="rounded-lg border p-2.5" style={{ borderColor: '#e5e7eb' }}>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Coupon code</div>
                <div className="flex gap-1.5">
                  <input className="input uppercase" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyCode()} placeholder="Enter code" aria-label="Coupon code" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={applyCode}>
                    Apply
                  </button>
                </div>
                {codeError && <div className="mt-1 text-xs text-red-700">{codeError}</div>}
                {cartState.codes.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cartState.codes.map((code) => (
                      <span key={code} className="chip chip-module">
                        {code}
                        <button type="button" aria-label={`Remove ${code}`} onClick={() => actions.removeCode(code)}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {cart.lines.length > 0 && (
              <div className="rounded-lg border p-2.5" style={{ borderColor: '#e5e7eb' }}>
                <div className="mb-1 text-[11px] uppercase tracking-wide text-gray-500">Checkout</div>
                {cart.bumpOffers.length === 0 && <div className="text-xs text-gray-500">No order bump for this cart.</div>}
                {cart.bumpOffers.map((o) => {
                  const on = cartState.tickedBumpIds.includes(o.bump.id)
                  return (
                    <label key={o.bump.id} className="flex items-start gap-2 py-1 text-sm">
                      <input type="checkbox" className="mt-0.5" checked={on} onChange={(e) => actions.toggleBump(o.bump.id, e.target.checked)} />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {o.bump.name} <span className="chip chip-module">Order Bump</span>
                          {o.campaignName && <span className="text-[11px] text-gray-500">{o.campaignName} version</span>}
                        </span>
                        <span className="block text-xs text-gray-500">
                          <Steps steps={o.steps} />
                        </span>
                        {on && o.caption && <span className="block text-[11px] text-gray-500">{o.caption}</span>}
                      </span>
                      <span>{fmtMoney(o.unit)}</span>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="mt-1 flex flex-col gap-1 border-t pt-2" style={{ borderColor: '#e5e7eb' }}>
              <div className="flex justify-between text-gray-600">
                <span>Items at regular price</span>
                <span>{fmtMoney(cart.gross)}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Discounts</span>
                  <span>-{fmtMoney(cart.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{cart.lines.length === 0 ? '--' : cart.freeShipping ? 'Free' : fmtMoney(8)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{fmtMoney(round2(cart.subtotal + (cart.lines.length && !cart.freeShipping ? 8 : 0)))}</span>
              </div>
            </div>
            <button type="button" className="btn btn-blue w-full justify-center" disabled={cart.lines.length === 0}>
              Place order
            </button>
          </div>
        </aside>
      </div>

      {showPop && (
        <div className="fixed bottom-20 left-5 z-30 flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-xl" style={{ borderColor: '#e5e7eb' }} role="status">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <ShoppingBag size={14} />
          </span>
          <div>
            <div>Someone in Portland bought Trail Boots.</div>
            <div className="text-[11px] text-gray-500">2 minutes ago · Live Sales Notification</div>
          </div>
          <button type="button" className="text-gray-400 hover:text-gray-700" aria-label="Dismiss" onClick={() => setPopOpen(false)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Price steps per unit, e.g. "$120 → $108 Countdown 10% → $75.60 30% off Outerwear". */
function Steps({ steps }: { steps: PriceStep[] }) {
  return (
    <span>
      {steps.map((s, i) => (
        <span key={i}>
          {i > 0 && ' → '}
          {fmtMoney(s.unit)}
          {s.label && ` ${s.label}`}
        </span>
      ))}
    </span>
  )
}
