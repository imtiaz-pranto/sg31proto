# StoreGrowth 3.1 prototype brief v3.1 for Claude Code

Author: Imtiaz (PM). Version 3.1, Nov 6, 2026.

This brief replaces every earlier version, including the merged v3 written from the v3 patch. It is the full spec and the single source of truth. The prototype in `sg31-proto` was last built from that merged v3. Update it to match v3.1. Where the merged v3 differs from this brief, this brief wins; list each difference you change in your report. Ask before adding anything this brief does not name.

## 0. What changed from v3

**From the last prototype run (brief conflicts P1 to P8, all accepted)**
- Field Jacket and Leather Gloves Countdown now end Dec 31 (P3), so the gloves return to exactly $24 after Black Friday.
- The $200 milestone reward is a code coupon, NEXT10 (P6), so it no longer discounts every cart.
- Ended campaigns never count for the no-overlap rule or the overlap warning (P8).
- Already in v3 and kept: overlap lines on scheduled, running and paused campaigns (P5), Delete on every status (P7), step 4 attaches instead of moving (P1), deleting runs last (P2), Outerwear means Jackets and Boots (P4).
- The walkthrough keeps v3's numbering (17 steps), not the patch's 18.

**From the code audit decisions**
- **Licence:** no grace after expiry. An expiry notice shows from 14 days before. Campaigns that end after the expiry date show a warning. Licence-stopped campaigns keep their status chip and get a list badge.
- **Expired Campaigns page:** shows the merchant's own campaigns read-only, not sample data. Sample data stays for Free.
- **Over the Free limit:** offers pause newest first, and the merchant chooses which stay on.
- **Coupons:** a code that loses on every line is removed with a notice. Two codes that can't combine keep the larger, with a notice. A fixed-cart coupon is split by line price, and a losing line's share moves to the remaining lines.
- **On sale:** a Countdown price counts as "on sale".
- **Cart Rewards threshold** follows the store's tax display, after discounts.
- **Report:** new "Store during campaign" line as context, not credit.
- **Cart notice** for paused, deleted or licence-stopped campaigns: "[Campaign] deal is no longer available. Prices updated."
- **Seed:** new coupons SAVE30 (fixed cart) and NEXT10, a licence expiry date, and store revenue during campaigns.
- **Walkthrough:** new steps 8.7 and 8.8 for the coupon rules; steps 6, 12 to 14 and 16 updated.

## 1. What this is

A clickable prototype of the StoreGrowth 3.1 admin and the storefront pieces it controls. StoreGrowth is a WooCommerce plugin with a modular admin. 3.1 adds:

- **Campaigns**: a Pro-only top-level page, not a module. It groups offers, a campaign price and surfaces under one schedule, one product scope and one report card.
- **Smart Coupons**: a new module that acts as the coupon layer:
  - method: automatic, code or link
  - limits, eligibility, combinations and schedule
  - its own math for percentage, fixed and quantity-tier discounts
- **Cart Rewards**: the existing Free Shipping Rules module, rebuilt as multi-milestone cart rewards.

The prototype lets stakeholders click through the merchant experience. It validates that the lock logic, the arbiter, the offer lifecycle and the split between Campaigns, Smart Coupons and BOGO read clearly. It is not a WordPress plugin and has no backend.

## 2. Stack and constraints

- **Stack:** Vite, React, TypeScript, Tailwind and React Router.
- **State:**
  - All state lives in one mock store, including the prototype time.
  - The store persists in `sessionStorage` only. It resets when the tab closes, and "Reset seed" clears it.
  - There is no API and no auth.
- **`PrototypeControls` panel:** a floating button, bottom right (section 9). Every screen reacts to its changes immediately.
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
5. **Offers have an everyday version and a campaign version** (section 3e).
   - An offer can be attached to several campaigns only if their windows don't overlap.
   - A campaign can also own campaign-only offers that exist nowhere else.
6. **Free merchants see Campaigns with sample data and locked controls. Expired-licence merchants see their own campaigns, read-only.** Neither ever sees an empty upgrade screen.
7. **Licence and campaigns.** While the licence is Free or expired, no campaign takes effect. There is no grace period after expiry. Campaign statuses don't change, but list rows show the badge "Stopped: licence expired". Every offer uses its everyday version and campaign-only offers are offline. Renewing brings running campaigns back into effect.
   - An expiry notice shows from 14 days before the licence expiry date.
   - A campaign that ends after the licence expiry date shows a warning (S2).
8. **Free plan limits** count active everyday offers only: one Smart Coupon, two Order Bumps, one Cart Rewards milestone.
   - While the licence is Free or expired, offers above the limit pause, newest first, with the chip "Paused: over Free limit".
   - An admin notice lets the merchant choose which stay on: "You have more offers than the Free plan allows. Choose which stay on." + "Choose offers".

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
- A campaign never changes a module's own saved settings. It only adds a campaign version on top (section 3e).

**Coupon dates**
- When editing a coupon's **campaign version**, or a **campaign-only** coupon, the dates field is locked, reading "Set by campaign: [name], [dates]", with a link to the campaign.
- When editing a coupon's **everyday version**, its own dates are editable.
- Removing an attached coupon from a campaign removes only its campaign version. The everyday version is untouched.
- Removing a campaign-only coupon asks "Delete it" or "Keep as everyday offer". Keeping it makes it an everyday coupon with status Inactive until dates are set.

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

The storefront preview demonstrates every point below. The arbiter always works on the **effective** version of each offer at the prototype time (section 3e).

1. **When the referee acts.** It acts on a product only when at least one deal on that product comes from a campaign or a Smart Coupon. Otherwise, deals combine exactly as they do today.
2. **Countdown is the base price.** A Countdown discount, whether the product's own or a campaign price, is the base price. Every other deal is calculated from it, and it never competes.
3. **BOGO against a Smart Coupon.** A BOGO deal competes as a whole, meaning the discount on its gift line, against a Smart Coupon's discount on the bought product. The larger wins, unless the coupon has "Can combine with other StoreGrowth deals" on.
   - **Fixed-cart coupons** are split across eligible lines by line price, leaving out free gift lines. The comparison uses the coupon's share on the bought product. Where the coupon loses, its share moves to the lines where it still applies, capped at their value.
