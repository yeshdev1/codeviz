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
- **`system-map.html`** — the centerpiece. An interactive canvas where **every box is a real system and every arrow is a real call**. Click any box for its role + why it exists; pick a scenario to **auto-play a real request hop-by-hop** (a comet travels the active edge with a progress bar + narration). *Spend the most effort here.*
- **`schema.html`** — the data model grouped by domain.
- **`api.html`** — the API surface, in depth (the most detailed page).
- **`index.html`** — a hub linking them ("read in this order: system map → data model → API").
- **`harness.css`** — the shared component library (copied from `assets/`).

Reusable assets bundled with this skill:
- `assets/harness.css` — the full component library (cards, flows, tables, timeline, callouts, **the canvas + tracer + modal CSS**).
- `assets/theme.css` — the per-project **palette overlay**, loaded after `harness.css`. Default = the built-in light theme; you overwrite it so the docs wear the **target repo's own colors** (see Phase 0).
- `assets/system-map.template.html` — a complete, runnable interactive-diagram page with a generic 6-node example and five clearly marked `@@ REPLACE @@` blocks (`NODES`, `EDGES`, `EDGE_DETAIL`, `DETAIL`, `SCENARIOS`). Adapt it; don't rewrite the engine.

## The mechanism: Plan → Generate → Debug → Deliver

### Phase 0 — Detect the stack
Scan package manifests, `Dockerfile`/`docker-compose`, `infra/`, `.env.example`, README, CI. Identify: language(s), framework, datastore(s), cache, queue/worker, 3rd-party providers, client apps, storage/CDN. Write a one-paragraph stack summary (it seeds the hub page). Spawn an `Explore` agent for the sweep if the repo is large; keep only the findings.

**Detect the palette** — so the onboarding wears the *target repo's* aesthetic, not codeviz's default. Pull its brand colors from `tailwind.config.*`, design tokens / CSS custom properties, `theme.*`, a component library, or the logo (most-frequent brand hex + dark/surface hexes). Then **overwrite `theme.css`** in the output dir: set the DOM tokens (`--cream` bg, `--card` surface, `--ink` text, `--slate`, `--wine`/`--amber` accents, `--border`) and the `--cv-*` canvas tokens. For a **dark** target also add the handful of rule overrides `theme.css` documents (`body`, `.topbar`, `th`, `pre`, `code`, `.status*`, `.toc`) because some tokens (e.g. `--ink`) are both text and a dark surface. If you can't confidently detect a palette, leave `theme.css` as the light default.

