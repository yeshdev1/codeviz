---
name: codeviz
description: Generate an illustrated, interactive system-design onboarding harness for a codebase — a system-to-system diagram FIRST, then the data model, then deep API docs. Use when someone needs to get up to speed on an unfamiliar codebase fast, or asks to "document the architecture / onboard onto this repo / explain how the system fits together."
---

# Onboard Harness

Turn any codebase into a small set of **linked, illustrated, interactive HTML pages** that get a new engineer productive fast. The priority order is deliberate and non-negotiable:

> **(1) how the systems talk to each other → (2) the data model → (3) the API in depth.**

A newcomer needs the *map* before the *territory*. Most readers bounce off a wall of endpoints; almost nobody bounces off a diagram they can click. So the system-to-system map gets the most effort and comes first; the API page is the deepest but comes last.

This skill was reverse-engineered from a hand-built set of system-design pages (an interactive `<canvas>` architecture diagram with auto-playing request walkthroughs and clickable component modals, a grouped data-model page, and a grouped API page on a shared component library). It ships that pattern as reusable assets.

## What it produces

Into an output dir (default `docs/onboarding/`):
- **`system-map.html`** — the centerpiece: a **semantic-zoom atlas** where **every box is a real system and every arrow is a real call**, arranged in colour-coded layers. Scroll (or use the Continents/Services/Detail pills) to zoom from the layer overview down to per-system detail; click a system to focus its neighbourhood; run the **guided tour** to walk a real request hop-by-hop with a comet, grad-level narration and jargon chips. Self-contained, offline. *Spend the most effort here.*
- **`schema.html`** — the data model grouped by domain.
- **`api.html`** — the API surface, in depth (the most detailed page).
- **`index.html`** — a hub linking them ("read in this order: system map → data model → API").
- **`harness.css`** — the shared component library (copied from `assets/`).

Reusable assets bundled with this skill:
- `assets/harness.css` — the component library for `schema.html` / `api.html` / `index.html` (cards, flows, tables, timeline, callouts).
- `assets/theme.css` — the per-project **palette overlay** for those pages, loaded after `harness.css`. Default = the built-in light theme; you overwrite it so the docs wear the **target repo's own colors** (see Phase 0). *(The system-map atlas is self-styled inline and doesn't use these two files yet.)*
- `assets/system-map.template.html` — the complete, runnable **atlas engine** with a generic 6-node example and five clearly marked `@@ REPLACE @@` blocks (`NODES`, `DOMAINS`, `EDGES`, `EDGE_DETAIL`, `SCENARIOS`). Self-contained (no CSS/CDN deps). Adapt the data; don't rewrite the engine.

## The mechanism: Plan → Generate → Debug → Deliver

### Scope & estimate — DO THIS FIRST (so the user only pays for what they want)
codeviz is **granular**: each output is opt-in. A full run on a large repo can cost **150k+ tokens**, so never silently generate everything — scope it first.

1. **Honor an explicit scope** if the invocation carries one (e.g. `/codeviz map`): run only that and skip this dialog. Scopes: `map` · `schema` · `api` · `steps` · `theme` · `full`.
2. **Otherwise estimate + ask.** Do a *cheap* size scan (count services/containers, DB tables/models, routes) and present a short table, then let the user pick which to run and drop the rest:

   | scope | output | rough cost* |
   |---|---|---|
   | `map` | `system-map.html` — the interactive diagram (+ hub) | ~30–70k |
   | `steps` | richer guided-tour steps (request/response + jargon) on an existing map | ~8–20k |
   | `schema` | `schema.html` — the data model | ~15–35k |
   | `api` | `api.html` — full API surface (deepest) | ~40–110k |
   | `theme` | detect palette + theme the pages | ~3–8k |
   | `full` | everything above | ~90–200k |

   *Rough, output-token order-of-magnitude; scale by the size scan (×~0.5 for a tiny service, ×~2 for a large monorepo). State that it's an estimate, not a quote.
3. **Run only the selected scopes.** If the user picks just `map`, do Phase 1 (+ a minimal hub) and stop — don't build schema/api. Default recommendation for a newcomer on a budget: **`map` + `steps`** (the highest-leverage, lowest-cost combination).

