// Pure helpers that derive display state from the store. No React here.
// Every date-based behaviour reads nowOf(state), the prototype time.

import { SEED_NOW, onSaleCountByCategory } from '../data/seed'
import type { AppState, BogoRule, Campaign, CampaignPrice, CampaignStatus, CouponStatus, FreeLimitModule, Module, ModuleId, OfferKey, OfferModuleId, OfferRef, OrderBump, SmartCoupon, SurfaceId } from '../types'

// ---------- time ----------

export function nowOf(state: AppState): string {
  return state.now
}

export function todayOf(state: AppState): string {
  return state.now.slice(0, 10)
}

export function isSeedTime(state: AppState): boolean {
  return state.now === SEED_NOW
}

// ---------- dates and money ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Nov 3, 2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/** "Nov 3" */
export function fmtShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}`
}

function fmtTime(iso: string): string {
  const [h, min] = iso.slice(11, 16).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`
}

/** "Nov 3, 2026, 12:00 AM" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  if (iso.length < 16) return fmtDate(iso)
  return `${fmtDate(iso)}, ${fmtTime(iso)}`
}

/** "Nov 27, 12:00 AM" (no year) */
export function fmtShortDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  if (iso.length < 16) return fmtShort(iso)
  return `${fmtShort(iso)}, ${fmtTime(iso)}`
}

export function fmtRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'No dates set'
  if (start && !end) return `${fmtDateTime(start)}, always on`
  if (!start && end) return `Until ${fmtDateTime(end)}`
  return `${fmtDateTime(start)} to ${fmtDateTime(end)}`
}

/** "Nov 27 to Dec 1", or "Nov 1, always on". */
export function fmtWindow(start: string | null, end: string | null): string {
  if (!start && !end) return 'no dates'
  if (start && !end) return `${fmtShort(start)}, always on`
  if (!start && end) return `until ${fmtShort(end)}`
  return `${fmtShort(start)} to ${fmtShort(end)}`
}

export function fmtMoney(n: number): string {
  const r = Math.round(n * 100) / 100
  return '$' + r.toLocaleString('en-US', { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 })
}

export function fmtPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86400000)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(iso.slice(0, 10)) + days * 86400000)
  return d.toISOString().slice(0, 10) + (iso.length > 10 ? iso.slice(10) : '')
}

export function rangesOverlap(aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null): boolean {
  const as = aStart ?? '0000'
  const ae = aEnd ?? '9999'
  const bs = bStart ?? '0000'
  const be = bEnd ?? '9999'
  return as <= be && bs <= ae
}

// ---------- modules ----------

export const MODULE_NAMES: Record<ModuleId, string> = {
  'smart-coupons': 'Smart Coupons',
  bogo: 'BOGO',
  'order-bump': 'Upsell Order Bump',
  countdown: 'Countdown Timer',
  'cart-rewards': 'Cart Rewards',
  'floating-bar': 'Floating Notification Bar',
  'stock-bar': 'Stock Count Bar',
  'sales-pop': 'Live Sales Notification',
  'fly-cart': 'Fly Cart',
  'direct-checkout': 'Direct Checkout',
  'quick-view': 'Quick View',
}

export const MODULE_CHIP: Record<ModuleId, string> = {
  'smart-coupons': 'Smart Coupon',
  bogo: 'BOGO',
  'order-bump': 'Order Bump',
  countdown: 'Countdown',
  'cart-rewards': 'Cart Rewards',
  'floating-bar': 'Floating Bar',
  'stock-bar': 'Stock Bar',
  'sales-pop': 'Sales Pop',
  'fly-cart': 'Fly Cart',
  'direct-checkout': 'Direct Checkout',
  'quick-view': 'Quick View',
}

export function moduleById(state: AppState, id: ModuleId): Module {
  return state.modules.find((m) => m.id === id)!
}

export type LockReason = 'moduleOff' | 'pro' | null

export interface Lockable {
  moduleId?: ModuleId | null
  pro?: boolean
}

/** The one lock rule (brief 3a). "moduleOff" wins over "pro". */
export function lockReason(state: AppState, thing: Lockable): LockReason {
  if (thing.moduleId && !moduleById(state, thing.moduleId).active) return 'moduleOff'
  if (thing.pro && state.licence !== 'pro') return 'pro'
  return null
}

export function isModuleOn(state: AppState, id: ModuleId): boolean {
  return moduleById(state, id).active
}

export function shortModuleName(id: ModuleId): string {
  const short: Partial<Record<ModuleId, string>> = { 'stock-bar': 'Stock bar', 'floating-bar': 'Floating bar', 'sales-pop': 'Sales pop', 'fly-cart': 'Fly cart', countdown: 'Countdown', 'order-bump': 'Order Bump' }
  return short[id] ?? MODULE_NAMES[id]
}