4. **Two Smart Coupons.** Smart Coupons that can't combine compete, and the larger wins.
   - If both are codes, the smaller is removed with the notice "Only one of these coupons can be used. We kept [CODE], which saves you more."
5. **Order Bump.** An Order Bump discount applies only to the bump line and is outside the competition.
6. **Cart Rewards.** A reward applies whenever its threshold is met and never competes with line discounts. Thresholds are re-checked on every cart change, including quantity changes and removals.
7. **Vendor deals.** These take part like any other deal.
8. **Other WooCommerce coupons.** These stack with a Smart Coupon only if that coupon has "Allow with other coupons" on. Their own "Individual use" setting is respected.
9. **A code that loses everywhere.** A code coupon that loses on every line it applies to is removed with the notice "[CODE] wasn't applied because [deal] saves you more." A code that wins on some lines stays on those lines.

**Cart preview captions:**
- When the referee picked a winner on a line: "Larger deal applied: [name]".
- When deals combined: "Deals combined".

### 3d. Attribution (the report card logic)

An order is credited to a campaign when, checked in this order:
1. an offer's **campaign version**, a campaign-only offer or the campaign price of that campaign applied to the order
2. the session started from the campaign link within the window, and the order contains a campaign product

An attached offer's sales outside the campaign window count toward its module, not the campaign.

One order is credited to one campaign. The campaign is stamped on the order at checkout.

**Credited surface:** the last campaign surface the shopper interacted with before adding a campaign product. That can be a bar click, a Fly Cart open, a badge or countdown product click, or a link visit. If there is none, it is "Direct". Impressions are counted separately per surface.

**Baseline:** the 30 days before the campaign starts, frozen at publish. AOV lift is campaign orders' AOV compared with the baseline AOV.

**Counting lines:** every metric card shows its counting rule under the number, using these exact lines:
- Attributed revenue: "Orders where a campaign offer applied, plus orders within 7 days of a link visit"
- Orders: "Same rule as revenue"
- Offer acceptance: "Carts that qualified and checked out"
- AOV change: "Campaign orders vs the 30 days before"

When the window setting changes, the "7 days" in these lines updates.

**Store during campaign:** a context line under the metric cards, not credited to the campaign.
- "Store during campaign: [revenue], [+/-x]% a day vs the 30 days before"
- Counting line: "All store orders in the window. Context only, not credited to the campaign."
- Not shown for always-on campaigns, or for draft and scheduled campaigns.

### 3e. Offer lifecycle: everyday version and campaign version

**Two versions per offer**

| Version | What it holds | When it applies |
|---|---|---|
| Everyday version | The offer as set on its module page: on/off, values, its own schedule | Whenever no campaign controlling it is running |
| Campaign version | Only what the campaign changes, or nothing if the merchant chose "Use as is" | Only while that campaign is **running** |

**One function decides.** `effectiveOffer(offer, now)` returns which version applies at `now`, its values, which campaign controls it (if any), and whether the offer is live. Every list, chip, banner, edit drawer and the arbiter use this one function. The everyday version is never overwritten, so nothing ever needs restoring.

**Rules**

| Situation | Outcome |
|---|---|
| Offer attached to a draft or scheduled campaign | Everyday version keeps running unchanged |
| Campaign starts | Campaign version applies |
| Campaign ends, is paused, or goes back to draft | Everyday version applies again |
| Campaign deleted | Campaign versions are removed; everyday versions untouched. Campaign-only offers are deleted, and the confirm dialog lists them by name. |
| Everyday version is off | The campaign switches it on during its window; it is off again after |
| Edit from the module page while a campaign is running | Changes the everyday version only; visible after the campaign ends |
| Edit from the campaign page | Changes the campaign version only |
| Licence Free or expired | See rule 7 in section 3 |
| Campaign-only offer | No everyday version; offline outside the campaign window |

**Several campaigns.** An offer can be attached to several campaigns only if their windows don't overlap. Example: everyday, then Black Friday, then everyday, then Christmas, then everyday. Ended campaigns never count.
- If windows overlap, the Attach button is disabled with the reason shown (section 6).
- Changing a campaign's dates so that it would overlap another campaign sharing an attached offer shows the same message and does not save.
- A campaign with no end date overlaps every campaign that starts after it begins.

**Code coupons.**
- Code and link Smart Coupons are real WooCommerce coupons.
- If the campaign keeps the same code and changes the amount, the campaign amount applies live during the window. The coupon's saved amount stays the everyday amount.
- A campaign that needs a different code (for example BF25) uses a campaign-only coupon.

**Cart at the start or end of a campaign.**
- The cart is re-checked on every cart change and at checkout.
- If a deal ended since the item was added, the cart shows: "[Campaign] ended. Prices updated."
- If a deal started since the item was added, the cart shows: "[Campaign] price applied."
- If a campaign is paused, deleted or stopped by the licence, the cart shows: "[Campaign] deal is no longer available. Prices updated."
- If a BOGO gift no longer qualifies, it is removed with: "[Deal] ended. Your free item was removed."

**Clone and Run again.**
- They include all offers, product BOGO rules included.
- Attached offers are attached to the new campaign with their campaign versions copied.
- Campaign-only offers are copied as new campaign-only offers.
- The new draft has empty dates. The no-overlap rule is checked when dates are set.

### 3f. Campaign overlap

**Price-changing offers:** Smart Coupons, BOGO rules, Order Bumps and the campaign price.
**Not price-changing:** Cart Rewards and display-only surfaces.

| Level | Fires when | Copy | Blocks? |
|---|---|---|---|
| Warning | Another draft, scheduled, running or paused campaign has a price-changing offer on products this campaign also changes, and their windows overlap | "[Campaign] also discounts [n] products in this campaign. The larger deal applies." + "See products" | No |
| Info line | Another campaign shares products and overlaps in time but changes no price | "Also running: [campaign]" | No |

Ended campaigns never count. Both can show at the same time. The referee still decides the outcome in the cart; these only inform the merchant. Where they show is set in S2.

## 4. Data model