### Phase 0 — Detect the stack
Scan package manifests, `Dockerfile`/`docker-compose`, `infra/`, `.env.example`, README, CI. Identify: language(s), framework, datastore(s), cache, queue/worker, 3rd-party providers, client apps, storage/CDN. Write a one-paragraph stack summary (it seeds the hub page). Spawn an `Explore` agent for the sweep if the repo is large; keep only the findings.

**Detect the palette** — so the onboarding wears the *target repo's* aesthetic, not codeviz's default. Pull its brand colors from `tailwind.config.*`, design tokens / CSS custom properties, `theme.*`, a component library, or the logo (most-frequent brand hex + dark/surface hexes). Apply it in **two places**:
- **`schema.html` / `api.html` / `index.html`** → overwrite `theme.css` in the output dir: the DOM tokens (`--cream` bg, `--card` surface, `--ink` text, `--slate`, `--wine`/`--amber` accents, `--border`) and the `--cv-*` tokens. For a **dark** target also add the handful of rule overrides `theme.css` documents (`body`, `.topbar`, `th`, `pre`, `code`, `.status*`, `.toc`).
- **`system-map.html` (the atlas)** is self-contained, so it carries its palette **inline** in a marked `:root` block (between `@@THEME@@` and `@@THEME-END@@`). Overwrite that block with the detected palette: the page-chrome tokens, the **`--cv-*` canvas tokens** (the canvas reads these at runtime via `getComputedStyle`, so this is what recolours the *diagram*), and `--glass` (the floating panels). Defaults are dark; for a light target, set light values (bg/ink/card/glass) and keep `--cv-req`/`--cv-resp` a distinct pair. Per-layer hues stay in `DOMAINS[].col`; the viridis latency ramp is fixed. If you can't confidently detect a palette, leave both as the shipped defaults.

### Phase 1 — SYSTEM-TO-SYSTEM MAP  (the priority — build this first, make it interactive)
This is what actually unblocks a newcomer.
The map is a **semantic-zoom atlas**: a layered, colour-coded substrate the reader pans/zooms through three levels of detail — **continents** (the layers) → **services** (the boxes) → **detail** (responsibilities) — with degree-of-interest focus, a minimap, and a fly-to guided tour. Dependency *direction* lives in vertical position (layers run top→bottom, calls flow down), so most arrows recede and only "back-edges" (a call **up** a layer) are flagged. There is **no hand-placed layout and no modal** — positions are computed from each node's layer; node depth lives in the hover card + the tour.

1. **Nodes** — enumerate the real systems: client apps · the API/services · datastores · cache · queue/workers · 3rd parties · CDN/storage. For each fill `{ tier, w, h, label, sub, status, about, resp:[] }`. `tier` is the layer index (0 = clients at top, then API, data, workers, 3rd-parties). `status` ∈ `built` (code exists today) · `partial` · `planned`. `about` + `resp[]` power the hover card — write them for the reader, not as notes. **Cite the file(s)** each node maps to in your working notes. **No `x, y`** — the engine lays nodes out by layer automatically and guarantees no overlaps.
2. **Domains** — group the nodes into **layers/continents**: `{ id, tier, label, blurb, col, members:[nodeIds] }`. `tier` sets the vertical band order; `col` is the layer's colour (a hex used for its label, band tint, node borders, minimap and legend — pick distinct hues, and avoid amber/yellow/orange which are reserved for status + latency). Every node id must belong to exactly one domain's `members`.
3. **Edges** — grep for cross-system calls: HTTP clients (`fetch`/`axios`/router mounts), SDK inits (Stripe/Twilio/…), DB client + queries, queue `.add()`/publish, pub/sub subscribe, presigned-upload/CDN URLs. For each edge `['from','to','label','style']` with `style` ∈ `solid` (sync request) · `dash` (async event/webhook/queue/pub-sub) · `thick` (bulk bytes/media that bypass the API). Label with the real route/payload. Edges are **bundled** into curved trunks automatically. **Latency (optional):** add a 5th element — milliseconds — `['from','to','label','style', 12]`. It renders as a CVD-safe (viridis) heat dot on the edge, shows the number on hover, and scales the tour comet (slow links take longer). Latency is **not derivable from static code** — only add real p50s, or mark it clearly illustrative (same-host ~1–5ms, cross-AZ ~10–30ms, external API ~100–300ms, bulk scales with size).
4. **Flows (the guided tour)** — pick **1–3 critical end-to-end paths** a newcomer MUST understand (the core write path, the auth flow, the money/most-contended path). Write each to **teach a new grad**, ordered hops `{ from, to, payload, text, detail, terms }`: `text` = what happens (one line), `detail` = *why* it works this way / what to remember (HTML `<b>` allowed), `terms` = `[[name, plain-English definition], …]` rendered as inline jargon chips. `from`/`to` must be node keys **and an existing `EDGES` pair** (the comet travels that line; reuse or add the edge). Decompose compound hops into separate steps — granularity is the point.
5. **Render** — copy `assets/system-map.template.html` into the output dir as `system-map.html` (fully self-contained — no `harness.css`/`theme.css`, no CDN); replace the five `@@ REPLACE @@` blocks (`NODES`, `DOMAINS`, `EDGES`, `EDGE_DETAIL`, `SCENARIOS`) and `@@PROJECT@@`. To theme the diagram, overwrite its inline `@@THEME@@` `:root` block (see Phase 0 palette) — the canvas reads those `--cv-*` tokens at runtime, so it recolours with the project.

