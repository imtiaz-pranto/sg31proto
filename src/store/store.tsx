// One mock store, mirrored to sessionStorage so a refresh keeps the state.
// Closing the tab clears it. "Reset seed" clears it too and resets the prototype time.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SEED_NOW, emptyCart, makeSeedState } from '../data/seed'
import { addDays, newId, nowOf, offerOf, refIn, sameKey, slugify, todayOf } from '../lib/derive'
import type { AppState, BogoRule, Campaign, CampaignPrice, CartRewardsConfig, FreeLimitModule, Licence, Milestone, ModuleId, OfferKey, OfferRef, OrderBump, PreviewCart, Settings, SmartCoupon, SurfaceId, TemplateId } from '../types'

const STORAGE_KEY = 'sg31-proto-v31'

type Updater = (fn: (s: AppState) => AppState) => void

interface StoreApi {
  state: AppState
  update: Updater
  actions: ReturnType<typeof makeActions>
}

const StoreContext = createContext<StoreApi | null>(null)

let toastSeq = 1

// ---------- persistence ----------

function loadState(): AppState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && Array.isArray(parsed.campaigns) && parsed.licence && parsed.now) return { ...parsed, toasts: [] }
    }
  } catch {
    /* fall through to seed */
  }
  return makeSeedState()
}

function saveState(s: AppState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, toasts: [] }))
  } catch {
    /* storage may be unavailable */
  }
}

// ---------- pure helpers ----------

function patchCampaign(s: AppState, id: string, patch: Partial<Campaign> | ((c: Campaign) => Partial<Campaign>)): AppState {
  return { ...s, campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)) }
}

type AnyOffer = SmartCoupon | BogoRule | OrderBump

function patchOffer(s: AppState, key: OfferKey, fn: (o: AnyOffer) => AnyOffer): AppState {
  switch (key.moduleId) {
    case 'smart-coupons':
      return { ...s, coupons: s.coupons.map((c) => (c.id === key.offerId ? (fn(c) as SmartCoupon) : c)) }
    case 'bogo':
      return { ...s, bogoRules: s.bogoRules.map((r) => (r.id === key.offerId ? (fn(r) as BogoRule) : r)) }
    case 'order-bump':
      return { ...s, orderBumps: s.orderBumps.map((b) => (b.id === key.offerId ? (fn(b) as OrderBump) : b)) }
  }
}

function deleteOffer(s: AppState, key: OfferKey): AppState {
  let next: AppState = s
  switch (key.moduleId) {
    case 'smart-coupons':
      next = { ...s, coupons: s.coupons.filter((c) => c.id !== key.offerId), bogoRules: s.bogoRules.map((r) => (r.usedByCouponId === key.offerId ? { ...r, usedByCouponId: null } : r)) }
      break
    case 'bogo':
      next = { ...s, bogoRules: s.bogoRules.filter((r) => r.id !== key.offerId) }
      break
    case 'order-bump':
      next = { ...s, orderBumps: s.orderBumps.filter((b) => b.id !== key.offerId) }
      break
  }
  return { ...next, campaigns: next.campaigns.map((c) => ({ ...c, offerRefs: c.offerRefs.filter((r) => !sameKey(r, key)) })) }
}

/** Copy a campaign-only offer into a new campaign-only offer for another campaign. */
function copyCampaignOnly(s: AppState, key: OfferKey, campaignId: string): { state: AppState; key: OfferKey } {
  const o = offerOf(s, key)!
  const base = { origin: 'campaignOnly' as const, campaignOnlyOf: campaignId, createdAt: nowOf(s) }
  switch (key.moduleId) {
    case 'smart-coupons': {
      const id = newId('c')
      return { state: { ...s, coupons: [...s.coupons, { ...(o as SmartCoupon), ...base, id, uses: 0, discountGiven: 0 }] }, key: { moduleId: 'smart-coupons', offerId: id } }
    }
    case 'bogo': {
      const id = newId('r')
      return { state: { ...s, bogoRules: [...s.bogoRules, { ...(o as BogoRule), ...base, id, usedByCouponId: null }] }, key: { moduleId: 'bogo', offerId: id } }
    }
    case 'order-bump': {
      const id = newId('ob')
      return { state: { ...s, orderBumps: [...s.orderBumps, { ...(o as OrderBump), ...base, id }] }, key: { moduleId: 'order-bump', offerId: id } }
    }
  }
}

