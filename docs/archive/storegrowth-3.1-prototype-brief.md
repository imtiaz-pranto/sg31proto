# StoreGrowth 3.1 prototype brief for Claude Code

Author: Imtiaz (PM). This brief is the spec. Build exactly what is here, ask before adding anything that is not.

## 1. What this is

A clickable prototype of the StoreGrowth 3.1 admin and the storefront pieces it controls. StoreGrowth is a WooCommerce plugin with a modular admin. 3.1 adds:

- **Campaigns**: a Pro-only, top-level page (not a module) that groups offers and surfaces from active modules under one schedule, one product scope and one report card.
- **Smart Coupons**: a new module, the coupon layer: method (automatic, code, link), limits, eligibility, combinations, schedule, plus its own math for percentage, fixed and quantity-tier discounts.
- **Cart Rewards**: the existing Free Shipping Rules module rebuilt as multi-milestone cart rewards.

The prototype exists to let stakeholders click through the merchant experience and to validate that the module-lock logic and the Campaigns vs Smart Coupons split read clearly. It is not a WordPress plugin and has no backend.

## 2. Stack and constraints

- Vite + React + TypeScript + Tailwind. React Router for pages. All state in memory with one mock store; no persistence, no API, no auth.
- One `PrototypeControls` panel (floating button, bottom right) that lets a reviewer flip: licence Free / Pro, and each module on / off (Smart Coupons, BOGO, Cart Rewards, Countdown Timer, Floating Notification Bar, Stock Count Bar, Live Sales Notification, Fly Cart, Upsell Order Bump). Every screen must react to these flips immediately. This panel is how the lock logic gets reviewed.
- Desktop first at 1360 wide, must not break at 1024. Sidebar stacks on narrower widths.
- Seed data lives in one file, `src/data/seed.ts`, matching section 8. Keep copy as literal strings in components so it can be edited by hand.
- No charting library needed. Chart areas are simple SVG bars or lines drawn from seed numbers.
- Do not write WooCommerce or PHP. Do not add features beyond this brief.

## 3. Frozen product rules

These are decisions, not suggestions. The prototype demonstrates each one.

1. **Campaigns is Pro-only and admin-only.** Free licence sees the Campaigns page in a locked preview state (section 5, S1 Free). No vendor or Dokan surfaces in 3.1.
2. **Link attribution window is 7 days**, shown on the report card as "orders within 7 days of a link visit," and editable in Settings (a number field, default 7).
3. **A campaign attaches offers from any active module.** Offer sources in 3.1: Smart Coupons (coupons), BOGO (rules), Cart Rewards (milestones), Upsell Order Bump (bumps). A campaign with no offer is allowed. Publish is blocked only by: end date before start date, or an empty campaign (no offer and no surface).
4. **BOGO module owns Buy X Get Y math.** Smart Coupons has no BOGO engine. The "Buy X get Y" coupon type references a BOGO rule and is locked when the BOGO module is off.
5. **An attached offer belongs to one campaign at a time.** Standalone otherwise. "Use in another campaign" clones it with a new name.
6. **Free merchants see Campaigns with a sample report card and locked controls**, not an empty upgrade screen.

### 3a. Module availability rule (applies to every list of offers or surfaces)

For each module that can act as an offer source or a surface:

| Module state | Appearance | Control |
|---|---|---|
| Active | Normal row, selectable | On / Off toggle (surfaces) or Attach (offers) |
| Installed, turned off | Below a divider labelled "Not available," greyed, with one line on what it adds | Button "Enable [module]" which turns it on in the mock store and returns the user to the same screen |
| Pro-only on Free licence | Below the same divider, greyed, with a "Pro" chip | Button "Upgrade" which opens the upgrade component (S9) |
| Not relevant (Direct Checkout, Add-to-Cart Redirect, Quick View) | Not shown | none |

If a module is turned off while a running campaign uses it: the campaign keeps running, that surface or offer row shows a warning chip "Module off since [date]," and the campaign row in the list shows a warning badge.

