// Seed data for the StoreGrowth 3.1 prototype. Matches brief v3.1 section 8.
// Everything here is sample data. Numbers are literal so reviewers can edit by hand.

import type { AppState, BogoRule, Campaign, CartRewardsConfig, Module, Order, OrderBump, Product, Settings, SmartCoupon } from '../types'

/** Seed prototype time. "Reset time" returns here. */
export const SEED_NOW = '2026-11-06T10:00'
export const SITE_TIMEZONE = 'America/New_York'
export const LICENCE_EXPIRES_AT = '2026-12-04T00:00'

export const categories = ['Jackets', 'Boots', 'Accessories']

export const products: Product[] = [
  { id: 'p-jacket', name: 'Field Jacket', price: 120, category: 'Jackets', ownCountdown: { percent: 10, end: '2026-12-31T23:59' }, vendor: null },
  { id: 'p-boots', name: 'Trail Boots', price: 95, category: 'Boots', ownCountdown: null, vendor: null },
  { id: 'p-beanie', name: 'Wool Beanie', price: 25, category: 'Accessories', ownCountdown: null, vendor: null },
  { id: 'p-scarf', name: 'Scarf', price: 30, category: 'Accessories', ownCountdown: null, vendor: null },
  { id: 'p-gloves', name: 'Leather Gloves', price: 40, category: 'Accessories', ownCountdown: { percent: 20, end: '2026-12-31T23:59' }, vendor: null },
  { id: 'p-socks', name: 'Wool Socks', price: 15, category: 'Accessories', ownCountdown: null, vendor: 'North Trail Co.' },
]

/** Seed fact: how many products in each category are already on sale in WooCommerce. */
export const onSaleCountByCategory: Record<string, number> = { Jackets: 3 }

export const modules: Module[] = [
  { id: 'smart-coupons', name: 'Smart Coupons', active: true, role: 'offer', adds: 'Coupons with codes, links, limits and eligibility.' },
  { id: 'bogo', name: 'BOGO', active: true, role: 'offer', adds: 'Buy X get Y deals.' },
  { id: 'order-bump', name: 'Upsell Order Bump', active: true, role: 'offer', adds: 'A one-click add-on at checkout.' },
  { id: 'countdown', name: 'Countdown Timer', active: true, role: 'both', adds: 'A countdown strip on product pages, and the campaign price.' },
  { id: 'cart-rewards', name: 'Cart Rewards', active: true, role: 'surface', adds: 'Milestones like free shipping and gifts, with a progress bar.' },
  { id: 'floating-bar', name: 'Floating Notification Bar', active: true, role: 'surface', adds: 'A bar at the top of the store with your message.' },
  { id: 'stock-bar', name: 'Stock Count Bar', active: false, role: 'surface', adds: 'A stock scarcity bar on product pages.' },
  { id: 'sales-pop', name: 'Live Sales Notification', active: true, role: 'surface', adds: 'A toast showing recent purchases.' },
  { id: 'fly-cart', name: 'Fly Cart', active: true, role: 'surface', adds: 'A slide-in cart with your message.' },
  { id: 'direct-checkout', name: 'Direct Checkout', active: true, role: 'none', adds: 'Skips the cart page.' },
  { id: 'quick-view', name: 'Quick View', active: true, role: 'none', adds: 'A product modal on shop pages.' },
]

const baseCoupon = {
  tiers: [] as { qty: number; percent: number }[],
  bogoRuleId: null,
  code: '',
  minimum: { kind: 'none' as const, value: 0 },
  eligibility: 'all' as const,
  usesPerCustomer: false,
  totalUses: 0,
  excludeOnSale: false,
  combinable: { withStoreGrowthDeals: false, withOtherCoupons: false },
  dates: { start: null, end: null },
  origin: 'everyday' as const,
  campaignOnlyOf: null,
  uses: 0,
  discountGiven: 0,
}