function withToast(s: AppState, text: string, action?: { label: string; to: string }): AppState {
  return { ...s, toasts: [...s.toasts, { id: toastSeq++, text, action }] }
}

function addRef(s: AppState, campaignId: string, ref: OfferRef): AppState {
  return patchCampaign(s, campaignId, (c) => ({ offerRefs: [...c.offerRefs.filter((r) => !sameKey(r, ref)), ref] }))
}

/** Any cart change: clear notices and resync what the cart last showed. */
function cartChanged(s: AppState, patch: Partial<PreviewCart>): AppState {
  return { ...s, preview: { ...s.preview, ...patch, seen: null, notices: [] } }
}

export const TEMPLATES: {
  id: TemplateId
  name: string
  offer: 'percentage' | 'campaignPrice' | null
  offerLine: string
  note?: string
  surfaces: SurfaceId[]
  excludeOnSale: boolean
  needs: ModuleId[]
}[] = [
  { id: 'flash-sale', name: 'Flash sale', offer: 'campaignPrice', offerLine: 'Campaign price, 20% (Countdown)', surfaces: ['countdown', 'floatingBar', 'badge', 'flyCart'], excludeOnSale: true, needs: ['countdown', 'floating-bar', 'fly-cart'] },
  { id: 'black-friday', name: 'Black Friday', offer: 'percentage', offerLine: 'Campaign-only Smart Coupon, percentage, automatic', surfaces: ['countdown', 'floatingBar', 'badge', 'salesPop', 'flyCart', 'cartRewardsBar'], excludeOnSale: true, needs: ['smart-coupons', 'countdown', 'floating-bar', 'sales-pop', 'fly-cart', 'cart-rewards'] },
  { id: 'clearance', name: 'Clearance', offer: 'percentage', offerLine: 'Campaign-only Smart Coupon, percentage, automatic, exclude on-sale off', surfaces: ['badge', 'stockBar', 'flyCart'], excludeOnSale: false, needs: ['smart-coupons', 'stock-bar', 'fly-cart'] },
  { id: 'launch-week', name: 'Launch week', offer: null, offerLine: 'None', surfaces: ['countdown', 'floatingBar', 'badge', 'salesPop'], excludeOnSale: true, needs: ['countdown', 'floating-bar', 'sales-pop'] },
  { id: 'always-on-free-shipping', name: 'Always-on free shipping', offer: null, offerLine: 'None', note: 'Uses your Cart Rewards milestones', surfaces: ['cartRewardsBar', 'flyCart'], excludeOnSale: true, needs: ['cart-rewards', 'fly-cart'] },
  { id: 'blank', name: 'Blank', offer: null, offerLine: 'None', surfaces: [], excludeOnSale: true, needs: [] },
]

export function blankCouponFor(campaignOnlyOf: string | null, now: string): SmartCoupon {
  return {
    id: newId('c'),
    origin: campaignOnlyOf ? 'campaignOnly' : 'everyday',
    campaignOnlyOf,
    createdAt: now,
    title: '',
    type: 'percentage',
    value: 10,
    tiers: [{ qty: 3, percent: 15 }],
    bogoRuleId: null,
    method: 'automatic',
    code: '',
    appliesTo: { kind: 'store', categories: [], products: [] },
    minimum: { kind: 'none', value: 50 },
    eligibility: 'all',
    usesPerCustomer: false,
    totalUses: 0,
    excludeOnSale: false,
    combinable: { withStoreGrowthDeals: false, withOtherCoupons: false },
    dates: { start: null, end: null },
    uses: 0,
    discountGiven: 0,
  }
}