### 3b. Inheritance

- A coupon inside a campaign has its dates field locked, reading "Set by campaign: [name], [dates]" with a link to the campaign. Removed from the campaign, the field unlocks and the coupon shows status Inactive until dates are set.
- Surfaces inside a campaign inherit dates, products and message from the campaign. Countdown ends at campaign end. Badge shows on exactly the campaign products.
- Campaign products are derived: the union of attached offers' "applies to." Read-only in the rail when offers exist. When no offer is attached, the Products card becomes editable (category and product picker).

### 3c. Discount arbiter (one rule, shown in the storefront preview)

Per cart line, collect every active deal from every module. Non-combinable deals compete, largest discount wins. Combinable deals add on top. Cart-level rewards (free shipping, free gift) apply whenever their threshold is met and never compete with line discounts. Order Bump discounts apply only to the bump product. WooCommerce native coupons stack only if the store setting allows it (a toggle in Settings, default off). The storefront cart preview must show which deal won when two qualify.

### 3d. Attribution (the report card logic)

An order is credited to a campaign when, checked in order:
1. A coupon or BOGO rule belonging to the campaign applied to the order.
2. A Cart Rewards milestone belonging to the campaign was reached.
3. The session started from the campaign link within the last 7 days and the order contains a campaign product.

One order, one campaign. Credited surface = the last campaign surface the shopper interacted with before adding a campaign product (bar click, fly cart open, badge or countdown product click, link visit); none = "Direct." Impressions are counted separately per surface. Baseline = the 30 days before campaign start, frozen at publish. AOV lift = campaign orders' AOV vs baseline AOV.

Every metric card carries its counting rule in plain words under the number. Use these exact lines:

- Attributed revenue: "Orders where a campaign offer applied, plus orders within 7 days of a link visit"
- Orders: "Same rule as revenue"
- Offer acceptance: "Carts that qualified and checked out"
- AOV change: "Campaign orders vs the 30 days before"

## 4. Data model (plain language, implement as TypeScript types)

- **Licence**: `free | pro`.
- **Module**: id, name, active (boolean), proOnly (boolean), role: `offer | surface | both | none`. Smart Coupons = offer. BOGO = offer. Cart Rewards = both (milestone is an offer, bar is a surface). Order Bump = offer. Countdown, Floating Bar, Stock Bar, Sales Pop, Fly Cart = surface.
- **Campaign**: id, name, templateId, status `draft | scheduled | running | paused | ended`, start, end (nullable = always on), offerRefs[] (each: moduleId, offerId), surfaces{} keyed by module id with `enabled` and optional `messageOverride`, productScope (derived or manual), linkSlug, baseline{aov, revenue}, metrics{revenue, orders, acceptance, aovLift, bySurface{}, byDay[]}, warnings[].
- **SmartCoupon**: id, title, type `percentage | fixed | tiers | buyXGetY`, value, tiers[] (qty, percent), bogoRuleId (when type is buyXGetY), method `automatic | code | link`, code, appliesTo{categories[], products[]}, minimum{kind: none | subtotal | quantity, value}, eligibility `all | firstTime | returning | roles`, usesPerCustomer, totalUses, excludeOnSale, combinable{withSmartCoupons, withWcCoupons}, dates{start, end} or `inheritedFromCampaignId`, status `active | scheduled | inactive | expired`, campaignId (nullable).
- **BogoRule**: id, name, buyQty, buyScope, getQty, getScope, getDiscount `free | percent`, usedByCouponId (nullable), campaignId (nullable).
- **CartRewardsConfig**: milestones[] (threshold, reward: `freeShipping | coupon:<id> | gift:<productId>`), barCopy, placement.
- **Order (seed only)**: id, date, total, items[], creditedCampaignId, creditedSurface, source.

## 5. Screens

Sidebar on every admin screen: Dashboard, Campaigns (with a "Pro" chip when licence is Free), Modules, Analytics, Settings. Smart Coupons, BOGO and Cart Rewards are reached from Modules.