// ---------- surfaces ----------

export interface SurfaceDef {
  id: SurfaceId
  label: string
  moduleId: ModuleId | null
  short: string
  note?: string
}

export const SURFACES: SurfaceDef[] = [
  { id: 'countdown', label: 'Countdown Timer', moduleId: 'countdown', short: 'Countdown' },
  { id: 'floatingBar', label: 'Floating Notification Bar', moduleId: 'floating-bar', short: 'Floating bar' },
  { id: 'stockBar', label: 'Stock Count Bar', moduleId: 'stock-bar', short: 'Stock bar' },
  { id: 'salesPop', label: 'Live Sales Notification', moduleId: 'sales-pop', short: 'Sales pop' },
  { id: 'flyCart', label: 'Fly Cart message', moduleId: 'fly-cart', short: 'Fly cart' },
  { id: 'cartRewardsBar', label: 'Cart Rewards bar', moduleId: 'cart-rewards', short: 'Cart Rewards bar', note: 'Uses your Cart Rewards milestones. Shows campaign copy on the bar.' },
  { id: 'badge', label: 'Product Badge', moduleId: null, short: 'Badge' },
]

export function surfaceLock(state: AppState, s: SurfaceDef): LockReason {
  return lockReason(state, { moduleId: s.moduleId, pro: s.moduleId === null })
}

export function surfaceOwnerName(s: SurfaceDef): string {
  return s.moduleId ? MODULE_NAMES[s.moduleId] : 'Campaigns'
}

// ---------- campaigns and the licence ----------

/** A published campaign is scheduled, running or ended depending on the prototype time. */
export function effectiveStatus(state: AppState, c: Campaign): CampaignStatus {
  if (c.status === 'scheduled' || c.status === 'running') {
    const now = nowOf(state)
    if (c.start && now < c.start) return 'scheduled'
    if (c.end && now > c.end) return 'ended'
    return 'running'
  }
  return c.status
}

/** Running at the prototype time with a Pro licence. Free or expired stops every campaign (rule 7). */
export function isCampaignLive(state: AppState, c: Campaign): boolean {
  return state.licence === 'pro' && effectiveStatus(state, c) === 'running'
}

export function liveCampaigns(state: AppState): Campaign[] {
  return state.campaigns.filter((c) => isCampaignLive(state, c))
}

export function campaignById(state: AppState, id: string | null | undefined): Campaign | null {
  return id ? state.campaigns.find((c) => c.id === id) ?? null : null
}

/** List badge "Stopped: licence expired" on running and scheduled rows while the licence is not Pro. */
export function stoppedByLicence(state: AppState, c: Campaign): boolean {
  if (state.licence === 'pro') return false
  const st = effectiveStatus(state, c)
  return st === 'running' || st === 'scheduled'
}

/** Expiry notice shows from 14 days before the licence expiry date. */
export function expiryNoticeVisible(state: AppState): boolean {
  if (state.licence !== 'pro') return false
  const from = addDays(state.licenceExpiresAt, -14)
  return state.now >= from && state.now < state.licenceExpiresAt
}

/** "Your licence expires on Dec 4, before this campaign ends. It will stop then." or null. */
export function licenceWarning(state: AppState, c: Campaign): string | null {
  if (state.licence !== 'pro' || !c.start) return null
  if (effectiveStatus(state, c) === 'ended') return null
  if (c.end !== null && c.end <= state.licenceExpiresAt) return null
  return `Your licence expires on ${fmtShort(state.licenceExpiresAt)}, before this campaign ends. It will stop then.`
}

// ---------- offers: everyday vs campaign versions ----------

export type AnyOffer = SmartCoupon | BogoRule | OrderBump

export function offerOf(state: AppState, key: OfferKey): AnyOffer | undefined {
  if (key.moduleId === 'smart-coupons') return state.coupons.find((c) => c.id === key.offerId)
  if (key.moduleId === 'bogo') return state.bogoRules.find((r) => r.id === key.offerId)
  return state.orderBumps.find((b) => b.id === key.offerId)
}

export function offerName(o: AnyOffer): string {
  return 'title' in o ? o.title : o.name
}

export function sameKey(a: OfferKey, b: OfferKey): boolean {
  return a.moduleId === b.moduleId && a.offerId === b.offerId
}

export function refIn(c: Campaign, key: OfferKey): OfferRef | undefined {
  return c.offerRefs.find((r) => sameKey(r, key))
}

/** Campaigns the offer is in: attached ones plus its campaign-only owner. Derived from Campaign.offerRefs. */
export function campaignsOfOffer(state: AppState, key: OfferKey): Campaign[] {
  return state.campaigns.filter((c) => refIn(c, key))
}

