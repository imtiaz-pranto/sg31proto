# StoreGrowth 3.1 prototype brief v2 for Claude Code

Author: Imtiaz (PM). Version 2, Nov 6, 2026.

This brief replaces `storegrowth-3.1-prototype-brief.md` (v1). It is the spec. The prototype in `sg31-proto` was built from v1. Update it to match v2. Ask before adding anything this brief does not name.

## 0. What changed from v1

The v1 logic was checked against the real StoreGrowth 3.0.0 code, and the product decisions below were made from that audit. Apply every item.

**Fixes carried over from the v1 review**
- The mock store may persist in `sessionStorage`. It must still reset when the tab closes, and "Reset seed" must clear it. This is a deliberate exception to v1's no-persistence rule.
- No module is Pro-only. Order Bump is a Free module; its only Pro limit is a maximum of 2 bumps on Free. Pro locks apply to options inside modules, not to whole modules.
- The v1 step 7 wording is replaced by the new step 7 in section 10.

**Product decisions**
- **Licence has three states:** Free, Pro, and Pro with an expired licence. An expired licence behaves like Free, but its button says "Renew licence" instead of "Upgrade to Pro".
- **Offers come from three places:** Smart Coupons, BOGO rules (store-wide and product rules) and Order Bumps.
- **Cart Rewards is now a surface only.** It is no longer an offer.
- **New: Campaign price.** A campaign can set its own "% off these products" through the Countdown module.
- **Product rules move, they don't clone.** A product-level BOGO rule cannot be cloned into another campaign; it can only be moved.
- **The arbiter is rewritten** (section 3c):
  - It acts only when a campaign or Smart Coupon deal is involved.
  - A Countdown price is the base price.
  - A whole BOGO deal competes with a Smart Coupon on the same product.
- **Coupon stacking is set per coupon:** an "Allow with other coupons" switch, default off. The store-wide setting from v1 is removed.
- **Code-only BOGO rules:** a BOGO rule used by a code or link coupon only applies with that coupon. If Smart Coupons is turned off, the rule pauses.
- **Dates are date and time** in the site timezone.
- **Vendor-created deals can't join campaigns.**
- **Cart Rewards warns about missing free shipping:** it shows a warning when a shipping zone has no Free shipping method.

## 1. What this is

A clickable prototype of the StoreGrowth 3.1 admin and the storefront pieces it controls. StoreGrowth is a WooCommerce plugin with a modular admin. 3.1 adds:

- **Campaigns**: a Pro-only top-level page, not a module. It groups offers, a campaign price and surfaces under one schedule, one product scope and one report card.
- **Smart Coupons**: a new module that acts as the coupon layer:
  - method: automatic, code or link
  - limits, eligibility, combinations and schedule
  - its own math for percentage, fixed and quantity-tier discounts
- **Cart Rewards**: the existing Free Shipping Rules module, rebuilt as multi-milestone cart rewards.

The prototype lets stakeholders click through the merchant experience. It validates that the lock logic, the arbiter and the split between Campaigns, Smart Coupons and BOGO read clearly. It is not a WordPress plugin and has no backend.

## 2. Stack and constraints

- **Stack:** Vite, React, TypeScript, Tailwind and React Router.
- **State:**
  - All state lives in one mock store.
  - The store persists in `sessionStorage` only.
  - There is no API and no auth.
- **`PrototypeControls` panel:** a floating button, bottom right. It lets a reviewer flip:
  - the licence: Free, Pro, or Pro (expired)
  - each module on or off: Smart Coupons, BOGO, Cart Rewards, Countdown Timer, Floating Notification Bar, Stock Count Bar, Live Sales Notification, Fly Cart, Upsell Order Bump

  Every screen reacts to these flips immediately.
- **Layout:** desktop first at 1360 wide. It must not break at 1024. The sidebar stacks on narrower widths.
- **Seed data and copy:**
  - Seed data lives in `src/data/seed.ts` and matches section 8.
  - Copy stays as literal strings in components, so it can be edited by hand.
- **Charts:** no charting library. Charts are simple SVG drawn from the seed numbers.
- **Limits:** do not write WooCommerce or PHP, and do not add features beyond this brief.

## 3. Frozen product rules

These are decisions, not suggestions. The prototype demonstrates each one.

1. **Campaigns is Pro-only and admin-only.**
   - With Free or an expired licence, the Campaigns page shows in a locked preview state (S1 Free).
   - Deals created by a vendor never appear in the Attach offer drawer. The drawer shows a footnote saying so (section 6).
2. **The link attribution window is 7 days.**
   - The report card shows it as "orders within 7 days of a link visit".
   - It is editable in Settings, as a number field with a default of 7.