function campaignOnly(campaignId: string) {
  return { origin: 'campaignOnly' as const, campaignOnlyOf: campaignId }
}

export const coupons: SmartCoupon[] = [
  { ...baseCoupon, ...campaignOnly('cmp-bf2026'), id: 'c-outerwear', createdAt: '2026-10-20T09:00', title: '30% off Outerwear', type: 'percentage', value: 30, method: 'automatic', appliesTo: { kind: 'categories', categories: ['Jackets', 'Boots'], products: [] }, minimum: { kind: 'subtotal', value: 80 } },
  { ...baseCoupon, ...campaignOnly('cmp-winter'), id: 'c-winter', createdAt: '2026-11-02T09:00', title: '15% off Outerwear', type: 'percentage', value: 15, method: 'automatic', appliesTo: { kind: 'categories', categories: ['Jackets', 'Boots'], products: [] } },
  { ...baseCoupon, ...campaignOnly('cmp-eid'), id: 'c-eid15', createdAt: '2026-05-25T09:00', title: 'EID15', type: 'percentage', value: 15, method: 'code', code: 'EID15', appliesTo: { kind: 'store', categories: [], products: [] }, uses: 58, discountGiven: 437 },
  { ...baseCoupon, ...campaignOnly('cmp-halloween'), id: 'c-halloween', createdAt: '2026-10-25T09:00', title: '20% off storewide', type: 'percentage', value: 20, method: 'automatic', appliesTo: { kind: 'store', categories: [], products: [] }, uses: 118, discountGiven: 1228 },
  {
    ...baseCoupon,
    ...campaignOnly('cmp-b2s'),
    id: 'c-b2s',
    createdAt: '2026-08-10T09:00',
    title: 'Buy 3 save 15%',
    type: 'tiers',
    value: 0,
    tiers: [
      { qty: 3, percent: 15 },
      { qty: 5, percent: 20 },
    ],
    method: 'automatic',
    appliesTo: { kind: 'store', categories: [], products: [] },
    uses: 64,
    discountGiven: 575,
  },
  { ...baseCoupon, ...campaignOnly('cmp-summer'), id: 'c-summer', createdAt: '2026-07-15T09:00', title: '40% off Summer', type: 'percentage', value: 40, method: 'automatic', appliesTo: { kind: 'categories', categories: ['Accessories'], products: [] }, uses: 32, discountGiven: 1153 },
  { ...baseCoupon, id: 'c-bfboots', createdAt: '2026-08-01T09:00', title: 'BF Boots', type: 'buyXGetY', value: 0, bogoRuleId: 'r-boots', method: 'automatic', appliesTo: { kind: 'categories', categories: ['Boots'], products: [] } },
  { ...baseCoupon, id: 'c-scarfduo', createdAt: '2026-09-01T09:00', title: 'SCARFDUO', type: 'buyXGetY', value: 0, bogoRuleId: 'r-scarf', method: 'code', code: 'SCARFDUO', appliesTo: { kind: 'products', categories: [], products: ['p-scarf'] }, dates: { start: '2026-10-01T00:00', end: '2026-12-31T23:59' }, uses: 12, discountGiven: 180 },
  { ...baseCoupon, id: 'c-next10', createdAt: '2026-10-01T09:00', title: '10% off your next item', type: 'percentage', value: 10, method: 'code', code: 'NEXT10', appliesTo: { kind: 'store', categories: [], products: [] }, dates: { start: '2026-10-01T00:00', end: null }, uses: 23, discountGiven: 96 },
  { ...baseCoupon, id: 'c-save30', createdAt: '2026-10-15T09:00', title: 'SAVE30', type: 'fixed', value: 30, method: 'code', code: 'SAVE30', appliesTo: { kind: 'store', categories: [], products: [] }, dates: { start: '2026-10-15T00:00', end: null }, uses: 41, discountGiven: 1230 },
]

const everyday = { origin: 'everyday' as const, campaignOnlyOf: null }