### S1 Campaigns list

- Header: title "Campaigns," subtitle "Every promotion you have run, with what it earned," date-range select (Last 30 days, Last 90 days, This year), button "New campaign."
- Four stat cards: Campaign revenue (with "x% of store revenue in the period"), Campaign orders, AOV lift during campaigns ("vs non-campaign days"), Best surface ("led x% of campaign orders"). Each card has its counting note under the number.
- Chart: campaign revenue by week, campaign windows shaded.
- Tabs: All, Running, Scheduled, Ended, with counts. Search box.
- Table columns: Campaign, Status chip, Runs, Offers (count plus small module icons), Surfaces (count), Revenue, Orders, AOV lift (green positive, red negative, grey "--" for scheduled). Row click opens S2. Warning badge on rows whose modules are off.
- **Free state:** same layout filled with seed sample data, a banner at the top: "Campaigns is a StoreGrowth Pro feature. This is a preview with sample data." with an Upgrade button. Every control disabled. Rows still open S2 in its own Free state (read-only, sample data, same banner).

### S2 Campaign page

Layout: breadcrumb "Campaigns / [name]," status chip, actions on the right, main column plus a right rail.

Main column, by status:

- **Draft:** readiness check card on top ("Ready to publish? x of y checks need attention"), then the report card with empty values ("--"), then the "When it ends" card. Actions: Use template, Clone, Publish.
- **Scheduled:** a strip "Starts in [n] days, on [date]" replaces the readiness card. Report empty. Actions: Clone, Unpublish.
- **Running:** report card live with seed numbers, two chart slots (Revenue by day, Which surface led to the sale). Rail editable with a note "Changes apply immediately." Actions: Pause, End now, Clone.
- **Paused:** like Running with an amber strip "Paused since [date]. Offers and surfaces are off." Action: Resume.
- **Ended:** wrap-up strip on top: result vs baseline in one sentence, button "Run again" (clones into a new draft). Report frozen. Rail read-only. Action: Clone.

Readiness checks (Draft only). Blocking checks render red and disable Publish; warnings render amber with their fix buttons:

| Check | Kind | Fix |
|---|---|---|
| End date before start date | Blocking | Edit dates |
| Nothing attached (no offer, no surface) | Blocking | none |
| Products already on sale inside the campaign scope | Warning | "Exclude" / "Stack" |
| Another campaign overlaps on the same products | Warning | "Review" |
| A BOGO rule and a Buy X get Y coupon both target the same product | Warning | "Remove rule" / "Remove coupon" / "Keep both" |
| No discount attached | Warning, copy: "Attribution will use the link and surface clicks only" | "Attach offer" |
| A surface is enabled whose module is off | Warning | "Enable [module]" |

Right rail cards, in this order:

1. **Runs**: dates, "Always on" when no end date, Edit.
2. **Products**: derived list when offers exist ("From attached offers"), editable picker when none.
3. **Offers**: attached offers listed with a module chip each (e.g. "Smart Coupon," "BOGO," "Cart Rewards," "Order Bump"). Button "Attach offer" opens a drawer grouped by module; locked modules appear per the availability rule. Each attached row has Edit (opens the offer in a drawer, not a new page) and Remove.
4. **Surfaces**: rows for Countdown Timer, Floating Notification Bar, Stock Count Bar, Live Sales Notification, Fly Cart message, Cart Rewards bar, plus Product Badge (owned by Campaigns in 3.1, always available on Pro). Active modules first with On/Off, then the "Not available" divider and the locked rows.
5. **Campaign link**: read-only field `yourstore.com/?sg=[slug]`, Copy button, note "Applies the offer and credits this campaign. Use it in ads, email, Texty."

### S3 Template picker

Modal from New campaign. Cards: Flash sale, Black Friday, Clearance, Launch week, Always-on free shipping, Blank. Each card lists what it pre-fills (offer type and surfaces). A card shows a lock line "Needs [module]" when a required module is off, with Enable inline. Choosing a card creates a Draft campaign with the pre-fills and opens S2.