3. **Offers can come from Smart Coupons, BOGO rules (store-wide and product rules) and Order Bumps.**
   - A campaign can also have a **campaign price**: "% off these products" through the Countdown module.
   - Cart Rewards joins a campaign as a surface, never as an offer.
   - A campaign with no offer is allowed.
   - Publish is blocked only when the end date is before the start date, or when the campaign is empty (no offer, no campaign price and no surface).
4. **The BOGO module owns Buy X Get Y math.**
   - Smart Coupons has no BOGO engine. Its "Buy X get Y" coupon type references a BOGO rule.
   - That coupon type is locked when the BOGO module is off.
   - When the coupon's method is code or link, the rule only applies with that coupon.
   - If Smart Coupons is turned off, a rule used this way pauses. It never falls back to applying automatically.
5. **An attached offer belongs to one campaign at a time.**
   - Smart Coupons, Order Bumps and store-wide BOGO rules that are already in another campaign can be cloned into this one.
   - Product BOGO rules cannot be cloned. Their only action is "Move here", which removes them from the other campaign.
6. **Free and expired-licence merchants see Campaigns with a sample report card and locked controls.** They never see an empty upgrade screen.

### 3a. Lock rule

One function, `lockReason(thing)`, decides every lock in the prototype. It returns one of three values:

| Returns | When |
|---|---|
| `moduleOff` | The module the thing needs is off. This wins over `pro`. |
| `pro` | The thing is a Pro option and the licence is Free or expired. |
| `null` | Nothing is locked. |

Every surface row, offer row, template card, coupon type card and Pro option uses this one function.

| State | Appearance | Control |
|---|---|---|
| Available | Normal row, selectable | On / Off toggle (surfaces) or Attach (offers) |
| `moduleOff` | Below a divider labelled "Not available", greyed, with one line on what it adds | "Enable [module]": turns the module on in the mock store and returns to the same screen |
| `pro`, licence Free | Greyed, with a "Pro" chip | "Upgrade to Pro": opens S9 |
| `pro`, licence expired | Greyed, with a "Pro" chip | "Renew licence": opens S9 in renew mode |
| Not relevant (Direct Checkout, Quick View) | Not shown | None |

**Module turned off mid-campaign:** if a module is turned off while a running campaign uses it, the campaign keeps running.
- That row shows a warning chip, "Module off since [date]".
- The campaign's row in the list shows a warning badge.

### 3b. Inheritance

**Dates**
- Campaign dates are a date and a time in the site timezone. The timezone is shown read-only next to the date fields.
- Attached offers and surfaces follow the campaign's dates. A module's own saved settings are never changed by a campaign.

**Coupon dates**
- A coupon inside a campaign has its dates field locked, reading "Set by campaign: [name], [dates]", with a link to the campaign.
- When it is removed from the campaign, the field unlocks and the coupon's status is Inactive until dates are set.

**Products**
- Campaign products are worked out from what is attached. They are the union of every attached offer's "applies to", plus the campaign price products.
- When anything is attached, the Products card is read-only.
- When nothing is attached, the Products card becomes an editable category and product picker.

**Surfaces**
- Surfaces show the campaign's copy and products.
- The Countdown timer ends at the campaign end.
- The badge shows on exactly the campaign products.
- The Cart Rewards bar keeps the module's own milestones and only takes the campaign's copy.

**Campaign price**
- It is the products' base price while the campaign runs.
- If a product has its own Countdown discount, the campaign price replaces it during the campaign.
- The product's own Countdown settings are kept, and they return after the campaign.

### 3c. Discount arbiter

The storefront preview demonstrates every point below.

1. **When the referee acts.** It acts on a product only when at least one deal on that product comes from a campaign or a Smart Coupon. Otherwise, deals combine exactly as they do today.
2. **Countdown is the base price.** A Countdown discount, whether the product's own or a campaign price, is the base price. Every other deal is calculated from it, and it never competes.
3. **BOGO against a Smart Coupon.** A BOGO deal competes as a whole, meaning the discount on its gift line, against a Smart Coupon's discount on the bought product. The larger wins, unless the coupon has "Can combine with other StoreGrowth deals" on.
4. **Two Smart Coupons.** Smart Coupons that can't combine compete, and the larger wins.
5. **Order Bump.** An Order Bump discount applies only to the bump line and is outside the competition.
6. **Cart Rewards.** A reward applies whenever its threshold is met and never competes with line discounts. Thresholds are re-checked on every cart change, including quantity changes and removals.
7. **Vendor deals.** These take part like any other deal.
8. **Other WooCommerce coupons.** These stack with a Smart Coupon only if that coupon has "Allow with other coupons" on.

**Cart preview captions:**
- When the referee picked a winner on a line: "Larger deal applied: [name]".
- When deals combined: "Deals combined".

### 3d. Attribution (the report card logic)

