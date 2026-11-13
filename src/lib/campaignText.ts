// Generated copy and step state for the campaign page (brief v3.2, S2). No React here.
// Everything is worked out from the same store helpers the rest of the prototype uses,
// so the sentences always agree with the offer lifecycle and the prototype time.

import type { AppState, BogoRule, Campaign, CampaignPrice, OfferKey, OfferRef, OrderBump, SmartCoupon } from '../types'
import {
  activeSurfaces,
  bogoDetail,
  bumpDetail,
  campaignPriceCountdownClashes,
  campaignScope,
  couponDetail,
  daysBetween,
  everydayOn,
  fmtMoney,
  fmtShort,
  fmtShortDateTime,
  hasAnythingAttached,
  nowOf,
  offerOf,
  offerView,
  readinessChecks,
  addDays,
  todayOf,
  withOverride,
  type AnyOffer,
  type OfferView,
} from './derive'

// ---------- small text helpers ----------

/** "a", "a and b", "a, b and c" */
export function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "Nov 27 at 12:00 AM" */
export function fmtDateAtTime(iso: string): string {
  return fmtShortDateTime(iso).replace(', ', ' at ')
}

export function displayName(c: Campaign): string {
  return c.name.trim() || 'New campaign'
}

// ---------- schedule ----------

/** Calendar days a window covers, counting both ends. Nov 27 to Dec 1 is 5. */
export function runDays(start: string, end: string): number {
  return Math.max(1, daysBetween(start, end) + 1)
}

/** Every date in the window, as "YYYY-MM-DD". */
export function windowDates(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = start.slice(0, 10); d <= end.slice(0, 10) && out.length < 400; d = addDays(d, 1)) out.push(d)
  return out
}

/** "in 21 days", "tomorrow", "today", or null when the start has passed. */
export function startsIn(state: AppState, c: Campaign): string | null {
  if (!c.start || c.start <= nowOf(state)) return null
  const n = daysBetween(nowOf(state), c.start)
  return n === 0 ? 'today' : `in ${plural(n, 'day')}`
}

/** Share of the window that has passed, 0 to 100. */
export function progressPct(state: AppState, c: Campaign): number {
  if (!c.start || !c.end) return 0
  const s = Date.parse(c.start)
  const e = Date.parse(c.end)
  const n = Date.parse(nowOf(state))
  if (e <= s) return 100
  return Math.round(Math.min(1, Math.max(0, (n - s) / (e - s))) * 100)
}

// ---------- offers ----------

export interface OfferLine {
  key: OfferKey
  ref: OfferRef
  view: OfferView
  name: string
  attached: boolean
  customised: boolean
  /** Whether the everyday version is on right now. Always false for offers made for this campaign. */
  everydayOn: boolean
  /** "25% off": the everyday version in a few words. */
  everydayShort: string
  /** "40% off": the campaign version in a few words. */
  campaignShort: string
  /** The row's second line. */
  details: string
}

/** The everyday and campaign versions in a few words each, e.g. ["25% off", "40% off"]. */
function shortPair(state: AppState, key: OfferKey, everyday: AnyOffer, campaign: AnyOffer): [string, string] {
  if (key.moduleId === 'smart-coupons') return [couponDetail(everyday as SmartCoupon, state), couponDetail(campaign as SmartCoupon, state)]
  if (key.moduleId === 'bogo') {
    const a = everyday as BogoRule
    const b = campaign as BogoRule
    // When only the "get" side changes, say just that part.
    const sameBuy = a.buyQty === b.buyQty && a.buyScope === b.buyScope && a.getScope === b.getScope
    const get = (r: BogoRule) => `get ${r.getQty} ${r.getDiscount === 'free' ? 'free' : `at ${r.getPercent}% off`}`
    return sameBuy ? [get(a), get(b)] : [bogoDetail(state, a), bogoDetail(state, b)]
  }
  return [`${(everyday as OrderBump).discountPercent}% off`, `${(campaign as OrderBump).discountPercent}% off`]
}

