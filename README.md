# Miga 3 — an interactive WordPress café experience

A personal WordPress / Elementor project by **Ivan Delgado**, created with AI assistance. Miga is a fictional café. Its menu, prices, opening hours and images are demonstration content, not an operating business.

[![Checks](https://github.com/ivaaandeelgado/freelance-wordpress-cafe-demo/actions/workflows/checks.yml/badge.svg)](https://github.com/ivaaandeelgado/freelance-wordpress-cafe-demo/actions/workflows/checks.yml)

![Miga home page](docs/screenshots/home-desktop.png)

## Included features

- Three actual WordPress pages: home, menu and visit, with native editable Elementor sections.
- A 13-item menu with combined category, accent-insensitive search and maximum-price filters.
- Result counts, empty states, reset controls and accessible pressed states on category buttons.
- A local visit preview with date checks and time options that respect the concept's weekend hours.
- A drink configurator with size, oat milk, extra espresso, quantities and immediate price calculation.
- A persistent browser bag with grouped preparations, quantity controls, removal and a downloadable selection.
- A real WordPress REST endpoint that independently recalculates integer-cent quotations and rejects invalid products, quantities and options. Client-provided prices are ignored.
- Persistent favorites and a plant-based recipe filter, combined with category, text and price filters.
- A ritual finder that pairs actual menu products within a selected budget and taste preference, with an honest empty result when there is no match.
- An interactive six-table floor plan that adapts to party size and the selected time, with clearly fictional occupancy.
- A downloadable calendar plan (.ics) after a valid visit preview. This is not a booking confirmation.
- Responsive layouts, keyboard-accessible links, original styling and two original AI-generated images.

The visit form remains a browser-only preview. It does not make a reservation, send email or store personal data. The bag and favorite product IDs persist in local storage. Only product IDs, options and quantities are sent to the local WordPress quotation endpoint, when **Comprobar presupuesto** is clicked. No payment or order is created.

## Run locally

Requires **Node.js 24**, npm and internet access for the first WordPress / Elementor download.

```sh
npm ci
npm start
# Wait for "Miga WordPress demo ready", then open http://127.0.0.1:9418
```

On Windows PowerShell use `npm.cmd` if needed. The start script builds the blueprint automatically. The server binds to loopback; Ctrl+C stops it. Restarting recreates the disposable site.

Open `/wp-admin/` with the **synthetic local** account `admin` / `local-demo-only`. Select a page under **Pages → Edit with Elementor**. Export changes made only in the editor before restarting.

## Try the interactions

1. Open **Carta**, search for `limon`, then lower the maximum price to see an empty result.
2. Clear filters, choose **Café** and set a maximum of `2.50`.
3. On **Visítanos**, choose a Saturday: afternoon options outside the displayed hours become unavailable.
4. Complete the fictional visit preview and check the explicit simulation message.
5. Choose **Preparar** on a Flat white, then add a large cup, oat milk and extra espresso: the unit price becomes €5.20. Two units total €10.40 both locally and through the WordPress quote endpoint.
6. Save an item with the heart button and combine **Solo mis favoritos** with **Receta vegetal**. Preferences survive a reload; the filters reset independently.
7. Try **Encuentra tu ritual** on the home or menu page. A plant-based sweet combination intentionally yields no match, because this example menu has no such pastry.
8. Choose a date, time and party size on **Visítanos**, then select a compatible table and generate the preview. Download the .ics plan if desired.

[Filtered menu](docs/screenshots/menu-filtered.png) · [Menu page](docs/screenshots/menu-desktop.png) · [Mobile home](docs/screenshots/home-mobile.png)

## Tests and reproducibility

**All 13 browser tests passed for version 3** in [GitHub Actions run 42224770916](https://github.com/ivaaandeelgado/freelance-wordpress-cafe-demo/actions/runs/42224770916), completed on 6 November 2026. The successful run tested commit `b07df17b6df22f8c6dcc7939d5e22cc0a3773732`, including the corrected cart timeout and selectors. The run log reports `13 passed (1.6m)`. This verifies the demo in Chromium on Ubuntu; mobile checks use viewport emulation.

With Google Chrome installed and any manually started demo server stopped:

```sh
npm test
```

Thirteen Playwright checks cover actual Elementor content, navigation, images, filters, literal search text, visit validation, weekend hours, responsive layouts, cart persistence, custom prices, API tampering, favorites, recommendations, seating and calendar downloads. Tests start their own runtime and write ignored screenshots/results to `evidence/`. CI uses Chromium on standard Ubuntu runners. The [verification summary](docs/verification.json) records the successful CI run and preserves the earlier partial local result.

| File | Responsibility |
| --- | --- |
| `build-blueprint.mjs` | Pages, Elementor widgets and reproducible setup |
| `demo.js` | Combined menu filters and visit preview |
| `demo.css` | Shared desktop/mobile presentation |
| `experience-markup.mjs` | Ritual finder, dialogs and seating UI in Elementor HTML widgets |
| `experience.js` / `experience.css` | Configurator, bag, favorites, recommendations and calendar |
| `miga-experience.php` | WordPress script registration and validated quotation endpoint |
| `assets/` | Original generated images and their provenance |
| `serve.mjs` | Loopback-only WordPress Playground |
| `tests/` | Interaction, content and layout checks |

`npm run build` creates three Elementor templates under `artifacts/templates/` and the companion plugin under `artifacts/miga-demo/`. To import elsewhere, install Elementor and the plugin, create the three pages, and replace the `@@CARTA@@` / `@@VISIT@@` link placeholders. For a subdirectory WordPress installation, update the image URLs or reselect Media Library images. The local blueprint does this setup for its own runtime.

The product definitions in `build-blueprint.mjs` generate both the editable product presentation and the canonical `catalog.json` used for quotations. Change prices there and rebuild to keep both consistent; editing a displayed Elementor price alone does not change the quotation API. Dynamic interactions are implemented in the companion plugin and HTML widgets; they are not additional Elementor Pro widgets.

## Quotation endpoint

`POST /wp-json/miga/v1/quote` (or the equivalent `?rest_route=/miga/v1/quote` URL for plain permalinks):

```json
{"items":[{"id":"cafe-2","quantity":2,"size":"large","milk":"oat","shot":true}]}
```

Returns `demoOnly: true`, line subtotals and `totalCents: 1040`. There is no database write, external payment service or order creation. Limits: 40 lines, 10 units per line and a 16 KB request body. Non-coffee items reject coffee customization. The endpoint is intentionally public and read-only in effect.

The floor plan uses deterministic fictional occupancy rather than a live availability database. Calendar entries use floating local time and a one-hour duration. The ritual finder is an explainable catalogue rule, not an AI service. No additional account, paid service or secret is required.

## Scope and assets

This demonstrates a small editable business website and focused improvements to an existing menu or form. It includes no real bookings, payments, analytics, production hosting or claimed client work. Mobile and tablet checks use viewport emulation.

Original code is **GPL-2.0-or-later**; see [LICENSE](LICENSE). Dependency licenses remain with their packages. [Image provenance](assets/image-prompts.json) records the original prompts; the pictures depict a fictional space and meal.