/** Campaigns that count for the no-overlap rule and the timeline chip: attached, not ended, with a start date. */
export function windowCampaigns(state: AppState, key: OfferKey): Campaign[] {
  return state.campaigns
    .filter((c) => refIn(c, key)?.mode === 'attached' && c.start && effectiveStatus(state, c) !== 'ended')
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
}

/** Apply a campaign ref's override on top of the everyday values. */
export function withOverride<T extends AnyOffer>(o: T, ref: OfferRef | undefined | null): T {
  return ref?.override ? ({ ...o, ...ref.override } as T) : o
}

// ---------- Free plan limits (rule 8) ----------

export const FREE_LIMITS: Record<FreeLimitModule, number> = { 'smart-coupons': 1, 'order-bump': 2, 'cart-rewards': 1 }

function everydayCouponActive(state: AppState, c: SmartCoupon): boolean {
  if (c.origin !== 'everyday') return false
  const { start, end } = c.dates
  const now = nowOf(state)
  if (!start && !end) return false
  if (end && end < now) return false
  if (start && start > now) return false
  return true
}

/** Active everyday offers of a Free-limited module, oldest first. */
export function freeLimitPool(state: AppState, m: FreeLimitModule): { id: string; name: string }[] {
  if (m === 'smart-coupons')
    return state.coupons
      .filter((c) => everydayCouponActive(state, c))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((c) => ({ id: c.id, name: c.method === 'automatic' ? c.title : `${c.title}${c.code && c.code !== c.title ? ` (${c.code})` : ''}` }))
  if (m === 'order-bump')
    return state.orderBumps
      .filter((b) => b.origin === 'everyday' && b.status === 'active')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((b) => ({ id: b.id, name: b.name }))
  return state.cartRewards.milestones.map((ms) => ({ id: ms.id, name: `${fmtMoney(ms.threshold)}: ${rewardLabel(state, ms.reward)}` }))
}

/** Ids paused with "Paused: over Free limit". Empty on Pro. Newest pause first unless the merchant chose. */
export function freeLimitPaused(state: AppState, m: FreeLimitModule): Set<string> {
  if (state.licence === 'pro') return new Set()
  const pool = freeLimitPool(state, m)
  const limit = FREE_LIMITS[m]
  if (pool.length <= limit) return new Set()
  const chosen = (state.freeKeep[m] ?? []).filter((id) => pool.some((p) => p.id === id)).slice(0, limit)
  const keep = chosen.length ? chosen : pool.slice(0, limit).map((p) => p.id)
  return new Set(pool.filter((p) => !keep.includes(p.id)).map((p) => p.id))
}

export function pausedReason(state: AppState, key: OfferKey): 'overFreeLimit' | null {
  if (key.moduleId === 'bogo') return null
  return freeLimitPaused(state, key.moduleId).has(key.offerId) ? 'overFreeLimit' : null
}

// ---------- the one function: effectiveOffer ----------

export interface Effective<T extends AnyOffer> {
  /** Values that apply right now. */
  offer: T
  version: 'everyday' | 'campaign' | 'offline'
  /** The running campaign controlling the offer, if any. */
  campaign: Campaign | null
  /** Whether the offer applies in the store right now. Code coupons still need their code entered. */
  live: boolean
  pausedReason: 'overFreeLimit' | null
}

/** effectiveOffer(offer, now): which version applies at the prototype time (brief 3e). */
export function effectiveOffer<T extends AnyOffer>(state: AppState, key: OfferKey, base: T): Effective<T> {
  const controlling = liveCampaigns(state).find((c) => refIn(c, key))
  if (controlling) {
    return { offer: withOverride(base, refIn(controlling, key)), version: 'campaign', campaign: controlling, live: true, pausedReason: null }
  }
  if (base.origin === 'campaignOnly') return { offer: base, version: 'offline', campaign: null, live: false, pausedReason: null }
  const paused = pausedReason(state, key)
  let everydayLive: boolean
  if (key.moduleId === 'smart-coupons') everydayLive = everydayCouponActive(state, base as SmartCoupon)
  else everydayLive = (base as BogoRule | OrderBump).status === 'active'
  return { offer: base, version: 'everyday', campaign: null, live: everydayLive && !paused, pausedReason: paused }
}

export function effectiveCoupon(state: AppState, c: SmartCoupon) {
  return effectiveOffer(state, { moduleId: 'smart-coupons', offerId: c.id }, c)
}
export function effectiveRule(state: AppState, r: BogoRule) {
  return effectiveOffer(state, { moduleId: 'bogo', offerId: r.id }, r)
}
export function effectiveBump(state: AppState, b: OrderBump) {
  return effectiveOffer(state, { moduleId: 'order-bump', offerId: b.id }, b)
}