An order is credited to a campaign when, checked in this order:
1. a Smart Coupon, BOGO rule, Order Bump or campaign price belonging to the campaign applied to the order
2. the session started from the campaign link within the window, and the order contains a campaign product

One order is credited to one campaign. The campaign is stamped on the order at checkout.

**Credited surface:** the last campaign surface the shopper interacted with before adding a campaign product. That can be a bar click, a Fly Cart open, a badge or countdown product click, or a link visit. If there is none, it is "Direct". Impressions are counted separately per surface.

**Baseline:** the 30 days before the campaign starts, frozen at publish. AOV lift is campaign orders' AOV compared with the baseline AOV.

**Counting lines:** every metric card shows its counting rule under the number, using these exact lines:
- Attributed revenue: "Orders where a campaign offer applied, plus orders within 7 days of a link visit"
- Orders: "Same rule as revenue"
- Offer acceptance: "Carts that qualified and checked out"
- AOV change: "Campaign orders vs the 30 days before"

When the window setting changes, the "7 days" in these lines updates.

## 4. Data model

Plain language; implement as TypeScript types.

**Licence:** `free | pro | proExpired`.

**Module:**
- `id`, `name`, `active`
- `role`: `offer | surface | both | none`

| Module | Role |
|---|---|
| Smart Coupons | offer |
| BOGO | offer |
| Order Bump | offer |
| Countdown | both (campaign price is the offer side, timer is the surface) |
| Cart Rewards | surface |
| Floating Bar | surface |
| Stock Bar | surface |
| Sales Pop | surface |
| Fly Cart | surface |

There is no `proOnly` field.

**Campaign:**
- `id`, `name`, `templateId`
- `status`: `draft | scheduled | running | paused | ended`
- `start`, `end`: date-times; `end` can be null, meaning always on
- `offerRefs[]`: each one is `{moduleId, offerId}`
- `campaignPrice`: `{percent, products[], categories[]}` or null
- `surfaces{}`: keyed by module id, each with `enabled` and an optional `messageOverride`
- `productScope`: derived or manual
- `linkSlug`
- `baseline`: `{aov, revenue}`
- `metrics`: `{revenue, orders, acceptance, aovLift, bySurface{}, byDay[]}`
- `warnings[]`

**SmartCoupon:**
- `id`, `title`
- `type`: `percentage | fixed | tiers | buyXGetY`
- `value`, `tiers[]` as `{qty, percent}`
- `bogoRuleId`: set when the type is `buyXGetY`
- `method`: `automatic | code | link`, plus `code`
- `appliesTo`: `{categories[], products[]}`
- `minimum`: `{kind: none | subtotal | quantity, value}`
- `eligibility`: `all | firstTime | returning | roles`
- `usesPerCustomer`, `totalUses`, `excludeOnSale`
- `combinable`: `{withStoreGrowthDeals, withOtherCoupons}`, both default false
- `dates`: `{start, end}` or `inheritedFromCampaignId`
- `status`: `active | scheduled | inactive | expired`
- `campaignId`: nullable

**BogoRule:**
- `id`, `name`
- `level`: `storeWide | product`
- `owner`: `admin | vendor`, plus `vendorName`
- `buyQty`, `buyScope`, `getQty`, `getScope`
- `getDiscount`: `free | percent`
- `usedByCouponId`: nullable
- `onlyWithCoupon`: derived; true when the referencing coupon's method is code or link
- `status`: `active | paused`. It is `paused` when `onlyWithCoupon` is true and Smart Coupons is off.
- `campaignId`: nullable

**OrderBump:** `id`, `name`, `targets` (categories and products), `offerProductId`, `discountPercent`, `campaignId` (nullable).

**Product:** `id`, `name`, `price`, `category`, `ownCountdown` (`{percent, end}` or null).

**CartRewardsConfig:**
- `milestones[]`: each `{threshold, reward}`, where the reward is `freeShipping`, `coupon:<id>` or `gift:<productId>`
- `barCopy`, `placement`
- `shippingZones[]`: each `{name, hasFreeShippingMethod}`

**Order (seed only):** `id`, `date`, `total`, `items[]`, `creditedCampaignId`, `creditedSurface`, `source`.

## 5. Screens

**Sidebar** on every admin screen: Dashboard, Campaigns, Modules, Analytics, Settings.
- Campaigns carries a "Pro" chip when the licence is Free or expired.
- Smart Coupons, BOGO, Order Bump and Cart Rewards are reached from Modules.

### S1 Campaigns list

**Header:**
- Title "Campaigns".
- Subtitle "Every promotion you have run, with what it earned".
- Date-range select: Last 30 days, Last 90 days, This year.
- Button "New campaign".

**Stat cards.** There are four, and each shows its counting note under the number:
- Campaign revenue, with "x% of store revenue in the period".
- Campaign orders.
- AOV lift during campaigns, with "vs non-campaign days".
- Best surface, with "led x% of campaign orders".