Plain language; implement as TypeScript types.

**Licence:** `free | pro | proExpired`, plus `expiresAt` (a date-time) used for the expiry notice and campaign warnings.

**Prototype time:** `now`, a date-time in the site timezone. Seed value: Nov 6, 2026, 10:00 AM.

**Module:**
- `id`, `name`, `active`
- `role`: `offer | surface | both | none`

| Module | Role |
|---|---|
| Smart Coupons | offer |
| BOGO | offer |
| Upsell Order Bump | offer |
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
- `offerRefs[]`: each one is `{moduleId, offerId, mode, override}`
  - `mode`: `attached | campaignOnly`
  - `override`: only the values the campaign changes (for example `{discountPercent: 40}`), or null for "Use as is"
- `campaignPrice`: `{percent, products[], categories[]}` or null
- `surfaces{}`: keyed by module id, each with `enabled` and an optional `messageOverride`
- `productScope`: derived or manual
- `linkSlug`
- `baseline`: `{aov, revenue}`
- `metrics`: `{revenue, orders, acceptance, aovLift, bySurface{}, byDay[]}`
- `storeDuring`: `{revenue, dailyChangePct}` or null
- `warnings[]`

**Fields every offer has** (SmartCoupon, BogoRule, OrderBump):
- `origin`: `everyday | campaignOnly`
- `campaignOnlyOf`: campaign id when `origin` is `campaignOnly`, otherwise null
- `status`: the everyday status. For campaign-only offers, derived from the campaign.
- `createdAt`: used to pause the newest first when over the Free limit
- `pausedReason`: `overFreeLimit` or null

Which campaigns an offer is attached to is derived from `Campaign.offerRefs`. Offers have no `campaignId` field.

**SmartCoupon:**
- `id`, `title`
- `type`: `percentage | fixed | tiers | buyXGetY`. `fixed` is a fixed amount off the cart, split by line price.
- `value`, `tiers[]` as `{qty, percent}`
- `bogoRuleId`: set when the type is `buyXGetY`
- `method`: `automatic | code | link`, plus `code`
- `appliesTo`: `{categories[], products[]}`
- `minimum`: `{kind: none | subtotal | quantity, value}`
- `eligibility`: `all | firstTime | returning | roles`
- `usesPerCustomer`, `totalUses`, `excludeOnSale`
- `combinable`: `{withStoreGrowthDeals, withOtherCoupons}`, both default false
- `dates`: `{start, end}` for the everyday version; null for campaign-only coupons
- `status`: `active | scheduled | inactive | expired`

**BogoRule:**
- `id`, `name`
- `level`: `storeWide | product`
- `owner`: `admin | vendor`, plus `vendorName`
- `buyQty`, `buyScope`, `getQty`, `getScope`
- `getDiscount`: `free | percent`
- `usedByCouponId`: nullable
- `onlyWithCoupon`: derived; true when the referencing coupon's method is code or link
- `status`: `active | off | paused`. It is `paused` when `onlyWithCoupon` is true and Smart Coupons is off.

**OrderBump:** `id`, `name`, `targets` (categories and products), `offerProductId`, `discountPercent`, `status`.

**Product:** `id`, `name`, `price`, `category`, `ownCountdown` (`{percent, end}` or null).

**CartRewardsConfig:**
- `milestones[]`: each `{threshold, reward}`, where the reward is `freeShipping`, `coupon:<id>` or `gift:<productId>`
- `barCopy`, `placement`
- `shippingZones[]`: each `{name, hasFreeShippingMethod}`

**Order (seed only):** `id`, `date`, `total`, `items[]`, `creditedCampaignId`, `creditedSurface`, `source`.

## 5. Screens

**Sidebar** on every admin screen: Dashboard, Campaigns, Modules, Analytics, Settings.
- Campaigns carries a "Pro" chip when the licence is Free or expired.
- Smart Coupons, BOGO, Upsell Order Bump and Cart Rewards are reached from Modules.

**Prototype time pill:** top right of every admin and storefront screen: "Prototype time: [date, time]". It is amber when the time differs from the seed time.

**Timeline chip:** shown on every offer row (module pages and campaign rail) when the offer is attached to at least one campaign.
- Before the campaign: "Live now · [Campaign] takes over [start] to [end] · back to everyday after". If the everyday version is off, "Off now" replaces "Live now".
- During: "[Campaign] version · until [end]"
- Several campaigns: the chip shows the next one and "+[n] more", with a tooltip listing every window.

**Module page banner:** on any module page with an offer currently controlled by a running campaign: "[Campaign] is controlling [offer] until [end]. Changes here apply after it ends." with a link "Edit [Campaign] version".

**Edit drawer header:** every offer edit drawer names the version being edited: "Everyday version", "[Campaign] version" or "Campaign-only: [Campaign]".

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
- Rows of campaigns stopped by the licence show the badge "Stopped: licence expired".

**Free state:**
- The same layout, filled with sample data.
- Banner: "Campaigns is a StoreGrowth Pro feature. This is a preview with sample data." with an "Upgrade to Pro" button.
- Every control is disabled.
- Rows still open S2 in its read-only Free state.

**Expired state:**
- The merchant's own campaigns, not sample data. Every control is disabled, and rows still open S2 read-only.
- Running and scheduled rows show the badge "Stopped: licence expired".
- Banner: "Your StoreGrowth Pro licence has expired, so your campaigns are stopped. Renew it to run them again." with a "Renew licence" button.

### S2 Campaign page

**Layout:** breadcrumb "Campaigns / [name]", a status chip, actions on the right, a main column and a right rail.

**Main column, by status**

| Status | Main column | Actions |
|---|---|---|
| Draft | Readiness check card ("Ready to publish? x of y checks need attention"), report card with "--" values, "When it ends" card | Use template, Clone, Publish, Delete |
| Scheduled | Strip "Starts in [n] days, on [date, time]" in place of the readiness card; report empty | Clone, Unpublish, Delete |
| Running | Live report card; charts for Revenue by day and Which surface led to the sale. Rail is editable, with the note "Changes apply immediately". | Pause, End now, Clone, Delete |
| Paused | Like Running, plus an amber strip "Paused since [date]. Offers are back to their everyday versions and surfaces are off." | Resume, Delete |
| Ended | Wrap-up strip: result vs baseline in one sentence, plus "Run again", which clones into a new draft. Report frozen, rail read-only. | Clone, Delete |