/** Whether the everyday version is on (for "Live now" vs "Off now"). */
export function everydayOn(state: AppState, key: OfferKey, o: AnyOffer): boolean {
  if (o.origin !== 'everyday') return false
  if (key.moduleId === 'smart-coupons') return everydayCouponActive(state, o as SmartCoupon) && !pausedReason(state, key)
  return (o as BogoRule | OrderBump).status === 'active' && !pausedReason(state, key)
}

/** Another campaign sharing the offer whose window overlaps the given window. Ended and undated campaigns never count. */
export function attachConflict(state: AppState, key: OfferKey, campaignId: string, start: string | null, end: string | null): Campaign | null {
  if (!start) return null
  for (const c of windowCampaigns(state, key)) {
    if (c.id === campaignId) continue
    if (rangesOverlap(start, end, c.start, c.end)) return c
  }
  return null
}

export function dateChangeConflict(state: AppState, c: Campaign, start: string | null, end: string | null): { offer: AnyOffer; other: Campaign } | null {
  for (const ref of c.offerRefs) {
    if (ref.mode !== 'attached') continue
    const o = offerOf(state, ref)
    if (!o) continue
    const other = attachConflict(state, ref, c.id, start, end)
    if (other) return { offer: o, other }
  }
  return null
}

export function dateOverlapMessage(o: AnyOffer, other: Campaign): string {
  return `${offerName(o)} is already in ${other.name} (${fmtWindow(other.start, other.end)}). Campaign dates can't overlap for the same offer.`
}

export interface TimelineChip {
  text: string
  title: string
}

/** Timeline chip (brief section 5). Null when the offer is attached to no dated, unended campaign. */
export function timelineChip(state: AppState, key: OfferKey): TimelineChip | null {
  const o = offerOf(state, key)
  if (!o || o.origin !== 'everyday') return null
  const windows = windowCampaigns(state, key)
  if (windows.length === 0) return null
  const now = nowOf(state)
  const title = windows.map((c) => `${c.name}: ${fmtShortDateTime(c.start)} to ${c.end ? fmtShortDateTime(c.end) : 'always on'}`).join('\n')
  const controlling = windows.find((c) => isCampaignLive(state, c))
  const upcoming = windows.filter((c) => c !== controlling && (!c.end || c.end >= now))
  const more = (n: number) => (n > 0 ? ` · +${n} more` : '')
  if (controlling) {
    const until = controlling.end ? `until ${fmtShortDateTime(controlling.end)}` : 'always on'
    return { text: `${controlling.name} version · ${until}${more(upcoming.length)}`, title }
  }
  const next = upcoming[0] ?? windows[0]
  const lead = everydayOn(state, key, o) ? 'Live now' : 'Off now'
  const end = next.end ? fmtShortDateTime(next.end) : 'always on'
  return { text: `${lead} · ${next.name} takes over ${fmtShortDateTime(next.start)} to ${end} · back to everyday after${more(upcoming.length - 1)}`, title }
}

// ---------- offer views ----------

export interface OfferView {
  ref: OfferKey
  mode: 'attached' | 'campaignOnly' | null
  title: string
  moduleId: OfferModuleId
  chip: string
  detail: string
  categories: string[]
  products: string[]
  levelLabel?: string
  vendor: string | null
  origin: 'everyday' | 'campaignOnly'
}

export const OFFER_MODULES: OfferModuleId[] = ['smart-coupons', 'bogo', 'order-bump']

export const OFFER_GROUP_LABEL: Record<OfferModuleId, string> = { 'smart-coupons': 'Smart Coupons', bogo: 'BOGO', 'order-bump': 'Order Bump' }

export function scopeToProducts(state: AppState, scope: string): { categories: string[]; products: string[] } {
  if (state.categories.includes(scope)) return { categories: [scope], products: [] }
  const p = state.products.find((x) => x.id === scope)
  return p ? { categories: [], products: [p.id] } : { categories: [], products: [] }
}

export function scopeLabel(state: AppState, scope: string): string {
  if (state.categories.includes(scope)) return scope
  return state.products.find((p) => p.id === scope)?.name ?? scope
}

export function couponDetail(c: SmartCoupon, state: AppState): string {
  switch (c.type) {
    case 'percentage':
      return `${c.value}% off`
    case 'fixed':
      return `${fmtMoney(c.value)} off the cart`
    case 'tiers':
      return c.tiers.map((t) => `${t.qty}+ = ${t.percent}%`).join(', ') || 'Buy more save more'
    case 'buyXGetY': {
      const r = state.bogoRules.find((x) => x.id === c.bogoRuleId)
      return r ? `Deal defined by BOGO rule: ${r.name}` : 'No BOGO rule chosen'
    }
  }
}

