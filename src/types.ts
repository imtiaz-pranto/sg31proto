// Data model for the StoreGrowth 3.1 prototype. See brief v2 section 4.

export type Licence = 'free' | 'pro' | 'proExpired'

export type ModuleId =
  | 'smart-coupons'
  | 'bogo'
  | 'order-bump'
  | 'countdown'
  | 'cart-rewards'
  | 'floating-bar'
  | 'stock-bar'
  | 'sales-pop'
  | 'fly-cart'
  | 'direct-checkout'
  | 'quick-view'

export type ModuleRole = 'offer' | 'surface' | 'both' | 'none'

export interface Module {
  id: ModuleId
  name: string
  active: boolean
  role: ModuleRole
  /** One line on what the module adds, shown on locked rows. */
  adds: string
}

/** Surfaces a campaign can switch on. Product Badge is owned by Campaigns itself. */
export type SurfaceId = 'countdown' | 'floatingBar' | 'stockBar' | 'salesPop' | 'flyCart' | 'cartRewardsBar' | 'badge'

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'ended'

export type OfferModuleId = 'smart-coupons' | 'bogo' | 'order-bump'

/** Identifies an offer by module and id. */
export interface OfferKey {
  moduleId: OfferModuleId
  offerId: string
}

/**
 * An offer inside a campaign. `mode` says whether it is an attached everyday offer or a campaign-only one.
 * `override` is the campaign version: only the values the campaign changes, or null for "Use as is".
 * The everyday version on the offer itself is never overwritten.
 */
export interface OfferRef extends OfferKey {
  mode: 'attached' | 'campaignOnly'
  override: Record<string, unknown> | null
}

/** Fields every offer has (brief v3.1 section 4). */
export interface OfferBase {
  origin: 'everyday' | 'campaignOnly'
  campaignOnlyOf: string | null
  createdAt: string
}

export interface SurfaceState {
  enabled: boolean
  messageOverride?: string
}

export interface ProductScope {
  mode: 'derived' | 'manual'
  categories: string[]
  products: string[]
}

export interface CampaignPrice {
  percent: number
  products: string[]
  categories: string[]
}

export interface DayPoint {
  date: string
  revenue: number
}

export interface CampaignMetrics {
  revenue: number
  orders: number
  acceptance: number
  aovLift: number
  bySurface: Record<string, number>
  byDay: DayPoint[]
}

export type TemplateId = 'flash-sale' | 'black-friday' | 'clearance' | 'launch-week' | 'always-on-free-shipping' | 'blank'

/** Date-times are ISO strings without zone, e.g. "2026-11-03T00:00", read in the site timezone. */
export interface Campaign {
  id: string
  name: string
  templateId: TemplateId
  status: CampaignStatus
  start: string | null
  end: string | null
  offerRefs: OfferRef[]
  campaignPrice: CampaignPrice | null
  surfaces: Partial<Record<SurfaceId, SurfaceState>>
  productScope: ProductScope
  linkSlug: string
  baseline: { aov: number; revenue: number }
  metrics: CampaignMetrics | null
  /** Store revenue in the window, as context only. Null for always-on, draft and scheduled campaigns. */
  storeDuring: { revenue: number; dailyChangePct: number } | null
  /** Campaign-level copy that surfaces inherit. */
  message: string
  pausedSince?: string
  endedOn?: string
  publishedOn?: string
  /** Readiness decisions the merchant already made. */
  onSaleDecision?: 'exclude' | 'stack'
  bogoOverlapDecision?: 'keep'
  countdownOverlapDecision?: 'ok'
}

export type CouponType = 'percentage' | 'fixed' | 'tiers' | 'buyXGetY'
export type CouponMethod = 'automatic' | 'code' | 'link'
export type CouponStatus = 'active' | 'scheduled' | 'inactive' | 'expired'
export type Eligibility = 'all' | 'firstTime' | 'returning' | 'roles'

export interface Tier {
  qty: number
  percent: number
}

