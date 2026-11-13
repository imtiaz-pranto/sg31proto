# StoreGrowth 3.1 prototype brief v3.2 for Claude Code

Author: Imtiaz (PM). Version 3.2, Nov 13, 2026.

This brief is v3.1 merged with the campaign page redesign brief (`docs/campaign-page-redesign/campaign-page-redesign-brief.md`, Nov 13, 2026). It replaces every earlier version and is the full spec and the single source of truth. v3.1 is kept next to it for reference. Ask before adding anything this brief does not name.

## 0. What changed from v3.1

**Campaign page redesign (S2)**
- The campaign page has two layouts. Draft: setup as six numbered steps, with a "Ready to publish?" checklist in the rail. Scheduled, Running, Paused and Ended: a status strip, results, and a compact Setup summary with edit drawers.
- New on the page: step ticks, checklist links that jump to a step, Save draft with a save state, "Leave without saving?", a "⋯" menu, an End now confirm, and generated text ("What happens when", "When it ends", the ended summary sentence).
- New campaign opens the template picker first, and Blank opens an empty draft.
- The product rules did not change: the offer lifecycle, the arbiter, the licence rules and the overlap rules are exactly as in v3.1.

**Copy** (section 6)
- "Surfaces" are called "store displays" in the UI, and the card is "Show it on your store". The data model keeps the word surface.
- "Campaign-only" reads "Made for this campaign", and "Attached" reads "Attached · Used as is" or "Attached · Customised".
- Report labels: "Revenue from this campaign", "Average order value", "Your whole store during this campaign", "What led to the sale".

**Seed** (section 8)
- Offer acceptance per campaign, revenue by day for November Boots Week and Halloween Flash, and Halloween Flash's orders by store display.

**Walkthrough** (section 10)
- Steps 1 to 17 are reworded where the UI changed. Steps 18 to 24 are new. Steps 1 to 17 run from Reset seed, then steps 18 to 24 run from a second Reset seed.

**Open points** from the redesign build are in section 14.

### What changed from v3 (carried over from v3.1)

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

- **Campaigns**: a Pro-only top-level page, not a module. It groups offers, a campaign price and surfaces under one schedule, one product scope and one report card. A surface is anywhere on the store a campaign can show itself. The UI calls surfaces **store displays**; this brief uses "surface" for the rule and the data model, and "store display" for copy.
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
- **Layout:** desktop first at 1360 wide. It must not break at 1024. The sidebar stacks on narrower widths. On the campaign page, the rail stacks under the main column below 1100.
- **Seed data and copy:**
  - Seed data lives in `src/data/seed.ts` and matches section 8.
  - Copy stays as literal strings in components, so it can be edited by hand.
- **Charts:** no charting library. Charts are simple SVG drawn from the seed numbers.
- **Limits:** do not write WooCommerce or PHP, and do not add features beyond this brief.

## 3. Frozen product rules

These are decisions, not suggestions. The prototype demonstrates each one.

1. **Campaigns is Pro-only.**
   - With Free or an expired licence, the Campaigns page shows in a locked preview state (S1 Free).
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
   - A campaign can also own campaign-only offers that exist nowhere else. The UI calls these offers "made for this campaign"; this brief keeps "campaign-only" for the rule and the data model.
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
| `moduleOff` | Below a divider labelled "Not available", greyed, with a lock icon and one line saying the module is off | "Enable [module]": turns the module on in the mock store and returns to the same screen |
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
- When editing a coupon's **campaign version**, or a coupon **made for a campaign** (made for this campaign), the dates field is locked, reading "Set by campaign: [name], [dates]", with a link to the campaign.
- When editing a coupon's **everyday version**, its own dates are editable.
- Removing an attached coupon from a campaign removes only its campaign version. The everyday version is untouched.
- Removing a campaign-only coupon asks "Delete it" or "Keep as everyday offer". Keeping it makes it an everyday coupon with status Inactive until dates are set.

**Products**
- Campaign products are worked out from what is attached. They are the union of every attached offer's "applies to", plus the campaign price products.
- When anything is attached, the Products step is read-only.
- When nothing is attached, the Products step of a draft becomes an editable category and product picker. After publishing, the Setup summary shows the products with no action.

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
7. **Other WooCommerce coupons.** These stack with a Smart Coupon only if that coupon has "Allow with other coupons" on. Their own "Individual use" setting is respected.
8. **A code that loses everywhere.** A code coupon that loses on every line it applies to is removed with the notice "[CODE] wasn't applied because [deal] saves you more." A code that wins on some lines stays on those lines.

**Cart preview captions:**
- When the referee picked a winner on a line: "Larger deal applied: [name]".
- When deals combined: "Deals combined".

### 3d. Attribution (the report card logic)

An order is credited to a campaign when, checked in this order:
1. an offer's **campaign version**, a campaign-only offer or the campaign price of that campaign applied to the order
2. the session started from the campaign link within the window, and the order contains a campaign product

An attached offer's sales outside the campaign window count toward its module, not the campaign.

One order is credited to one campaign. The campaign is stamped on the order at checkout.

**Credited surface** ("What led to the sale"): the last campaign surface the shopper interacted with before adding a campaign product. That can be a bar click, a Fly Cart open, a badge or countdown product click, or a link visit. If there is none, it is "Direct". Impressions are counted separately per surface.

**Baseline:** the 30 days before the campaign starts, frozen at publish. AOV lift is campaign orders' AOV compared with the baseline AOV.

**Counting lines:** every metric card shows its counting rule under the number, using these exact lines:
- Revenue from this campaign: "Orders where a campaign offer applied, plus orders within 7 days of a link visit"
- Orders: "Same rule as revenue"
- Offer acceptance: "Carts that qualified and checked out". A campaign with no offer shows "--".
- Average order value: "Campaign orders vs the 30 days before"