**Chart:** campaign revenue by week, with campaign windows shaded.

**Tabs and search:** tabs for All, Running, Scheduled and Ended, each with a count, plus a search box.

**Table:**
- Columns: Campaign, Status chip, Runs, Offers (count plus small module icons), Surfaces (count), Revenue, Orders, AOV lift.
- AOV lift is green when positive, red when negative and a grey "--" for scheduled campaigns.
- Clicking a row opens S2.
- Rows whose modules are off show a warning badge.

**Free state:**
- The same layout, filled with sample data.
- Banner: "Campaigns is a StoreGrowth Pro feature. This is a preview with sample data." with an "Upgrade to Pro" button.
- Every control is disabled.
- Rows still open S2 in its read-only Free state.

**Expired state:**
- The same as Free.
- Banner: "Your StoreGrowth Pro licence has expired. Renew it to run campaigns. This is a preview with sample data." with a "Renew licence" button.

### S2 Campaign page

**Layout:** breadcrumb "Campaigns / [name]", a status chip, actions on the right, a main column and a right rail.

**Main column, by status**

| Status | Main column | Actions |
|---|---|---|
| Draft | Readiness check card ("Ready to publish? x of y checks need attention"), report card with "--" values, "When it ends" card | Use template, Clone, Publish |
| Scheduled | Strip "Starts in [n] days, on [date, time]" in place of the readiness card; report empty | Clone, Unpublish |
| Running | Live report card; charts for Revenue by day and Which surface led to the sale. Rail is editable, with the note "Changes apply immediately". | Pause, End now, Clone |
| Paused | Like Running, plus an amber strip "Paused since [date]. Offers and surfaces are off." | Resume |
| Ended | Wrap-up strip: result vs baseline in one sentence, plus "Run again", which clones into a new draft. Report frozen, rail read-only. | Clone |

**Readiness checks (Draft only).** Blocking checks are red and disable Publish. Warnings are amber and show their fix buttons.

| Check | Kind | Fix |
|---|---|---|
| End date before start date | Blocking | Edit dates |
| Nothing attached (no offer, no campaign price, no surface) | Blocking | None |
| Products already on sale inside the campaign scope | Warning | "Exclude" / "Stack" |
| Another campaign overlaps on the same products | Warning | "Review" |
| A BOGO rule and a Buy X get Y coupon both target the same product | Warning | "Remove rule" / "Remove coupon" / "Keep both" |
| Campaign price products that already have their own Countdown discount | Warning | "Review products" / "OK" |
| No discount attached | Warning: "Attribution will use the link and surface clicks only" | "Attach offer" |
| A surface is enabled whose module is off | Warning | "Enable [module]" |

**Right rail cards, in this order**

1. **Runs.**
   - Start and end, each a date and a time.
   - The site timezone, read-only.
   - "Always on" when there is no end.
   - Edit.
2. **Products.**
   - A derived list when anything is attached, labelled "From attached offers and campaign price".
   - An editable picker when nothing is attached.
3. **Offers.**
   - Attached offers, each with a module chip: "Smart Coupon", "BOGO" or "Order Bump".
   - "Attach offer" opens a drawer grouped by module: Smart Coupons, BOGO, Order Bump.
   - BOGO rows show "Store-wide rule" or "Product rule".
   - An offer already in another campaign shows "In [campaign]" and:
     - "Clone into this campaign" for Smart Coupons, Order Bumps and store-wide rules
     - "Move here" for product rules, with the copy from section 6
   - Locked modules appear per section 3a.
   - The drawer footnote reads "Deals created by vendors can't be added to campaigns."
   - Each attached row has Edit, which opens the offer in a drawer rather than a new page, and Remove.
4. **Campaign price.**
   - Uses the Countdown module and carries a "Countdown" chip.
   - Empty state: "Add campaign price".
   - When set, it shows the percent off and the products or categories.
   - Note: "Products' own Countdown settings are kept and return after the campaign."
   - Locked per section 3a when Countdown is off.
5. **Surfaces.**
   - Rows: Countdown Timer, Floating Notification Bar, Stock Count Bar, Live Sales Notification, Fly Cart message, Cart Rewards bar, Product Badge.
   - Product Badge is owned by Campaigns and is always available on Pro.
   - The Cart Rewards bar row carries the note "Uses your Cart Rewards milestones. Shows campaign copy on the bar."
   - Available rows come first with On/Off, then the "Not available" divider and the locked rows.
6. **Campaign link.**
   - Read-only field `yourstore.com/?sg=[slug]` with a Copy button.
   - Note: "Applies the offer and credits this campaign. Use it in ads, email, Texty."

### S3 Template picker