export function bogoDetail(state: AppState, r: BogoRule): string {
  const get = r.getDiscount === 'free' ? 'free' : `at ${r.getPercent}% off`
  return `Buy ${r.buyQty} ${scopeLabel(state, r.buyScope)}, get ${r.getQty} ${scopeLabel(state, r.getScope)} ${get}`
}

export function bumpDetail(state: AppState, b: OrderBump): string {
  const offer = state.products.find((p) => p.id === b.offerProductId)
  const targets = [...b.targets.categories, ...b.targets.products.map((id) => scopeLabel(state, id))].join(', ')
  return `${offer?.name ?? 'Product'} at ${b.discountPercent}% off, shown with ${targets || 'any product'}`
}

export function bogoOnlyWithCoupon(state: AppState, r: BogoRule): SmartCoupon | null {
  const c = r.usedByCouponId ? state.coupons.find((x) => x.id === r.usedByCouponId) : null
  return c && c.method !== 'automatic' ? c : null
}

/** BOGO status: everyday "active" or "off"; "paused" when only-with-coupon and Smart Coupons is off. */
export function bogoStatus(state: AppState, r: BogoRule): 'active' | 'off' | 'paused' {
  if (bogoOnlyWithCoupon(state, r) && !isModuleOn(state, 'smart-coupons')) return 'paused'
  return r.status
}

/** Scope of an offer: the products its "applies to" covers. The campaign's version is used when one is given. */
export function offerView(state: AppState, key: OfferKey, campaign: Campaign | null = null): OfferView | null {
  const ref = campaign ? refIn(campaign, key) : undefined
  const mode = ref?.mode ?? null
  if (key.moduleId === 'smart-coupons') {
    const base = state.coupons.find((x) => x.id === key.offerId)
    if (!base) return null
    const c = withOverride(base, ref)
    let categories = c.appliesTo.kind === 'categories' ? c.appliesTo.categories : []
    let products = c.appliesTo.kind === 'products' ? c.appliesTo.products : []
    if (c.appliesTo.kind === 'store') categories = [...state.categories]
    if (c.type === 'buyXGetY' && c.bogoRuleId) {
      const r = state.bogoRules.find((x) => x.id === c.bogoRuleId)
      if (r) {
        const s = scopeToProducts(state, r.buyScope)
        categories = s.categories
        products = s.products
      }
    }
    return { ref: key, mode, title: c.title, moduleId: 'smart-coupons', chip: MODULE_CHIP['smart-coupons'], detail: couponDetail(c, state), categories, products, vendor: null, origin: base.origin }
  }
  if (key.moduleId === 'bogo') {
    const base = state.bogoRules.find((x) => x.id === key.offerId)
    if (!base) return null
    const r = withOverride(base, ref)
    const s = scopeToProducts(state, r.buyScope)
    return { ref: key, mode, title: r.name, moduleId: 'bogo', chip: MODULE_CHIP.bogo, detail: bogoDetail(state, r), categories: s.categories, products: s.products, levelLabel: r.level === 'storeWide' ? 'Store-wide rule' : 'Product rule', vendor: r.owner === 'vendor' ? r.vendorName : null, origin: base.origin }
  }
  const base = state.orderBumps.find((x) => x.id === key.offerId)
  if (!base) return null
  const b = withOverride(base, ref)
  // The bump changes the price of its offer product, so that product is part of the scope too.
  return { ref: key, mode, title: b.name, moduleId: 'order-bump', chip: MODULE_CHIP['order-bump'], detail: bumpDetail(state, b), categories: b.targets.categories, products: [...b.targets.products, b.offerProductId], vendor: null, origin: base.origin }
}

/** Every everyday admin offer, for the Attach existing drawer. Vendor deals and campaign-only offers never appear. */
export function everydayOffers(state: AppState): OfferView[] {
  const keys: OfferKey[] = [
    ...state.coupons.map((c) => ({ moduleId: 'smart-coupons' as const, offerId: c.id })),
    ...state.bogoRules.map((r) => ({ moduleId: 'bogo' as const, offerId: r.id })),
    ...state.orderBumps.map((b) => ({ moduleId: 'order-bump' as const, offerId: b.id })),
  ]
  return keys
    .map((k) => offerView(state, k))
    .filter((x): x is OfferView => x !== null)
    .filter((x) => x.vendor === null && x.origin === 'everyday')
}

export function campaignOffers(state: AppState, c: Campaign): OfferView[] {
  return c.offerRefs.map((r) => offerView(state, r, c)).filter((x): x is OfferView => x !== null)
}

export function rewardLabel(state: AppState, reward: { kind: 'freeShipping' } | { kind: 'coupon'; couponId: string } | { kind: 'gift'; productId: string }): string {
  if (reward.kind === 'freeShipping') return 'free shipping'
  if (reward.kind === 'gift') return `a free ${state.products.find((x) => x.id === reward.productId)?.name ?? 'gift'}`
  return state.coupons.find((x) => x.id === reward.couponId)?.title ?? 'a Smart Coupon'
}