Pre-fills:

| Template | Offer | Surfaces |
|---|---|---|
| Flash sale | Smart Coupon, percentage, automatic | Countdown, Floating bar, Badge, Fly cart |
| Black Friday | Smart Coupon, percentage, automatic | Countdown, Floating bar, Badge, Sales pop, Fly cart, Cart Rewards |
| Clearance | Smart Coupon, percentage, automatic, exclude on-sale off | Badge, Stock bar, Fly cart |
| Launch week | none | Countdown, Floating bar, Badge, Sales pop |
| Always-on free shipping | Cart Rewards milestone | Cart Rewards bar, Fly cart |
| Blank | none | none |

### S4 Smart Coupons list

Reached from Modules. Table: Title, Type (with a "BOGO module" chip on Buy X get Y rows), Method, Status, Used in (campaign name or "Standalone"), Uses, Discount given. Button "New coupon." Free state: one active coupon; the add action shows the S9 upgrade component inline as a second row: "Upgrade to add more coupons."

### S5 Smart Coupon form

Follows the Shopify discount form order, one card per section, right rail with summary and shopper preview.

1. **Method**: segmented control Automatic, Discount code, Link. Code field appears for Discount code. Link method shows a "Pro" chip on Free and opens S9 when clicked.
2. **Title**: text field, helper "Shoppers see this in their cart and at checkout."
3. **Discount value**: type cards Percentage, Fixed amount, Buy more save more (Pro chip on Free), Buy X get Y. The Buy X get Y card always carries the chip "uses the BOGO module." When BOGO is off, that card is greyed, chip reads "BOGO module is off," and its only control is "Enable BOGO." When selected and active, the card shows a BOGO rule picker ("Choose a BOGO rule" or "Create one") and the summary line "Deal defined by BOGO rule: [name]" with "Edit deal" opening the rule in a drawer. Value field for percentage and fixed; tier table (qty, percent, add row) for tiers.
4. **Applies to**: select Specific categories / Specific products / Entire store, with chips.
5. **Minimum purchase**: radios No minimum / Cart subtotal of at least [amount] / Minimum quantity [n].
6. **Eligibility**: select All customers / First-time customers (Pro) / Returning customers (Pro) / Specific roles (Pro). Checkboxes "One use per customer," "Skip products already on sale."
7. **Combinations**: checkboxes "Can combine with other Smart Coupons," "Can combine with WooCommerce coupons." Helper: "When two deals both qualify, the shopper gets the larger one."
8. **Active dates**: start and end fields when standalone. When inside a campaign, a blue locked panel "Set by campaign: [name], [dates]" with "Open campaign."

Rail: **Summary** (plain-text bullet list regenerated from the form) and **Shoppers will see** (product page strikethrough price with badge, cart lines with the discount line, and the not-yet-eligible nudge "Add $20 more to unlock 30% off").

Actions: Discard, Save. Saving from a campaign drawer returns to the campaign with the coupon attached.

### S6 BOGO module page

Existing-style module page: list of BOGO rules (name, buy, get, status, "Used by coupon: [title]" chip when referenced, campaign name when attached). Top banner: "Need a code, a link or usage limits on a BOGO deal? Create it as a Smart Coupon." with button "Create Smart Coupon" (opens S5 with Buy X get Y preselected and the rule picker focused). Rule form in a drawer: buy quantity and scope, get quantity and scope, free or percent off.

### S7 Cart Rewards module page

Milestones list ordered by threshold. Each row: threshold, reward (Free shipping / Smart Coupon picker / Free gift product picker), remove. "Add milestone" button; on Free, a second milestone triggers S9 inline. Bar copy field with placeholders `{remaining}` and `{reward}`. Placement select (Fly cart, Cart page, Both). Live bar preview on the right showing the next unreached milestone. Note under the list: "Existing Free Shipping Rules became milestone 1."

### S8 Storefront preview

One page with four panels, reachable from a "Preview storefront" button on S2 and from the Prototype controls:

- Product page: product title, regular price struck through, campaign price, badge text, tier table when a tiers coupon applies, countdown strip when enabled.
- Floating bar at the top with campaign copy.
- Fly cart drawer: line items, discount line named after the coupon title, Cart Rewards progress bar, nudge line when a minimum is not met, free gift line at $0 when a gift milestone is reached.
- Sales pop toast: "Someone in [city] bought [product]."

The preview must reflect the arbiter: a seed scenario where a BOGO rule and a percentage coupon both qualify on Field Jacket shows only the larger one applied, with a small caption "Larger deal applied: [name]."

### S9 Upgrade component

One reusable inline card: a lock icon, the locked thing's name, one sentence on what it does, button "Upgrade to Pro." Used in: S1 Free banner, S2 locked rail rows, S4 second coupon, S5 Pro-tagged options, S7 second milestone. Clicking Upgrade in the prototype flips the licence to Pro and shows a toast "Prototype: licence set to Pro."

### Settings (minimal)

Only two fields are needed: "Link attribution window (days)," default 7, and "Allow WooCommerce coupons to stack with Smart Coupons," default off. Changing the window updates the counting note on the report card.

## 6. Clarity copy for the Campaigns vs Smart Coupons vs BOGO split

Use these strings verbatim.

| Place | Copy |
|---|---|
| S5 type card, active | "Buy X get Y · uses the BOGO module" |
| S5 type card, BOGO off | "Buy X get Y · BOGO module is off" + button "Enable BOGO" |
| S5 after choosing a rule | "Deal defined by BOGO rule: [rule name]" + link "Edit deal" |
| S6 top banner | "Need a code, a link or usage limits on a BOGO deal? Create it as a Smart Coupon." |
| S6 rule row chip | "Used by coupon: [coupon title]" |
| S2 readiness warning | "A BOGO rule and a Buy X get Y coupon both target [product]. The larger one wins." |
| S2 Offers rail group labels | "Smart Coupons," "BOGO," "Cart Rewards," "Order Bump" |
| S2 locked row, module off | "[Module] is off. Enable it to use it here." |
| S2 locked row, Pro | "[Module] is a Pro module." |
| S1 Free banner | "Campaigns is a StoreGrowth Pro feature. This is a preview with sample data." |

Rule for all copy: a thing that comes from another module always shows that module's name.

## 7. Visual direction

- Inter, white cards on `#f4f5f7`, text `#111827`, muted `#4b5563`, borders `#e5e7eb`, radius 12 on cards, 8 on inputs.
- Accent blue `#1d4ed8` for Campaigns actions. Accent orange `#c2410c` for Smart Coupons actions. Locked anything is grey with a lock icon; never a lighter version of the accent.
- Status chips: Running green (`#065f46` on `#d1fae5`), Scheduled blue (`#1e3a8a` on `#dbeafe`), Draft amber (`#92400e` on `#fef3c7`), Paused amber, Ended grey (`#374151` on `#f3f4f6`).
- Module chips: one style everywhere, small grey pill with the module name.
- Icons: inline SVG from a single icon set (lucide-react is fine). No emoji.
- Real buttons, labels and inputs; keyboard reachable.

## 8. Seed data

Licence: Pro by default. Modules: all active by default except Stock Count Bar (off) so the lock state is visible on first load.

Campaigns:

| Name | Status | Runs | Offers | Surfaces | Revenue | Orders | AOV lift |
|---|---|---|---|---|---|---|---|
| November Boots Week | Running | Nov 3 to Nov 9, 2026 | BOGO rule "Buy 2 boots get 1 free" | 4 | $2,140 | 47 | +22% |
| Free shipping, always on | Running | no end | Cart Rewards milestone "Free shipping over $80" | 2 | $6,380 | 151 | +9% |
| Black Friday 2026 | Draft | Nov 27 to Dec 1, 2026 | Smart Coupon "30% off Outerwear" | 6 (Stock bar enabled but module off, so one warning) | -- | -- | -- |
| Halloween Flash | Ended | Oct 29 to Oct 31, 2026 | Smart Coupon "20% off storewide" | 5 | $4,910 | 118 | +17% |
| Back to School | Ended | Aug 18 to Sep 2, 2026 | Smart Coupon tiers "Buy 3 save 15%" | 3 | $3,260 | 64 | +26% |
| Summer Clearance | Ended | Jul 20 to Aug 3, 2026 | Smart Coupon "40% off Summer" | 4 | $1,730 | 32 | -4% |
| Eid Sale | Ended | Jun 1 to Jun 7, 2026 | Smart Coupon code "EID15" | 3 | $2,480 | 58 | +11% |
| Spring Launch | Ended | Mar 10 to Mar 16, 2026 | none | 4 | $1,120 | 21 | +3% |

Overall stats for Last 90 days: revenue $18,420 (31% of store), orders 412, AOV lift +14%, best surface Fly cart (38%).

Black Friday 2026 readiness: products already on sale (3 in Jackets), another discount plugin active, Stock bar enabled while module off. Its 30-day baseline: AOV $64.20, revenue $9,870.

Smart Coupons: 30% off Outerwear (percentage, automatic, Jackets and Boots, min $80, in Black Friday 2026), EID15 (code, expired), 20% off storewide (expired), Buy 3 save 15% (tiers, expired), BF Boots (Buy X get Y referencing BOGO rule "Buy 2 boots get 1 free," standalone, inactive).

BOGO rules: "Buy 2 boots get 1 free" (used by coupon BF Boots and attached to November Boots Week), "Buy 1 scarf get 1 at 50%" (standalone).

Cart Rewards milestones: $80 free shipping, $150 free gift "Wool beanie," $200 Smart Coupon "10% off next item" (Pro).

Products for the storefront: Field Jacket $120 (Jackets), Trail Boots $95 (Boots), Wool Beanie $25 (Accessories), Scarf $30 (Accessories).

Orders by surface for November Boots Week: Fly cart 18, Floating bar 11, Countdown 9, Badge 5, Link 3, Direct 1.

## 9. Prototype controls panel

Floating button bottom right opens a panel with: Licence toggle (Free / Pro), a switch per module, a "Reset seed" button, and shortcuts to S1, S2 (Black Friday 2026), S5 (new coupon), S8 (storefront). Changing anything here re-renders the current screen without a page reload.

## 10. Acceptance walkthrough

The prototype is done when a reviewer can do all of the following without hitting a dead end:

1. Open Campaigns, see the overall stats and the list, click November Boots Week, see a live report with surface breakdown.
2. Open Black Friday 2026, see three readiness warnings, click "Enable Stock bar," see the warning clear and the surface row move above the divider.
3. In the same campaign, click Attach offer, see offers grouped by module, attach "Buy 1 scarf get 1 at 50%," see Products update to include Accessories.
4. Turn the BOGO module off in Prototype controls, see the attached BOGO offer row show "Module off," see the campaign list row show a warning badge, open New coupon, see the Buy X get Y card locked with "Enable BOGO," click it, see the card unlock.
5. Flip licence to Free, see the Campaigns page in preview state with sample data and the banner, open Smart Coupons, try to add a second coupon, see the upgrade card, click Upgrade, see Pro restored.
6. Open Black Friday 2026, click the attached coupon's Edit, see the coupon drawer with Active dates locked to the campaign, remove the coupon from the campaign, see the coupon become Inactive with its dates editable.
7. Open the storefront preview for November Boots Week, add two Trail Boots and a Field Jacket, see the BOGO line, the rewards bar at $80 reached, and the "Larger deal applied" caption when the 30% coupon is also enabled.
8. End November Boots Week with "End now," see the wrap-up strip with the result vs baseline and a "Run again" button that creates a new draft.

## 11. Out of scope

Dokan vendor campaigns, email or SMS of any kind, store credit, gift cards, bulk unique codes, product bundles, frequently bought together, A/B testing, real WooCommerce integration, persistence.