A modal opened from New campaign.
- Each card lists what it pre-fills.
- If a required module is off, the card shows "Needs [module]" with an inline Enable button.
- Choosing a card creates a Draft with the pre-fills and opens S2.

| Template | Offer or price | Surfaces |
|---|---|---|
| Flash sale | Campaign price, 20% (Countdown) | Countdown, Floating bar, Badge, Fly cart |
| Black Friday | Smart Coupon, percentage, automatic | Countdown, Floating bar, Badge, Sales pop, Fly cart, Cart Rewards bar |
| Clearance | Smart Coupon, percentage, automatic, exclude on-sale off | Badge, Stock bar, Fly cart |
| Launch week | None | Countdown, Floating bar, Badge, Sales pop |
| Always-on free shipping | None. Card note: "Uses your Cart Rewards milestones" | Cart Rewards bar, Fly cart |
| Blank | None | None |

### S4 Smart Coupons list

Reached from Modules.

- **Table columns:** Title, Type, Method, Status, Used in, Uses, Discount given.
  - Buy X get Y rows show a "BOGO module" chip in Type.
  - Used in shows the campaign name or "Standalone".
- **Under the title:** "Code and link coupons also appear in WooCommerce > Coupons, marked Managed by Smart Coupons."
- **Button:** "New coupon".
- **Free and expired states:** one active coupon. Adding another shows S9 inline as a second row: "Upgrade to add more coupons", or "Renew licence to add more coupons" when the licence is expired.

### S5 Smart Coupon form

Follows Shopify's discount form order, with one card per section and a right rail.

1. **Method.**
   - A segmented control: Automatic, Discount code, Link.
   - Choosing Discount code shows a code field.
   - Link carries a "Pro" chip on Free or expired, and opens S9.
2. **Title.** A text field with the helper "Shoppers see this in their cart and at checkout."
3. **Discount value.**
   - Type cards: Percentage, Fixed amount, Buy more save more (Pro), Buy X get Y.
   - The Buy X get Y card always shows the chip "uses the BOGO module".
   - When BOGO is off:
     - The card is greyed.
     - The chip reads "BOGO module is off".
     - The card's only control is "Enable BOGO".
   - When Buy X get Y is selected:
     - A BOGO rule picker shows ("Choose a BOGO rule" or "Create one").
     - The summary line reads "Deal defined by BOGO rule: [name]", with "Edit deal" opening the rule in a drawer.
     - If the method is code or link, the line "This BOGO rule will only apply when shoppers use this coupon." shows.
   - Inputs per type:
     - Percentage and fixed get a value field.
     - Tiers get a table (quantity, percent, add row).
     - Buy X get Y has no value field, because the value comes from the rule.
4. **Applies to.** Specific categories / Specific products / Entire store, shown with chips.
5. **Minimum purchase.**
   - No minimum.
   - Cart subtotal of at least [amount].
   - Minimum quantity [n].
6. **Eligibility.**
   - Who: All customers, First-time customers (Pro), Returning customers (Pro), Specific roles (Pro).
   - Checkboxes: "One use per customer" and "Skip products already on sale".
7. **Combinations.**
   - "Can combine with other StoreGrowth deals", with the helper "Other Smart Coupons and BOGO deals. Countdown prices always combine."
   - "Allow with other coupons", with the helper "Coupons from outside StoreGrowth."
   - Both are off by default.
   - Card helper: "When deals can't combine, the shopper gets the larger one."
8. **Active dates.**
   - When standalone: start and end, each a date and a time, in the site timezone.
   - When inside a campaign: a blue locked panel "Set by campaign: [name], [dates]" with "Open campaign".

**Rail:**
- **Summary:** plain-text bullets regenerated from the form.
- **Shoppers will see:**
  - the product page price with a badge
  - the cart lines with the discount line
  - the nudge, e.g. "Add $20 more to unlock 30% off"

**Actions:** Discard, Save. Saving from a campaign drawer returns to the campaign with the coupon attached.

### S6 BOGO module page

**List columns:** Name, Level (Store-wide or Product), Buy, Get, Status, Chips.

**Chips:**
- "Used by coupon: [title]"
- "Only with coupon: [title]" when the coupon's method is code or link
- "Paused: needs Smart Coupons" when the rule is paused
- "Vendor: [store name]" on vendor rules
- the campaign name, when attached

**Top banner:** "Need a code, a link or usage limits on a BOGO deal? Create it as a Smart Coupon."
- Button: "Create Smart Coupon".
- It opens S5 with Buy X get Y preselected and the rule picker focused.

**Rule form, in a drawer:**
- level
- buy quantity and scope
- get quantity and scope
- free or percent off

### S7 Cart Rewards module page

- **Milestones list**, ordered by threshold. Each row has:
  - the threshold
  - the reward: Free shipping, a Smart Coupon picker, or a Free gift product picker
  - Remove