Publish sets the status to Scheduled when the start is after the prototype time, or Running when it isn't. Status follows the prototype time: a scheduled campaign shows Running inside its window and Ended after it.

**Delete:** a confirm dialog: "Delete [campaign]? Attached offers go back to their everyday versions." If the campaign has campaign-only offers, it adds: "These campaign-only offers will be deleted: [names]."

**Readiness checks (Draft only).** Blocking checks are red and disable Publish. Warnings are amber and show their fix buttons. Info lines are grey and have no fix.

| Check | Kind | Fix |
|---|---|---|
| End date before start date | Blocking | Edit dates |
| Nothing attached (no offer, no campaign price, no surface) | Blocking | None |
| Products already on sale inside the campaign scope | Warning | "Exclude" / "Stack" |
| Another campaign changes prices on the same products (section 3f) | Warning | "See products" |
| Another campaign shares products without changing prices (section 3f) | Info | None |
| A BOGO rule and a Buy X get Y coupon both target the same product | Warning | "Remove rule" / "Remove coupon" / "Keep both" |
| Campaign price products that already have their own Countdown discount | Warning | "Review products" / "OK" |
| No discount attached | Warning: "Attribution will use the link and surface clicks only" | "Attach offer" |
| A surface is enabled whose module is off | Warning | "Enable [module]" |
| The campaign ends after the licence expiry date | Warning: "Your licence expires on [date], before this campaign ends. It will stop then." | "Renew licence" |

For Scheduled, Running and Paused campaigns, the overlap warning, the info line and the licence warning show under the Runs card instead.

**Report card:** shows the "Store during campaign" line from section 3d under the metric cards.

**Right rail cards, in this order**

1. **Runs.**
   - Start and end, each a date and a time.
   - The site timezone, read-only.
   - "Always on" when there is no end.
   - Edit. Saving new dates applies the no-overlap rule from section 3e.
2. **Products.**
   - A derived list when anything is attached, labelled "From attached offers and campaign price".
   - An editable picker when nothing is attached.
3. **Offers.**
   - Each offer row has a module chip ("Smart Coupon", "BOGO" or "Order Bump"), a tag ("Attached" or "Campaign-only") and, for attached offers, the timeline chip.
   - Button "Add offer" with two choices:
     - **Attach existing offer:** opens a drawer grouped by module: Smart Coupons, BOGO, Order Bump. BOGO rows show "Store-wide rule" or "Product rule". After picking, choose "Use as is" or "Customise for this campaign".
     - **Create campaign-only offer:** opens the normal create flow for the chosen module, saved inside this campaign.
   - In the drawer, an offer already attached to another campaign shows "In [campaign], [dates]":
     - windows don't overlap: Attach is enabled
     - windows overlap: Attach is disabled with the reason from section 6
   - Locked modules appear per section 3a.
   - The drawer footnote reads "Deals created by vendors can't be added to campaigns."
   - Each row has Edit, which opens the campaign version (or the campaign-only offer) in a drawer, and Remove. Remove follows section 3b.
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
- Choosing a card creates a Draft with the pre-fills and opens S2. Offers a template creates are campaign-only.

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
  - Used in shows "Everyday", "Everyday + [campaign]" (with "+[n] more" when several), or "Campaign-only: [campaign]".
  - Attached coupons show the timeline chip.
- **Under the title:** "Code and link coupons also appear in WooCommerce > Coupons, marked Managed by Smart Coupons."
- **Button:** "New coupon".
- **Free and expired states:** one active everyday coupon. Adding another shows S9 inline as a second row: "Upgrade to add more coupons", or "Renew licence to add more coupons" when the licence is expired.
  - Coupons above the limit show "Paused: over Free limit", and the notice from section 3, rule 8 shows above the table.
- **Module page banner** per section 5 when a running campaign controls a coupon.

### S5 Smart Coupon form

Follows Shopify's discount form order, with one card per section and a right rail. The header names the version being edited (section 5).

1. **Method.**
   - A segmented control: Automatic, Discount code, Link.
   - Choosing Discount code shows a code field.
   - Link carries a "Pro" chip on Free or expired, and opens S9.
   - In a campaign version, the method and code are read-only. A different code needs a campaign-only coupon.
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
     - Percentage and fixed get a value field. Fixed carries the helper "Taken off the cart, split across eligible products by price."
     - Tiers get a table (quantity, percent, add row).
     - Buy X get Y has no value field, because the value comes from the rule.
4. **Applies to.** Specific categories / Specific products / Entire store, shown with chips.
5. **Minimum purchase.**
   - No minimum.
   - Cart subtotal of at least [amount].
   - Minimum quantity [n].
6. **Eligibility.**
   - Who: All customers, First-time customers (Pro), Returning customers (Pro), Specific roles (Pro).
   - Checkboxes: "One use per customer" and "Skip products already on sale", with the helper "Countdown prices count as on sale."
7. **Combinations.**
   - "Can combine with other StoreGrowth deals", with the helper "Other Smart Coupons and BOGO deals. Countdown prices always combine."
   - "Allow with other coupons", with the helper "Coupons from outside StoreGrowth."
   - Both are off by default.
   - Card helper: "When deals can't combine, the shopper gets the larger one."
8. **Active dates.**
   - Everyday version: start and end, each a date and a time, in the site timezone.
   - Campaign version or campaign-only: a blue locked panel "Set by campaign: [name], [dates]" with "Open campaign".

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
- the timeline chip, when attached to a campaign
- "Campaign-only: [campaign]" for campaign-only rules

**Top banner:** "Need a code, a link or usage limits on a BOGO deal? Create it as a Smart Coupon."
- Button: "Create Smart Coupon".
- It opens S5 with Buy X get Y preselected and the rule picker focused.

**Module page banner** per section 5 when a running campaign controls a rule.

**Rule form, in a drawer:**
- everyday status: On / Off
- level
- buy quantity and scope
- get quantity and scope
- free or percent off

