# StoreGrowth 3.1 prototype: Campaign page redesign brief

Author: Imtiaz (PM). Nov 13, 2026.
Adds to: `docs/storegrowth-3.1-prototype-brief-v3.1.md`.
Designs: `designs/` (six screens, see `designs/README.md`).

## 0. What this is

The campaign page (S2 in brief v3.1) is redesigned for every status: draft, scheduled, running, paused and ended. The product rules in brief v3.1 don't change: the offer lifecycle, the arbiter, the licence rules, the overlap rules and the seed stay exactly as they are. Only the campaign page's layout, behaviour and copy change, plus the few seed values in section 7.

Where this brief or the designs differ from brief v3.1's S2, S3 entry point or copy table, **this brief wins**. Everywhere else, v3.1 still holds.

## 1. Two layouts

| Status | Main column (wide, left) | Right rail (narrow) |
|---|---|---|
| **Draft** | Setup as six numbered steps | "Ready to publish?" checklist with Publish, At a glance, When it ends, Results placeholder |
| **Scheduled, Running, Paused, Ended** | Status strip, then results, then a compact **Setup** summary | Status and controls for that status |

The idea: while drafting, setup is the job, so it gets the space. Once published, results are the job, and setup becomes a summary you can still edit.

Below 1100px wide, the rail stacks under the main column. Nothing may be cut off at 1024.

## 2. Header (all statuses)

- Back link "Campaigns", the campaign name as the page title, and the status chip.
- Draft only: a save state next to the chip: "Not saved yet", "Saved just now", "Saved [n] minutes ago".
- Buttons by status. "⋯" is an icon button (`aria-label="More actions"`) opening a menu.

| Status | Buttons | "⋯" menu |
|---|---|---|
| Draft | Save draft, **Publish** (solid) | Use template, Clone, Delete (red) |
| Scheduled | Unpublish | Clone, Delete |
| Running | Pause, End now | Clone, Delete |
| Paused | **Resume** (solid), End now | Clone, Delete |
| Ended | **Run again** (solid) | Clone, Delete |

- Draft: while required steps are missing, Publish is disabled with the tooltip "Finish the [n] required step(s) to publish".
- Delete keeps v3.1's confirm dialog, including the list of offers made for this campaign.
- End now asks first: "End [campaign] now? It finishes for good and the results freeze." with End now / Cancel.

## 3. Draft

See `Main.dc.html` (empty) and `Ready.dc.html` (filled).

### 3.1 Getting here
- **New campaign** on the Campaigns list opens the template picker (v3.1 S3) first. "Blank" opens an empty draft.
- On an empty draft, a banner at the top says "Starting from scratch? A template fills in offers and surfaces for you." with **Browse templates**. Hide it as soon as anything is set.

### 3.2 The six steps
Each step is a card with a number badge, a title and a one-line description (copy from the designs). A badge turns into a green tick when the step is done.