function applyTemplate(s: AppState, campaignId: string, templateId: TemplateId): AppState {
  const t = TEMPLATES.find((x) => x.id === templateId)!
  const c = s.campaigns.find((x) => x.id === campaignId)!
  let next = s
  const offerRefs: OfferRef[] = [...c.offerRefs]
  let campaignPrice = c.campaignPrice
  if (t.offer === 'percentage') {
    const coupon: SmartCoupon = { ...blankCouponFor(campaignId, nowOf(s)), title: `${c.name} offer`, value: 20, excludeOnSale: t.excludeOnSale }
    next = { ...next, coupons: [...next.coupons, coupon] }
    offerRefs.push({ moduleId: 'smart-coupons', offerId: coupon.id, mode: 'campaignOnly', override: null })
  }
  if (t.offer === 'campaignPrice') campaignPrice = { percent: 20, categories: [...s.categories], products: [] }
  const surfaces = { ...c.surfaces }
  for (const sid of t.surfaces) surfaces[sid] = { enabled: true }
  const productScope = t.id === 'always-on-free-shipping' ? { mode: 'manual' as const, categories: [...s.categories], products: [] } : c.productScope
  return patchCampaign(next, campaignId, { templateId, offerRefs, campaignPrice, surfaces, productScope })
}

// ---------- actions ----------