### S6b Upsell Order Bump module page

Reached from Modules > Upsell Order Bump.

- **List columns:** Name, Targets, Offer product, Discount, Status, Chips (timeline chip or "Campaign-only: [campaign]").
- **Button:** "New bump". On Free or expired, a third everyday bump shows S9 inline.
- **Bump form, in a drawer:** everyday status On / Off, targets, offer product, discount percent.
- **Module page banner** per section 5 when a running campaign controls a bump.

### S7 Cart Rewards module page

- **Milestones list**, ordered by threshold. Each row has:
  - the threshold
  - the reward: Free shipping, a Smart Coupon picker, or a Free gift product picker. A coupon reward is a code coupon, and the shopper sees "You unlocked [reward]: [CODE]".
  - Remove
- **"Add milestone":** on Free or expired, a second milestone shows S9 inline.
- **Threshold note:** "Thresholds use the cart subtotal after discounts, with or without tax as your store shows prices."
- **Bar copy field** with `{remaining}` and `{reward}` placeholders.
- **Placement:** Fly cart, Cart page, or Both.
- **Live bar preview** on the right.
- **Note under the list:** "Existing Free Shipping Rules became milestone 1."
- **Zone warning:** when any shipping zone has no Free shipping method, show an amber warning: "Your [zone] zone has no Free shipping method, so this reward won't apply there." with a mock link "Open shipping settings" that shows a toast.

### S8 Storefront preview

One page with four panels. It is reachable from "Preview storefront" on S2 and from Prototype controls. Everything on it follows the prototype time.

1. **Product page:**
   - Title.
   - The regular price, struck through when discounted.
   - The current price, with a small line naming where it comes from, e.g. "Countdown 10%" or "Campaign price 15%".
   - Badge.
   - Tier table, when a tiers coupon applies.
   - Countdown strip, when enabled.
2. **Floating bar:** campaign copy.
3. **Fly cart drawer:**
   - Line items, each showing its price steps with percents, e.g. "$120 → $108 Countdown 10% → $75.60 30% off Outerwear".
   - Discount lines.
   - The caption "Larger deal applied: [name]" or "Deals combined" on each line where two deals met.
   - The Cart Rewards bar, re-checked on every change.
   - The nudge line.
   - A free gift line at $0 when a gift milestone is reached.
   - A checkout step showing Order Bumps that can be ticked.
   - Cart notices when the prototype time crosses a campaign start or end, or a campaign is paused, deleted or stopped (section 3e).
   - A coupon code field. Coupon notices follow section 3c, rules 4 and 9.
4. **Sales pop toast:** "Someone in [city] bought [product]."

**Preview toggle:** "Also apply 30% off Outerwear". This forces that coupon on for the arbiter demo, even when it isn't live.

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
- the S6b third bump
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
| S2 readiness, campaign price | "[n] product(s) already have their own Countdown discount. The campaign price replaces it while the campaign runs." Singular and plural handled. |
| S2 campaign price note | "Products' own Countdown settings are kept and return after the campaign." |
| S2 Add offer choices | "Attach existing offer" / "Create campaign-only offer" |
| S2 attach mode | "Use as is" / "Customise for this campaign" |
| S2 offer tags | "Attached" / "Campaign-only" |
| S2 drawer, offer in another campaign, no overlap | "In [campaign], [dates]." + button "Attach" |
| S2 drawer, offer in another campaign, overlap | "In [campaign], [dates]. Campaign dates can't overlap for the same offer." Attach disabled. |
| S2 dates saved into an overlap | "[Offer] is already in [campaign] ([dates]). Campaign dates can't overlap for the same offer." |
| S2 drawer footnote | "Deals created by vendors can't be added to campaigns." |
| S2 Cart Rewards surface row | "Uses your Cart Rewards milestones. Shows campaign copy on the bar." |
| S2 Offers drawer group labels | "Smart Coupons", "BOGO", "Order Bump" |
| S2 overlap warning | "[Campaign] also discounts [n] products in this campaign. The larger deal applies." + "See products" |
| S2 overlap info line | "Also running: [campaign]" |
| S2 delete confirm | "Delete [campaign]? Attached offers go back to their everyday versions." / "These campaign-only offers will be deleted: [names]." |
| S2 remove campaign-only offer | "Remove [offer] from [campaign]?" + "Delete it" / "Keep as everyday offer" |
| S2 paused strip | "Paused since [date]. Offers are back to their everyday versions and surfaces are off." |
| Timeline chip, before | "Live now · [Campaign] takes over [start] to [end] · back to everyday after" (or "Off now · …") |
| Timeline chip, during | "[Campaign] version · until [end]" |
| Module page banner | "[Campaign] is controlling [offer] until [end]. Changes here apply after it ends." + "Edit [Campaign] version" |
| Edit drawer headers | "Everyday version" / "[Campaign] version" / "Campaign-only: [Campaign]" |
| Cart notice, ended | "[Campaign] ended. Prices updated." |
| Cart notice, started | "[Campaign] price applied." |
| Locked row, module off | "[Module] is off. Enable it to use it here." |
| Locked option, Pro | "[Option] is a Pro feature." |
| S1 Free banner | "Campaigns is a StoreGrowth Pro feature. This is a preview with sample data." |
| S1 expired banner | "Your StoreGrowth Pro licence has expired, so your campaigns are stopped. Renew it to run them again." |
| S7 zone warning | "Your [zone] zone has no Free shipping method, so this reward won't apply there." |
| S8 captions | "Larger deal applied: [name]" / "Deals combined" |
| Cart notice, stopped | "[Campaign] deal is no longer available. Prices updated." |
| Cart notice, gift removed | "[Deal] ended. Your free item was removed." |
| Code lost everywhere | "[CODE] wasn't applied because [deal] saves you more." |
| Two codes clash | "Only one of these coupons can be used. We kept [CODE], which saves you more." |
| S5 on-sale helper | "Countdown prices count as on sale." |
| S5 fixed helper | "Taken off the cart, split across eligible products by price." |
| S7 threshold note | "Thresholds use the cart subtotal after discounts, with or without tax as your store shows prices." |
| Cart Rewards coupon unlocked | "You unlocked [reward]: [CODE]" |
| Licence expiry notice | "Your StoreGrowth Pro licence expires on [date]. Renew licence." |
| Campaign past licence expiry | "Your licence expires on [date], before this campaign ends. It will stop then." |
| List badge, licence | "Stopped: licence expired" |
| Over Free limit chip | "Paused: over Free limit" |
| Over Free limit notice | "You have more offers than the Free plan allows. Choose which stay on." + "Choose offers" |
| Store during campaign | "Store during campaign: [revenue], [+/-x]% a day vs the 30 days before" / "All store orders in the window. Context only, not credited to the campaign." |
| Prototype time pill | "Prototype time: [date, time]" |

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