| # | Step | Done when | Contents |
|---|---|---|---|
| 1 | Name and schedule | Name and start date are set | Name field; Starts (date + time); Ends (date + time) with the checkbox "No end date (always on)"; the line "Times use your site timezone, [tz]. Change in Settings". A missing start date gets a red border and "Needed to publish" under it. |
| 2 | Offers | At least one offer | **Empty:** two large buttons: "Attach an existing offer" (opens v3.1's attach drawer) and "Create a new offer" (opens the create flow, saved as made for this campaign). **Filled:** offer rows, then "Add offer" (same two choices in a small menu). |
| 3 | Campaign price | A price is set | "Optional" chip. **Empty:** "Add campaign price" button, which opens an inline form (percent + categories/products, Save/Cancel). **Filled:** "15% off Jackets" with Edit and Remove, plus an amber line for products with their own Countdown, e.g. "Field Jacket's own 10% Countdown pauses while this runs, then comes back." The badge stays a number when skipped. |
| 4 | Products | Products are known | **Nothing attached:** category and product search fields (with placeholders). **Something attached:** read-only chips, e.g. "Jackets · category", "Wool Beanie", with "Change them in the offers above." |
| 5 | Show it on your store | At least one display is on | One row per display: name, one-line description, switch. Then a "Not available" divider with locked rows (lock icon, "The [module] module is off. Turn it on to use it here.", **Enable [module]**). Pro locks follow v3.1's lock rule. |
| 6 | Campaign link | After the first save | Before saving: "Your link appears once the draft is saved." After: read-only link field with **Copy**. |

**Offer rows** (step 2):
- Module chip (Smart Coupon, BOGO, Order Bump), the offer name, and a tag:
  - "Made for this campaign" (campaign-only)
  - "Attached · Used as is"
  - "Attached · Customised"
- Second line: the offer's key details. For a customised offer: "Everyday: 25% off · During this campaign: 40% off".
- Attached offers also show the timeline line from v3.1 ("Live now · … takes over … · back to everyday after", or "Off now · … turns it on …").
- Buttons:
  - used as is: **Customise** and Remove
  - otherwise: **Edit** and Remove
- Remove follows v3.1's remove rules.

The vendor footnote no longer shows on the page. Keep it inside the attach drawer only.

### 3.3 The rail
**"Ready to publish?"**
- A progress line ("[n] things left" / "All required steps done") and a bar.
- **Required:** the blocking checks from v3.1, worded as tasks:
  - "Set a start date"
  - "Add an offer, a campaign price or a store display"
  - "End date is before start date"
  - Each open item is a link ("Go to step 1") that scrolls to that step, focuses its first field and briefly highlights the card.
  - Done items show a green tick.
- **Worth a look ([n]):** v3.1's warnings, each with its fix links (See products, Review, Exclude them, Stack deals and so on). Fix links scroll to the relevant step.
- **Info lines** (grey): e.g. "Also running: Free shipping, always on".
- A full-width **Publish** button, with a line under it:
  - while blocked: "Finish the required steps to publish"
  - when ready: "Starts [date, time]. Offers switch over by themselves."
- The heading changes to "Ready to publish" with a green tick when nothing required is left.

**Other rail cards**
- **At a glance:** Runs, Starts in, Offers count, Campaign price, Store displays (count on). All computed.
- **When it ends:** generated from the offers. Attached offers: "[name] goes back to its everyday version." Campaign-only: "[name] stops."
- **Results:** a dashed placeholder: "Revenue, orders and AOV change show here once the campaign starts."

### 3.4 Saving
- Save draft saves and updates the save state.
- Leaving the page with unsaved changes asks "Leave without saving?".
- The link card fills in after the first save.

## 4. Scheduled

See `Scheduled.dc.html`.

- **Status strip:** "Starts in [n] days, on [date] at [time]", with "Runs [n] days, until [date] at [time]" on the right. Under it: "Until then, your everyday offers keep running as normal. You can still change anything below." Days are computed from prototype time.
- **Results placeholder:** "Results start on [date]".
- **Setup summary:** one row per step (number, title, summary, action). "Editable until it starts".
  - **Edit** opens that step's editor (the same component as the draft step) in a side drawer with Save/Cancel.
  - Products has no action.
  - The link row has **Copy**.
- **Rail:**
  - **What happens when:** a three-point timeline generated from the offers: "Now to [day before start]" (everyday state), "[start]" (what switches on or changes), "[end]" (what goes back or stops).
  - **Worth a look:** overlap warnings and info lines. This is where v3.1 puts them for scheduled campaigns.
  - **Get ready:** "Your campaign link works from [date]. Add it to your emails, ads and Texty messages now." with **Copy campaign link**.
- **Unpublish** returns the campaign to Draft and the draft layout.

## 5. Running

See `Running.dc.html`.

- **Status strip:** "Day [x] of [y] · ends in [n] days" with the window on the right, and a green progress bar. Computed from prototype time. For a campaign with no end, show "Running since [date] · always on" with no bar.
- **Results so far:**
  - Four metric cards, each with its v3.1 counting line: Revenue from this campaign, Orders, Offer acceptance, Average order value (change vs the 30 days before, green or red).
  - The "Your whole store during this campaign" line, with v3.1's context note. Hidden for always-on campaigns.
  - Two charts:
    - **Revenue by day:** bars for past days, a lighter bar for today, dashed placeholders for days still to come.
    - **What led to the sale:** horizontal bars per display, Direct in grey, caption "Orders, by the last campaign display the shopper used".
- **Setup summary:** as Scheduled, but labelled "Changes apply right away" in amber. Edits apply immediately, per v3.1.
- **Rail:**
  - **Live on your store now:** each offer with its live state, e.g. "Campaign version · until [end] · then back to Off". The displays that are on. Info lines.
  - **Need to stop it?:** one line each explaining Pause and End now, with both buttons.
  - **When it ends:** generated, as in Draft.

## 6. Paused and Ended

### 6.1 Paused
See `Paused.dc.html`.
- **Amber status strip:** "Paused since [date, time]", with "Scheduled to end [date, time]" on the right. Under it: "Offers are back to their everyday versions and store displays are off. Resume before [end] to finish the campaign."
- **Results** titled "Results up to the pause", with "Nothing new is counted while paused". The numbers stay as they were.
- **Setup summary** labelled "Changes apply when you resume".
- **Rail:**
  - **Off while paused:** each offer's current everyday state, and "[n] store displays, all off".
  - **Pick it back up:** Resume (solid) and End now, with one line each.
- The numbers in the paused design are illustrative. In the prototype, metrics are seeded snapshots, so pausing just freezes what's there.

### 6.2 Ended
See `Ended.dc.html`.
- **Summary strip:** "Ended [date] at [time] · ran [n] days", then one generated sentence: "[Name] earned [revenue] from [orders] orders. Average order value was [x]% higher/lower than the 30 days before." Plus **Run again**.
- **Final results**, "Frozen when the campaign ended". Same cards and charts as Running, with only the campaign's days on the revenue chart.
- **Setup summary:** read-only, no actions, labelled "Read-only. Run again to reuse it." The link row adds "· no longer applies an offer".
- **Rail:**
  - **Compared with the 30 days before:** AOV change, store revenue a day, top store display.
  - **When it ended:** generated from the offers.
  - **Run it again:** "Copies the offers and store displays into a new draft. You pick new dates." with **Run again** (v3.1's Run again rules).

## 7. Seed additions

- **Offer acceptance** per campaign (seed sample values): November Boots Week 34%, Halloween Flash 41%, Back to School 29%, Summer Clearance 22%, Eid Sale 31%. Spring Launch has no offer, so show "--".
- **Revenue by day:**
  - November Boots Week: Nov 3 $460, Nov 4 $520, Nov 5 $590, Nov 6 (today) $570. Total $2,140, matching the seed.
  - Halloween Flash: Oct 29 $1,380, Oct 30 $1,560, Oct 31 $1,970. Total $4,910.
  - Keep any existing per-day seed for the other campaigns.
- **Halloween Flash surface counts** (total 118): Fly cart 41, Floating bar 28, Countdown 22, Sales pop 12, Badge 9, Link 4, Direct 2.
- Keep every other seed value from brief v3.1 as it is.

## 8. Copy changes (apply everywhere in the prototype)

| Was | Now |
|---|---|
| Surfaces (card title, campaign page) | Show it on your store |
| surfaces (in counts, checklists, At a glance, list columns) | store displays |
| Campaign-only (tags, drawer headers, Used in) | Made for this campaign |
| Attached (tag) | Attached · Used as is / Attached · Customised |
| Readiness card title | Ready to publish? / Ready to publish |
| Attributed revenue (metric) | Revenue from this campaign |
| AOV change (metric) | Average order value |
| "Store during campaign: …" | "Your whole store during this campaign: …" |
| Which surface led to the sale | What led to the sale |
| Paused strip | "Paused since [date, time]" plus the line in 6.1 |
| Blocking check "Nothing attached" | "Add an offer, a campaign price or a store display" |

Update brief v3.1's copy table (section 6) to match.

## 9. Walkthrough (brief v3.1, section 10)

- **Keep all 17 steps passing.** Update their wording where the UI changed, for example:
  - step 2: warnings now sit under "Worth a look"
  - step 3: start from "Attach an existing offer"
  - step 7: the tag reads "Made for this campaign"
  - step 15: the new paused strip
  - step 17: Delete is in the "⋯" menu
- Expected prices and behaviours don't change.

**Add these steps.** Run steps 1 to 17 from Reset seed, then Reset seed again and run steps 18 to 24.

18. **New campaign → template picker → Blank.** All six step badges are numbers, the template banner shows, "Ready to publish?" shows 0 of 2 with both required items, and Publish is disabled with the tooltip.
19. **Checklist links.** Click "Set a start date": the page scrolls to step 1, focuses the start date and highlights the card. Same for the offers item.
20. **Filling in.** Set a name and start date: step 1 ticks and the progress moves to 1 of 2. Turn on one store display: step 5 ticks, the progress shows 2 of 2, the heading reads "Ready to publish", and Publish enables in both places.
21. **Save draft.** The save state changes to "Saved just now", and the link card shows the link with Copy.
22. **Scheduled view.** Publish Black Friday 2026 from the seed. See the strip with the computed days, "What happens when" listing the beanie BOGO and 30% off Outerwear correctly, and the overlap warning in the rail. Click Edit on Offers: the drawer opens and a change saves. Unpublish: back to the draft layout.
23. **Running, Paused, Ended.**
    - Open November Boots Week at seed time: "Day 4 of 7 · ends in 3 days", the four metrics, the store line, both charts, and "Changes apply right away".
    - Pause: the paused layout with the amber strip and "Off while paused". Resume: running again.
    - End now: confirm, then the ended layout with the generated sentence "November Boots Week earned $2,140 from 47 orders. Average order value was 22% higher than the 30 days before."
    - Run again: a new draft with the offers and empty dates.
24. **Narrow width.** At 1024px wide, every status shows the rail under the main column, with nothing cut off.

All 24 steps must pass: 1 to 17 in one run from Reset seed, then 18 to 24 in a second run from Reset seed.

## 10. Out of scope

- The Campaigns list, module pages, storefront preview and licence screens, apart from the copy changes in section 8.
- Any new product logic. If something in the designs seems to need a new rule, list it as a brief conflict instead of inventing one.