export const bogoRules: BogoRule[] = [
  { ...everyday, id: 'r-boots', createdAt: '2026-07-01T09:00', name: 'Buy 2 boots get 1 free', level: 'storeWide', owner: 'admin', vendorName: null, buyQty: 2, buyScope: 'Boots', getQty: 1, getScope: 'Boots', getDiscount: 'free', getPercent: 100, status: 'off', usedByCouponId: 'c-bfboots' },
  { ...everyday, id: 'r-scarf', createdAt: '2026-08-20T09:00', name: 'Buy 1 scarf get 1 at 50%', level: 'product', owner: 'admin', vendorName: null, buyQty: 1, buyScope: 'p-scarf', getQty: 1, getScope: 'p-scarf', getDiscount: 'percent', getPercent: 50, status: 'active', usedByCouponId: 'c-scarfduo' },
  { ...everyday, id: 'r-beanie', createdAt: '2026-10-10T09:00', name: 'Buy 1 beanie get 1 at 50%', level: 'product', owner: 'admin', vendorName: null, buyQty: 1, buyScope: 'p-beanie', getQty: 1, getScope: 'p-beanie', getDiscount: 'percent', getPercent: 50, status: 'off', usedByCouponId: null },
  { ...everyday, id: 'r-socks', createdAt: '2026-09-12T09:00', name: 'Buy 2 socks get 1 free', level: 'product', owner: 'vendor', vendorName: 'North Trail Co.', buyQty: 2, buyScope: 'p-socks', getQty: 1, getScope: 'p-socks', getDiscount: 'free', getPercent: 100, status: 'active', usedByCouponId: null },
]

export const orderBumps: OrderBump[] = [
  { ...everyday, id: 'ob-gloves', createdAt: '2026-09-05T09:00', name: 'Add Leather Gloves, 25% off', targets: { categories: ['Jackets'], products: [] }, offerProductId: 'p-gloves', discountPercent: 25, status: 'active' },
  { ...everyday, id: 'ob-socks', createdAt: '2026-09-20T09:00', name: 'Add Wool Socks, 20% off', targets: { categories: ['Boots'], products: [] }, offerProductId: 'p-socks', discountPercent: 20, status: 'active' },
]

export const cartRewards: CartRewardsConfig = {
  milestones: [
    { id: 'm-80', threshold: 80, reward: { kind: 'freeShipping' } },
    { id: 'm-150', threshold: 150, reward: { kind: 'gift', productId: 'p-beanie' } },
    { id: 'm-200', threshold: 200, reward: { kind: 'coupon', couponId: 'c-next10' } },
  ],
  barCopy: 'Add {remaining} more for {reward}',
  placement: 'both',
  shippingZones: [
    { name: 'United States', hasFreeShippingMethod: true },
    { name: 'Rest of world', hasFreeShippingMethod: false },
  ],
}

function baseline(revenue: number, orders: number, lift: number) {
  const aov = revenue / orders
  return { aov: Math.round((aov / (1 + lift / 100)) * 100) / 100, revenue: Math.round(revenue * 1.6) }
}

const noScope = { mode: 'derived' as const, categories: [], products: [] }
const attached = (moduleId: 'smart-coupons' | 'bogo' | 'order-bump', offerId: string) => ({ moduleId, offerId, mode: 'attached' as const, override: null })
const ownOffer = (moduleId: 'smart-coupons' | 'bogo' | 'order-bump', offerId: string) => ({ moduleId, offerId, mode: 'campaignOnly' as const, override: null })

