# StoreGrowth 3.1 prototype

Clickable prototype of StoreGrowth 3.1 (Campaigns, Smart Coupons, Cart Rewards, rules engine). Confidential, internal only.

## How to run

```bash
npm install
npm run dev
```

Then open http://localhost:5181.

## Stack

Vite, React, TypeScript, Tailwind, React Router.

## Prototype controls

The dark **Prototype** button in the bottom-right corner opens the reviewer panel:

- **Licence:** Free, Pro or Pro (expired), plus the licence expiry date.
- **Modules:** a switch for each module.
- **Prototype time:** a date and time picker in the site timezone, plus Reset time.
- **Reset seed:** restores the seed data, resets the time and clears sessionStorage.

## Acceptance walkthrough

The acceptance walkthrough is section 10 of `docs/storegrowth-3.1-prototype-brief-v3.2.md`. All 24 steps pass: steps 1 to 17 in one run from Reset seed, then steps 18 to 24 in a second run from Reset seed.

## State

State persists in sessionStorage; Reset seed clears it.

No backend, no WooCommerce, mock data only.

## Docs

- `docs/storegrowth-3.1-prototype-brief-v3.2.md` is the current brief: v3.1 merged with the campaign page redesign.
- `docs/storegrowth-3.1-prototype-brief-v3.1.md` is the brief before the redesign, kept for reference.
- `docs/campaign-page-redesign/` holds the redesign brief and the six design screens.
- `docs/archive/` holds the earlier briefs: v1, v2, the v3 patch and the merged v3.
