# StoreGrowth 3.1 Prototype Brief: v3 Patch

**Author:** Imti (PM)
**Date:** Nov 6, 2026
**Applies on top of:** storegrowth-3.1-prototype-brief-v2.md

Apply these changes to brief v2 and save the result as v3. Keep v2 for reference. Where v3 and v2 disagree, v3 wins.

---

## 1. Decisions locked in v3

1. Every offer has an **everyday version**. When a campaign it belongs to starts, the campaign **takes over**. When the campaign ends, the offer **goes back to its everyday version**. Same for every offer type: Smart Coupons, BOGO (store-wide and product rules), Order Bumps.
2. "Move here" and "Clone into this campaign" are replaced by **Attach existing offer** and **Create campaign-only offer**.
3. The campaign overlap **warning** fires only when two campaigns change the price of the same products. Overlaps with no price change get a lighter **info line**.
4. The prototype gets a **Simulate date and time** control so takeover and hand-back can be tested.

---

## 2. Offer lifecycle (replaces section 3b "offers follow campaign dates")

### 2.1 Two versions per offer

| Version | What it holds | When it applies |
|---|---|---|
| Everyday version | The offer as set on its module page: on/off, values, its own schedule | Whenever no running campaign controls it |
| Campaign version | Only what the campaign changes, or nothing if the merchant chose "Use as is" | Only while that campaign is **running** |

The effective offer is worked out live on every page view and every cart change: if a running campaign controls this offer right now, use the campaign version; otherwise use the everyday version. The everyday version is never overwritten, so nothing ever needs restoring.

### 2.2 Rules

| Situation | Outcome |
|---|---|
| Offer attached to a draft or scheduled campaign | Everyday version keeps running unchanged |
| Campaign starts | Campaign version applies |
| Campaign ends, is paused, or goes back to draft | Everyday version applies again |
| Campaign deleted or archived | Campaign version is removed; everyday version untouched |
| Everyday version is off | Campaign switches it on during its window; it is off again after |
| Edit from the module page while a campaign is running | Changes the everyday version only; visible after the campaign ends |
| Edit from the campaign page | Changes the campaign version only |
| Pro licence expires mid-campaign | Counts as Free, campaign stops, every offer goes back to its everyday version |
| Offer created inside a campaign (campaign-only) | No everyday version; offline outside the campaign window |
| Free plan 2-bump limit | Counts everyday bumps only |

### 2.3 Attaching to more than one campaign

- An offer can be attached to several campaigns **only if their windows do not overlap**. Example: everyday, then Black Friday, then everyday, then Christmas, then everyday.
- If windows overlap, block the attach with: *"Gloves bump is already in Black Friday 2026 (Nov 27 to Nov 30). Campaign dates can't overlap for the same offer."*
- Changing a campaign's dates so that it would overlap another campaign sharing an offer shows the same message and does not save.

### 2.4 Code coupons

- Code and link Smart Coupons stay real WooCommerce coupons.
- If the campaign keeps the same code and changes the amount, the campaign amount applies live during the window. The coupon's saved amount stays the everyday amount.
- If the campaign needs a different code (for example BF25), that is a **campaign-only** coupon, not a campaign version of the everyday one.

### 2.5 Cart at the start or end of a campaign

- The cart is re-checked on every cart change and at checkout (same rule as Cart Rewards).
- If a deal ended or changed since the item was added, show a cart notice: *"Black Friday 2026 ended. Prices updated."*
- If a deal started since the item was added, the new price applies with: *"Black Friday 2026 price applied."*

### 2.6 Campaign clone and Run again

Clone and Run again now include **all** offers, product BOGO rules included:
- Attached offers are attached to the new campaign with their campaign versions copied.
- Campaign-only offers are copied as new campaign-only offers.
- If the new campaign's dates would overlap another campaign sharing an attached offer, apply rule 2.3.

This replaces the v2 call that skipped product BOGO rules on clone.

---

## 3. UI changes

### 3.1 Campaign page: adding offers

- Button: **Add offer**, with two choices:
  - **Attach existing offer:** pick from all offers. Then choose **Use as is** or **Customise for this campaign**.
  - **Create campaign-only offer:** opens the normal create flow, saved inside this campaign.
- Each offer row in the campaign shows a tag: **Attached** or **Campaign-only**.

### 3.2 Timeline chip on offer rows

Shown on the module page row and the campaign row for any attached offer.

- Before the campaign: *Live now · Black Friday takes over Nov 27 to Nov 30 · back to everyday after*
- During: *Black Friday version · until Nov 30, 11:59 PM*
- Several campaigns: chip shows the next one and "+1 more" with a tooltip listing all windows.