function couponKeyDetails(state: AppState, c: SmartCoupon): string {
  const method = c.method === 'automatic' ? 'Automatic' : c.method === 'code' ? `Code ${c.code}` : 'Link'
  const applies =
    c.appliesTo.kind === 'store'
      ? 'Entire store'
      : c.appliesTo.kind === 'categories'
        ? listJoin(c.appliesTo.categories)
        : listJoin(c.appliesTo.products.map((id) => state.products.find((p) => p.id === id)?.name ?? id))
  const minimum = c.minimum.kind === 'subtotal' ? `orders over ${fmtMoney(c.minimum.value)}` : c.minimum.kind === 'quantity' ? `${c.minimum.value} or more items` : ''
  return [couponDetail(c, state), method, applies, minimum].filter(Boolean).join(' · ')
}

export function offerLines(state: AppState, c: Campaign): OfferLine[] {
  const out: OfferLine[] = []
  for (const ref of c.offerRefs) {
    const base = offerOf(state, ref)
    const view = offerView(state, ref, c)
    if (!base || !view) continue
    const key: OfferKey = { moduleId: ref.moduleId, offerId: ref.offerId }
    const effective = withOverride(base, ref)
    const attached = ref.mode === 'attached'
    const customised = attached && ref.override !== null
    const [everydayShort, campaignShort] = shortPair(state, key, base, effective)
    let details: string
    if (customised) details = '' // the row shows "Everyday: … · During this campaign: …" instead
    else if (key.moduleId === 'smart-coupons') details = couponKeyDetails(state, effective as SmartCoupon)
    else if (key.moduleId === 'bogo') details = [bogoDetail(state, effective as BogoRule), view.levelLabel].filter(Boolean).join(' · ')
    else details = bumpDetail(state, effective as OrderBump)
    out.push({ key, ref, view, name: view.title, attached, customised, everydayOn: attached && everydayOn(state, key, base), everydayShort, campaignShort, details })
  }
  return out
}

/** "made for this campaign", "attached, used as is", "attached, 40% off during the campaign" */
export function offerSummaryNote(o: OfferLine): string {
  if (!o.attached) return 'made for this campaign'
  if (!o.customised) return 'attached, used as is'
  return o.campaignShort !== o.everydayShort ? `attached, ${o.campaignShort} during the campaign` : 'attached, customised'
}

export function priceText(state: AppState, price: CampaignPrice): string {
  const names = [...price.categories, ...price.products.map((id) => state.products.find((p) => p.id === id)?.name ?? id)]
  const all = state.categories.length > 0 && state.categories.every((cat) => price.categories.includes(cat))
  return `${price.percent}% off ${all ? 'the entire store' : listJoin(names)}`
}

/** "Jackets, Boots, Wool Beanie", or "Entire store" when every category is in. */
export function productsText(state: AppState, c: Campaign): string {
  const scope = campaignScope(state, c)
  if (state.categories.length > 0 && state.categories.every((cat) => scope.categories.includes(cat))) return 'Entire store'
  return [...scope.categories, ...scope.products.map((id) => state.products.find((p) => p.id === id)?.name ?? id)].join(', ')
}

// ---------- draft: steps and the "Ready to publish?" checklist ----------

export function isEmptyDraft(c: Campaign): boolean {
  return !c.name.trim() && !c.start && !c.end && !hasAnythingAttached(c) && !Object.values(c.surfaces).some((s) => s?.enabled) && c.productScope.categories.length === 0 && c.productScope.products.length === 0
}

/** Which of the six steps are done (index 0 is step 1). */
export function stepsDone(state: AppState, c: Campaign): boolean[] {
  const scope = campaignScope(state, c)
  return [
    !!c.name.trim() && !!c.start,
    c.offerRefs.length > 0,
    c.campaignPrice !== null,
    scope.categories.length > 0 || scope.products.length > 0,
    activeSurfaces(state, c).length > 0,
    c.savedAt !== undefined,
  ]
}