// ---------- campaign products ----------

export interface ScopeView {
  derived: boolean
  categories: string[]
  products: string[]
}

export function hasAnythingAttached(c: Campaign): boolean {
  return c.offerRefs.length > 0 || c.campaignPrice !== null
}

export function campaignScope(state: AppState, c: Campaign): ScopeView {
  if (!hasAnythingAttached(c)) return { derived: false, categories: c.productScope.categories, products: c.productScope.products }
  const cats = new Set<string>()
  const prods = new Set<string>()
  for (const o of campaignOffers(state, c)) {
    o.categories.forEach((x) => cats.add(x))
    o.products.forEach((x) => prods.add(x))
  }
  if (c.campaignPrice) {
    c.campaignPrice.categories.forEach((x) => cats.add(x))
    c.campaignPrice.products.forEach((x) => prods.add(x))
  }
  for (const p of [...prods]) {
    const prod = state.products.find((x) => x.id === p)
    if (prod && cats.has(prod.category)) prods.delete(p)
  }
  return { derived: true, categories: state.categories.filter((x) => cats.has(x)), products: [...prods] }
}

export function scopeProductIds(state: AppState, scope: { categories: string[]; products: string[] }): string[] {
  const ids = new Set<string>(scope.products)
  state.products.filter((p) => scope.categories.includes(p.category)).forEach((p) => ids.add(p.id))
  return [...ids]
}

/** Products whose price this campaign changes: offers plus the campaign price. */
export function priceChangedProductIds(state: AppState, c: Campaign): string[] {
  const ids = new Set<string>()
  for (const o of campaignOffers(state, c)) scopeProductIds(state, o).forEach((id) => ids.add(id))
  if (c.campaignPrice) scopeProductIds(state, c.campaignPrice).forEach((id) => ids.add(id))
  return [...ids]
}

export function hasCountdownNow(state: AppState, productId: string): boolean {
  const p = state.products.find((x) => x.id === productId)
  return !!p?.ownCountdown && p.ownCountdown.end >= nowOf(state)
}

export function campaignPriceCountdownClashes(state: AppState, price: CampaignPrice | null) {
  if (!price) return []
  return scopeProductIds(state, price)
    .map((id) => state.products.find((p) => p.id === id)!)
    .filter((p) => hasCountdownNow(state, p.id))
}

/** On-sale count per category in scope. A Countdown price counts as on sale (brief v3.1). */
export function onSaleCounts(state: AppState, c: Campaign): { category: string; count: number }[] {
  const ids = scopeProductIds(state, campaignScope(state, c))
  const out: { category: string; count: number }[] = []
  for (const cat of state.categories) {
    const inScope = ids.filter((id) => state.products.find((p) => p.id === id)?.category === cat)
    if (inScope.length === 0) continue
    const countdown = inScope.filter((id) => hasCountdownNow(state, id)).length
    const count = Math.max(onSaleCountByCategory[cat] ?? 0, countdown)
    if (count > 0) out.push({ category: cat, count })
  }
  return out
}

// ---------- coupon status ----------

/** Everyday status from the coupon's own dates. A campaign-only coupon's status is derived from its campaign. */
export function couponStatus(state: AppState, c: SmartCoupon): CouponStatus {
  if (c.origin === 'campaignOnly') {
    const cmp = campaignById(state, c.campaignOnlyOf)
    if (!cmp) return 'inactive'
    if (isCampaignLive(state, cmp)) return 'active'
    const st = effectiveStatus(state, cmp)
    return st === 'ended' ? 'expired' : st === 'scheduled' || st === 'draft' ? 'scheduled' : 'inactive'
  }
  const { start, end } = c.dates
  const now = nowOf(state)
  if (!start && !end) return 'inactive'
  if (end && end < now) return 'expired'
  if (start && start > now) return 'scheduled'
  return 'active'
}

// ---------- module-off warnings ----------

export interface ModuleWarning {
  moduleId: ModuleId
  kind: 'offer' | 'surface' | 'price'
  id: string
  since: string | null
}

export function campaignModuleWarnings(state: AppState, c: Campaign): ModuleWarning[] {
  const out: ModuleWarning[] = []
  for (const ref of c.offerRefs) {
    if (!isModuleOn(state, ref.moduleId)) out.push({ moduleId: ref.moduleId, kind: 'offer', id: ref.offerId, since: state.moduleOffSince[ref.moduleId] ?? null })
  }
  if (c.campaignPrice && !isModuleOn(state, 'countdown')) out.push({ moduleId: 'countdown', kind: 'price', id: 'price', since: state.moduleOffSince.countdown ?? null })
  for (const s of SURFACES) {
    if (!c.surfaces[s.id]?.enabled || !s.moduleId) continue
    if (!isModuleOn(state, s.moduleId)) out.push({ moduleId: s.moduleId, kind: 'surface', id: s.id, since: state.moduleOffSince[s.moduleId] ?? null })
  }
  return out
}