When the window setting changes, the "7 days" in these lines updates.

**Your whole store during this campaign:** a context line under the metric cards, not credited to the campaign.
- "Your whole store during this campaign: [revenue] so far, [+/-x]% a day vs the 30 days before". "so far" reads "while it ran" when paused and "over the [n] days" when ended.
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

Ended campaigns never count. Both can show at the same time. The referee still decides the outcome in the cart; these only inform the merchant. They show under "Worth a look" on the campaign page (S2).

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
- `metrics`: `{revenue, orders, acceptance, aovLift, bySurface{}, byDay[]}`. `acceptance` is null when the campaign has no offer.
- `storeDuring`: `{revenue, dailyChangePct}` or null
- `warnings[]`
- `pausedSince`: the date-time it was paused
- `savedAt`: when the draft was last saved; unset means "Not saved yet"

**Save state:** the store keeps a snapshot of a draft from its first unsaved change (and of a published campaign while a Setup edit drawer is open), so "Leave without saving" and Cancel can put things back. This is page plumbing, not a product rule.

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

**Timeline chip:** shown on every offer row (module pages and the campaign page's offer rows) when the offer is attached to at least one campaign.
- Before the campaign: "Live now · [Campaign] takes over [start] to [end] · back to everyday after". If the everyday version is off: "Off now · [Campaign] turns it on [start] to [end] · back to everyday after".
- During: "[Campaign] version · until [end]"
- Several campaigns: the chip shows the next one and "+[n] more", with a tooltip listing every window.

**Module page banner:** on any module page with an offer currently controlled by a running campaign: "[Campaign] is controlling [offer] until [end]. Changes here apply after it ends." with a link "Edit [Campaign] version".

**Edit drawer header:** every offer edit drawer names the version being edited: "Everyday version", "[Campaign] version" or "Made for [Campaign]".

### S1 Campaigns list

**Header:**
- Title "Campaigns".
- Subtitle "Every promotion you have run, with what it earned".
- Date-range select: Last 30 days, Last 90 days, This year.
- Button "New campaign", which opens the template picker (S3).

**Stat cards.** There are four, and each shows its counting note under the number:
- Campaign revenue, with "x% of store revenue in the period".
- Campaign orders.
- AOV lift during campaigns, with "vs non-campaign days".
- Best store display, with "led x% of campaign orders".

**Chart:** campaign revenue by week, with campaign windows shaded.

**Tabs and search:** tabs for All, Running, Scheduled and Ended, each with a count, plus a search box.

**Table:**
- Columns: Campaign, Status chip, Runs, Offers (count plus small module icons), Store displays (count), Revenue, Orders, AOV lift.
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

Redesigned in v3.2. The designs are in `docs/campaign-page-redesign/designs/` (six screens). Numbers and dates in the designs are examples; computed values win.

**Two layouts**

| Status | Main column (wide, left) | Right rail (narrow) |
|---|---|---|
| **Draft** | Setup as six numbered steps | "Ready to publish?" checklist with Publish, At a glance, When it ends, Results placeholder |
| **Scheduled, Running, Paused, Ended** | Status strip, then results, then a compact **Setup** summary | Status and controls for that status |

While drafting, setup is the job, so it gets the space. Once published, results are the job, and setup becomes a summary you can still edit.

Below 1100px wide, the rail stacks under the main column, with its cards side by side. Nothing may be cut off at 1024.

Publish sets the status to Scheduled when the start is after the prototype time, or Running when it isn't. Status follows the prototype time: a scheduled campaign shows Running inside its window and Ended after it.

**Header (all statuses)**

- Back link "Campaigns", the campaign name as the page title ("New campaign" until it has a name), and the status chip. Running has a green dot.
- A "Module off" warning chip when a module the campaign uses is off.
- Draft only: a save state next to the chip: "Not saved yet", "Unsaved changes", "Saved just now", "Saved [n] minutes ago".
- Buttons by status. "⋯" is an icon button (`aria-label="More actions"`) opening a menu.

| Status | Buttons | "⋯" menu |
|---|---|---|
| Draft | Save draft, **Publish** (solid) | Use template, Clone, Preview storefront, Delete (red) |
| Scheduled | Unpublish | Clone, Preview storefront, Delete |
| Running | Pause, End now | Clone, Preview storefront, Delete |
| Paused | **Resume** (solid), End now | Clone, Preview storefront, Delete |
| Ended | **Run again** (solid) | Clone, Preview storefront, Delete |

- Draft: while required steps are missing, Publish is disabled with the tooltip "Finish the [n] required step(s) to publish".
- **Delete:** a confirm dialog: "Delete [campaign]? Attached offers go back to their everyday versions." If the campaign has offers made for it, it adds: "These offers made for this campaign will be deleted: [names]."
- **End now** asks first: "End [campaign] now? It finishes for good and the results freeze." with End now / Cancel.
- With a Free or expired licence, the banner from S1 shows at the top and every control is disabled.

#### S2 Draft

See `Main.dc.html` (empty) and `Ready.dc.html` (filled).

**Getting here**
- **New campaign** on the Campaigns list opens the template picker (S3) first. "Blank" opens an empty draft: no name, no dates.
- On an empty draft, a banner at the top says "Starting from scratch? A template fills in offers and store displays for you." with **Browse templates**. It hides as soon as anything is set.

**The six steps.** Each step is a card with a number badge, a title and a one-line description. A badge turns into a green tick when the step is done.

| # | Step | Done when | Contents |
|---|---|---|---|
| 1 | Name and schedule | Name and start date are set | Name field; Starts (date + time); Ends (date + time) with the checkbox "No end date (always on)"; the line "Times use your site timezone, [tz]. Change in Settings". A missing start date gets a red border and "Needed to publish" under it. Saving dates applies the no-overlap rule from section 3e: a clash shows the message from section 6 and does not save. |
| 2 | Offers | At least one offer | **Empty:** two large buttons: "Attach an existing offer" (opens the attach drawer) and "Create a new offer" (pick Smart Coupon, BOGO rule or Order Bump; saved as made for this campaign). **Filled:** offer rows, then "Add offer" (the same two choices in a small menu). |
| 3 | Campaign price | A price is set | "Optional" chip. **Empty:** "Add campaign price" button, which opens an inline form (percent + categories/products, Save/Cancel). **Filled:** "15% off Jackets" with Edit and Remove, plus an amber line for each product with its own Countdown: "[Product]'s own [n]% Countdown pauses while this runs, then comes back." The badge stays a number when skipped. Locked per section 3a when Countdown is off. |
| 4 | Products | Products are known | **Nothing attached:** category and product search fields. **Something attached:** read-only chips, e.g. "Jackets · category", "Wool Beanie", or "Entire store", with "Change them in the offers above." |
| 5 | Show it on your store | At least one store display is on | One row per store display: name, one-line description, switch. Then a "Not available" divider with locked rows (lock icon, "The [module] module is off. Turn it on to use it here.", **Enable [module]**). Pro locks follow section 3a. |
| 6 | Campaign link | After the first save | Before saving: "Your link appears once the draft is saved." After: read-only field `yourstore.com/?sg=[slug]` with **Copy**. |

**Store display rows**, in this order:

| Store display | Description |
|---|---|
| Countdown timer | Counts down to the campaign end on product pages |
| Floating notification bar | A bar across the top or bottom of every page |
| Product badge | A sale badge on campaign products. Owned by Campaigns, always available on Pro. |
| Live sales notification | Pop-ups of recent orders for campaign products |
| Fly cart message | A line about the campaign inside the side cart |
| Cart rewards bar | Your Cart Rewards milestones, with campaign copy on the bar |
| Stock count bar | Shows how many are left on campaign products |

**Offer rows** (step 2):
- Module chip (Smart Coupon, BOGO, Order Bump), the offer name, and a tag:
  - "Made for this campaign"
  - "Attached · Used as is"
  - "Attached · Customised"
- Second line: the offer's key details. For a customised offer: "Everyday: 25% off · During this campaign: 40% off".
- Attached offers also show the timeline line (section 5).
- Buttons:
  - used as is: **Customise** and Remove
  - otherwise: **Edit** and Remove
- Edit opens the campaign version (or the offer made for this campaign) in a drawer. Remove follows section 3b.
- When the offer's module is off, the row shows "Module off since [date]" and **Enable [module]** in place of Edit.

**Attach an existing offer** opens a drawer grouped by module: Smart Coupons, BOGO, Order Bump. BOGO rows show "Store-wide rule" or "Product rule". After picking, choose "Use as is" or "Customise for this campaign".
- An offer already attached to another campaign shows "In [campaign], [dates]":
  - windows don't overlap: Attach is enabled
  - windows overlap: Attach is disabled with the reason from section 6
- Locked modules appear per section 3a.

**The rail**

*"Ready to publish?"*
- A progress line ("[n] things left" and "[x] of [y] done", or "All required steps done" and "[y] of [y]") and a bar.
- **Required:** the blocking checks, worded as tasks:
  - "Set a start date"
  - "Add an offer, a campaign price or a store display"
  - "End date is before start date" (only while it fails)
  - Each open item is a link ("Go to step 1", "Go to steps 2, 3 or 5") that scrolls to that step, focuses its first field and briefly highlights the card.
  - Done items show a green tick ("Start date set", "Offer attached").
- **Worth a look ([n]):** the warnings below, each with its fix links. Fix links scroll to the relevant step.
- **Info lines** (grey): e.g. "Also running: Free shipping, always on".
- A full-width **Publish** button, with a line under it:
  - while blocked: "Finish the required steps to publish"
  - when ready: "Starts [date, time]. Offers switch over by themselves."
- The heading changes to "Ready to publish" with a green tick when nothing required is left.

| Check | Kind | Fix |
|---|---|---|
| No start date | Required | Go to step 1 |
| End date before start date | Required | Go to step 1 |
| Nothing attached (no offer, no campaign price, no store display) | Required | Go to steps 2, 3 or 5 |
| Products already on sale inside the campaign scope: "[n] products in [category] are already on sale." | Warning | "Exclude them" / "Stack deals" |
| Another campaign changes prices on the same products (section 3f) | Warning | "See products": scrolls to step 4 and names the shared products there |
| Another campaign shares products without changing prices (section 3f) | Info | None |
| A BOGO rule and a Buy X get Y coupon both target the same product | Warning | "Remove rule" / "Remove coupon" / "Keep both" |
| Campaign price products that already have their own Countdown discount | Warning | "Review" (scrolls to step 3) / "OK" |
| No discount attached | Warning: "Attribution will use the link and store display clicks only". Hidden while "Add an offer, a campaign price or a store display" is still open. | "Attach offer" |
| A store display is enabled whose module is off | Warning | "Enable [module]" |
| The campaign ends after the licence expiry date | Warning: "Your licence expires on [date], before this campaign ends. It will stop then." | "Renew licence" |

*Other rail cards*
- **At a glance:** Runs, Starts in, Offers count, Campaign price, Store displays (count on). All computed.
- **When it ends:** generated from the offers. Attached offers: "[name] goes back to its everyday version." (or "its everyday status, Off"). Made for this campaign: "[name] stops." Before anything is attached: "Attached offers go back to their everyday versions. Offers made for this campaign stop."
- **Results:** a dashed placeholder: "Revenue, orders and AOV change show here once the campaign starts."

**Saving**
- Edits on a draft show at once on the page, and the save state reads "Unsaved changes" (or "Not saved yet").
- Save draft saves and updates the save state. Publish saves too.
- Leaving the page with unsaved changes asks "Leave without saving?" with "Keep editing" and "Leave without saving". Leaving puts the draft back as it was when last saved.
- The link card fills in after the first save. A draft saved without a name is named "Untitled campaign".

#### S2 Scheduled

See `Scheduled.dc.html`.

- **Status strip:** "Starts in [n] days, on [date] at [time]", with "Runs [n] days, until [date] at [time]" on the right. Under it: "Until then, your everyday offers keep running as normal. You can still change anything below." Days are computed from the prototype time.
- **Results placeholder:** "Results start on [date]".
- **Setup summary:** one row per step (number, title, summary, action). "Editable until it starts".
  - **Edit** (or **Add** when the row is empty) opens that step's editor, the same component as the draft step, in a side drawer with Save/Cancel. Cancel puts everything back.
  - Products has no action.
  - The link row has **Copy**.
- **Rail:**
  - **What happens when:** a three-point timeline generated from the offers: "Now to [day before start]" (everyday state), "[start]" (what switches on or changes), "[end]" (what goes back or stops).
  - **Worth a look:** overlap warnings, the licence warning and info lines.
  - **Get ready:** "Your campaign link works from [date]. Add it to your emails, ads and Texty messages now." with **Copy campaign link**.
- **Unpublish** returns the campaign to Draft and the draft layout.

#### S2 Running

See `Running.dc.html`.

- **Status strip:** "Day [x] of [y] · ends in [n] days" with the window on the right, and a green progress bar. Computed from the prototype time. For a campaign with no end, "Running since [date] · always on" with no bar.
- **Results so far:**
  - Four metric cards, each with its counting line (section 3d): Revenue from this campaign, Orders, Offer acceptance, Average order value (change vs the 30 days before, green or red).
  - The "Your whole store during this campaign" line, with its context note. Hidden for always-on campaigns.
  - Two charts:
    - **Revenue by day:** bars for past days, a lighter bar for today, dashed placeholders for days still to come.
    - **What led to the sale:** horizontal bars per store display, Direct in grey, caption "Orders, by the last campaign display the shopper used".
- **Setup summary:** as Scheduled, but labelled "Changes apply right away" in amber. Edits apply immediately.
- **Rail:**
  - **Live on your store now:** each offer with its live state, e.g. "Campaign version · until [end] · then back to Off". The store displays that are on. Info lines.
  - **Worth a look:** only when there is an overlap warning or the licence warning.
  - **Need to stop it?:** one line each explaining Pause and End now, with both buttons.
  - **When it ends:** generated, as in Draft, plus "Results are frozen for the report."

#### S2 Paused

See `Paused.dc.html`.

- **Amber status strip:** "Paused since [date, time]", with "Scheduled to end [date, time]" on the right. Under it: "Offers are back to their everyday versions and store displays are off. Resume before [end] to finish the campaign."
- **Results** titled "Results up to the pause", with "Nothing new is counted while paused". The numbers stay as they were: metrics are seeded snapshots, so pausing just freezes what's there.
- **Setup summary** labelled "Changes apply when you resume".
- **Rail:**
  - **Off while paused:** each offer's current everyday state ("Back to its everyday version, Off, until you resume"), and "[n] store displays, all off".
  - **Pick it back up:** Resume (solid) and End now, with one line each.
  - **When it ends**, as in Running.

#### S2 Ended

See `Ended.dc.html`.

- **Summary strip:** "Ended [date] at [time] · ran [n] days", then one generated sentence: "[Name] earned [revenue] from [orders] orders. Average order value was [x]% higher/lower than the 30 days before." Plus **Run again**.
- **Final results**, "Frozen when the campaign ended". Same cards and charts as Running, with only the campaign's days on the revenue chart.
- **Setup summary:** read-only, no actions, labelled "Read-only. Run again to reuse it." The link row adds "· no longer applies an offer".
- **Rail:**
  - **Compared with the 30 days before:** average order value, store revenue a day, top store display.
  - **When it ended:** generated from the offers.
  - **Run it again:** "Copies the offers and store displays into a new draft. You pick new dates." with **Run again** (section 3e, Clone and Run again).

### S3 Template picker

A modal opened from New campaign on the Campaigns list, from "Browse templates" on an empty draft, and from "Use template" in a draft's "⋯" menu.
- Each card lists what it pre-fills.
- If a required module is off, the card shows "Needs [module]" with an inline Enable button.
- Choosing a card creates a Draft with the pre-fills and opens S2. Offers a template creates are made for that campaign.
- "Blank" opens an empty draft: no name, no dates, nothing attached.

| Template | Offer or price | Store displays |
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
  - Used in shows "Everyday", "Everyday + [campaign]" (with "+[n] more" when several), or "Made for [campaign]".
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
   - In a campaign version, the method and code are read-only. A different code needs a coupon made for this campaign.
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
   - Campaign version or made for a campaign: a blue locked panel "Set by campaign: [name], [dates]" with "Open campaign".

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
- the timeline chip, when attached to a campaign
- "Made for [campaign]" for rules made for a campaign

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

- **List columns:** Name, Targets, Offer product, Discount, Status, Chips (timeline chip or "Made for [campaign]").
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

One page with four panels. It is reachable from "Preview storefront" in the "⋯" menu on S2 and from Prototype controls. Everything on it follows the prototype time.

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
   - A coupon code field. Coupon notices follow section 3c, rules 4 and 8.
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
- locked S2 store display rows
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
| S6 rule chips | "Used by coupon: [title]" / "Only with coupon: [title]" / "Paused: needs Smart Coupons" |
| S2 "Worth a look", BOGO and coupon | "A BOGO rule and a Buy X get Y coupon both target [product]. The larger one wins." |
| S2 "Worth a look", campaign price | "[n] product(s) already have their own Countdown discount. The campaign price replaces it while the campaign runs." Singular and plural handled. |
| S2 campaign price, product with its own Countdown | "[Product]'s own [n]% Countdown pauses while this runs, then comes back." |
| S2 campaign price note | "Products' own Countdown settings are kept and return after the campaign." |
| S2 Add offer choices | "Attach an existing offer" / "Create a new offer" |
| S2 attach mode | "Use as is" / "Customise for this campaign" |
| S2 offer tags | "Made for this campaign" / "Attached · Used as is" / "Attached · Customised" |
| S2 drawer, offer in another campaign, no overlap | "In [campaign], [dates]." + button "Attach" |
| S2 drawer, offer in another campaign, overlap | "In [campaign], [dates]. Campaign dates can't overlap for the same offer." Attach disabled. |
| S2 dates saved into an overlap | "[Offer] is already in [campaign] ([dates]). Campaign dates can't overlap for the same offer." |
| S2 Cart rewards bar row | "Your Cart Rewards milestones, with campaign copy on the bar" |
| S2 Offers drawer group labels | "Smart Coupons", "BOGO", "Order Bump" |
| S2 overlap warning | "[Campaign] also discounts [n] products in this campaign. The larger deal applies." + "See products" |
| S2 overlap info line | "Also running: [campaign]" |
| S2 delete confirm | "Delete [campaign]? Attached offers go back to their everyday versions." / "These offers made for this campaign will be deleted: [names]." |
| S2 remove an offer made for this campaign | "Remove [offer] from [campaign]?" + "Delete it" / "Keep as everyday offer" |
| S2 paused strip | "Paused since [date, time]" / "Offers are back to their everyday versions and store displays are off. Resume before [end] to finish the campaign." |
| Timeline chip, before | "Live now · [Campaign] takes over [start] to [end] · back to everyday after" / "Off now · [Campaign] turns it on [start] to [end] · back to everyday after" |
| Timeline chip, during | "[Campaign] version · until [end]" |
| Module page banner | "[Campaign] is controlling [offer] until [end]. Changes here apply after it ends." + "Edit [Campaign] version" |
| Edit drawer headers | "Everyday version" / "[Campaign] version" / "Made for [Campaign]" |
| Used in, and module page chips | "Made for [Campaign]" |
| Cart notice, ended | "[Campaign] ended. Prices updated." |
| Cart notice, started | "[Campaign] price applied." |
| Locked row, module off | "[Module] is off. Enable it to use it here." |
| S2 locked store display row | "The [module] module is off. Turn it on to use it here." + button "Enable [module]" |
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
| Whole store during campaign | "Your whole store during this campaign: [revenue] so far, [+/-x]% a day vs the 30 days before" / "All store orders in the window. Context only, not credited to the campaign." |
| Prototype time pill | "Prototype time: [date, time]" |
| S2 store displays card title | "Show it on your store" |
| Counts, checklists, At a glance, list columns | "store displays" (never "surfaces") |
| S2 readiness card title | "Ready to publish?" / "Ready to publish" |
| S2 required checks | "Set a start date" / "Add an offer, a campaign price or a store display" / "End date is before start date" |
| Report metric labels | "Revenue from this campaign" / "Orders" / "Offer acceptance" / "Average order value" |
| Report chart title | "What led to the sale" + caption "Orders, by the last campaign display the shopper used" |
| S2 save states | "Not saved yet" / "Unsaved changes" / "Saved just now" / "Saved [n] minutes ago" |
| S2 Publish tooltip, blocked | "Finish the [n] required step(s) to publish" |
| S2 line under Publish | "Finish the required steps to publish" / "Starts [date, time]. Offers switch over by themselves." |
| S2 template banner | "Starting from scratch? A template fills in offers and store displays for you." + "Browse templates" |
| S2 start date missing | "Needed to publish" |
| S2 leave with unsaved changes | "Leave without saving?" + "Keep editing" / "Leave without saving" |
| S2 End now confirm | "End [campaign] now? It finishes for good and the results freeze." + "End now" / "Cancel" |
| S2 scheduled strip | "Starts in [n] days, on [date] at [time]" / "Runs [n] days, until [date] at [time]" / "Until then, your everyday offers keep running as normal. You can still change anything below." |
| S2 running strip | "Day [x] of [y] · ends in [n] days" / "Running since [date] · always on" |
| S2 ended strip | "Ended [date] at [time] · ran [n] days" / "[Name] earned [revenue] from [orders] orders. Average order value was [x]% higher/lower than the 30 days before." |
| S2 Setup summary labels | "Editable until it starts" / "Changes apply right away" / "Changes apply when you resume" / "Read-only. Run again to reuse it." |
| S2 running rail, offer state | "Campaign version · until [end] · then back to Off" (or "… then back to its everyday version") |
| S2 paused rail, offer state | "Back to its everyday version, Off, until you resume" |
| S2 ended link row | "· no longer applies an offer" |

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

| Name | Status | Runs | Offers / price | Store displays | Revenue | Orders | AOV lift |
|---|---|---|---|---|---|---|---|
| November Boots Week | Running | Nov 3, 00:00 to Nov 9, 23:59, 2026 | BOGO "Buy 2 boots get 1 free" (attached, use as is) | 4 | $2,140 | 47 | +22% |
| Free shipping, always on | Running | Nov 1, 2026, no end | None (manual scope: entire store) | Cart Rewards bar, Fly cart | $6,380 | 151 | +9% |
| Black Friday 2026 | Draft | Nov 27, 00:00 to Dec 1, 23:59, 2026 | Smart Coupon "30% off Outerwear" (made for this campaign), BOGO "Buy 1 beanie get 1 at 50%" (attached, use as is) | 6 (Stock bar enabled but its module is off) | -- | -- | -- |
| Winter Outerwear 15% | Scheduled | Nov 20, 00:00 to Dec 6, 23:59, 2026 | Smart Coupon "15% off Outerwear" (made for this campaign) | Floating bar, Badge | -- | -- | -- |
| Halloween Flash | Ended | Oct 29 to Oct 31, 2026 | Smart Coupon "20% off storewide" (made for this campaign) | 5 | $4,910 | 118 | +17% |
| Back to School | Ended | Aug 18 to Sep 2, 2026 | Smart Coupon tiers "Buy 3 save 15%" (made for this campaign) | 3 | $3,260 | 64 | +26% |
| Summer Clearance | Ended | Jul 20 to Aug 3, 2026 | Smart Coupon "40% off Summer" (made for this campaign) | 4 | $1,730 | 32 | -4% |
| Eid Sale | Ended | Jun 1 to Jun 7, 2026 | Smart Coupon code "EID15" (made for this campaign) | 3 | $2,480 | 58 | +11% |
| Spring Launch | Ended | Mar 10 to Mar 16, 2026 | None | 4 | $1,120 | 21 | +3% |

**Overall stats, Last 90 days:**
- Revenue $18,420 (31% of store)
- Orders 412
- AOV lift +14%
- Best store display Fly cart (38%)

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

**Offer acceptance** (seed sample values):

| Campaign | Offer acceptance |
|---|---|
| November Boots Week | 34% |
| Halloween Flash | 41% |
| Back to School | 29% |
| Summer Clearance | 22% |
| Eid Sale | 31% |
| Spring Launch | "--" (no offer) |

**Revenue by day:**

| Campaign | Days | Total |
|---|---|---|
| November Boots Week | Nov 3 $460, Nov 4 $520, Nov 5 $590, Nov 6 (today) $570 | $2,140 |
| Halloween Flash | Oct 29 $1,380, Oct 30 $1,560, Oct 31 $1,970 | $4,910 |

The other campaigns have no per-day seed.

**Black Friday 2026:**
- "Worth a look" warnings:
  - products already on sale (3 in Jackets)
  - Winter Outerwear 15% also discounts 2 products (Field Jacket, Trail Boots)
  - Stock bar enabled while its module is off
- Info line: "Also running: Free shipping, always on"
- Baseline: AOV $64.20, revenue $9,870.

### Smart Coupons

| Coupon | Type | Method | Details | Origin and status |
|---|---|---|---|---|
| 30% off Outerwear | Percentage | Automatic | Jackets and Boots, minimum $80 | Made for Black Friday 2026 |
| 15% off Outerwear | Percentage | Automatic | Jackets and Boots | Made for Winter Outerwear 15% |
| EID15 | Percentage | Code | | Made for Eid Sale, expired |
| 20% off storewide | Percentage | Automatic | | Made for Halloween Flash, expired |
| Buy 3 save 15% | Tiers | Automatic | | Made for Back to School, expired |
| BF Boots | Buy X get Y, references "Buy 2 boots get 1 free" | Automatic | | Everyday, Inactive |
| SCARFDUO | Buy X get Y, references "Buy 1 scarf get 1 at 50%" | Code | | Everyday, Active |
| NEXT10 | Percentage, 10% off one item | Code | Cart Rewards $200 reward | Everyday, Active |
| SAVE30 | Fixed, $30 off the cart | Code | Entire store; combines with nothing | Everyday, Active |

Active everyday coupons in creation order, oldest first: SCARFDUO, NEXT10, SAVE30. On Free or expired, NEXT10 and SAVE30 pause.

### BOGO rules

| Rule | Level | Everyday status | Links |
|---|---|---|---|
| Buy 2 boots get 1 free | Store-wide (Boots) | Off | Used by BF Boots; attached to November Boots Week |
| Buy 1 scarf get 1 at 50% | Product (Scarf) | Active | Used by SCARFDUO, so only with that coupon |
| Buy 1 beanie get 1 at 50% | Product (Wool Beanie) | Off | Attached to Black Friday 2026 |

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
| Wool Socks | $15 | Accessories | None |

### Orders by store display

The report shows Badge as "Product badge" and Link as "Campaign link".

**November Boots Week** (47 orders)

| Store display | Orders |
|---|---|
| Fly cart | 18 |
| Floating bar | 11 |
| Countdown | 9 |
| Badge | 5 |
| Link | 3 |
| Direct | 1 |

**Halloween Flash** (118 orders)

| Store display | Orders |
|---|---|
| Fly cart | 41 |
| Floating bar | 28 |
| Countdown | 22 |
| Sales pop | 12 |
| Badge | 9 |
| Link | 4 |
| Direct | 2 |

## 9. Prototype controls panel

A floating button, bottom right, opens a panel with:
- licence: Free / Pro / Pro (expired), plus the licence expiry date (default Dec 4, 2026)
- a switch for each module: Smart Coupons, BOGO, Cart Rewards, Countdown Timer, Floating Notification Bar, Stock Count Bar, Live Sales Notification, Fly Cart, Upsell Order Bump
- **Prototype time:** a date and time picker in the site timezone, plus "Reset time" (back to Nov 6, 2026, 10:00 AM)
- "Reset seed", which also resets the time and clears `sessionStorage`
- shortcuts to S1, S2 (Black Friday 2026), S5 (new coupon) and S8 (storefront)

Any change re-renders the current screen without a page reload. Campaign statuses, chips, banners, the arbiter and cart notices all follow the prototype time.

## 10. Acceptance walkthrough

The prototype is done when a reviewer can do all of the following without hitting a dead end: steps 1 to 17 in one run from Reset seed, then steps 18 to 24 in a second run from Reset seed.

A draft with unsaved changes asks "Leave without saving?" when you leave it. Where a step edits a draft and the next step leaves the page, the step ends with **Save draft**.

1. **Campaigns list and live report.**
   - Open Campaigns and see the overall stats and the list, including Winter Outerwear 15% as Scheduled.
   - Click November Boots Week and see a live report with the "What led to the sale" breakdown.
   - Refresh the page and see the same state. The store persisted.
2. **Readiness, overlap and enabling a module.**
   - Open Black Friday 2026 and see three warnings under "Worth a look (3)": products on sale, "Winter Outerwear 15% also discounts 2 products in this campaign. The larger deal applies.", and Stock count bar with its module off.
   - See the grey info line "Also running: Free shipping, always on".
   - Click "See products": the page scrolls to step 4, which names Field Jacket and Trail Boots.
   - Click "Enable Stock bar", see that warning clear, and see the Stock count bar row move above the "Not available" divider.
3. **Attaching an offer.**
   - In Black Friday 2026, step 2, click Add offer, then Attach an existing offer.
   - See offers grouped as Smart Coupons, BOGO and Order Bump.
   - Attach "Add Leather Gloves, 25% off", choose "Customise for this campaign" and set 40%.
   - See Products (step 4) update to include Leather Gloves, and the row tagged "Attached · Customised" with "Everyday: 25% off · During this campaign: 40% off" and the line "Live now · Black Friday 2026 takes over Nov 27, 12:00 AM to Dec 1, 11:59 PM · back to everyday after".
   - Click Save draft.
4. **Attaching to several campaigns.**
   - Open "Free shipping, always on". In Setup, click Add on the Offers row, then Attach an existing offer.
   - "Buy 1 beanie get 1 at 50%" shows "In Black Friday 2026, Nov 27 to Dec 1. Campaign dates can't overlap for the same offer." with Attach disabled, because an always-on campaign overlaps it. Close the drawers.
   - Open Black Friday 2026, click Add offer, then Attach an existing offer.
   - The BOGO rule "Buy 2 boots get 1 free" shows "In November Boots Week, Nov 3 to Nov 9." with Attach enabled. Attach it with "Use as is". Click Save draft.
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
   - Open Black Friday 2026 and click Edit on "30% off Outerwear", which is tagged "Made for this campaign".
   - See the header "Made for Black Friday 2026" and Active dates locked to the campaign, shown as dates and times with the site timezone.
   - Remove it from the campaign and choose "Keep as everyday offer". Click Save draft.
   - In Smart Coupons, see it Inactive with editable dates.
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
   - In Black Friday 2026, step 3, add a campaign price of 15% on Jackets.
   - See the "Worth a look" warning "1 product already has its own Countdown discount…", with singular and plural handled.
   - See the line "Field Jacket's own 10% Countdown pauses while this runs, then comes back."
   - Click Save draft.
10. **Ending a campaign.**
    - End November Boots Week with "End now", and confirm.
    - See the summary strip with the result vs the 30 days before.
    - On the BOGO page, see "Buy 2 boots get 1 free" back to its everyday status, Off.
    - Click "Run again" and see a new draft with the boots rule attached and empty dates.
11. **Zone warning.** Open Cart Rewards and see the Rest of world zone warning.
12. **Takeover and hand-back.** For steps 12 to 17, check the gloves line in a cart with a Field Jacket and the gloves bump ticked.
    - Publish Black Friday 2026. See "Starts in 21 days, on Nov 27 at 12:00 AM".
    - Set the prototype time to Nov 26, 10:00 AM: "$40 → $32 Countdown 20% → $24 bump" (everyday version).
    - Set it to Nov 28, 10:00 AM: Black Friday 2026 shows Running, and the gloves line shows "$40 → $32 Countdown 20% → $19.20 bump" (Black Friday version, 40%). On Modules > Upsell Order Bump the chip reads "Black Friday 2026 version · until Dec 1, 11:59 PM". On the campaign page, "Live on your store now" reads "Campaign version · until Dec 1, 11:59 PM · then back to its everyday version".
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
    - Set the time to Nov 28, 10:00 AM. Pause Black Friday 2026: the amber strip "Paused since Nov 28, 10:00 AM" shows with "Off while paused" in the rail, and the gloves line shows $24 with "Black Friday 2026 deal is no longer available. Prices updated."
    - Resume: back to $19.20.
16. **Licence notices and expiry mid-campaign.**
    - At Nov 28, 10:00 AM, see the notice "Your StoreGrowth Pro licence expires on Dec 4, 2026. Renew licence."
    - Open Winter Outerwear 15% and see "Your licence expires on Dec 4, before this campaign ends. It will stop then." under "Worth a look" in the rail. Black Friday 2026 has no such warning, because it ends Dec 1.
    - Set the licence to Pro (expired). Black Friday 2026 keeps its status but has no effect: the gloves line shows $24 with "Black Friday 2026 deal is no longer available. Prices updated." and "Renew licence" shows.
    - On the Campaigns list, see "Stopped: licence expired" on Black Friday 2026 and Winter Outerwear 15%.
    - Click Renew: back to $19.20, and the badges clear.
17. **Deleting campaigns.**
    - At Nov 28, 10:00 AM, open the "⋯" menu on Black Friday 2026 and click Delete. The confirm dialog lists no offers made for the campaign (step 7 kept the coupon as everyday). The gloves line shows $24, and the bump still exists on its module page with no timeline chip.
    - Delete Winter Outerwear 15% the same way. The confirm dialog lists "15% off Outerwear", which is deleted with it.
    - Click "Reset time".

**Second run. Click Reset seed first.**

18. **New campaign → template picker → Blank.** All six step badges are numbers, the template banner shows, "Ready to publish?" shows 0 of 2 with both required items, and Publish is disabled with the tooltip.
19. **Checklist links.** Click "Set a start date": the page scrolls to step 1, focuses the start date and highlights the card. Same for the offers item, which goes to step 2.
20. **Filling in.** Set a name and start date: step 1 ticks and the progress moves to 1 of 2. Turn on one store display: step 5 ticks, the progress shows 2 of 2, the heading reads "Ready to publish", and Publish enables in both places.
21. **Save draft.** The save state changes to "Saved just now", and the link card shows the link with Copy.
22. **Scheduled view.** Publish Black Friday 2026 from the seed. See the strip with the computed days, "What happens when" listing the beanie BOGO and 30% off Outerwear correctly, and the overlap warning in the rail. Click Edit on Offers: the drawer opens and a change saves. Unpublish: back to the draft layout.
23. **Running, Paused, Ended.**
    - Open November Boots Week at seed time: "Day 4 of 7 · ends in 3 days", the four metrics, the store line, both charts, and "Changes apply right away".
    - Pause: the paused layout with the amber strip and "Off while paused". Resume: running again.
    - End now: confirm, then the ended layout with the generated sentence "November Boots Week earned $2,140 from 47 orders. Average order value was 22% higher than the 30 days before."
    - Run again: a new draft with the offers and empty dates.
24. **Narrow width.** At 1024px wide, every status shows the rail under the main column, with nothing cut off.

## 11. Out of scope

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

- **Multi-currency:** base currency only in 3.1, documented.
- **Archived:** there is no archived campaign status.
- The GitHub issues for the 3.1 build hold the full list of decisions.

## 14. Open points from the campaign page redesign

Places where the redesign brief, the designs and brief v3.1 disagreed, or where the build needed a decision none of them makes. Each one is implemented as described and waits for a PM yes or no.

**Saving**
1. **How saving works.** The redesign asks for Save draft, a save state and "Leave without saving?". Edits on a draft show at once; the store keeps how the draft was at its last save, and "Leave without saving" puts that back. A fourth save state, "Unsaved changes", shows between an edit and the next save.
2. **Walkthrough steps 3, 4, 7 and 9** now end with Save draft, because the next step leaves the page.
3. **Drafts that were never saved** (from New campaign, Clone and Run again) stay in the Campaigns list. They read "Not saved yet" and have no link until the first save.
4. **Names.** A blank draft has no name and its title reads "New campaign". Saving or publishing without a name names it "Untitled campaign". A missing name does not block Publish, because the required checks are only the three in S2.
5. **Edit drawers on published campaigns.** Changes apply while the drawer is open, and Cancel puts them back. Save only confirms them.

**Dates**
6. **"No end date (always on)".** In the data model an empty end date already means always on. So the box ticks itself as soon as a start date is set with no end date. The empty design shows it unticked.
7. **Templates other than Blank** still pre-fill a name and dates, as before. Only Blank opens empty.
8. **Timeline line.** The designs show dates only ("Nov 27 to Dec 1"). Walkthrough step 3 expects dates and times, so times are kept. "Off now · [Campaign] turns it on …" also shows on the module pages.

**Copy**
9. **Template banner.** The redesign brief and the design say "offers and surfaces". Section 8 retires "surfaces", so the banner says "offers and store displays".
10. **"Made for this campaign" where the campaign must be named** (Used in, module page chips, edit drawer headers) reads "Made for [Campaign]". The tag on the campaign page reads "Made for this campaign".
11. **"Store displays" outside the listed places.** "Best surface" on the Campaigns list, the Analytics page, the Modules role labels and the template cards also say "store display".
12. **Locked rows.** The new copy "The [module] module is off. Turn it on to use it here." is used on the campaign page (store display rows and campaign price). The attach drawer keeps v3.1's "[Module] is off. Enable it to use it here."
13. **Generated sentences** use the offers' real names ("Buy 1 beanie get 1 at 50%"), not short forms like "the beanie BOGO".
14. **Offer rows** lead the details line with the value ("30% off · Automatic · Jackets and Boots · orders over $80"). The design leaves the value out.

**Layout and behaviour**
15. **Preview storefront.** v3.1 reaches the storefront from the campaign page; the new header has no such button. It is in the "⋯" menu.
16. **Store display rows** follow the designs' order and names (Product badge third, Stock count bar last, sentence case), not v3.1's.
17. **Store display counts on the campaign page** count displays that are switched on and whose module is on. Black Friday 2026 shows 5 until Stock Bar is enabled. The Campaigns list still shows 6, as in the seed table.
18. **Products after publishing.** The Setup summary gives Products no action, as the redesign says. So a campaign with nothing attached can no longer change its hand-picked products once published; v3.1 allowed it.
19. **"Worth a look" on Running and Paused.** The designs show none, but v3.1 puts the overlap and licence warnings on those statuses. The card shows there only when there is a warning.
20. **"See products".** v3.1 wants the shared products named; the redesign wants fix links to scroll to a step. The link scrolls to step 4 and names them there.
21. **Campaign price warning** keeps "OK" next to "Review", so it can still be dismissed.
22. **"No discount attached"** is hidden on a draft until "Add an offer, a campaign price or a store display" is done, so an empty draft shows no "Worth a look".
23. **Baseline line.** v3.1's "Baseline: … AOV, revenue" line under the report is gone, because the designs have no place for it.
24. **Paused charts.** The design shows fewer bars after a pause. The redesign brief says pausing freezes what is there, so the chart keeps every day that has numbers.

**Seed**
25. **Offer acceptance.** Spring Launch shows "--". Free shipping, always on also has no offer but keeps its 57%, because section 7 of the redesign brief does not list it.
26. **Link slugs** stay as in the seed (`boots-week`, `bf2026`). The designs show longer ones.