### Phase 1 — SYSTEM-TO-SYSTEM MAP  (the priority — build this first, make it interactive)
This is what actually unblocks a newcomer.
1. **Nodes** — enumerate the real systems: client apps · the API/services · datastores · cache · queue/workers · 3rd parties · CDN/storage. For each fill `{ tier, w, h, label, sub, status, about, resp:[], notes:[] }`. `tier` is the layer index (0 = clients at top, then API, data, workers, 3rd-parties). `status` ∈ `built` (code exists today) · `partial` · `planned`. **Cite the file(s)** each node maps to as you go. **Coordinates are optional:** omit `x, y` and the template auto-lays-out by tier with elkjs (recommended for anything beyond ~12 nodes); add explicit `{ x, y }` only when you want to hand-tune placement.
2. **Edges** — grep for cross-system calls: HTTP clients (`fetch`/`axios`/router mounts), SDK inits (Stripe/Twilio/…), DB client + queries, queue `.add()`/publish, pub/sub subscribe, presigned-upload/CDN URLs. For each edge `['from','to','label','style']` with `style` ∈ `solid` (sync request) · `dash` (async event/webhook/queue/pub-sub) · `thick` (bulk bytes/media that bypass the API). Label with the real route/payload. **Latency (optional):** add a 5th element — milliseconds — `['from','to','label','style', 12]`. It renders as a green→red heat dot on the edge, shows the number on hover/active edges, and scales the request-tracer comet (slow links take longer) plus a per-hop/cumulative/end-to-end readout. Latency is **not derivable from static code** — only add it when you have real p50s, or mark it clearly illustrative (typical orders of magnitude: same-host ~1–5ms, cross-AZ ~10–30ms, external API ~100–300ms, bulk transfer scales with size).
3. **Flows** — pick **1–3 critical end-to-end paths** a newcomer MUST understand (the core write path, the auth flow, the money/most-contended path). Express each as ordered hops `{ from, to, payload, text }`; `from`/`to` must be node keys. Prefer flows that traverse the most systems — the point is to show how the boxes connect under a real request.
4. **Render** — copy `assets/system-map.template.html` + `assets/harness.css` + `assets/theme.css` into the output dir; replace the five `@@ REPLACE @@` blocks (`NODES`, `EDGES`, `EDGE_DETAIL`, `DETAIL`, `SCENARIOS`) and `@@PROJECT@@`. The canvas reads its colors from the `--cv-*` vars in `theme.css`, so it follows whatever palette Phase 0 detected. Set each node's `tier` (0 top → bottom) and let auto-layout place them; the engine computes positions with elkjs and guarantees no overlaps. (Hand-placed `{ x, y }` on the 880×510 grid still works if you want to override; open any page with `?layout=elk` to force auto-layout on a hand-placed map.)
5. Write modal `DETAIL` only for the **4–6 most important nodes** (tier/cap/why/alts/learn) — don't over-document trivia.

### Phase 2 — DATA MODEL
Extract entities from the real schema source: ORM models / migrations / `schema.sql` / Prisma·Drizzle·SQLAlchemy·ActiveRecord·Ecto. Group by domain. Per table: name, key columns, purpose, built-vs-planned. Generate `schema.html` — a `.frame` page with grouped, anchored `<h2>` sections and `<table>`s (reuse `harness.css`); link each domain back to the system-map node it lives behind.

### Phase 3 — API DEPTH  (go deep — the most detailed page)
Extract **every** route from the router/handlers/OpenAPI/annotations. Per endpoint: method · path · auth · params/body · **what it touches** (which tables/services — tie each back to a system-map node) · sync vs async · built-vs-planned. Group by area (auth, the core domain, payments, media, …). Generate `api.html`. This is where depth belongs — don't summarize it away.

### Debug — interpret the code (understand it, don't audit it)
"Debug" here = read the code closely enough to explain what it actually *does*, so the diagram, flows, schema and routes reflect real behaviour — **not** to check the code is correct. Ground each node/edge/flow in the source you read (cite `file:line`); drop anything you can't actually find rather than guessing. If you happen to spot a real bug while reading, **raise a flag** — add it to a short `⚠ Noticed while reading` list on the hub page — then move on. Don't fix it, don't go bug-hunting, don't audit for correctness.

### Deliver
Assemble `index.html` (stack summary + tiles to the three pages, in reading order). **Validate every page's inline JS with `node --check`** (extract `<script>` blocks, check syntax) and confirm the template's required IDs survive (`archCanvas`, `scenSeg`, `scenStep`, `scenBar`, `scenPrev/Play/Next`, `scenCount`, `scenEdges`, `compDetail`, `compModal`). Tell the user the output path and that it opens via `file://` (online for the Lucide icon CDN). Optionally serve it.