export function campaignHasWarning(state: AppState, c: Campaign): boolean {
  return effectiveStatus(state, c) !== 'ended' && campaignModuleWarnings(state, c).length > 0
}

export function surfaceCount(c: Campaign): number {
  return Object.values(c.surfaces).filter((s) => s?.enabled).length
}

// ---------- overlap levels (brief 3f) ----------

export interface OverlapChecks {
  warnings: { campaign: Campaign; products: string[] }[]
  infos: Campaign[]
}

export function overlapChecks(state: AppState, c: Campaign): OverlapChecks {
  const warnings: OverlapChecks['warnings'] = []
  const infos: Campaign[] = []
  if (!c.start) return { warnings, infos }
  const mine = priceChangedProductIds(state, c)
  const myScope = scopeProductIds(state, campaignScope(state, c))
  for (const o of state.campaigns) {
    if (o.id === c.id || !o.start) continue
    if (effectiveStatus(state, o) === 'ended') continue
    if (!rangesOverlap(c.start, c.end, o.start, o.end)) continue
    const theirs = priceChangedProductIds(state, o)
    const shared = mine.filter((id) => theirs.includes(id))
    if (shared.length > 0) {
      warnings.push({ campaign: o, products: shared })
      continue
    }
    if (theirs.length === 0 && scopeProductIds(state, campaignScope(state, o)).some((id) => myScope.includes(id))) infos.push(o)
  }
  return { warnings, infos }
}

export function overlapWarningText(w: OverlapChecks['warnings'][number]): string {
  return `${w.campaign.name} also discounts ${w.products.length} ${w.products.length === 1 ? 'product' : 'products'} in this campaign. The larger deal applies.`
}

// ---------- readiness ----------

export interface ReadinessCheck {
  id: string
  kind: 'blocking' | 'warning'
  text: string
  fixes: { label: string; action: string; arg?: string }[]
}

/** Rows in the readiness table, info line included. */
export const READINESS_CHECK_COUNT = 10

export function readinessChecks(state: AppState, c: Campaign): ReadinessCheck[] {
  const out: ReadinessCheck[] = []
  const offers = campaignOffers(state, c)
  const hasDiscount = offers.length > 0 || c.campaignPrice !== null

  if (!c.start) {
    out.push({ id: 'noStart', kind: 'blocking', text: 'Set a start date before publishing.', fixes: [{ label: 'Edit dates', action: 'editDates' }] })
  }
  if (c.start && c.end && c.end < c.start) {
    out.push({ id: 'dates', kind: 'blocking', text: 'End date is before the start date.', fixes: [{ label: 'Edit dates', action: 'editDates' }] })
  }
  if (!hasAnythingAttached(c) && surfaceCount(c) === 0) {
    out.push({ id: 'empty', kind: 'blocking', text: 'Nothing attached. Add an offer, a campaign price or a surface.', fixes: [] })
  }

  const onSale = onSaleCounts(state, c)
  const coupons = offers.filter((o) => o.moduleId === 'smart-coupons').map((o) => withOverride(state.coupons.find((x) => x.id === o.ref.offerId)!, refIn(c, o.ref)))
  const allCouponsSkipSale = coupons.length > 0 && coupons.every((k) => k.excludeOnSale) && offers.length === coupons.length && !c.campaignPrice
  if (hasDiscount && onSale.length > 0 && !c.onSaleDecision && !allCouponsSkipSale) {
    const parts = onSale.map((x) => `${x.count} in ${x.category}`).join(', ')
    out.push({
      id: 'onSale',
      kind: 'warning',
      text: `Products already on sale inside the campaign scope (${parts}). Exclude them, or stack the discount on top.`,
      fixes: [
        { label: 'Exclude', action: 'onSale', arg: 'exclude' },
        { label: 'Stack', action: 'onSale', arg: 'stack' },
      ],
    })
  }

  for (const w of overlapChecks(state, c).warnings) {
    out.push({ id: `overlap-${w.campaign.id}`, kind: 'warning', text: overlapWarningText(w), fixes: [{ label: 'See products', action: 'seeProducts', arg: w.campaign.id }] })
  }

  if (!c.bogoOverlapDecision) {
    const rules = offers.filter((o) => o.moduleId === 'bogo')
    const bxgy = offers.filter((o) => o.moduleId === 'smart-coupons' && state.coupons.find((x) => x.id === o.ref.offerId)?.type === 'buyXGetY')
    for (const r of rules) {
      for (const k of bxgy) {
        const shared = scopeProductIds(state, r).filter((id) => scopeProductIds(state, k).includes(id))
        if (shared.length > 0) {
          const name = state.products.find((p) => p.id === shared[0])?.name ?? 'the same product'
          out.push({
            id: `bogo-${r.ref.offerId}-${k.ref.offerId}`,
            kind: 'warning',
            text: `A BOGO rule and a Buy X get Y coupon both target ${name}. The larger one wins.`,
            fixes: [
              { label: 'Remove rule', action: 'removeOffer', arg: `bogo:${r.ref.offerId}` },
              { label: 'Remove coupon', action: 'removeOffer', arg: `smart-coupons:${k.ref.offerId}` },
              { label: 'Keep both', action: 'keepBoth' },
            ],
          })
        }
      }
    }
  }

  if (!c.countdownOverlapDecision) {
    const clashes = campaignPriceCountdownClashes(state, c.campaignPrice)
    if (clashes.length > 0) {
      const n = clashes.length
      const head = n === 1 ? '1 product already has its own Countdown discount.' : `${n} products already have their own Countdown discount.`
      out.push({ id: 'countdownClash', kind: 'warning', text: `${head} The campaign price replaces it while the campaign runs.`, fixes: [{ label: 'Review products', action: 'reviewProducts' }, { label: 'OK', action: 'countdownOk' }] })
    }
  }

  if (!hasDiscount) {
    out.push({ id: 'noDiscount', kind: 'warning', text: 'No discount attached. Attribution will use the link and surface clicks only.', fixes: [{ label: 'Attach offer', action: 'attachOffer' }] })
  }

  for (const w of campaignModuleWarnings(state, c)) {
    if (w.kind !== 'surface') continue
    out.push({ id: `surface-off-${w.id}`, kind: 'warning', text: `${SURFACES.find((s) => s.id === w.id)?.label} is enabled but the ${MODULE_NAMES[w.moduleId]} module is off.`, fixes: [{ label: `Enable ${shortModuleName(w.moduleId)}`, action: 'enableModule', arg: w.moduleId }] })
  }

  const lic = licenceWarning(state, c)
  if (lic) out.push({ id: 'licence', kind: 'warning', text: lic, fixes: [{ label: 'Renew licence', action: 'renewLicence' }] })

  return out
}