export interface RequiredItem {
  id: 'noStart' | 'empty' | 'dates'
  done: boolean
  /** The task, shown while open. */
  label: string
  /** What it reads once done. */
  doneLabel: string
  link: string
  step: number
}

/** The blocking checks from readinessChecks, worded as tasks. The date-order item only shows while it fails. */
export function requiredItems(state: AppState, c: Campaign): RequiredItem[] {
  const open = new Set(readinessChecks(state, c).filter((k) => k.kind === 'blocking').map((k) => k.id))
  const items: RequiredItem[] = [
    { id: 'noStart', done: !open.has('noStart'), label: 'Set a start date', doneLabel: 'Start date set', link: 'Go to step 1', step: 1 },
    {
      id: 'empty',
      done: !open.has('empty'),
      label: 'Add an offer, a campaign price or a store display',
      doneLabel: c.offerRefs.length > 0 ? 'Offer attached' : c.campaignPrice ? 'Campaign price set' : 'Store display on',
      link: 'Go to steps 2, 3 or 5',
      step: 2,
    },
  ]
  if (open.has('dates')) items.push({ id: 'dates', done: false, label: 'End date is before start date', doneLabel: '', link: 'Go to step 1', step: 1 })
  return items
}

// ---------- "When it ends" and "When it ended" ----------

function backToEveryday(att: OfferLine[], past: boolean): string | null {
  if (att.length === 0) return null
  if (att.length === 1) return `${att[0].name} ${past ? 'went' : 'goes'} back to its everyday ${att[0].everydayOn ? 'version' : 'status, Off'}.`
  return `${listJoin(att.map((o) => o.name))} ${past ? 'went' : 'go'} back to their everyday versions.`
}

function priceEnds(state: AppState, c: Campaign): string | null {
  if (!c.campaignPrice) return null
  const clashes = campaignPriceCountdownClashes(state, c.campaignPrice).map((p) => p.name)
  if (clashes.length === 0) return 'The campaign price ends.'
  return `The campaign price ends, and ${listJoin(clashes)} ${clashes.length === 1 ? 'gets its' : 'get their'} own Countdown back.`
}

/** Draft, running and paused. `frozen` adds the report line for campaigns that have results. */
export function whenItEnds(state: AppState, c: Campaign, frozen: boolean): string {
  const lines = offerLines(state, c)
  if (lines.length === 0 && !c.campaignPrice) {
    if (!frozen) return 'Attached offers go back to their everyday versions. Offers made for this campaign stop.'
    return `${c.end === null ? 'There is no end date, so this happens when you end it. ' : ''}Store displays switch off. Results are frozen for the report.`
  }
  const att = lines.filter((o) => o.attached)
  const own = lines.filter((o) => !o.attached)
  const out: string[] = []
  if (c.start && c.end === null) out.push('There is no end date, so this happens when you end it.')
  const back = backToEveryday(att, false)
  if (back) out.push(back)
  if (own.length > 0) out.push(`${listJoin(own.map((o) => o.name))} ${own.length === 1 ? 'stops' : 'stop'}.`)
  const price = priceEnds(state, c)
  if (price) out.push(price)
  if (frozen) out.push('Results are frozen for the report.')
  return out.join(' ')
}

export function whenItEnded(state: AppState, c: Campaign): string {
  const lines = offerLines(state, c)
  const att = lines.filter((o) => o.attached)
  const own = lines.filter((o) => !o.attached)
  const displays = Object.values(c.surfaces).some((s) => s?.enabled)
  const out: string[] = []
  const back = backToEveryday(att, true)
  if (back) out.push(back)
  if (own.length > 0) out.push(`${listJoin(own.map((o) => o.name))} stopped${displays ? ' and every store display switched off' : ''}.`)
  else if (displays) out.push('Every store display switched off.')
  if (c.campaignPrice) out.push('The campaign price ended.')
  if (att.length === 0) out.push('No everyday offers were attached, so nothing else changed.')
  return out.join(' ')
}