- **Module chips and offer tags:** one small grey pill style, used everywhere.
- **Timeline chip:** blue text `#1d4ed8` on `#eff6ff`.
- **Prototype time pill:** grey at the seed time, amber (Draft colours) when moved.
- **Icons:** inline SVG from lucide-react. No emoji.
- **Accessibility:** real buttons, labels and inputs, all keyboard reachable.

## 8. Seed data

**Starting state:**
- Licence: Pro, expiring Dec 4, 2026 (`expiresAt`).
- Modules: all active except Stock Count Bar, which starts off.
- Site timezone: America/New_York.
- Prototype time: Nov 6, 2026, 10:00 AM.

### Campaigns

| Name | Status | Runs | Offers / price | Surfaces | Revenue | Orders | AOV lift |
|---|---|---|---|---|---|---|---|
| November Boots Week | Running | Nov 3, 00:00 to Nov 9, 23:59, 2026 | BOGO "Buy 2 boots get 1 free" (attached, use as is) | 4 | $2,140 | 47 | +22% |
| Free shipping, always on | Running | Nov 1, 2026, no end | None (manual scope: entire store) | Cart Rewards bar, Fly cart | $6,380 | 151 | +9% |
| Black Friday 2026 | Draft | Nov 27, 00:00 to Dec 1, 23:59, 2026 | Smart Coupon "30% off Outerwear" (campaign-only), BOGO "Buy 1 beanie get 1 at 50%" (attached, use as is) | 6 (Stock bar enabled but its module is off) | -- | -- | -- |
| Winter Outerwear 15% | Scheduled | Nov 20, 00:00 to Dec 6, 23:59, 2026 | Smart Coupon "15% off Outerwear" (campaign-only) | Floating bar, Badge | -- | -- | -- |
| Halloween Flash | Ended | Oct 29 to Oct 31, 2026 | Smart Coupon "20% off storewide" (campaign-only) | 5 | $4,910 | 118 | +17% |
| Back to School | Ended | Aug 18 to Sep 2, 2026 | Smart Coupon tiers "Buy 3 save 15%" (campaign-only) | 3 | $3,260 | 64 | +26% |
| Summer Clearance | Ended | Jul 20 to Aug 3, 2026 | Smart Coupon "40% off Summer" (campaign-only) | 4 | $1,730 | 32 | -4% |
| Eid Sale | Ended | Jun 1 to Jun 7, 2026 | Smart Coupon code "EID15" (campaign-only) | 3 | $2,480 | 58 | +11% |
| Spring Launch | Ended | Mar 10 to Mar 16, 2026 | None | 4 | $1,120 | 21 | +3% |

**Overall stats, Last 90 days:**
- Revenue $18,420 (31% of store)
- Orders 412
- AOV lift +14%
- Best surface Fly cart (38%)

**Store during campaign** (seed values):

| Campaign | Store revenue in window | Per day vs the 30 days before |
|---|---|---|
| November Boots Week | $3,420 so far | +38% |
| Halloween Flash | $7,950 | +61% |
| Back to School | $9,140 | +12% |
| Summer Clearance | $5,020 | -6% |
| Eid Sale | $4,310 | +19% |
| Spring Launch | $2,890 | +5% |

Not shown for Free shipping, always on (no end), or for draft and scheduled campaigns.

**Black Friday 2026:**
- Readiness warnings:
  - products already on sale (3 in Jackets)
  - Winter Outerwear 15% also discounts 2 products (Field Jacket, Trail Boots)
  - Stock bar enabled while its module is off
- Readiness info line: "Also running: Free shipping, always on"
- Baseline: AOV $64.20, revenue $9,870.

### Smart Coupons

| Coupon | Type | Method | Details | Origin and status |
|---|---|---|---|---|
| 30% off Outerwear | Percentage | Automatic | Jackets and Boots, minimum $80 | Campaign-only: Black Friday 2026 |
| 15% off Outerwear | Percentage | Automatic | Jackets and Boots | Campaign-only: Winter Outerwear 15% |
| EID15 | Percentage | Code | | Campaign-only: Eid Sale, expired |
| 20% off storewide | Percentage | Automatic | | Campaign-only: Halloween Flash, expired |
| Buy 3 save 15% | Tiers | Automatic | | Campaign-only: Back to School, expired |
| BF Boots | Buy X get Y, references "Buy 2 boots get 1 free" | Automatic | | Everyday, Inactive |
| SCARFDUO | Buy X get Y, references "Buy 1 scarf get 1 at 50%" | Code | | Everyday, Active |
| NEXT10 | Percentage, 10% off one item | Code | Cart Rewards $200 reward | Everyday, Active |
| SAVE30 | Fixed, $30 off the cart | Code | Entire store; combines with nothing | Everyday, Active |

Active everyday coupons in creation order, oldest first: SCARFDUO, NEXT10, SAVE30. On Free or expired, NEXT10 and SAVE30 pause.

### BOGO rules

| Rule | Level | Owner | Everyday status | Links |
|---|---|---|---|---|
| Buy 2 boots get 1 free | Store-wide (Boots) | Admin | Off | Used by BF Boots; attached to November Boots Week |
| Buy 1 scarf get 1 at 50% | Product (Scarf) | Admin | Active | Used by SCARFDUO, so only with that coupon |
| Buy 1 beanie get 1 at 50% | Product (Wool Beanie) | Admin | Off | Attached to Black Friday 2026 |
| Buy 2 socks get 1 free | Product (Wool Socks) | Vendor "North Trail Co." | Active | Never shown in the offer drawer |

