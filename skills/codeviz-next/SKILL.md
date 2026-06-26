---
name: codeviz-next
description: Suggest the next component to build or visualize for a codeviz system design. Reads the map's real state (partial & planned nodes, whether a data model / flows exist) and emits next-steps.html — an advisor that surfaces a DIFFERENT suggestion every time it's opened, blended with a rotating pool of next-visualization ideas. Use after a map exists ("what should I build next", "where do I take this", "/codeviz-next").
---

# codeviz-next — what to build next

A map is never "done" — there are always partial components to finish and a next layer of visualization
worth adding. This generates **`next-steps.html`**: an advisor that reads the current map and suggests
**the next thing to build**, and shows a **fresh suggestion every time the page is opened** (plus an
*Another idea →* button), so it nudges rather than nags.

## What it reads (so suggestions fit your map)
From the generated `system-map.html` it extracts `NODES`, `EDGES`, `DATAMODEL`, `SCENARIOS` and derives:
- **partial / planned nodes** — components on the map that aren't built yet;
- whether a **data model** exists (and which datastores still lack one);
- how many **flows** the tour covers.

It turns those into **tailored** suggestions (finish *this* partial node, model *that* store, add a
failure flow) and prepends them to a standing **pool of ~17 next-visualization ideas** (sequence view,
latency heatmap, dependency matrix, error/retry paths, deployment topology, data lineage, blast-radius
simulator, caching map, read/write split, auth overlay, capacity annotations, event choreography,
glossary, day-1 reading path, cost overlay, cold-start trace, responsive map, test-coverage overlay).

Each suggestion carries a **kind**, a **why**, concrete **how** steps (often pointing at the right
codeviz command), and **impact / effort** gauges.

## "A different suggestion every time"
The page holds all suggestions and walks a **persisted, reshuffling queue** in `localStorage`: each open
advances to the next unseen idea, reshuffling once the pool is exhausted, so consecutive visits never
repeat. The *Another idea →* button advances within a session. (Robust mechanism: the rotation lives in
the page, so it holds even if the skill regenerates the same file.)

## Run it
After a map exists:

```
node <skill>/assets/render-next.js <output-dir>      # default: docs/onboarding
```

Writes `next-steps.html` next to the map. Self-contained — Node built-ins only, inherits the map's theme,
opens over `file://`. Exposed as `/codeviz-next`.

## Notes
- It's an **advisor**, not a generator — it suggests the work; the actual building is the other codeviz commands (`/codeviz-datamodel`, `/codeviz steps`, `/codeviz-scenario`, …) it points you to.
- The tailored suggestions key off node `status` (`partial`/`planned`) — keep those honest in `NODES` and the advice stays honest.
- To bias the pool for a specific project, edit the `POOL` array at the top of `assets/render-next.js`.