### Phase 2 — DATA MODEL
Extract entities from the real schema source: ORM models / migrations / `schema.sql` / Prisma·Drizzle·SQLAlchemy·ActiveRecord·Ecto. Group by domain. Per table: name, key columns, purpose, built-vs-planned. Generate `schema.html` — a `.frame` page with grouped, anchored `<h2>` sections and `<table>`s (reuse `harness.css`); link each domain back to the system-map node it lives behind.

### Phase 3 — API DEPTH  (go deep — the most detailed page)
Extract **every** route from the router/handlers/OpenAPI/annotations. Per endpoint: method · path · auth · params/body · **what it touches** (which tables/services — tie each back to a system-map node) · sync vs async · built-vs-planned. Group by area (auth, the core domain, payments, media, …). Generate `api.html`. This is where depth belongs — don't summarize it away.

### Debug — interpret the code (understand it, don't audit it)
"Debug" here = read the code closely enough to explain what it actually *does*, so the diagram, flows, schema and routes reflect real behaviour — **not** to check the code is correct. Ground each node/edge/flow in the source you read (cite `file:line`); drop anything you can't actually find rather than guessing. If you happen to spot a real bug while reading, **raise a flag** — add it to a short `⚠ Noticed while reading` list on the hub page — then move on. Don't fix it, don't go bug-hunting, don't audit for correctness.

### Deliver
Assemble `index.html` (stack summary + tiles to the three pages, in reading order). **Validate every page's inline JS with `node --check`** (extract `<script>` blocks, check syntax) and confirm the system-map's required IDs survive (`cv`, `levels`, `zin`, `zout`, `fit`, `tourBtn`, `layerKey`, `focusbar`, `focusClear`, `narr`, `narrHead`, `narrText`, `narrDetail`, `narrJargon`, `tPrev/Play/Next`, `tExit`, `tCount`, `scenpick`, `tip`). The system-map is **fully self-contained and works offline over `file://`** (no CDN). Tell the user the output path. Optionally serve it.

## Filling the template — quick reference
For the **complete field reference, common-architecture use cases, and the edge-case/gotcha table + invariants**, see [`DATA-SPEC.md`](DATA-SPEC.md) (compact TOON tables). The essentials:
- **Node:** `{ tier, w, h, label, sub, status, about, resp:[] }`. `tier` = layer index (0 = top). `status` ∈ `built|partial|planned`. No `x, y` — laid out by layer. `about` + `resp[]` show in the hover card.
- **Domain (layer/continent):** `{ id, tier, label, blurb, col, members:[nodeIds] }`. `col` = the layer's hex colour (label + band + node border + minimap + legend). Avoid amber/yellow/orange (reserved for status + latency). Every node belongs to exactly one domain.
- **Edge:** `['from','to','label','style']`, `style` ∈ `solid|dash|thick`. Optional 5th element = latency in ms (`['from','to','label','style', 12]`) → heat dot + hover number + comet speed. Illustrative unless you have real numbers. A call to a **higher** layer is auto-flagged as a back-edge.
- **Connection explainer:** `EDGE_DETAIL['from>to'] = [ '…', '…' ]` — an **array** of one-short-sentence-per-step strings of what that connection *does*, shown when the reader **hovers the line**. Key must match an `EDGES` pair. Author the important edges; undocumented edges still show label/latency on hover.
- **Scenario (guided tour):** `{ id, label, steps:[{from,to,payload,text,detail,terms, reply,replyText,replyDetail,oneway}] }`. Author each step as the **request**: `text` = what happens, `detail` = why (teach a grad; `<b>` allowed), `terms` = `[[name, definition], …]` → jargon chips, `payload` = the request chip. Then add the **response** that returns over that hop: `reply` = the *actual content* that comes back (rows / JSON / id — **not** a bare ack), `replyText`/`replyDetail` narrate the return. The engine plays a real **call stack**: requests descend the steps in order, then responses unwind in *reverse* (an upstream node replies only after its downstream returns). Mark fire-and-forget hops (email/queue/webhook) `oneway:true` — they get no return leg. `from→to` must be a real edge; `SCENARIOS[0]` is offered first.
- Use ASCII art only as a last resort — the canvas is the diagram.