export const campaigns: Campaign[] = [
  {
    id: 'cmp-boots',
    name: 'November Boots Week',
    templateId: 'flash-sale',
    status: 'running',
    start: '2026-11-03T00:00',
    end: '2026-11-09T23:59',
    offerRefs: [attached('bogo', 'r-boots')],
    campaignPrice: null,
    surfaces: { countdown: { enabled: true }, floatingBar: { enabled: true }, flyCart: { enabled: true }, badge: { enabled: true } },
    productScope: noScope,
    linkSlug: 'boots-week',
    message: 'Buy 2 boots, get 1 free. Ends Sunday.',
    baseline: baseline(2140, 47, 22),
    storeDuring: { revenue: 3420, dailyChangePct: 38 },
    publishedOn: '2026-11-02',
    metrics: {
      revenue: 2140,
      orders: 47,
      acceptance: 41,
      aovLift: 22,
      bySurface: { 'Fly cart': 18, 'Floating bar': 11, Countdown: 9, Badge: 5, Link: 3, Direct: 1 },
      byDay: [
        { date: '2026-11-03', revenue: 380 },
        { date: '2026-11-04', revenue: 520 },
        { date: '2026-11-05', revenue: 610 },
        { date: '2026-11-06', revenue: 630 },
      ],
    },
  },
  {
    id: 'cmp-freeship',
    name: 'Free shipping, always on',
    templateId: 'always-on-free-shipping',
    status: 'running',
    start: '2026-11-01T00:00',
    end: null,
    offerRefs: [],
    campaignPrice: null,
    surfaces: { cartRewardsBar: { enabled: true }, flyCart: { enabled: true } },
    productScope: { mode: 'manual', categories: ['Jackets', 'Boots', 'Accessories'], products: [] },
    linkSlug: 'free-shipping',
    message: 'Free shipping on orders over $80.',
    baseline: baseline(6380, 151, 9),
    storeDuring: null,
    publishedOn: '2026-10-31',
    metrics: { revenue: 6380, orders: 151, acceptance: 57, aovLift: 9, bySurface: { 'Fly cart': 64, 'Cart Rewards bar': 58, Link: 4, Direct: 25 }, byDay: [] },
  },
  {
    id: 'cmp-bf2026',
    name: 'Black Friday 2026',
    templateId: 'black-friday',
    status: 'draft',
    start: '2026-11-27T00:00',
    end: '2026-12-01T23:59',
    offerRefs: [ownOffer('smart-coupons', 'c-outerwear'), attached('bogo', 'r-beanie')],
    campaignPrice: null,
    surfaces: { countdown: { enabled: true }, floatingBar: { enabled: true }, stockBar: { enabled: true }, salesPop: { enabled: true }, flyCart: { enabled: true }, badge: { enabled: true } },
    productScope: noScope,
    linkSlug: 'bf2026',
    message: '30% off outerwear. Four days only.',
    baseline: { aov: 64.2, revenue: 9870 },
    storeDuring: null,
    metrics: null,
  },
  {
    id: 'cmp-winter',
    name: 'Winter Outerwear 15%',
    templateId: 'blank',
    status: 'scheduled',
    start: '2026-11-20T00:00',
    end: '2026-12-06T23:59',
    offerRefs: [ownOffer('smart-coupons', 'c-winter')],
    campaignPrice: null,
    surfaces: { floatingBar: { enabled: true }, badge: { enabled: true } },
    productScope: noScope,
    linkSlug: 'winter-outerwear',
    message: '15% off outerwear all winter.',
    baseline: { aov: 61.5, revenue: 9120 },
    storeDuring: null,
    publishedOn: '2026-11-05',
    metrics: { revenue: 0, orders: 0, acceptance: 0, aovLift: 0, bySurface: {}, byDay: [] },
  },
  {
    id: 'cmp-halloween',
    name: 'Halloween Flash',
    templateId: 'flash-sale',
    status: 'ended',
    start: '2026-10-29T00:00',
    end: '2026-10-31T23:59',
    endedOn: '2026-10-31',
    offerRefs: [ownOffer('smart-coupons', 'c-halloween')],
    campaignPrice: null,
    surfaces: { countdown: { enabled: true }, floatingBar: { enabled: true }, badge: { enabled: true }, salesPop: { enabled: true }, flyCart: { enabled: true } },
    productScope: noScope,
    linkSlug: 'halloween',
    message: '20% off everything until midnight.',
    baseline: baseline(4910, 118, 17),
    storeDuring: { revenue: 7950, dailyChangePct: 61 },
    publishedOn: '2026-10-27',
    metrics: {
      revenue: 4910,
      orders: 118,
      acceptance: 48,
      aovLift: 17,
      bySurface: { 'Fly cart': 46, 'Floating bar': 29, Countdown: 21, Badge: 12, Link: 6, Direct: 4 },
      byDay: [
        { date: '2026-10-29', revenue: 1420 },
        { date: '2026-10-30', revenue: 1690 },
        { date: '2026-10-31', revenue: 1800 },
      ],
    },
  },
  {
    id: 'cmp-b2s',
    name: 'Back to School',
    templateId: 'flash-sale',
    status: 'ended',
    start: '2026-08-18T00:00',
    end: '2026-09-02T23:59',
    endedOn: '2026-09-02',
    offerRefs: [ownOffer('smart-coupons', 'c-b2s')],
    campaignPrice: null,
    surfaces: { floatingBar: { enabled: true }, badge: { enabled: true }, flyCart: { enabled: true } },
    productScope: noScope,
    linkSlug: 'back-to-school',
    message: 'Buy 3, save 15%.',
    baseline: baseline(3260, 64, 26),
    storeDuring: { revenue: 9140, dailyChangePct: 12 },
    publishedOn: '2026-08-15',
    metrics: { revenue: 3260, orders: 64, acceptance: 33, aovLift: 26, bySurface: { 'Fly cart': 27, 'Floating bar': 19, Badge: 11, Link: 5, Direct: 2 }, byDay: [] },
  },
  {
    id: 'cmp-summer',
    name: 'Summer Clearance',
    templateId: 'clearance',
    status: 'ended',
    start: '2026-07-20T00:00',
    end: '2026-08-03T23:59',
    endedOn: '2026-08-03',
    offerRefs: [ownOffer('smart-coupons', 'c-summer')],
    campaignPrice: null,
    surfaces: { badge: { enabled: true }, stockBar: { enabled: true }, flyCart: { enabled: true }, floatingBar: { enabled: true } },
    productScope: noScope,
    linkSlug: 'summer-clearance',
    message: '40% off summer accessories while stock lasts.',
    baseline: baseline(1730, 32, -4),
    storeDuring: { revenue: 5020, dailyChangePct: -6 },
    publishedOn: '2026-07-18',
    metrics: { revenue: 1730, orders: 32, acceptance: 29, aovLift: -4, bySurface: { 'Fly cart': 12, 'Floating bar': 8, 'Stock bar': 7, Badge: 3, Link: 1, Direct: 1 }, byDay: [] },
  },
  {
    id: 'cmp-eid',
    name: 'Eid Sale',
    templateId: 'flash-sale',
    status: 'ended',
    start: '2026-06-01T00:00',
    end: '2026-06-07T23:59',
    endedOn: '2026-06-07',
    offerRefs: [ownOffer('smart-coupons', 'c-eid15')],
    campaignPrice: null,
    surfaces: { countdown: { enabled: true }, floatingBar: { enabled: true }, badge: { enabled: true } },
    productScope: noScope,
    linkSlug: 'eid',
    message: 'Use code EID15 for 15% off.',
    baseline: baseline(2480, 58, 11),
    storeDuring: { revenue: 4310, dailyChangePct: 19 },
    publishedOn: '2026-05-30',
    metrics: { revenue: 2480, orders: 58, acceptance: 36, aovLift: 11, bySurface: { 'Floating bar': 24, Countdown: 14, Badge: 9, Link: 8, Direct: 3 }, byDay: [] },
  },
  {
    id: 'cmp-spring',
    name: 'Spring Launch',
    templateId: 'launch-week',
    status: 'ended',
    start: '2026-03-10T00:00',
    end: '2026-03-16T23:59',
    endedOn: '2026-03-16',
    offerRefs: [],
    campaignPrice: null,
    surfaces: { countdown: { enabled: true }, floatingBar: { enabled: true }, badge: { enabled: true }, salesPop: { enabled: true } },
    productScope: { mode: 'manual', categories: ['Jackets'], products: [] },
    linkSlug: 'spring-launch',
    message: 'The new Field Jacket is here.',
    baseline: baseline(1120, 21, 3),
    storeDuring: { revenue: 2890, dailyChangePct: 5 },
    publishedOn: '2026-03-08',
    metrics: { revenue: 1120, orders: 21, acceptance: 0, aovLift: 3, bySurface: { 'Floating bar': 8, Countdown: 5, Badge: 4, Link: 3, Direct: 1 }, byDay: [] },
  },
]

