// Discount arbiter for the storefront preview. Brief v3.1 section 3c.
// Every deal is read through effectiveOffer() at the prototype time.

import type { AppState, BogoRule, CartLine, Milestone, OrderBump, Product, SmartCoupon } from '../types'
import { MODULE_NAMES, bogoOnlyWithCoupon, bogoStatus, effectiveBump, effectiveCoupon, effectiveRule, fmtMoney, freeLimitPaused, hasCountdownNow, isModuleOn, liveCampaigns, nowOf, rewardLabel, scopeProductIds } from './derive'

export type { CartLine }

export interface PriceStep {
  label: string | null
  unit: number
}

export interface Candidate {
  id: string
  title: string
  moduleName: string
  campaignId: string | null
  campaignName: string | null
  fromCampaignOrCoupon: boolean
  combinable: boolean
  discount: number
  /** Set for code coupons, so a loss can be reported by code. */
  code: string | null
  /** Set for fixed-cart coupons: the coupon id, for the split. */
  fixedCartId: string | null
  bonus?: { product: Product; qty: number; percentOff: number; unitBase: number }
}

export interface PricedLine {
  product: Product
  qty: number
  regular: number
  base: number
  baseLabel: string | null
  unit: number
  gross: number
  net: number
  steps: PriceStep[]
  applied: Candidate[]
  caption: string | null
  losers: string[]
}

export interface BonusLine {
  product: Product
  qty: number
  percentOff: number
  unitBase: number
  unit: number
  title: string
  moduleName: string
  campaignId: string | null
  campaignName: string | null
}

export interface BumpOffer {
  bump: OrderBump
  product: Product
  steps: PriceStep[]
  unit: number
  caption: string | null
  campaignName: string | null
}

export interface CartResult {
  lines: PricedLine[]
  bonusLines: BonusLine[]
  bumpOffers: BumpOffer[]
  tickedBumps: BumpOffer[]
  gross: number
  discount: number
  subtotal: number
  reached: Milestone[]
  next: Milestone | null
  barText: string
  barPct: number
  gifts: Product[]
  freeShipping: boolean
  unlockedCoupons: SmartCoupon[]
  nudges: string[]
  /** Codes the arbiter drops (rules 4 and 9), with their notices. */
  rejected: { code: string; notice: string }[]
}

export interface PreviewOptions {
  forcedCouponIds: string[]
  tickedBumpIds: string[]
  codes: string[]
}

// ---------- which deals are live ----------

interface LiveCoupon {
  coupon: SmartCoupon
  campaignId: string | null
  campaignName: string | null
}

/** Automatic coupons that are live, code and link coupons that are live and entered, and forced ones. */
function liveCoupons(state: AppState, opts: PreviewOptions): LiveCoupon[] {
  if (!isModuleOn(state, 'smart-coupons')) return []
  const out: LiveCoupon[] = []
  for (const base of state.coupons) {
    const e = effectiveCoupon(state, base)
    const forced = opts.forcedCouponIds.includes(base.id)
    const c = forced && !e.live ? base : e.offer
    const entered = c.method !== 'automatic' && opts.codes.includes(c.code.toUpperCase())
    if (forced || (e.live && (c.method === 'automatic' || entered))) out.push({ coupon: c, campaignId: e.campaign?.id ?? null, campaignName: e.campaign?.name ?? null })
  }
  return out
}

interface LiveRule {
  rule: BogoRule
  campaignId: string | null
  campaignName: string | null
}

/** Rules live on their own: controlled by a live campaign, or everyday-active and not tied to a code coupon. */
function liveRules(state: AppState): LiveRule[] {
  if (!isModuleOn(state, 'bogo')) return []
  const out: LiveRule[] = []
  for (const base of state.bogoRules) {
    const e = effectiveRule(state, base)
    if (e.version === 'campaign') out.push({ rule: e.offer, campaignId: e.campaign!.id, campaignName: e.campaign!.name })
    else if (e.live && !bogoOnlyWithCoupon(state, base) && bogoStatus(state, base) === 'active') out.push({ rule: e.offer, campaignId: null, campaignName: null })
  }
  return out
}