### Order Bumps

| Bump | Targets | Everyday status |
|---|---|---|
| Add Leather Gloves, 25% off | Jackets | Active |
| Add Wool Socks, 20% off | Boots | Active |

### Cart Rewards

**Milestones:**
- $80: free shipping
- $150: free gift "Wool Beanie"
- $200: Smart Coupon NEXT10, "10% off your next item" (Pro)

**Shipping zones:**
- United States: has a Free shipping method.
- Rest of world: has no Free shipping method, so the zone warning shows.

### Products

| Product | Price | Category | Own Countdown |
|---|---|---|---|
| Field Jacket | $120 | Jackets | 10%, ends Dec 31, 23:59 |
| Trail Boots | $95 | Boots | None |
| Wool Beanie | $25 | Accessories | None |
| Scarf | $30 | Accessories | None |
| Leather Gloves | $40 | Accessories | 20%, ends Dec 31, 23:59 |
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
- licence: Free / Pro / Pro (expired), plus the licence expiry date (default Dec 4, 2026)
- a switch for each module: Smart Coupons, BOGO, Cart Rewards, Countdown Timer, Floating Notification Bar, Stock Count Bar, Live Sales Notification, Fly Cart, Upsell Order Bump
- **Prototype time:** a date and time picker in the site timezone, plus "Reset time" (back to Nov 6, 2026, 10:00 AM)
- "Reset seed", which also resets the time and clears `sessionStorage`
- shortcuts to S1, S2 (Black Friday 2026), S5 (new coupon) and S8 (storefront)

Any change re-renders the current screen without a page reload. Campaign statuses, chips, banners, the arbiter and cart notices all follow the prototype time.

## 10. Acceptance walkthrough

The prototype is done when a reviewer can do all of the following, in one run from Reset seed, without hitting a dead end.

1. **Campaigns list and live report.**
   - Open Campaigns and see the overall stats and the list, including Winter Outerwear 15% as Scheduled.
   - Click November Boots Week and see a live report with the surface breakdown.
   - Refresh the page and see the same state. The store persisted.
2. **Readiness, overlap and enabling a module.**
   - Open Black Friday 2026 and see three readiness warnings: products on sale, "Winter Outerwear 15% also discounts 2 products in this campaign. The larger deal applies.", and Stock bar with its module off.
   - See the grey info line "Also running: Free shipping, always on".
   - Click "See products" and see Field Jacket and Trail Boots.
   - Click "Enable Stock bar", see that warning clear, and see the Stock bar row move above the divider.
3. **Attaching an offer.**
   - In Black Friday 2026, click Add offer, then Attach existing offer.
   - See offers grouped as Smart Coupons, BOGO and Order Bump, and see the vendor footnote. "Buy 2 socks get 1 free" is not listed.
   - Attach "Add Leather Gloves, 25% off", choose "Customise for this campaign" and set 40%.
   - See Products update to include Accessories, and the row tagged "Attached" with the chip "Live now · Black Friday 2026 takes over Nov 27, 12:00 AM to Dec 1, 11:59 PM · back to everyday after".
4. **Attaching to several campaigns.**
   - Open "Free shipping, always on" and open Attach existing offer.
   - "Buy 1 beanie get 1 at 50%" shows "In Black Friday 2026, Nov 27 to Dec 1. Campaign dates can't overlap for the same offer." with Attach disabled, because an always-on campaign overlaps it.
   - Open Black Friday 2026 and open Attach existing offer.
   - "Buy 2 boots get 1 free" shows "In November Boots Week, Nov 3 to Nov 9." with Attach enabled. Attach it with "Use as is".
   - On the BOGO page, see that rule's timeline chip with "+1 more", and the tooltip listing both windows.
5. **Module locks.**
   - Turn BOGO off in Prototype controls.
   - See BOGO rows in campaigns show "Module off", and see warning badges on the campaign list rows.
   - Open New coupon and see the Buy X get Y card locked with "Enable BOGO". Click it and see the card unlock.
   - Turn Smart Coupons off, open the BOGO page, and see "Buy 1 scarf get 1 at 50%" with "Paused: needs Smart Coupons".
   - Turn Smart Coupons back on and see the chip return to "Only with coupon: SCARFDUO".
6. **Licence states.**
   - Flip the licence to Free and see the Campaigns preview with sample data and the Free banner.
   - Open Smart Coupons. See SCARFDUO active, NEXT10 and SAVE30 with "Paused: over Free limit", and the notice to choose which stay on.
   - Try to add another coupon and see the upgrade card.
   - Flip to Pro (expired). See your own campaigns, read-only, with the expired banner, "Stopped: licence expired" on running rows, and "Renew licence" wherever a lock shows.
   - Click Renew and see Pro restored, with NEXT10 and SAVE30 active again.
7. **Coupon dates.**
   - Open Black Friday 2026 and click Edit on "30% off Outerwear".
   - See the header "Campaign-only: Black Friday 2026" and Active dates locked to the campaign, shown as dates and times with the site timezone.
   - Remove it from the campaign, choose "Keep as everyday offer", and see it become Inactive with editable dates.
8. **Arbiter in the storefront.** Open the storefront preview at the seed time and:
   1. Add two Trail Boots. See the free Trail Boots gift line from November Boots Week.
   2. Add a Field Jacket. See "$120 → $108 Countdown 10%".
   3. Turn on "Also apply 30% off Outerwear".
      - On the boots, see "Larger deal applied: Buy 2 boots get 1 free". The $95 gift beats 30% off two boots.
      - On the jacket, see "$108 → $75.60 30% off Outerwear" with "Deals combined", because Countdown is the base price.
   4. At checkout, tick "Add Leather Gloves, 25% off". See "$40 → $32 Countdown 20% → $24 bump" with "Deals combined". The bump is live because its everyday version runs until Black Friday starts.
   5. See the rewards bar with free shipping, the free Wool Beanie gift line at $0 and the third milestone reached, showing "You unlocked 10% off your next item: NEXT10".
   6. Remove one Trail Boot. See the gift line disappear and the rewards bar update immediately.
   7. Clear the cart and turn off "Also apply 30% off Outerwear". Add two Trail Boots and a Field Jacket, then enter SAVE30.
      - Boots: "Larger deal applied: Buy 2 boots get 1 free". The $95 gift beats SAVE30's $19.13 share on the boots.
      - Jacket: "$120 → $108 Countdown 10% → $78 SAVE30" with "Deals combined". The boots' share moved to the jacket, so the jacket gets the full $30.
   8. Remove the Field Jacket. SAVE30 now loses on every line and is removed with "SAVE30 wasn't applied because Buy 2 boots get 1 free saves you more."