function makeActions(update: Updater) {
  return {
    // licence
    setLicence(licence: Licence) {
      update((s) => ({ ...s, licence }))
    },
    setLicenceExpiry(iso: string) {
      update((s) => ({ ...s, licenceExpiresAt: iso }))
    },
    upgradeToPro() {
      update((s) => withToast({ ...s, licence: 'pro' }, 'Prototype: licence set to Pro'))
    },
    /** Renew: Pro again. If renewing from the expiry notice or after the expiry date, the date moves a year on. */
    renewLicence() {
      update((s) => {
        const extend = s.licence === 'pro' || nowOf(s) >= s.licenceExpiresAt
        const base = nowOf(s) > s.licenceExpiresAt ? nowOf(s) : s.licenceExpiresAt
        return withToast({ ...s, licence: 'pro', licenceExpiresAt: extend ? addDays(base, 365) : s.licenceExpiresAt }, 'Prototype: licence renewed')
      })
    },

    // prototype time
    setNow(iso: string) {
      update((s) => ({ ...s, now: iso }))
    },
    resetTime() {
      update((s) => ({ ...s, now: SEED_NOW }))
    },

    setModuleActive(id: ModuleId, active: boolean) {
      update((s) => ({
        ...s,
        modules: s.modules.map((m) => (m.id === id ? { ...m, active } : m)),
        moduleOffSince: active ? omit(s.moduleOffSince, id) : { ...s.moduleOffSince, [id]: todayOf(s) },
      }))
    },
    setFreeKeep(m: FreeLimitModule, ids: string[]) {
      update((s) => ({ ...s, freeKeep: { ...s.freeKeep, [m]: ids } }))
    },
    resetSeed() {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      update(() => withToast(makeSeedState(), 'Prototype: seed data restored, time reset'))
    },
    toast(text: string, action?: { label: string; to: string }) {
      update((s) => withToast(s, text, action))
    },
    dismissToast(id: number) {
      update((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }))
    },

    // campaigns
    createCampaign(templateId: TemplateId): string {
      const id = newId('cmp')
      update((s) => {
        const t = TEMPLATES.find((x) => x.id === templateId)!
        const today = todayOf(s)
        const name = t.id === 'blank' ? 'Untitled campaign' : `${t.name} ${today.slice(0, 4)}`
        const c: Campaign = {
          id,
          name,
          templateId,
          status: 'draft',
          start: `${today}T00:00`,
          end: t.id === 'always-on-free-shipping' ? null : `${addDays(today, 7)}T23:59`,
          offerRefs: [],
          campaignPrice: null,
          surfaces: {},
          productScope: { mode: 'manual', categories: [], products: [] },
          linkSlug: slugify(name),
          message: '',
          baseline: { aov: 58.4, revenue: 8120 },
          storeDuring: null,
          metrics: null,
        }
        return applyTemplate({ ...s, campaigns: [c, ...s.campaigns] }, id, templateId)
      })
      return id
    },
    useTemplate(campaignId: string, templateId: TemplateId) {
      update((s) => applyTemplate(s, campaignId, templateId))
    },
    updateCampaign(id: string, patch: Partial<Campaign>) {
      update((s) => patchCampaign(s, id, patch))
    },
    publish(id: string) {
      update((s) =>
        patchCampaign(s, id, (c) => ({
          status: c.start && c.start > nowOf(s) ? 'scheduled' : 'running',
          publishedOn: todayOf(s),
          metrics: c.metrics ?? { revenue: 0, orders: 0, acceptance: 0, aovLift: 0, bySurface: {}, byDay: [] },
        })),
      )
    },
    unpublish(id: string) {
      update((s) => patchCampaign(s, id, { status: 'draft', publishedOn: undefined }))
    },
    pause(id: string) {
      update((s) => patchCampaign(s, id, { status: 'paused', pausedSince: todayOf(s) }))
    },
    resume(id: string) {
      update((s) => patchCampaign(s, id, { status: 'running', pausedSince: undefined }))
    },
    endNow(id: string) {
      update((s) => patchCampaign(s, id, { status: 'ended', endedOn: todayOf(s), end: nowOf(s) }))
    },
    /** Delete: campaign versions go with the campaign (they live on its refs), campaign-only offers are deleted, everyday versions untouched. */
    deleteCampaign(id: string) {
      update((s) => {
        const c = s.campaigns.find((x) => x.id === id)
        if (!c) return s
        let next = s
        for (const ref of c.offerRefs) if (ref.mode === 'campaignOnly') next = deleteOffer(next, ref)
        return withToast({ ...next, campaigns: next.campaigns.filter((x) => x.id !== id) }, `Deleted ${c.name}. Attached offers are back to their everyday versions.`)
      })
    },
    /** Clone and Run again: a new draft with empty dates and all offers. */
    clone(id: string): string {
      const newCmpId = newId('cmp')
      update((s) => {
        const src = s.campaigns.find((c) => c.id === id)!
        let next = s
        const offerRefs: OfferRef[] = []
        for (const ref of src.offerRefs) {
          if (!offerOf(next, ref)) continue
          if (ref.mode === 'campaignOnly') {
            const r = copyCampaignOnly(next, ref, newCmpId)
            next = r.state
            offerRefs.push({ ...r.key, mode: 'campaignOnly', override: null })
          } else {
            offerRefs.push({ ...ref, override: ref.override ? { ...ref.override } : null })
          }
        }
        const name = `${src.name} (copy)`
        const copy: Campaign = {
          ...src,
          id: newCmpId,
          name,
          status: 'draft',
          start: null,
          end: null,
          offerRefs,
          campaignPrice: src.campaignPrice ? { ...src.campaignPrice } : null,
          linkSlug: slugify(name),
          metrics: null,
          storeDuring: null,
          pausedSince: undefined,
          endedOn: undefined,
          publishedOn: undefined,
          onSaleDecision: undefined,
          bogoOverlapDecision: undefined,
          countdownOverlapDecision: undefined,
        }
        return { ...next, campaigns: [copy, ...next.campaigns] }
      })
      return newCmpId
    },
    /** Attach an everyday offer. The caller checks the no-overlap rule first. */
    attachExisting(campaignId: string, key: OfferKey, override: OfferRef['override']) {
      update((s) => addRef(s, campaignId, { ...key, mode: 'attached', override }))
    },
    /** Save the campaign version of an attached offer. Null means "Use as is". */
    saveCampaignVersion(campaignId: string, key: OfferKey, override: OfferRef['override']) {
      update((s) => patchCampaign(s, campaignId, (c) => ({ offerRefs: c.offerRefs.map((r) => (sameKey(r, key) ? { ...r, override } : r)) })))
    },
    /** Remove an offer from a campaign. Attached: only the campaign version goes. Campaign-only: delete it, or keep it as an everyday offer. */
    removeOffer(campaignId: string, key: OfferKey, keepAsEveryday = false) {
      update((s) => {
        const c = s.campaigns.find((x) => x.id === campaignId)
        const ref = c ? refIn(c, key) : undefined
        let next = patchCampaign(s, campaignId, (cc) => ({ offerRefs: cc.offerRefs.filter((r) => !sameKey(r, key)) }))
        if (ref?.mode === 'campaignOnly') {
          if (keepAsEveryday) {
            next = patchOffer(next, key, (o) => {
              const kept = { ...o, origin: 'everyday' as const, campaignOnlyOf: null }
              if (key.moduleId === 'smart-coupons') return { ...(kept as SmartCoupon), dates: { start: null, end: null } }
              return { ...(kept as BogoRule | OrderBump), status: 'off' as const }
            })
          } else next = deleteOffer(next, key)
        }
        return next
      })
    },
    setCampaignPrice(campaignId: string, price: CampaignPrice | null) {
      update((s) => patchCampaign(s, campaignId, { campaignPrice: price, countdownOverlapDecision: undefined }))
    },
    setSurface(campaignId: string, surfaceId: SurfaceId, enabled: boolean) {
      update((s) => patchCampaign(s, campaignId, (c) => ({ surfaces: { ...c.surfaces, [surfaceId]: { ...(c.surfaces[surfaceId] ?? {}), enabled } } })))
    },
    setOnSaleDecision(campaignId: string, decision: 'exclude' | 'stack') {
      update((s) => {
        let next = patchCampaign(s, campaignId, { onSaleDecision: decision })
        if (decision === 'exclude') {
          const c = next.campaigns.find((x) => x.id === campaignId)!
          for (const ref of c.offerRefs.filter((r) => r.moduleId === 'smart-coupons')) {
            if (ref.mode === 'campaignOnly') next = patchOffer(next, ref, (k) => ({ ...(k as SmartCoupon), excludeOnSale: true }))
            else next = patchCampaign(next, campaignId, (cc) => ({ offerRefs: cc.offerRefs.map((r) => (sameKey(r, ref) ? { ...r, override: { ...(r.override ?? {}), excludeOnSale: true } } : r)) }))
          }
        }
        return next
      })
    },
    keepBothBogo(campaignId: string) {
      update((s) => patchCampaign(s, campaignId, { bogoOverlapDecision: 'keep' }))
    },
    acceptCountdownClash(campaignId: string) {
      update((s) => patchCampaign(s, campaignId, { countdownOverlapDecision: 'ok' }))
    },

    // offers: everyday versions, or campaign-only offers saved inside a campaign
    saveCoupon(coupon: SmartCoupon) {
      update((s) => {
        const exists = s.coupons.some((c) => c.id === coupon.id)
        let next: AppState = { ...s, coupons: exists ? s.coupons.map((c) => (c.id === coupon.id ? coupon : c)) : [...s.coupons, coupon] }
        next = {
          ...next,
          bogoRules: next.bogoRules.map((r) => {
            if (r.usedByCouponId === coupon.id && r.id !== coupon.bogoRuleId) return { ...r, usedByCouponId: null }
            if (coupon.type === 'buyXGetY' && r.id === coupon.bogoRuleId) return { ...r, usedByCouponId: coupon.id }
            return r
          }),
        }
        if (coupon.campaignOnlyOf) next = addRef(next, coupon.campaignOnlyOf, { moduleId: 'smart-coupons', offerId: coupon.id, mode: 'campaignOnly', override: null })
        return next
      })
    },
    saveBogoRule(rule: BogoRule) {
      update((s) => {
        const exists = s.bogoRules.some((r) => r.id === rule.id)
        let next: AppState = { ...s, bogoRules: exists ? s.bogoRules.map((r) => (r.id === rule.id ? rule : r)) : [...s.bogoRules, rule] }
        if (rule.campaignOnlyOf) next = addRef(next, rule.campaignOnlyOf, { moduleId: 'bogo', offerId: rule.id, mode: 'campaignOnly', override: null })
        return next
      })
    },
    saveBump(bump: OrderBump) {
      update((s) => {
        const exists = s.orderBumps.some((b) => b.id === bump.id)
        let next: AppState = { ...s, orderBumps: exists ? s.orderBumps.map((b) => (b.id === bump.id ? bump : b)) : [...s.orderBumps, bump] }
        if (bump.campaignOnlyOf) next = addRef(next, bump.campaignOnlyOf, { moduleId: 'order-bump', offerId: bump.id, mode: 'campaignOnly', override: null })
        return next
      })
    },
    removeBump(id: string) {
      update((s) => deleteOffer(s, { moduleId: 'order-bump', offerId: id }))
    },

    // cart rewards
    updateCartRewards(patch: Partial<CartRewardsConfig>) {
      update((s) => ({ ...s, cartRewards: { ...s.cartRewards, ...patch } }))
    },
    addMilestone() {
      update((s) => {
        const last = s.cartRewards.milestones[s.cartRewards.milestones.length - 1]
        const m: Milestone = { id: newId('m'), threshold: (last?.threshold ?? 50) + 50, reward: { kind: 'freeShipping' } }
        return { ...s, cartRewards: { ...s.cartRewards, milestones: [...s.cartRewards.milestones, m] } }
      })
    },
    updateMilestone(id: string, patch: Partial<Milestone>) {
      update((s) => ({ ...s, cartRewards: { ...s.cartRewards, milestones: s.cartRewards.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)).sort((a, b) => a.threshold - b.threshold) } }))
    },
    removeMilestone(id: string) {
      update((s) => ({ ...s, cartRewards: { ...s.cartRewards, milestones: s.cartRewards.milestones.filter((m) => m.id !== id) } }))
    },

    // settings
    updateSettings(patch: Partial<Settings>) {
      update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
    },

    // storefront preview cart
    addToCart(productId: string) {
      update((s) => {
        const ls = s.preview.lines
        const lines = ls.some((l) => l.productId === productId) ? ls.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l)) : [...ls, { productId, qty: 1 }]
        return cartChanged(s, { lines })
      })
    },
    setQty(productId: string, qty: number) {
      update((s) => cartChanged(s, { lines: qty <= 0 ? s.preview.lines.filter((l) => l.productId !== productId) : s.preview.lines.map((l) => (l.productId === productId ? { ...l, qty } : l)) }))
    },
    toggleBump(bumpId: string, on: boolean) {
      update((s) => cartChanged(s, { tickedBumpIds: on ? [...s.preview.tickedBumpIds, bumpId] : s.preview.tickedBumpIds.filter((x) => x !== bumpId) }))
    },
    setForceOuterwear(on: boolean) {
      update((s) => cartChanged(s, { forceOuterwear: on }))
    },
    applyCode(code: string) {
      update((s) => cartChanged(s, { codes: s.preview.codes.includes(code) ? s.preview.codes : [...s.preview.codes, code] }))
    },
    removeCode(code: string) {
      update((s) => cartChanged(s, { codes: s.preview.codes.filter((c) => c !== code) }))
    },
    /** Record what the cart now shows, with any notices for what changed since it last showed. */
    cartSync(seen: NonNullable<PreviewCart['seen']>, notices: string[]) {
      update((s) => ({ ...s, preview: { ...s.preview, seen, notices: notices.length ? notices : s.preview.notices } }))
    },
    /** Coupon rules 4 and 9: drop codes the arbiter rejected, with their notices. */
    rejectCodes(codes: string[], notices: string[]) {
      update((s) => ({ ...s, preview: { ...s.preview, codes: s.preview.codes.filter((c) => !codes.includes(c)), notices: [...s.preview.notices, ...notices] } }))
    },
    dismissCartNotices() {
      update((s) => ({ ...s, preview: { ...s.preview, notices: [] } }))
    },
    clearCart() {
      update((s) => ({ ...s, preview: emptyCart() }))
    },
  }
}

function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

// ---------- provider ----------

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const update = useCallback<Updater>((fn) => setState((s) => fn(s)), [])
  const actions = useMemo(() => makeActions(update), [update])
  const api = useMemo(() => ({ state, update, actions }), [state, update, actions])
  useEffect(() => {
    saveState(state)
  }, [state])
  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}