/** "Store during campaign" context line. Hidden for always-on, draft and scheduled campaigns. */
export function storeDuringLine(state: AppState, c: Campaign): string | null {
  if (!c.storeDuring || c.end === null) return null
  const st = effectiveStatus(state, c)
  if (st === 'draft' || st === 'scheduled') return null
  const pct = c.storeDuring.dailyChangePct
  return `Store during campaign: ${fmtMoney(c.storeDuring.revenue)}, ${pct > 0 ? '+' : ''}${pct}% a day vs the 30 days before`
}

// ---------- attribution copy ----------

export function revenueNote(days: number): string {
  return `Orders where a campaign offer applied, plus orders within ${days} days of a link visit`
}

// ---------- list stats ----------

export type RangeKey = 'Last 30 days' | 'Last 90 days' | 'This year'

export function rangeStart(state: AppState, key: RangeKey): string {
  if (key === 'Last 30 days') return addDays(todayOf(state), -30)
  if (key === 'Last 90 days') return addDays(todayOf(state), -90)
  return '2026-01-01'
}

export function campaignInRange(state: AppState, c: Campaign, key: RangeKey): boolean {
  return rangesOverlap(c.start, c.end ?? todayOf(state), rangeStart(state, key), todayOf(state))
}

export function weeklyRevenue(state: AppState, key: RangeKey): { weekStart: string; revenue: number; inCampaign: boolean }[] {
  const start = rangeStart(state, key)
  const today = todayOf(state)
  const weeks: { weekStart: string; revenue: number; inCampaign: boolean }[] = []
  for (let d = start; d <= today; d = addDays(d, 7)) {
    const weekEnd = addDays(d, 6)
    let revenue = 0
    let inCampaign = false
    for (const c of state.campaigns) {
      if (!c.metrics || !c.start) continue
      const cStart = c.start.slice(0, 10)
      const cEnd = (c.end ?? today).slice(0, 10)
      if (!rangesOverlap(d, weekEnd, cStart, cEnd)) continue
      inCampaign = true
      const runDays = Math.max(1, daysBetween(cStart, cEnd) + 1)
      const overlapStart = cStart > d ? cStart : d
      const overlapEnd = cEnd < weekEnd ? cEnd : weekEnd
      const overlapDays = Math.max(0, daysBetween(overlapStart, overlapEnd) + 1)
      revenue += (c.metrics.revenue * overlapDays) / runDays
    }
    weeks.push({ weekStart: d, revenue: Math.round(revenue), inCampaign })
  }
  return weeks
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