- **"Add milestone":** on Free or expired, a second milestone shows S9 inline.
- **Bar copy field** with `{remaining}` and `{reward}` placeholders.
- **Placement:** Fly cart, Cart page, or Both.
- **Live bar preview** on the right.
- **Note under the list:** "Existing Free Shipping Rules became milestone 1."
- **Zone warning:** when any shipping zone has no Free shipping method, show an amber warning: "Your [zone] zone has no Free shipping method, so this reward won't apply there." with a mock link "Open shipping settings".

### S8 Storefront preview

One page with four panels. It is reachable from "Preview storefront" on S2 and from Prototype controls.

1. **Product page:**
   - Title.
   - The regular price, struck through when discounted.
   - The current price, with a small line naming where it comes from, e.g. "Countdown 10%" or "Campaign price 15%".
   - Badge.
   - Tier table, when a tiers coupon applies.
   - Countdown strip, when enabled.
2. **Floating bar:** campaign copy.
3. **Fly cart drawer:**
   - Line items, each showing its price steps, e.g. "$120 → $108 Countdown → $75.60 30% off Outerwear".
   - Discount lines.
   - The caption "Larger deal applied: [name]" or "Deals combined" on each line where two deals met.
   - The Cart Rewards bar, re-checked on every change.
   - The nudge line.
   - A free gift line at $0 when a gift milestone is reached.
   - A checkout step showing Order Bumps that can be ticked.
4. **Sales pop toast:** "Someone in [city] bought [product]."

**Preview toggle:** "Also apply 30% off Outerwear". This forces that coupon on for the arbiter demo, even though its campaign is a draft.

### S9 Upgrade component

One reusable inline card, with two modes:

| Mode | Contents | Clicking it |
|---|---|---|
| Upgrade | Lock icon, the locked thing's name, one sentence on what it does, "Upgrade to Pro" | Sets the licence to Pro; toast "Prototype: licence set to Pro" |
| Renew | Same card, button "Renew licence" | Sets the licence to Pro; toast "Prototype: licence renewed" |

Used in:
- the S1 banner
- locked S2 rail rows
- the S4 second coupon
- S5 Pro options
- the S7 second milestone

### Settings

- **Link attribution window (days):** default 7. Changing it updates the counting lines.
- **Site timezone:** read-only, "America/New_York (from WordPress settings)".

## 6. Clarity copy

Use these strings verbatim.

| Place | Copy |
|---|---|
| S5 type card, active | "Buy X get Y · uses the BOGO module" |
| S5 type card, BOGO off | "Buy X get Y · BOGO module is off" + button "Enable BOGO" |
| S5 after choosing a rule | "Deal defined by BOGO rule: [rule name]" + link "Edit deal" |
| S5 code or link method with a rule | "This BOGO rule will only apply when shoppers use this coupon." |
| S6 top banner | "Need a code, a link or usage limits on a BOGO deal? Create it as a Smart Coupon." |
| S6 rule chips | "Used by coupon: [title]" / "Only with coupon: [title]" / "Paused: needs Smart Coupons" / "Vendor: [store name]" |
| S2 readiness, BOGO and coupon | "A BOGO rule and a Buy X get Y coupon both target [product]. The larger one wins." |
| S2 readiness, campaign price | "[n] products already have their own Countdown discount. The campaign price replaces it while the campaign runs." |
| S2 campaign price note | "Products' own Countdown settings are kept and return after the campaign." |
| S2 drawer, product rule elsewhere | "In [campaign]. Product deals can't be copied. Moving it removes it from [campaign]." + button "Move here" |
| S2 drawer, other offer elsewhere | "In [campaign]." + button "Clone into this campaign" |
| S2 drawer footnote | "Deals created by vendors can't be added to campaigns." |
| S2 Cart Rewards surface row | "Uses your Cart Rewards milestones. Shows campaign copy on the bar." |
| S2 Offers drawer group labels | "Smart Coupons", "BOGO", "Order Bump" |
| Locked row, module off | "[Module] is off. Enable it to use it here." |
| Locked option, Pro | "[Option] is a Pro feature." |
| S1 Free banner | "Campaigns is a StoreGrowth Pro feature. This is a preview with sample data." |
| S1 expired banner | "Your StoreGrowth Pro licence has expired. Renew it to run campaigns. This is a preview with sample data." |
| S7 zone warning | "Your [zone] zone has no Free shipping method, so this reward won't apply there." |
| S8 captions | "Larger deal applied: [name]" / "Deals combined" |

**Rule for all copy:** a thing that comes from another module always shows that module's name.

## 7. Visual direction

- **Base:** Inter. White cards on `#f4f5f7`. Text `#111827`, muted `#4b5563`, borders `#e5e7eb`. Radius 12 on cards and 8 on inputs.
- **Accents:**
  - Blue `#1d4ed8` for Campaigns.
  - Orange `#c2410c` for Smart Coupons.
  - Anything locked is grey with a lock icon. It is never a lighter version of an accent.