### 3.3 Module page banner during a campaign

*"Black Friday 2026 is controlling this bump until Nov 30, 11:59 PM. Changes here apply after it ends."* with a link **Edit Black Friday version**.

### 3.4 Edit drawer header

The drawer always names the version being edited: **Everyday version** or **Black Friday 2026 version**. If opened from a campaign with "Use as is", show **Customise for this campaign** instead of editable fields.

---

## 4. Campaign overlap (replaces the v2 broadened rule)

### 4.1 What counts as changing the price

Price-changing offers: Smart Coupons, BOGO, Order Bumps, campaign price (Countdown-based).
Not price-changing: Cart Rewards (free shipping) and display-only surfaces.

### 4.2 Two levels

| Level | Fires when | Copy | Blocks save? |
|---|---|---|---|
| ⚠️ Warning | Another running or scheduled campaign has a price-changing offer on products this campaign also changes | *"Winter Outerwear 15% also discounts 4 products in this campaign. The larger deal applies."* + **See products** | No |
| ℹ️ Info line | Another running or scheduled campaign shares products but changes no price | *"Also running: Free shipping, always on"* | No |

Both can show at the same time. The referee still decides the outcome at checkout; these only inform the merchant.

### 4.3 Seed change

Add a scheduled campaign:
- **Name:** Winter Outerwear 15%
- **Dates:** starts before and ends after Black Friday 2026's seeded window
- **Offer:** automatic Smart Coupon, 15% off the Outerwear category (includes the jacket)

Expected: Black Friday 2026 shows the warning naming Winter Outerwear 15% and the info line for Free shipping, always on. After step 4 moves the beanie rule, the warning **stays**, because the overlap is on Outerwear.

---

## 5. Prototype tool: Simulate date and time

- A control in the prototype toolbar to set a simulated date and time in the site timezone.
- When active, show a visible badge: *Simulated: Nov 28, 2026, 10:00 AM*, with **Back to real time**.
- Every date-based behaviour reads the simulated time: campaign status, takeover, hand-back, chips, banners, cart notices.
- The simulated time is kept across refresh with the rest of the state. **Reset seed** returns to real time.

---

## 6. Walkthrough changes (section 10)

**Changed steps**

- **Step 3:** Attaching the gloves bump to Black Friday 2026 (draft) keeps the bump live. The row shows the timeline chip. Customise the Black Friday version to 40% off.
- **Step 8.4:** Back to the original wording. Passes without Reset seed: checkout shows the gloves bump at its everyday price, `$40 → $32 Countdown 20% → $24 bump`, "Deals combined".

**New steps**

12. **Takeover and hand-back.** Schedule Black Friday 2026. Simulate a time before the start: everyday bump ($24). Simulate a time inside the window: Black Friday version (with Countdown at 20%, `$40 → $32 → $19.20`). Simulate a time after the end: everyday bump again ($24).
13. **Pause and delete mid-window.** Inside the window, pause Black Friday 2026: everyday version applies. Resume: Black Friday version again. Delete the campaign: everyday version applies and the bump still exists on its module page.
14. **Edit everyday version during a campaign.** Inside the window, open the bump from Modules > Upsell Order Bump. The banner shows. Change the everyday discount. Checkout still shows the Black Friday version. Simulate after the end: the new everyday value applies.
15. **Overlapping attach blocked.** Create a campaign whose window overlaps Black Friday 2026 and try to attach the gloves bump. The block message from 2.3 shows and nothing is attached.
16. **Overlap levels.** Open Black Friday 2026: warning for Winter Outerwear 15% and info line for Free shipping, always on. Complete step 4 again: the warning stays.
17. **Cart at the boundary.** Inside the window, add the jacket and gloves bump to the cart. Simulate a time after the end and open the cart: prices update and the "ended" notice shows.
18. **Licence expires mid-campaign.** Inside the window, switch the licence to Pro (expired): campaign stops, every offer shows its everyday version, "Renew licence" shows.

All 18 steps should pass in one run from Reset seed.

---

## 7. Real-build notes (not for the prototype)

- Work out the effective offer live, not with a scheduled switch. WordPress scheduled tasks only run on site visits, so a "switch back at midnight" job can fire late on quiet stores.
- Clear cached product pages for affected products at a campaign's start and end, best effort. Checkout stays correct regardless because it is calculated live.
- Reports: revenue during a campaign window counts toward the campaign; outside it, toward the module.

---

## 8. Still open

- **Dokan:** a vendor BOGO and an admin Smart Coupon on the same line compete, larger wins. Need a decision on what happens to the vendor's deal and who funds the discount that applies. Required before the rules engine build.
