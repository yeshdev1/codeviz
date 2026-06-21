# codeviz — Interaction Enhancement Plan (6 HCI-grounded features)

Adds six interactive capabilities to the system-map engine, each grounded in a named HCI
principle and **hardened by adversarial red-team research** (a workflow that attacks the very
thinkers behind each principle to find where the dogma breaks). The six are fixed — research
refines *how* we build them, never *whether*.

## Where this plugs in
The engine lives identically in three files (kept in lockstep):
- `skills/codeviz/assets/system-map.template.html` (canonical)
- `examples/demo/system-map.html` (shipped demo)
- `playground/supabase-onboarding/system-map.html` (live verification on a real repo)

Shared styles in `harness.css` (×3 copies), palette in `theme.css`. All additions are **additive
and backward-compatible** — a map with no new data still renders exactly as today.

## Architecture: one small interaction layer
Rather than six bolt-ons, add a single **interaction state** object and a thin control bar above
the diagram, then let each feature read/write that state. The existing `draw()` loop already
keys off `sel` / `hover` / `trace` to decide each node/edge's emphasis — we extend that one
decision point instead of touching the renderer in six places.

```
state = { query:'', focus:null, focusDir:'both', down:{}, pinned:{}, dragging:null, motion:'auto' }
```
A single `vis(nodeId) / edgeVis(e)` resolver folds query + focus + down-state into the
alpha/highlight the renderer already understands. New UI: a compact toolbar (search input,
focus/impact toggle, "reset layout", reduced-motion toggle) rendered above the legend.

---

## The six features

### 1. Type-to-filter / search  · *Shneiderman's mantra (zoom & filter) + Hick's Law*
- Search box above the diagram; as you type, matching nodes stay sharp, the rest dim; edges
  between two matches stay lit. Matches on label/sub/about.
- **Red-team guard (anticipated):** "overview-first" isn't always best and dimming can hide
  needed context → keep non-matches *faded, not removed* (preserve the map's gestalt); show a
  match count; never collapse structure on filter.

### 2. Focus + context — neighborhood isolation & impact tracing · *Furnas fisheye / DOI*
- Click-focus a node → its N-hop neighborhood stays sharp, rest fades. A direction toggle
  (upstream / downstream / both) walks the edge graph transitively to answer "what breaks if
  this dies?".
- **Red-team guard:** focus+context via *distortion* (true fisheye) often loses to plain
  highlighting + pan/zoom (Cockburn/Karlson; Nekrasovski) → use **highlight-dim, not geometric
  distortion**; keep positions stable to protect spatial memory.

### 3. Direct manipulation — drag / pin / reset · *Shneiderman direct manipulation*
- Drag a node to reposition; it auto-pins; "Reset layout" restores ELK. Dragged nodes are
  excluded from re-layout.
- **Red-team guard:** direct manipulation hides state and invites accidental edits (Anti-Mac;
  Maes–Shneiderman) → make pinning **visible** (a pin glyph), make every action **reversible**
  (reset), and never lose the computed layout.

### 4. Coordinated views — brushing & linking across pages · *CMV (Baldonado; North)*
- Selecting/focusing a node broadcasts an id (URL hash + `localStorage`); `schema.html` and
  `api.html` read it and highlight the matching tables/routes (and link back).
- **Red-team guard:** CMV adds split-attention & change-blindness cost; Baldonado's own *rule of
  parsimony* → keep it **opt-in and lightweight** (highlight + anchor-scroll, no auto-jumping
  views), and make the link **bidirectional and obvious**.

### 5. What-if failure simulation · *Norman conceptual models + feedforward*
- Toggle a node "down" → dependent edges/nodes turn a failure state; the tracer flags which
  scenarios break.
- **Red-team guard:** mental models are incomplete and simulations breed *false confidence*
  (Norman; automation-bias literature) → label it explicitly as a **reachability heuristic, not a
  real fault model** ("shows what *depends on* X, not how it actually fails"); don't imply
  certainty.

### 6. Accessibility & motion · *Nielsen heuristics + WCAG + reduced-motion*
- (a) **Colour-blind-safe encoding:** the latency heat is green→amber→red today — add a redundant
  channel (dot size / shape) and adopt a CVD-safe ramp (Okabe-Ito / viridis-style) pending the
  research verdict. (b) **Keyboard nav:** Tab between nodes, arrow-keys walk edges, Enter opens,
  Esc closes; visible focus ring; ARIA live region announces selection. (c) **`prefers-reduced-
  motion`:** detect it and default the comet to paused/stepped.
- **Red-team guard:** heuristic evaluation has weak inter-rater reliability (Hertzum & Jacobsen)
  and WCAG-2 contrast math is contested (APCA) → don't rely on one heuristic pass; test with
  automated checks (axe) + a CVD simulation, and verify keyboard paths headlessly.

---

## How the adversarial research feeds in
A background workflow (`hci-adversarial-research`) runs **7 red-team agents** — one per principle
(incl. Tversky animation + Fitts targets) — each finding peer-reviewed *counter-evidence* and the
authors' own caveats, then a synthesizer emits a per-feature **design-decisions brief**. Each
feature's "red-team guard" above will be finalized from that brief before coding (e.g., the exact
CVD palette, whether focus uses any distortion at all, the reduced-motion default).

## Verification (headless, text-based; screenshots only on request)
- `node --check` every inline script across all three files.
- Playwright: simulate search (match count + dim), focus (neighborhood alpha), drag (node moves +
  pins), down-state (edges flip), keyboard nav (Tab/arrows/Enter), and `prefers-reduced-motion`
  (comet paused). Assert **0 page errors** each.
- `axe-core` pass + a colour-blind-safe check on the latency encoding.
- Re-run the checkpoint builder so the Supabase demo stays measured.

## Sequencing (build order)
1. Interaction-state layer + toolbar shell + the `vis()` resolver (foundation for all).
2. #1 search + #2 focus/impact (share the resolver) → biggest scale win.
3. #6 accessibility (keyboard + reduced-motion + CVD palette) → integrity.
4. #3 drag/pin/reset.
5. #5 what-if (layers on #2's graph walk).
6. #4 coordinated views (touches schema/api too; highest effort, last).
7. Docs: `SKILL.md` gains the new optional data + interaction notes.

## Risks / honesty
- Coordinated views (#4) spans three pages and needs cross-page state — the hardest, most
  fragile piece; it ships last and stays opt-in.
- Latency/what-if remain **illustrative** (not derivable from static code) — labelled as such.
- Six features add surface area; the single-resolver design is what keeps the renderer sane.