/** Overall stats per date range for the Campaigns list header. */
export const overallStats = {
  'Last 90 days': { revenue: 18420, storeShare: 31, orders: 412, aovLift: 14, bestSurface: 'Fly cart', bestSurfaceShare: 38 },
  'Last 30 days': { revenue: 13430, storeShare: 34, orders: 316, aovLift: 16, bestSurface: 'Fly cart', bestSurfaceShare: 40 },
  'This year': { revenue: 22020, storeShare: 24, orders: 491, aovLift: 12, bestSurface: 'Fly cart', bestSurfaceShare: 36 },
}

export const orders: Order[] = [
  { id: 'o-1041', date: '2026-11-03', total: 190, items: [{ productId: 'p-boots', qty: 3 }], creditedCampaignId: 'cmp-boots', creditedSurface: 'Fly cart', source: 'offer' },
  { id: 'o-1042', date: '2026-11-03', total: 108, items: [{ productId: 'p-jacket', qty: 1 }], creditedCampaignId: 'cmp-freeship', creditedSurface: 'Cart Rewards bar', source: 'link' },
  { id: 'o-1043', date: '2026-11-04', total: 285, items: [{ productId: 'p-boots', qty: 3 }], creditedCampaignId: 'cmp-boots', creditedSurface: 'Floating bar', source: 'offer' },
  { id: 'o-1044', date: '2026-11-04', total: 55, items: [{ productId: 'p-beanie', qty: 1 }, { productId: 'p-scarf', qty: 1 }], creditedCampaignId: null, creditedSurface: 'Direct', source: 'none' },
  { id: 'o-1045', date: '2026-11-05', total: 190, items: [{ productId: 'p-boots', qty: 3 }], creditedCampaignId: 'cmp-boots', creditedSurface: 'Link', source: 'link' },
  { id: 'o-1046', date: '2026-11-06', total: 215, items: [{ productId: 'p-boots', qty: 2 }, { productId: 'p-scarf', qty: 1 }], creditedCampaignId: 'cmp-boots', creditedSurface: 'Countdown', source: 'offer' },
]

export const settings: Settings = {
  attributionWindowDays: 7,
  siteTimezone: SITE_TIMEZONE,
}

export function emptyCart(): AppState['preview'] {
  return { lines: [], tickedBumpIds: [], codes: [], forceOuterwear: false, seen: null, notices: [] }
}

export function makeSeedState(): AppState {
  // Deep-copy so "Reset seed" restores pristine data.
  return structuredClone({
    licence: 'pro',
    licenceExpiresAt: LICENCE_EXPIRES_AT,
    now: SEED_NOW,
    freeKeep: {},
    preview: emptyCart(),
    modules,
    moduleOffSince: { 'stock-bar': '2026-10-28' },
    campaigns,
    coupons,
    bogoRules,
    orderBumps,
    cartRewards,
    products,
    categories,
    orders,
    settings,
    toasts: [],
  }) as AppState
}