// ---------- scheduled: "What happens when" ----------

export interface TimelinePoint {
  label: string
  text: string
  filled: boolean
}

export function whatHappensWhen(state: AppState, c: Campaign): TimelinePoint[] {
  if (!c.start) return []
  const lines = offerLines(state, c)
  const att = lines.filter((o) => o.attached)
  const own = lines.filter((o) => !o.attached)
  const displays = activeSurfaces(state, c).length

  // 1. Until the start: the everyday state.
  const before = ['Everyday offers run as normal.']
  for (const o of att) {
    if (!o.everydayOn) before.push(`${o.name} stays off.`)
    else if (o.customised && o.campaignShort !== o.everydayShort) before.push(`${o.name} stays at ${o.everydayShort}.`)
  }
  const dayBefore = addDays(c.start.slice(0, 10), -1)
  const beforeLabel = dayBefore > todayOf(state) ? `Now to ${fmtShort(dayBefore)}` : dayBefore === todayOf(state) ? 'Today' : 'Until it starts'

  // 2. The start: what switches on or changes.
  const at = ['Campaign takes over.']
  const switchOn = [...own, ...att.filter((o) => !o.everydayOn)].map((o) => o.name)
  if (switchOn.length > 0) at.push(`${listJoin(switchOn)} ${switchOn.length === 1 ? 'switches' : 'switch'} on.`)
  for (const o of att.filter((x) => x.everydayOn)) {
    if (!o.customised) at.push(`${o.name} keeps running as is.`)
    else at.push(o.campaignShort !== o.everydayShort ? `${o.name} goes to ${o.campaignShort}.` : `${o.name} switches to its campaign settings.`)
  }
  if (c.campaignPrice) at.push(`The campaign price starts: ${priceText(state, c.campaignPrice)}.`)
  if (lines.length === 0 && !c.campaignPrice && displays > 0) at.push(`${plural(displays, 'store display')} ${displays === 1 ? 'switches' : 'switch'} on.`)

  // 3. The end: what goes back or stops.
  const after: string[] = []
  if (c.end === null) after.push('It runs until you pause or end it.')
  else {
    if (att.length > 0) after.push('Everything goes back to everyday.')
    if (own.length > 0) after.push(`${listJoin(own.map((o) => o.name))} ${own.length === 1 ? 'stops' : 'stop'}.`)
    if (c.campaignPrice) after.push('The campaign price ends.')
    if (after.length === 0) after.push('Store displays switch off.')
  }

  return [
    { label: beforeLabel, text: before.join(' '), filled: true },
    { label: fmtShortDateTime(c.start), text: at.join(' '), filled: false },
    { label: c.end ? fmtShortDateTime(c.end) : 'No end date', text: after.join(' '), filled: false },
  ]
}

// ---------- ended ----------

/** "[Name] earned $2,140 from 47 orders. Average order value was 22% higher than the 30 days before." */
export function endedSentence(c: Campaign): string {
  const m = c.metrics
  if (!m || m.orders === 0) return `${displayName(c)} ended with no orders credited to it.`
  const lift = m.aovLift
  const aov = lift === 0 ? 'Average order value was the same as the 30 days before.' : `Average order value was ${Math.abs(lift)}% ${lift > 0 ? 'higher' : 'lower'} than the 30 days before.`
  return `${displayName(c)} earned ${fmtMoney(m.revenue)} from ${plural(m.orders, 'order')}. ${aov}`
}

/** The store display that led the most orders, leaving Direct out. */
export function topDisplay(c: Campaign): string | null {
  const entries = Object.entries(c.metrics?.bySurface ?? {}).filter(([k, v]) => k !== 'Direct' && v > 0)
  if (entries.length === 0) return null
  return displayLabel(entries.sort((a, b) => b[1] - a[1])[0][0])
}

/** Report names for the keys in metrics.bySurface. */
export function displayLabel(key: string): string {
  return key === 'Badge' ? 'Product badge' : key === 'Link' ? 'Campaign link' : key
}