function liveBumps(state: AppState): { bump: OrderBump; campaignName: string | null }[] {
  if (!isModuleOn(state, 'order-bump')) return []
  return state.orderBumps
    .map((b) => effectiveBump(state, b))
    .filter((e) => e.live)
    .map((e) => ({ bump: e.offer, campaignName: e.campaign?.name ?? null }))
}

// ---------- scope checks ----------

function couponCovers(c: SmartCoupon, p: Product, state: AppState): boolean {
  if (c.type === 'buyXGetY') {
    const r = state.bogoRules.find((x) => x.id === c.bogoRuleId)
    return r ? scopeCovers(r.buyScope, p, state) : false
  }
  if (c.excludeOnSale && hasCountdownNow(state, p.id)) return false
  if (c.appliesTo.kind === 'store') return true
  if (c.appliesTo.kind === 'categories') return c.appliesTo.categories.includes(p.category)
  return c.appliesTo.products.includes(p.id)
}

function scopeCovers(scope: string, p: Product, state: AppState): boolean {
  if (state.categories.includes(scope)) return p.category === scope
  return p.id === scope
}

// ---------- base price (rule 2) ----------

export function basePrice(state: AppState, p: Product): { unit: number; label: string | null } {
  if (!isModuleOn(state, 'countdown')) return { unit: p.price, label: null }
  for (const c of liveCampaigns(state)) {
    if (c.campaignPrice && scopeProductIds(state, c.campaignPrice).includes(p.id)) {
      return { unit: round2(p.price * (1 - c.campaignPrice.percent / 100)), label: `Campaign price ${c.campaignPrice.percent}%` }
    }
  }
  if (p.ownCountdown && p.ownCountdown.end >= nowOf(state)) {
    return { unit: round2(p.price * (1 - p.ownCountdown.percent / 100)), label: `Countdown ${p.ownCountdown.percent}%` }
  }
  return { unit: p.price, label: null }
}

function eligible(c: SmartCoupon, lines: CartLine[], state: AppState): { subtotal: number; qty: number } {
  let subtotal = 0
  let qty = 0
  for (const l of lines) {
    const p = state.products.find((x) => x.id === l.productId)!
    if (!couponCovers(c, p, state)) continue
    subtotal += basePrice(state, p).unit * l.qty
    qty += l.qty
  }
  return { subtotal, qty }
}

function minimumMet(c: SmartCoupon, lines: CartLine[], state: AppState): boolean {
  if (c.minimum.kind === 'none') return true
  const e = eligible(c, lines, state)
  return c.minimum.kind === 'subtotal' ? e.subtotal >= c.minimum.value : e.qty >= c.minimum.value
}

function bogoCandidate(state: AppState, r: BogoRule, p: Product, qty: number, base: Omit<Candidate, 'discount' | 'bonus' | 'combinable'>): Candidate | null {
  if (!scopeCovers(r.buyScope, p, state)) return null
  const sets = Math.floor(qty / r.buyQty)
  if (sets === 0) return null
  const gift = state.categories.includes(r.getScope) ? state.products.find((x) => x.category === r.getScope) ?? p : state.products.find((x) => x.id === r.getScope) ?? p
  const percentOff = r.getDiscount === 'free' ? 100 : r.getPercent
  const bonusQty = sets * r.getQty
  const unitBase = basePrice(state, gift).unit
  return { ...base, combinable: false, discount: unitBase * bonusQty * (percentOff / 100), bonus: { product: gift, qty: bonusQty, percentOff, unitBase } }
}

// ---------- main ----------