export interface SmartCoupon extends OfferBase {
  id: string
  title: string
  type: CouponType
  value: number
  tiers: Tier[]
  bogoRuleId: string | null
  method: CouponMethod
  code: string
  appliesTo: { kind: 'categories' | 'products' | 'store'; categories: string[]; products: string[] }
  minimum: { kind: 'none' | 'subtotal' | 'quantity'; value: number }
  eligibility: Eligibility
  usesPerCustomer: boolean
  totalUses: number
  excludeOnSale: boolean
  combinable: { withStoreGrowthDeals: boolean; withOtherCoupons: boolean }
  /** Everyday dates. Campaign-only coupons keep both null; the campaign sets their window. */
  dates: { start: string | null; end: string | null }
  /** Seed-only reporting. */
  uses: number
  discountGiven: number
}

/** Fields a campaign version of a coupon may change. */
export type CouponEditable = Pick<SmartCoupon, 'title' | 'type' | 'value' | 'tiers' | 'bogoRuleId' | 'method' | 'code' | 'appliesTo' | 'minimum' | 'eligibility' | 'usesPerCustomer' | 'totalUses' | 'excludeOnSale' | 'combinable'>

export interface BogoRule extends OfferBase {
  id: string
  name: string
  level: 'storeWide' | 'product'
  owner: 'admin' | 'vendor'
  vendorName: string | null
  buyQty: number
  buyScope: string
  getQty: number
  getScope: string
  getDiscount: 'free' | 'percent'
  getPercent: number
  /** Everyday status. A campaign switches the rule on during its window even when this is off. "paused" is derived. */
  status: 'active' | 'off'
  usedByCouponId: string | null
}

export type BogoEditable = Pick<BogoRule, 'name' | 'buyQty' | 'buyScope' | 'getQty' | 'getScope' | 'getDiscount' | 'getPercent'>

export interface OrderBump extends OfferBase {
  id: string
  name: string
  targets: { categories: string[]; products: string[] }
  offerProductId: string
  discountPercent: number
  /** Everyday status. */
  status: 'active' | 'off'
}

export type BumpEditable = Pick<OrderBump, 'name' | 'targets' | 'offerProductId' | 'discountPercent'>

export interface Product {
  id: string
  name: string
  price: number
  category: string
  ownCountdown: { percent: number; end: string } | null
  vendor: string | null
}

export type MilestoneReward = { kind: 'freeShipping' } | { kind: 'coupon'; couponId: string } | { kind: 'gift'; productId: string }

export interface Milestone {
  id: string
  threshold: number
  reward: MilestoneReward
}

export interface ShippingZone {
  name: string
  hasFreeShippingMethod: boolean
}

export interface CartRewardsConfig {
  milestones: Milestone[]
  barCopy: string
  placement: 'flyCart' | 'cartPage' | 'both'
  shippingZones: ShippingZone[]
}

export interface Order {
  id: string
  date: string
  total: number
  items: { productId: string; qty: number }[]
  creditedCampaignId: string | null
  creditedSurface: string
  source: string
}

export interface Settings {
  attributionWindowDays: number
  siteTimezone: string
}

export interface Toast {
  id: number
  text: string
  action?: { label: string; to: string }
}

export interface CartLine {
  productId: string
  qty: number
}

/** The storefront preview cart. It lives in the store so it survives navigation and refresh. */
export interface PreviewCart {
  lines: CartLine[]
  tickedBumpIds: string[]
  codes: string[]
  forceOuterwear: boolean
  /** What the cart last showed: live price-changing campaigns and BOGO gifts. Null means "resync without notices". */
  seen: { live: { id: string; name: string }[]; gifts: { title: string; campaignId: string }[] } | null
  notices: string[]
}

export type FreeLimitModule = 'smart-coupons' | 'order-bump' | 'cart-rewards'

export interface AppState {
  licence: Licence
  licenceExpiresAt: string
  /** Prototype time in the site timezone. Every date-based behaviour reads it. */
  now: string
  /** Offers the merchant chose to keep on while over the Free limit, per module. Unset means oldest first. */
  freeKeep: Partial<Record<FreeLimitModule, string[]>>
  preview: PreviewCart
  modules: Module[]
  /** Date a module was turned off, keyed by module id. */
  moduleOffSince: Partial<Record<ModuleId, string>>
  campaigns: Campaign[]
  coupons: SmartCoupon[]
  bogoRules: BogoRule[]
  orderBumps: OrderBump[]
  cartRewards: CartRewardsConfig
  products: Product[]
  categories: string[]
  orders: Order[]
  settings: Settings
  toasts: Toast[]
}