- **Status chips:**

| Status | Text | Background |
|---|---|---|
| Running | `#065f46` | `#d1fae5` |
| Scheduled | `#1e3a8a` | `#dbeafe` |
| Draft | `#92400e` | `#fef3c7` |
| Paused | amber, same as Draft | amber, same as Draft |
| Ended | `#374151` | `#f3f4f6` |

- **Module chips:** one small grey pill with the module name, used everywhere.
- **Icons:** inline SVG from lucide-react. No emoji.
- **Accessibility:** real buttons, labels and inputs, all keyboard reachable.

## 8. Seed data

**Starting state:**
- Licence: Pro.
- Modules: all active except Stock Count Bar, which starts off.
- Site timezone: America/New_York.
- Simulated today: Nov 6, 2026.

### Campaigns

| Name | Status | Runs | Offers / price | Surfaces | Revenue | Orders | AOV lift |
|---|---|---|---|---|---|---|---|
| November Boots Week | Running | Nov 3, 00:00 to Nov 9, 23:59, 2026 | BOGO "Buy 2 boots get 1 free" | 4 | $2,140 | 47 | +22% |
| Free shipping, always on | Running | No end | None (manual scope: entire store) | Cart Rewards bar, Fly cart | $6,380 | 151 | +9% |
| Black Friday 2026 | Draft | Nov 27, 00:00 to Dec 1, 23:59, 2026 | Smart Coupon "30% off Outerwear", BOGO "Buy 1 beanie get 1 at 50%" | 6 (Stock bar enabled but its module is off) | -- | -- | -- |
| Halloween Flash | Ended | Oct 29 to Oct 31, 2026 | Smart Coupon "20% off storewide" | 5 | $4,910 | 118 | +17% |
| Back to School | Ended | Aug 18 to Sep 2, 2026 | Smart Coupon tiers "Buy 3 save 15%" | 3 | $3,260 | 64 | +26% |
| Summer Clearance | Ended | Jul 20 to Aug 3, 2026 | Smart Coupon "40% off Summer" | 4 | $1,730 | 32 | -4% |
| Eid Sale | Ended | Jun 1 to Jun 7, 2026 | Smart Coupon code "EID15" | 3 | $2,480 | 58 | +11% |
| Spring Launch | Ended | Mar 10 to Mar 16, 2026 | None | 4 | $1,120 | 21 | +3% |

**Overall stats, Last 90 days:**
- Revenue $18,420 (31% of store)
- Orders 412
- AOV lift +14%
- Best surface Fly cart (38%)

**Black Friday 2026:**
- Readiness warnings:
  - products already on sale (3 in Jackets)
  - another campaign overlaps
  - Stock bar enabled while its module is off
- Baseline: AOV $64.20, revenue $9,870.

### Smart Coupons

| Coupon | Type | Method | Details | Status |
|---|---|---|---|---|
| 30% off Outerwear | Percentage | Automatic | Jackets and Boots, minimum $80 | In Black Friday 2026 |
| EID15 | Percentage | Code | | Expired |
| 20% off storewide | Percentage | Automatic | | Expired |
| Buy 3 save 15% | Tiers | Automatic | | Expired |
| BF Boots | Buy X get Y, references "Buy 2 boots get 1 free" | Automatic | Standalone | Inactive |
| SCARFDUO | Buy X get Y, references "Buy 1 scarf get 1 at 50%" | Code | Standalone | Active |

### BOGO rules

| Rule | Level | Owner | Links |
|---|---|---|---|
| Buy 2 boots get 1 free | Store-wide (Boots) | Admin | Used by BF Boots; in November Boots Week |
| Buy 1 scarf get 1 at 50% | Product (Scarf) | Admin | Used by SCARFDUO, so only with that coupon |
| Buy 1 beanie get 1 at 50% | Product (Wool Beanie) | Admin | In Black Friday 2026 |
| Buy 2 socks get 1 free | Product (Wool Socks) | Vendor "North Trail Co." | Never shown in the offer drawer |

### Order Bumps

| Bump | Targets | Status |
|---|---|---|
| Add Leather Gloves, 25% off | Jackets | Standalone |
| Add Wool Socks, 20% off | Boots | Standalone |

### Cart Rewards

**Milestones:**
- $80: free shipping
- $150: free gift "Wool Beanie"
- $200: Smart Coupon "10% off next item" (Pro)

**Shipping zones:**
- United States: has a Free shipping method.
- Rest of world: has no Free shipping method, so the zone warning shows.

### Products