## Built-in interactions (in the template engine — HCI-grounded; see `docs/`)
The atlas works off `NODES`/`DOMAINS`/`EDGES`/`SCENARIOS` automatically — no extra wiring. Design choices trace to the HCI/dataviz literature; don't "improve" them back into the known failure modes.
1. **Semantic zoom (level-of-detail)** — scroll or the **Continents / Services / Detail** pills cross-fade between the layer overview, the service boxes, and per-node responsibilities (Furnas fisheye; Card & Nation DOI). Continents show aggregated, count-badged inter-layer edges; zooming in reveals the individual calls.
2. **Layered substrate** — direction is encoded in vertical position (calls flow **down**), so the arrow hairball recedes; only **back-edges** (a call up a layer) are flagged in amber. (Layered "software city" beat flat layouts on dependency comprehension in controlled studies.)
3. **Degree-of-interest focus** — click a system → it flies in and dims everything but its 1-hop neighbourhood (kept legible by a min-zoom clamp). Cue-based, never geometric distortion. Esc / "show full system" clears.
4. **Edge bundling** — calls route through curved trunks so shared paths merge instead of crossing (Holten hierarchical edge bundling).
5. **Data-in-motion (round trip)** — every edge animates the *whole* transfer: **request out = blue packets**, **response back = orange packets** on two parallel lanes; **packet speed = latency** (slow hop → slow crawl); **bulk bytes ride as chunks** on a wide ribbon. No edge is one-way. Needs no extra data — driven by `style` + the optional latency.
6. **Minimap (overview + detail)** — a constant corner overview with layer-coloured regions, status dots, and a **draggable viewport box** to jump anywhere (Shneiderman overview+detail).
7. **Guided tour (onboarding scrollytelling)** — walks a real flow as a **call stack**: requests descend hop-by-hop (blue), then responses **unwind in reverse** (orange), each carrying the *actual returned content* (rows, JSON, ids — not acks), so a service is shown replying only after its downstream calls return. Fire-and-forget hops (`oneway`) have no return leg. The camera flies to frame each hop; every step has a grad-level explanation + jargon chips. **Dual hover on a hop:** hovering the *line* shows what the connection does (`EDGE_DETAIL`); hovering the moving *content label* shows what's actually being sent/returned (the payload/response) — two distinct tooltips. Animated transitions preserve object constancy (Heer & Robertson).
8. **Colour coding** — each layer has a categorical hue, **redundant with vertical position** (never hue alone), kept clear of the status (green/amber), latency (viridis) and flow-direction (blue/orange) channels. A legend key maps colour→layer.
9. **Accessibility & motion** — `prefers-reduced-motion` swaps animated flow for static two-colour direction chevrons, disables camera tweens + auto-advance, and freezes the comet; an `aria-live` region announces focus + each tour leg (request out / response back). Verify with the headless checks, not a "we followed WCAG" claim.

## Scope dials
- **Quick** (one service): ~6–10 nodes, 1 flow, schema + the key routes.
- **Thorough** (monorepo): nodes per service + datastores + 3rd parties, 2–3 flows, full schema, full API, a verifier pass per page.

## House style
- `harness.css` carries the whole component library — **reuse its classes; don't write new CSS** unless a section genuinely needs it.
- Keep prose at **"claim + one-line why"** density. The interactivity does the teaching, not paragraphs.
- Honesty: mark `planned` what isn't built; never let the diagram imply a system exists when it's only proposed.
