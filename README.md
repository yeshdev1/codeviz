# codeviz

**Interactive system-design onboarding for any codebase** — a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin.

Point it at a repo and it generates linked, **interactive** HTML that gets a new engineer productive fast — a system you *explore*, not a static diagram. Self-contained: opens over `file://`, no server, no CDN.

![A live request walked end to end through the interactive system map](examples/clips/codeviz-tour.gif)

## The system map

A zoomable **atlas** — every box a real system, every arrow a real call, in colour-coded layers. Scroll continents → services → detail, click a system to focus its neighbourhood, hover a connection to see what it carries. Try it: [`examples/demo/system-map.html`](examples/demo/system-map.html).

Its **guided tour** walks a real request hop by hop — and it's **diggable**, one dial, three depths:

- **Overview** — just the hop, what moves where
- **Walkthrough** — the request and why it works that way (the default)
- **Deep dive** — a from-scratch explanation, every term defined

Go past the recommended depth and it asks first: *"reference detail, not insight — dig in anyway?"*

## Data models you can read at a glance

![ER diagram — tables laid out by dependency, with crow's-foot connectors on the real keys](examples/clips/codeviz-datamodel.png)

Click any **datastore** → its full ER diagram, built from the **real** schema (SQL / migrations / ORM / NoSQL). Tables lay themselves out **by dependency** — roots left, junction tables right — with crow's-foot *many→one* cardinality and foreign keys drawn as connectors to the key they point at. **Hover a table to spotlight just its relationships;** junction and hub tables are auto-badged. A **Dig depth** dial controls detail: Entities → Keys → Columns → Everything.

Grounded only: it never invents tables, marks unbuilt ones `planned`, and badges the page *"modeled from the schema — verify against your live database."*

## Real health, not just illustrative

![Health overlay — real container status snapped from Docker into the map](examples/clips/codeviz-health.gif)

A **Structure ↔ Health** toggle. Scenarios are illustrative by default (badged *"modeled — not observed"*); `/codeviz-scenario` models a what-if up the call graph. For **real** status, `/codeviz-health` reads your local **Docker** and writes an **observed**, point-in-time snapshot you can toggle to — never fabricated.

## Install

```
/plugin marketplace add yeshdev1/codeviz
/plugin install codeviz
```

## Commands

`/codeviz` builds the docs; the rest extend or operate on a generated map. Costs are output tokens — order-of-magnitude, scaling with repo and schema size.

| command | what it does | avg tokens |
|---|---|---|
| **`/codeviz [scope] [path]`** | build the interactive map (+ opt-in data-model, API, themed pages). Bare = size-scan & pick; or one scope — `map` · `steps` · `schema` · `api` · `theme` · `full` | ~3k–200k |
| **`/codeviz-datamodel [overview\|standard\|full]`** | per-datastore ER diagram from the real schema, with the Dig-depth dial | ~6–12k · 12–25k · 25–50k+ /store |
| **`/codeviz-capture <scene>`** | record an MP4/GIF of a scene — `tour` · `digtour` · `er` · `digdata` · `health` · `zoom` · `focus` (local Playwright + ffmpeg) | ~1–3k |
| **`/codeviz-health`** | snapshot real Docker status (state, uptime, restarts) into the map | ~3–10k |
| **`/codeviz-scenario "<what-if>"`** | model a failure's blast radius as a switchable scenario | ~3–10k |
| **`/dig-codeviz <step>`** | one level of `file:line`-cited detail on a step; hard-stops at 5 digs | ~8–20k /dig |

## Run only what you need

`/codeviz` is **granular** — every output is opt-in, because a full run on a large repo can cost **150k+ tokens**. Run it with **no scope** and it **size-scans** the repo (services, routes, models, rough LOC), prints a **per-scope estimate**, and lets you pick what to generate — never a silent full run. Pass one scope to skip the dialog (anything after it is the target path); `full` runs them all.

| scope | builds | rough cost |
|---|---|---|
| `map` | the interactive diagram (`system-map.html` + hub) | ~30–70k |
| `steps` | request/response detail + jargon per tour step | ~8–20k |
| `schema` | the static data-model page (`schema.html`) | ~15–35k |
| `api` | the full API surface (`api.html`) | ~40–110k |
| `theme` | detect the repo palette and theme the pages | ~3–8k |
| `full` | all of the above | ~90–200k |

The estimate scales with the scan (≈ ×0.5 for a tiny service, ×2 for a large monorepo) and is shown before anything runs. **Start with `map` + `steps`** (~40–90k) — the diagram plus narrated request flows; add `theme` (~3–8k) for the repo's own colors.

## How it works

**Plan → Generate → Debug → Deliver.** "Debug" means *interpret* the code so the docs reflect real behaviour (grounded in `file:line`) — not a correctness audit; a real bug spotted while reading goes to a `⚠ Noticed while reading` list, not a fix. Output lands in `docs/onboarding/`.

Authoring reference for the diagram data, scenarios, use cases and edge cases: [`skills/codeviz/DATA-SPEC.md`](skills/codeviz/DATA-SPEC.md).

## License

MIT — see [LICENSE](LICENSE).