export function priceCart(state: AppState, lines: CartLine[], opts: PreviewOptions): CartResult {
  const coupons = liveCoupons(state, opts)
  const rules = liveRules(state)
  const products = lines.map((l) => state.products.find((x) => x.id === l.productId)!)
  const bases = products.map((p) => basePrice(state, p))
  const grossOf = (i: number) => bases[i].unit * lines[i].qty

  // Fixed-cart coupons: total of eligible line prices, gift lines left out (they are bonus lines, not cart lines).
  const fixedTotals = new Map<string, number>()
  for (const { coupon: c } of coupons) {
    if (c.type !== 'fixed' || !minimumMet(c, lines, state)) continue
    fixedTotals.set(c.id, lines.reduce((s, _l, i) => (couponCovers(c, products[i], state) ? s + grossOf(i) : s), 0))
  }

  // Pass 1: candidates per line and the referee's choice.
  const perLine: { candidates: Candidate[]; applied: Candidate[]; competing: Candidate[]; caption: string | null; losers: string[] }[] = []
  for (let i = 0; i < lines.length; i++) {
    const p = products[i]
    const gross = grossOf(i)
    const candidates: Candidate[] = []
    for (const { coupon: c, campaignId, campaignName } of coupons) {
      if (!couponCovers(c, p, state) || !minimumMet(c, lines, state)) continue
      const common = { id: `coupon:${c.id}`, title: c.title, moduleName: MODULE_NAMES['smart-coupons'], campaignId, campaignName, fromCampaignOrCoupon: true, combinable: c.combinable.withStoreGrowthDeals, code: c.method === 'automatic' ? null : c.code.toUpperCase(), fixedCartId: null as string | null }
      if (c.type === 'percentage') candidates.push({ ...common, discount: gross * (c.value / 100) })
      else if (c.type === 'fixed') {
        const total = fixedTotals.get(c.id) ?? 0
        if (total > 0) candidates.push({ ...common, fixedCartId: c.id, discount: (c.value * gross) / total })
      } else if (c.type === 'tiers') {
        const tier = [...c.tiers].sort((a, b) => b.qty - a.qty).find((t) => eligible(c, lines, state).qty >= t.qty)
        if (tier) candidates.push({ ...common, discount: gross * (tier.percent / 100) })
      } else if (c.type === 'buyXGetY' && isModuleOn(state, 'bogo')) {
        const r = state.bogoRules.find((x) => x.id === c.bogoRuleId)
        if (r) {
          const cand = bogoCandidate(state, effectiveRule(state, r).offer, p, lines[i].qty, { ...common, moduleName: `${MODULE_NAMES['smart-coupons']} · ${MODULE_NAMES.bogo}` })
          if (cand) candidates.push(cand)
        }
      }
    }
    for (const { rule: r, campaignId, campaignName } of rules) {
      const moduleName = r.owner === 'vendor' ? `${MODULE_NAMES.bogo} · Vendor: ${r.vendorName}` : MODULE_NAMES.bogo
      const cand = bogoCandidate(state, r, p, lines[i].qty, { id: `bogo:${r.id}`, title: r.name, moduleName, campaignId, campaignName, fromCampaignOrCoupon: campaignId !== null, code: null, fixedCartId: null })
      if (cand) candidates.push(cand)
    }

    const refereeActs = candidates.some((c) => c.fromCampaignOrCoupon)
    let applied: Candidate[]
    let competing: Candidate[] = []
    let caption: string | null = null
    const losers: string[] = []
    if (!refereeActs) {
      applied = candidates
    } else {
      competing = candidates.filter((c) => !c.combinable).sort((a, b) => b.discount - a.discount)
      const stacking = candidates.filter((c) => c.combinable)
      applied = competing.length ? [competing[0], ...stacking] : stacking
      if (competing.length > 1) {
        caption = `Larger deal applied: ${competing[0].title}`
        losers.push(...competing.slice(1).map((c) => c.title))
      }
    }
    perLine.push({ candidates, applied, competing, caption, losers })
  }

  // Pass 2: a fixed-cart coupon's share on losing lines moves to the lines where it applies, capped at their value.
  for (const [couponId, total] of fixedTotals) {
    if (total <= 0) continue
    const value = coupons.find((c) => c.coupon.id === couponId)!.coupon.value
    const winning = perLine.map((pl, i) => ({ pl, i, cand: pl.applied.find((a) => a.fixedCartId === couponId) })).filter((x) => x.cand)
    if (winning.length === 0) continue
    const winTotal = winning.reduce((s, w) => s + grossOf(w.i), 0)
    for (const w of winning) {
      const others = w.pl.applied.filter((a) => a !== w.cand && !a.bonus).reduce((s, a) => s + a.discount, 0)
      w.cand!.discount = Math.min((value * grossOf(w.i)) / winTotal, grossOf(w.i) - others)
    }
  }

  // Build lines, steps and captions.
  const priced: PricedLine[] = []
  const bonusLines: BonusLine[] = []
  for (let i = 0; i < lines.length; i++) {
    const p = products[i]
    const base = bases[i]
    const gross = grossOf(i)
    const { applied, losers } = perLine[i]
    let { caption } = perLine[i]
    if (!caption && applied.length + (base.label ? 1 : 0) >= 2) caption = 'Deals combined'
    const steps: PriceStep[] = [{ label: null, unit: p.price }]
    if (base.label) steps.push({ label: base.label, unit: base.unit })
    let discount = 0
    let unit = base.unit
    for (const a of applied) {
      if (a.bonus) {
        bonusLines.push({ product: a.bonus.product, qty: a.bonus.qty, percentOff: a.bonus.percentOff, unitBase: a.bonus.unitBase, unit: round2(a.bonus.unitBase * (1 - a.bonus.percentOff / 100)), title: a.title, moduleName: a.moduleName, campaignId: a.campaignId, campaignName: a.campaignName })
      } else {
        discount += a.discount
        unit = round2(unit - a.discount / lines[i].qty)
        steps.push({ label: a.title, unit })
      }
    }
    discount = Math.min(discount, gross)
    priced.push({ product: p, qty: lines[i].qty, regular: p.price, base: base.unit, baseLabel: base.label, unit, gross, net: round2(gross - discount), steps, applied, caption, losers })
  }

  // Rule 9: a code that loses on every line it applies to is removed. Rule 4: two codes that can't combine keep the larger.
  const rejected: { code: string; notice: string }[] = []
  const codeCoupons = coupons.filter((c) => c.coupon.method !== 'automatic' && opts.codes.includes(c.coupon.code.toUpperCase()))
  const savings = new Map<string, number>()
  for (const { coupon: c } of codeCoupons) {
    const code = c.code.toUpperCase()
    const onLines = perLine.filter((pl) => pl.candidates.some((x) => x.code === code))
    if (onLines.length === 0) continue
    const wonLines = onLines.filter((pl) => pl.applied.some((x) => x.code === code))
    if (wonLines.length === 0) {
      const winner = onLines[0].competing[0]?.title ?? 'another deal'
      rejected.push({ code, notice: `${code} wasn't applied because ${winner} saves you more.` })
      continue
    }
    savings.set(code, wonLines.reduce((s, pl) => s + pl.applied.filter((x) => x.code === code).reduce((t, x) => t + x.discount, 0), 0))
  }
  const clashing = codeCoupons.filter((c) => savings.has(c.coupon.code.toUpperCase()) && !c.coupon.combinable.withStoreGrowthDeals)
  if (clashing.length > 1) {
    const sorted = [...clashing].sort((a, b) => savings.get(b.coupon.code.toUpperCase())! - savings.get(a.coupon.code.toUpperCase())!)
    const kept = sorted[0].coupon.code.toUpperCase()
    for (const c of sorted.slice(1)) rejected.push({ code: c.coupon.code.toUpperCase(), notice: `Only one of these coupons can be used. We kept ${kept}, which saves you more.` })
  }

  const nudges: string[] = []
  for (const { coupon: c } of coupons) {
    if (c.minimum.kind !== 'subtotal' || minimumMet(c, lines, state)) continue
    const have = eligible(c, lines, state).subtotal
    if (have === 0) continue
    nudges.push(`Add ${fmtMoney(c.minimum.value - have)} more to unlock ${c.type === 'percentage' ? `${c.value}% off` : c.title}`)
  }

  // Order Bumps (rule 5): offered when a target product is in the cart; the discount applies only to the bump line.
  const cartIds = lines.map((l) => l.productId)
  const bumpOffers: BumpOffer[] = liveBumps(state)
    .filter(({ bump: b }) => scopeProductIds(state, b.targets).some((id) => cartIds.includes(id)) && !cartIds.includes(b.offerProductId))
    .map(({ bump: b, campaignName }) => {
      const product = state.products.find((p) => p.id === b.offerProductId)!
      const base = basePrice(state, product)
      const unit = round2(base.unit * (1 - b.discountPercent / 100))
      const steps: PriceStep[] = [{ label: null, unit: product.price }]
      if (base.label) steps.push({ label: base.label, unit: base.unit })
      steps.push({ label: 'bump', unit })
      return { bump: b, product, steps, unit, caption: base.label ? 'Deals combined' : null, campaignName }
    })
  const tickedBumps = bumpOffers.filter((o) => opts.tickedBumpIds.includes(o.bump.id))

  const regularTotal = priced.reduce((s, l) => s + l.regular * l.qty, 0) + tickedBumps.reduce((s, b) => s + b.product.price, 0)
  const lineNet = priced.reduce((s, l) => s + l.net, 0)
  const bonusCharge = bonusLines.reduce((s, b) => s + b.unit * b.qty, 0)
  const bumpNet = tickedBumps.reduce((s, b) => s + b.unit, 0)
  const subtotal = round2(lineNet + bonusCharge + bumpNet)

  // Cart Rewards (rule 6): thresholds use the subtotal after discounts. Milestones over the Free limit are paused.
  const pausedMs = freeLimitPaused(state, 'cart-rewards')
  const milestones = isModuleOn(state, 'cart-rewards') ? [...state.cartRewards.milestones].filter((m) => !pausedMs.has(m.id)).sort((a, b) => a.threshold - b.threshold) : []
  const reached = milestones.filter((m) => subtotal >= m.threshold)
  const next = milestones.find((m) => subtotal < m.threshold) ?? null
  const barText = next ? state.cartRewards.barCopy.replace('{remaining}', fmtMoney(next.threshold - subtotal)).replace('{reward}', rewardLabel(state, next.reward)) : milestones.length ? 'All rewards unlocked' : ''
  const barPct = next ? Math.min(100, (subtotal / next.threshold) * 100) : 100
  const gifts = reached.flatMap((m) => {
    const r = m.reward
    return r.kind === 'gift' ? [state.products.find((p) => p.id === r.productId)!] : []
  })
  const freeShipping = reached.some((m) => m.reward.kind === 'freeShipping')
  const unlockedCoupons = reached.flatMap((m) => {
    const r = m.reward
    return r.kind === 'coupon' ? state.coupons.filter((c) => c.id === r.couponId) : []
  })

  return { lines: priced, bonusLines, bumpOffers, tickedBumps, gross: round2(regularTotal), discount: round2(regularTotal - subtotal), subtotal, reached, next, barText, barPct, gifts, freeShipping, unlockedCoupons, nudges, rejected }
}

/** Live campaigns that change prices: the ones cart notices talk about. */
export function livePriceCampaigns(state: AppState): { id: string; name: string }[] {
  return liveCampaigns(state)
    .filter((c) => c.offerRefs.length > 0 || c.campaignPrice)
    .map((c) => ({ id: c.id, name: c.name }))
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