## Filling the template — quick reference
- **Node:** `{ tier, w, h, label, sub, status, about, resp:[], notes:[] }`. `tier` = layer index (0 = top). `status` ∈ `built|partial|planned`. Auto-layout (elkjs) computes `x, y` from `tier` + edges; add explicit `{ x, y }` only to hand-tune. `?layout=elk` forces auto-layout; offline it falls back to a built-in tier-stack.
- **Edge:** `['from','to','label','style']`, `style` ∈ `solid|dash|thick`. Optional 5th element = latency in ms (`['from','to','label','style', 12]`) → heat dot + hover number + latency-scaled comet + tracer ms readout. Illustrative unless you have real numbers.
- **Connection explainer:** `EDGE_DETAIL['from>to'] = { steps:[ '…', '…' ] }` — plain-English, one-short-sentence-per-step of what that connection *does*, shown when the reader **hovers the line** (the edge highlights and a tooltip lists the steps). Key must match an `EDGES` pair. Author it for the important edges; un-documented edges still show their label/latency on hover. Describe the *purpose* of the call in order — this is the "simple English, point by point" layer.
- **Scenario:** `{ id, label, steps:[{from,to,payload,text}], solved:[], deferred:[] }`. Each step animates a comet on the `from→to` edge, so **that edge must exist** or the hop won't draw — reuse an existing edge or add one. Scenario buttons auto-sort by step count (hot→cool) and `SCENARIOS[0]` auto-plays.
- **Secondary nodes** a step writes/reads but that aren't its `from`/`to`: add `touch:['nodeId', …]` to the step so they light up too (e.g. a `POST` hop whose handler writes a table — `touch` that datastore node). This keeps the highlight honest: every system the narration names actually lights.
- Use ASCII art only as a last resort — the canvas is the diagram.

## Built-in interactions (in the template engine — HCI-grounded, adversarially reviewed)
The system-map ships a toolbar above the diagram. Most of these need **no extra data** — they work off `NODES`/`EDGES` automatically. Design choices were stress-tested against the HCI literature (see `docs/INTERACTIONS-RESEARCH.md`); don't "improve" them back into the known failure modes noted below.
1. **Filter** (`#ixSearch`) — type to dim non-matches to a **0.30 floor (never hide)**, keeping each match's 1-hop neighbourhood lit; shows "showing N of M". Matches label/sub/about/`resp`/edge-labels. *(Hiding dependency edges destroys the most load-bearing onboarding info.)*
2. **Focus / impact** — click a node → its upstream/downstream/both reachability stays sharp, the rest dims to ~40%. **Cue-based only — never geometric distortion** (fisheye loses head-to-head and harms spatial memory).
3. **Arrange** (drag/pin/reset/export) — an **explicit mode** (so a normal click still opens the modal); tier-locked horizontal nudge; **auto-disabled above 12 nodes** with a "small tweaks" note; persist via **Export x,y** (paste into `NODES`), not browser storage.
4. **Brushing** — selecting a node writes it to `localStorage`/`#node=` so `schema.html` + `api.html` highlight the matching section. **Requirement:** give those pages' `<h2>` an `id` equal to the system-map node key (e.g. `<h2 id="auth">`), and a `#brushBar` + the brush script (see the template demo). Add a "lives behind **‹node›**" line per section.
5. **Simulate failure** — focus a node, then "⚡ simulate failure" greys its **downstream-reachable** set. It is a **reachability highlighter, not a behaviour simulation** — it carries a permanent "modeled from static structure, not observed" banner and is deliberately low-fidelity. Do **not** animate a rerouting "still works" path (false feedforward / automation bias).
6. **Accessibility & motion** — the latency ramp is **CVD-safe (viridis) with a redundant dot-size + ms label** (never hue alone). `prefers-reduced-motion` turns autoplay off and freezes the comet to a static marker. The canvas is keyboard-navigable (arrows walk systems, Enter opens) with an `aria-live` announcer. Keep these; verify with the headless checks, not a "we followed WCAG" claim.

## Scope dials
- **Quick** (one service): ~6–10 nodes, 1 flow, schema + the key routes.
- **Thorough** (monorepo): nodes per service + datastores + 3rd parties, 2–3 flows, full schema, full API, a verifier pass per page.

## House style
- `harness.css` carries the whole component library — **reuse its classes; don't write new CSS** unless a section genuinely needs it.
- Keep prose at **"claim + one-line why"** density. The interactivity does the teaching, not paragraphs.
- Honesty: mark `planned` what isn't built; never let the diagram imply a system exists when it's only proposed.
