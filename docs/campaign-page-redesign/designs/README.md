# Campaign page designs

Six screens exported from the design canvas "StoreGrowth 3.1 Campaign Page Redesign".

| File | Screen |
|---|---|
| Main.dc.html | 1. New campaign, just created (draft, empty) |
| Ready.dc.html | 2. Same draft, filled in and ready to publish |
| Scheduled.dc.html | 3. Scheduled |
| Running.dc.html | 4. Running |
| Paused.dc.html | 5. Paused |
| Ended.dc.html | 6. Ended |

How to read them:
- They are HTML with inline styles. Treat the markup and inline styles as the visual spec: layout, spacing, colours, type sizes, copy.
- Ignore the design-tool wrappers: `<x-dc>`, `<helmet>`, `<sc-if>`, `<sc-for>`, the `support.js` script and the `<script type="text/x-dc">` block. `{{accent}}` means the accent colour `#1D4ED8`.
- They won't render on their own (the wrappers need the design tool), so read the source.
- The WordPress sidebar and StoreGrowth header are context only. Keep the prototype's existing shell.
- Numbers and dates in the designs are examples. Where the prototype computes a value (days to start, day x of y, totals), the computed value wins.