9. **Campaign price.**
   - In Black Friday 2026, add a campaign price of 15% on Jackets.
   - See the readiness warning "1 product already has its own Countdown discount…", with singular and plural handled.
   - See the note about the products' own settings returning after the campaign.
10. **Ending a campaign.**
    - End November Boots Week with "End now".
    - See the wrap-up strip with the result vs baseline.
    - On the BOGO page, see "Buy 2 boots get 1 free" back to its everyday status, Off.
    - Click "Run again" and see a new draft with the boots rule attached and empty dates.
11. **Zone warning.** Open Cart Rewards and see the Rest of world zone warning.
12. **Takeover and hand-back.** For steps 12 to 17, check the gloves line in a cart with a Field Jacket and the gloves bump ticked.
    - Publish Black Friday 2026. See "Starts in 21 days, on Nov 27, 12:00 AM".
    - Set the prototype time to Nov 26, 10:00 AM: "$40 → $32 Countdown 20% → $24 bump" (everyday version).
    - Set it to Nov 28, 10:00 AM: Black Friday 2026 shows Running, and the gloves line shows "$40 → $32 Countdown 20% → $19.20 bump" (Black Friday version, 40%). The chip reads "Black Friday 2026 version · until Dec 1, 11:59 PM".
    - Set it to Dec 2, 10:00 AM: Black Friday 2026 shows Ended, and the gloves line shows "$40 → $32 Countdown 20% → $24 bump" again (everyday version).
13. **Editing the everyday version during a campaign.**
    - Set the time to Nov 28, 10:00 AM and open Modules > Upsell Order Bump.
    - See the banner "Black Friday 2026 is controlling Add Leather Gloves, 25% off until Dec 1, 11:59 PM. Changes here apply after it ends."
    - Change the everyday discount to 30%. The storefront still shows $19.20.
    - Set the time to Dec 2, 10:00 AM: "$40 → $32 Countdown 20% → $22.40 bump". Set the everyday discount back to 25%.
14. **Cart across the start and end.**
    - Set the time to Nov 26, 11:55 PM and add the jacket and gloves bump: "$40 → $32 Countdown 20% → $24 bump".
    - Set it to Nov 27, 12:05 AM and open the cart: "$40 → $32 Countdown 20% → $19.20 bump" with "Black Friday 2026 price applied."
    - Set it to Dec 1, 11:50 PM: still "$40 → $32 Countdown 20% → $19.20 bump".
    - Set it to Dec 2, 12:05 AM and open the cart: "$40 → $32 Countdown 20% → $24 bump" with "Black Friday 2026 ended. Prices updated."
15. **Pause and resume mid-window.**
    - Set the time to Nov 28, 10:00 AM. Pause Black Friday 2026: the paused strip shows, and the gloves line shows $24 with "Black Friday 2026 deal is no longer available. Prices updated."
    - Resume: back to $19.20.
16. **Licence notices and expiry mid-campaign.**
    - At Nov 28, 10:00 AM, see the notice "Your StoreGrowth Pro licence expires on Dec 4, 2026. Renew licence."
    - Open Winter Outerwear 15% and see "Your licence expires on Dec 4, before this campaign ends. It will stop then." under the Runs card. Black Friday 2026 has no such warning, because it ends Dec 1.
    - Set the licence to Pro (expired). Black Friday 2026 keeps its status but has no effect: the gloves line shows $24 with "Black Friday 2026 deal is no longer available. Prices updated." and "Renew licence" shows.
    - On the Campaigns list, see "Stopped: licence expired" on Black Friday 2026 and Winter Outerwear 15%.
    - Click Renew: back to $19.20, and the badges clear.
17. **Deleting campaigns.**
    - At Nov 28, 10:00 AM, delete Black Friday 2026. The confirm dialog lists no campaign-only offers (step 7 kept the coupon as everyday). The gloves line shows $24, and the bump still exists on its module page with no timeline chip.
    - Delete Winter Outerwear 15%. The confirm dialog lists "15% off Outerwear", which is deleted with it.
    - Click "Reset time".

## 11. Out of scope

- Dokan vendor campaigns, and any vendor screens
- Email or SMS of any kind
- Store credit, gift cards and bulk unique codes
- Product bundles and frequently bought together
- A/B testing
- WooCommerce screens, real WooCommerce integration, and any backend

## 12. Notes for the real build (not for the prototype)

- Work out the effective offer live on every page view and cart change, not with a scheduled switch. WordPress scheduled tasks only run on site visits, so a "switch back at midnight" job can fire late on quiet stores.
- Clear cached product pages for affected products at a campaign's start and end, best effort. Checkout stays correct regardless because it is calculated live.
- Reports: an order counts toward a campaign only when a campaign offer, price or link applied (section 3d). An attached offer's sales outside the window count toward its module.
- The licence check follows the shared weDevs flow: a daily check, no grace after expiry.
- Smart Coupons appear in WooCommerce > Coupons labelled "Managed by Smart Coupons", and their Edit link opens Smart Coupons, so a coupon can't be edited in two places.
- Campaign link attribution: check whether WooCommerce's built-in order attribution can carry the campaign before building a custom one.

## 13. Decided after the code audit

- **Dokan:** when an admin Smart Coupon beats a vendor BOGO on a vendor product, the marketplace funds the discount, following Dokan's admin-coupon setting where one exists.
- **Multi-currency:** base currency only in 3.1, documented.
- **Archived:** there is no archived campaign status.
- The GitHub issues for the 3.1 build hold the full list of decisions.
