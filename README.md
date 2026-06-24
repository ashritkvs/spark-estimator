# Spark Estimator

**▶ Live app:** https://spark-estimator.vercel.app/ — open on a phone (Chrome Android / Safari iOS) and *Add to Home Screen* to install.

A mobile-first **repair cost estimator** PWA for the Spark Homes acquisition team. An agent walks a property room by room, checks off needed repairs, enters quantities, snaps photos of equipment nameplates, and gets a **live cost total** — then turns that total into a go/no-go **offer decision** on the spot. Works fully offline, installs to the home screen, exports a ZIP (Excel + photos) for the team.

Built for the Spark Homes Developer Contest.

---

## Run it locally

No build step, no dependencies, no server-side code. It's a single HTML file plus static assets.

```bash
# from the project folder — any static server works
python3 -m http.server 4173
# then open http://localhost:4173
```

> A server is only needed because **service workers and the camera require a secure context** (`http://localhost` counts as secure). Opening `index.html` via `file://` will load the UI but the service worker / install / offline features won't register. To test PWA install + offline, serve over `localhost` (or any HTTPS host) and use Chrome (Android) or Safari (iOS) → *Add to Home Screen*.

### Deploy
Drop the folder on any static host (GitHub Pages, Netlify, Vercel, S3). No configuration required.

---

## What's in the box

| File | Purpose |
|------|---------|
| `index.html` | The entire app — UI, state, data model, export, OCR, deal analyzer. Self-contained. |
| `sw.js` | Service worker — offline app shell + runtime-caches the CDN libs so export/OCR survive offline. |
| `manifest.json` | PWA manifest (installable, standalone, themed). |
| `icon-*.png`, `favicon.png` | App icons (incl. maskable). |
| *(price list)* | The 107 default prices live in `index.html` (`ITEMS`), keyed by `id` — the single source of truth. The global price-update feature downloads a CSV template generated in-app, so no separate price file ships with the deploy. |
| `spark-logo.png` | Spark Group logo (used in the projects panel). |

### Libraries (CDN, runtime-cached for offline)
- [`xlsx-js-style`](https://github.com/gitbrent/xlsx-js-style) — styled `.xlsx` generation
- [`jszip`](https://stuk.github.io/jszip/) — bundles the spreadsheet + photos into the export ZIP
- [`tesseract.js`](https://tesseract.projectnaptha.com/) — lazy-loaded **only** when an agent scans a serial photo

No UI framework. The CSS is hand-written so the app is instant and 100% offline-safe (no Tailwind JIT CDN dependency at runtime).

---

## Feature coverage (against the brief)

- **Projects** — create / name / rename / delete, switch without data loss, each stores its own selections, quantities, **notes**, prices, and photos. Auto-saved to `localStorage` (debounced).
- **Repair line items** — all 107 items from the official price list, anchored by `id`, organized into the required **19 collapsible groups** across 5 sections. Every group has a **"No Action Needed"** option. Each item shows name, unit, qty input, unit cost, and live line total.
- **Price override** — tap any unit cost to override it **per-project**; upload a CSV in Settings to update standard pricing **globally** across all projects (only `id` + `cost` are read).
- **Add / remove items** — add custom line items to any group; remove default items per-item.
- **Adjustable rooms** — 7 room types (Interior, Kitchen, Bathroom, Systems & Structure, Exterior, Bedroom, Living/Common). Bathrooms / bedrooms / living areas are **add-as-many-as-you-need** instances, auto-labeled "Bathroom 1", "Bathroom 2"… each with its own groups. Add/remove freely mid-walkthrough.
- **Progress tracking** — bar in the header; counted **per group** (any checked item *or* "No Action" marks a group complete), across every section and every room instance.
- **Notes** — every line item has an optional free-text note (condition, location, reminder); persisted per project and carried into the summary and the Excel export.
- **Photo capture** — attach photos to **any** line item straight from the camera (`capture="environment"`), with thumbnails and individual delete. Equipment items additionally run OCR on the photo. Images are downscaled before storage to protect the `localStorage` quota.
- **Export** — one tap produces a **ZIP** containing a formatted Excel cost breakdown (line items, qty, unit cost, line totals, per-room subtotals, grand total, + a Deal Analysis appendix) and every photo, foldered. Downloads automatically.
- **PWA / offline** — service worker app-shell, web manifest, installable on Android & iOS, full offline operation, state persisted locally.

### Creative additions (two)

1. **Serial-photo OCR + equipment age decoder.** Scan an HVAC / water-heater / appliance nameplate → Tesseract OCR reads the serial → a multi-brand heuristic decodes the **manufacture year** (explicit year, Carrier/ICP week-year `WWYY`, Rheem `YYWW`, 2-digit prefixes) → the app estimates **remaining service life** and flags units that are at end-of-life. This targets the exact failure mode the brief calls out: a missed furnace or water heater swinging the estimate by thousands. Degrades gracefully — if OCR can't run (or you're offline before its first load), you just type the year and still get the age analysis.

2. **Deal Analyzer.** The running repair total flows live into a **Maximum Allowable Offer** calculation: `MAO = ARV × (1 − target margin) − repairs − holding/closing costs`. Enter a real offer to see projected profit, margin %, and a **GO / TIGHT / NO** verdict. It connects every checkbox in the walkthrough to the only number that decides the deal, and rides along into the Excel export.

---

## Architecture notes

- **One render function, surgical patches.** State changes trigger a full `render()`, *except* quantity typing — that path patches only the affected line/group/running totals and progress bar directly in the DOM, so number entry never loses focus or stutters.
- **Stable data model.** Items are keyed by their price-list `id`; per-room selections are keyed `roomInstanceId::itemId`. Prices resolve project-override → global-override → list, so the CSV stays the single source of truth.
- **Offline-first SW.** App shell is cache-first; trusted CDNs are stale-while-revalidate so the Excel/OCR libraries keep working after the first online load.

## Known limitations
- Serial decoding is a best-effort heuristic across common HVAC/appliance formats, not an exhaustive per-brand database — it always lets the agent confirm/override the year.
- Photos live in `localStorage` (downscaled); a very photo-heavy project can approach the browser quota, at which point the app keeps selections and drops the heaviest photo data rather than failing the save.
- Tesseract's first run needs one online load to cache the OCR engine; after that it works offline.