| Product | Price | Category | Own Countdown |
|---|---|---|---|
| Field Jacket | $120 | Jackets | 10%, ends Nov 30 |
| Trail Boots | $95 | Boots | None |
| Wool Beanie | $25 | Accessories | None |
| Scarf | $30 | Accessories | None |
| Leather Gloves | $40 | Accessories | 20%, ends Nov 30 |
| Wool Socks | $15 | Accessories | None (vendor product) |

### Orders by surface, November Boots Week

| Surface | Orders |
|---|---|
| Fly cart | 18 |
| Floating bar | 11 |
| Countdown | 9 |
| Badge | 5 |
| Link | 3 |
| Direct | 1 |

## 9. Prototype controls panel

A floating button, bottom right, opens a panel with:
- licence: Free / Pro / Pro (expired)
- a switch for each module
- "Reset seed", which also clears `sessionStorage`
- shortcuts to S1, S2 (Black Friday 2026), S5 (new coupon) and S8 (storefront)

Any change re-renders the current screen without a page reload.

## 10. Acceptance walkthrough

The prototype is done when a reviewer can do all of the following without hitting a dead end.

1. **Campaigns list and live report.**
   - Open Campaigns and see the overall stats and the list.
   - Click November Boots Week and see a live report with the surface breakdown.
   - Refresh the page and see the same state. The store persisted.
2. **Readiness and enabling a module.**
   - Open Black Friday 2026 and see three readiness warnings.
   - Click "Enable Stock bar", see that warning clear, and see the Stock bar row move above the divider.
3. **Attaching an offer.**
   - In Black Friday 2026, click Attach offer.
   - See offers grouped as Smart Coupons, BOGO and Order Bump, and see the vendor footnote. "Buy 2 socks get 1 free" is not listed.
   - Attach "Add Leather Gloves, 25% off" and see Products update to include Accessories.
4. **Move vs clone.**
   - Open "Free shipping, always on" and click Attach offer.
   - "Buy 1 beanie get 1 at 50%" shows "In Black Friday 2026" with "Move here".
   - "Buy 2 boots get 1 free" shows "In November Boots Week" with "Clone into this campaign".
   - Click "Move here" and see the rule leave Black Friday 2026.
5. **Module locks.**
   - Turn BOGO off in Prototype controls.
   - See BOGO rows in campaigns show "Module off", and see warning badges on the campaign list rows.
   - Open New coupon and see the Buy X get Y card locked with "Enable BOGO". Click it and see the card unlock.
   - Turn Smart Coupons off, open the BOGO page, and see "Buy 1 scarf get 1 at 50%" with "Paused: needs Smart Coupons".
   - Turn Smart Coupons back on and see the chip return to "Only with coupon: SCARFDUO".
6. **Licence states.**
   - Flip the licence to Free and see the Campaigns preview with the Free banner.
   - Open Smart Coupons, try to add a second coupon, and see the upgrade card.
   - Flip to Pro (expired) and see the expired banner and "Renew licence" wherever a lock shows.
   - Click Renew and see Pro restored.
7. **Coupon dates.**
   - Open Black Friday 2026 and click the attached coupon's Edit.
   - See Active dates locked to the campaign, shown as dates and times with the site timezone.
   - Remove the coupon from the campaign and see it become Inactive with editable dates.
8. **Arbiter in the storefront.** Open the storefront preview and:
   1. Add two Trail Boots. See the free Trail Boots gift line from November Boots Week.
   2. Add a Field Jacket. See "$120 → $108 Countdown".
   3. Turn on "Also apply 30% off Outerwear".
      - On the boots, see "Larger deal applied: Buy 2 boots get 1 free". The $95 gift beats 30% off two boots.
      - On the jacket, see "$108 → $75.60 30% off Outerwear" with "Deals combined", because Countdown is the base price.
   4. At checkout, tick "Add Leather Gloves, 25% off". See "$40 → $32 Countdown → $24 bump" with "Deals combined".
   5. See the rewards bar with free shipping, the free Wool Beanie gift line at $0 and the third milestone reached.
   6. Remove one Trail Boot. See the gift line disappear and the rewards bar update immediately.
9. **Campaign price.**
   - In Black Friday 2026, add a campaign price of 15% on Jackets.
   - See the readiness warning: "1 products already have their own Countdown discount…". Make the copy handle singular and plural.
   - See the note about the products' own settings returning after the campaign.
10. **Ending a campaign.**
    - End November Boots Week with "End now".
    - See the wrap-up strip with the result vs baseline.
    - Click "Run again" and see a new draft created.
11. **Zone warning.** Open Cart Rewards and see the Rest of world zone warning.

## 11. Out of scope

- Dokan vendor campaigns, and any vendor screens
- Email or SMS of any kind
- Store credit, gift cards and bulk unique codes
- Product bundles and frequently bought together
- A/B testing
- WooCommerce screens, real WooCommerce integration, and any backend
