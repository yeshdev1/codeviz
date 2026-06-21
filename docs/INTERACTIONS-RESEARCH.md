# codeviz Interactions — Adversarial HCI Red-Team Brief

Produced by the `hci-adversarial-research` workflow (7 red-team agents + synthesis): each
attacked one HCI principle/figure to find peer-reviewed counter-evidence and the authors' own
caveats, then a synthesizer turned it into per-feature design decisions. This brief drives the
implementation in `INTERACTIONS-PLAN.md`. The six features are fixed; this only refines *how*.

## Per-feature decisions (condensed)

**#1 Search/filter** — Hick's Law is misapplied to a labeled diagram (Liu et al. CHI 2020);
"overview-first" costs time for known-item retrieval (Cockburn/Karlson 2008); dimming to 0.08
hides load-bearing dependency edges and triggers change blindness (Nowell 2001).
→ Full map on load; **filter-dim floor ~0.30** (separate from selection-dim); keep each match's
1-hop neighborhood lit; match `sub`/`resp`/`about`/edge-labels; "showing N of M"; no slow fades;
zero-match keeps full map; skip dimming when most match.

**#2 Focus + impact** — Pan&Zoom beats rubber-sheet F+C (Nekrasovski CHI 2006); fisheye degrades
visual memory/change-detection (Lam 2006); auto-focus for a newcomer is unsolved (Hornbæk & Skov).
→ **Cue-based focus only (no geometric distortion)**; dim context ~35–45% (never hide); keep
labels on focus + 1-hop; layout deterministic; "show full system" escape toggle; for >25 nodes
prefer overview+detail (minimap) over distortion.

**#3 Drag/pin/reset** — DM doesn't scale (Anti-Mac 1996); **partial-stability layout is worse than
either extreme** (Purchase & Samra 2008); mental-map benefit unproven (Archambault & Purchase
2013); accidental drag-on-click + `file://` localStorage leakage (Hutchins/Hollan/Norman 1985).
→ Auto-layout authoritative; drag = reversible delta overlay; gate behind >6px move + hold (so
click still opens modal); **off above ~12 nodes**; tier-locked (horizontal nudge only / snap
back); persist by **baking x,y (export)** not localStorage; re-route edges after drag; also offer
the cheaper "isolate neighbors" (== #2) for the decluttering users actually want.

**#4 Brushing/linking** — CMV violates Baldonado's own Rule of Parsimony (AVI 2000); per-step the
tracer fires 4–6 simultaneous changes → split-attention + change blindness (Chandler & Sweller
1992; Nowell 2001); coordinated views for learning code gave no gain / sometimes lost to text
(arXiv:2509.26466, 2025).
→ One change at a time (sequence comet → then touch-nodes); dim rest ~30%; **persistent
post-step trail/badge**; persistent **"lives behind: ‹node›" breadcrumbs** on schema/api;
heat dots OFF unless real p50s; single static diagram for <~8-node "Quick" maps.

**#5 What-if failure** — edges are call sites not runtime deps; a rerouting comet feedforwards
graceful degradation that may not exist = false feedforward (Vermeulen CHI 2013); high-fidelity
sim inflates miscalibrated confidence (Massoth 2019); automation bias hits onboarding hardest
(Parasuraman & Riley 1997).
→ Make it a **cited blast-radius / reachability highlighter, not a behavior simulator**: kill a
node → grey strictly-downstream-reachable, label "depends on X (file:line)"; **no rerouting
animation**; persistent "ASSUMED, NOT OBSERVED" badge; deliberately low-fidelity schematic style;
optional per-edge `onFail` (cited only); predict-then-reveal; standing "what this can't see"
callout. Ship as a Resilience PANEL, not a kill-toy, until real telemetry exists.

**#6 Accessibility & motion** — latency is encoded by **hue alone** (green→red), which WCAG
contrast can't catch and ~8% of men can't read (SC 1.4.1); `prefers-reduced-motion` never checked
and rAF runs forever; "we followed Nielsen+WCAG" isn't proof — heuristic eval has severe evaluator
effect (Hertzum & Jacobsen 2001), WCAG-2 contrast math is contested (don't chase APCA as a bar).
→ **CVD-safe viridis/cividis ramp + redundant size/label** (never hue alone); reduced-motion:
autoplay off, comet → steppable static highlight, **stop idle rAF**; cap pulse <3 Hz; keyboard
nav (Tab nodes, arrows walk edges, Enter/Esc) + `aria-live` step announcements; replace the
"conformance claim" with **deterministic gates** (CVD snapshot, axe contrast, reduced-motion smoke).

## Cross-cutting rules (bind every feature)
1. **CVD-safe palette, globally** — viridis/cividis for sequential, Okabe-Ito for categorical;
   every colour channel carries a redundant size/shape/dash/text channel.
2. **Reduced motion is a default-respecting behavior** — query once; under `reduce` no autoplay,
   comet → steppable, idle rAF stopped; cap speeds, no >3 Hz.
3. **Defend change blindness** — one change at a time, dim (~30%) don't hide, persistent
   trails/badges/counts.
4. **Parsimony of coordinated views** — default quiet/paused/single-view; escalate only when
   justified (≥~8 nodes / multi-service).
5. **No false confidence** — no synthetic latency drives heat dots; failure = cited blast-radius,
   badged "modeled not observed," low-fidelity.
6. **Layout authoritative & deterministic** — emphasis is colour/opacity/stroke, never (x,y);
   playback/filter never re-layout.
7. **Deterministic gates, not heuristic claims** — CVD snapshot, axe contrast, reduced-motion
   smoke, a renderer assertion that playback never re-layouts.
8. **`file://` discipline** — prefer baked/exported/inspectable persistence over browser-origin
   localStorage.

_Full agent reports: workflow run wf_53fd5cb8-b92._
