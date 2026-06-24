# codeviz

**Interactive system-design onboarding for any codebase** — a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin.

Point it at a repo; it generates linked, interactive HTML that gets a new engineer productive fast: a zoomable **system-design atlas** (every box a real system, every arrow a real call) with a diggable request/response tour, drillable **data models**, and a Structure/Health overlay. Self-contained — opens over `file://`, no server, no CDN. See [`examples/demo/system-map.html`](examples/demo/system-map.html).

## Install

```
/plugin marketplace add yeshdev1/codeviz
/plugin install codeviz
```

## The commands

Six commands. **`/codeviz`** builds the docs; the rest extend or operate on a generated map. Costs are output tokens, order-of-magnitude — they scale with repo and schema size.

**`/codeviz [scope] [path]`** — *the generator.* Point it at a repo and it builds the interactive system map (and, opt-in, the data-model, API, and themed pages). Run it bare to size-scan and pick pieces, or pass one scope — `map`, `steps`, `schema`, `api`, `theme`, `full`. **~3k–200k** depending on scope (breakdown below).

**`/codeviz-datamodel [overview|standard|full]`** — *the data layer.* After a map exists, reads the **real** schema (SQL / migrations / ORM / NoSQL samples) and draws each datastore's ER diagram with a Dig-depth dial. Granularity is a dial: `overview` = entities + keys, `standard` = + key columns, types and top queries, `full` = every column, constraint and index. **~6–12k · ~12–25k · ~25–50k+ per datastore.**

**`/codeviz-capture <scene> [--speed --secs --caption --gif]`** — *record a clip.* Drives a generated map (or the data-model page) headlessly in Playwright and renders an MP4/GIF of one scene: `tour`, `digtour`, `health`, `zoom`, `focus`, `er`, `digdata`. `--speed`/`--secs` tighten the length; `--caption` burns in a title. **~1–3k** — it runs a local Node + ffmpeg script, so it barely touches the model (needs Chromium + ffmpeg).

**`/codeviz-health`** — *real status.* With your stack running locally, reads Docker (container state, uptime, restarts, healthchecks), maps each container to a system, and writes an **observed** snapshot into the map you can toggle to. Point-in-time, never fabricated. **~3–10k** per snapshot.

**`/codeviz-scenario "<what-if>"`** — *model a failure.* Describe a scenario ("database outage") and it computes the blast radius up the call graph and appends it as a switchable, **modeled** health scenario. **~3–10k** per scenario.

**`/dig-codeviz <step or node>`** — *dig deeper.* Adds one level of code-grounded, `file:line`-cited explanation to a step (a hop, edge, or node). **Hard-stops after 5 digs** per onboarding so curiosity can't run up a bill. **~8–20k per dig.**

## Run only what you need

`/codeviz` is **granular** — every output is opt-in, because a full run on a large repo can cost **150k+ tokens**. Run it with **no scope** and it first **size-scans** the repo (services, routes, models, rough LOC), prints a **per-scope token estimate**, and lets you choose what to generate and drop the rest — it never silently generates everything. Pass one scope to skip the dialog (anything after it is the target path); `full` runs them all.

| command | builds | rough cost* |
|---|---|---|
| `/codeviz map` | the interactive system diagram (`system-map.html` + hub) | ~30–70k |
| `/codeviz steps` | request/response detail + jargon for each tour step | ~8–20k |
| `/codeviz schema` | the static data-model page (`schema.html`) | ~15–35k |
| `/codeviz api` | the full API surface (`api.html`) | ~40–110k |
| `/codeviz theme` | detect the repo's palette and theme the pages | ~3–8k |
| `/codeviz full` | all of the above | ~90–200k |

\* Output tokens, order-of-magnitude. The estimate **scales with the size scan** — roughly ×0.5 for a tiny service, ×2 for a large monorepo — and is shown *before* anything runs, as an estimate, not a quote.

**Where to start:** `map` + `steps` is the lowest-cost, highest-value combo for a newcomer (~40–90k) — the diagram plus narrated request flows. Add `theme` (~3–8k) so it wears the repo's own colors. The data-model, health and capture commands above run **after** a map exists and are billed separately, so you only pay for the depth you actually open.

## Data models you can read at a glance

![ER diagram — tables laid out by dependency, with crow's-foot connectors on the real keys](examples/clips/codeviz-datamodel.png)

Click any **datastore** → its full data-model page. codeviz reads the **real** schema (SQL / migrations / ORM / NoSQL samples) and draws an **ER diagram laid out by dependency** — root tables left, junction tables right — with crow's-foot *many→one* cardinality and foreign keys drawn as connectors to the key they point at. **Hover a table to spotlight just its relationships;** junction and hub tables are auto-badged.

A **Dig depth** dial controls detail — Entities → Keys → Columns → Everything. It opens at the level that's actually useful and **warns when you go past it** (*"reference detail, not insight — dig in anyway?"*). Detail you can reach, never detail dumped on you.

Grounded only: it never invents tables, marks unbuilt ones `planned`, and badges the page *"modeled from the schema — verify against your live database."*

## A guided tour you can dig into

The map's tour walks a real request hop by hop. It's **diggable** — one dial, three depths:

- **Overview** — just the hop, what moves where
- **Walkthrough** — the request and why it works that way (the default)
- **Deep dive** — a from-scratch explanation, every term defined

Same *"you're past what you need — go further?"* gate as the data models. Scenarios live here, on the map — there's no separate scenarios page.

## Record a clip

![Guided tour of a codeviz map — a live request walked end to end](examples/clips/codeviz-tour.gif)

`/codeviz-capture` films any scene — the tour above, the Health view, the ER diagram — into a shareable MP4/GIF. Self-narrating, captioned, ~5–10s, all local. (Scenes and flags are in [the commands](#the-commands).)

## Real health, not just illustrative

![Health overlay — real container status snapped from Docker into the map](examples/clips/codeviz-health.gif)

The map has a **Structure ↔ Health** toggle. Scenarios are illustrative by default (badged *"modeled — not observed"*) — `/codeviz-scenario` models a what-if up the call graph. For **real** status, `/codeviz-health` reads your local **Docker** and writes an **observed** snapshot you can toggle to: point-in-time, never fabricated.

## How it works

**Plan → Generate → Debug → Deliver.** "Debug" means *interpret* the code so the docs reflect real behaviour (grounded in `file:line`) — not a correctness audit; a real bug spotted while reading goes to a `⚠ Noticed while reading` list, not a fix. Output lands in `docs/onboarding/`.

Authoring reference for the diagram data, scenarios, use cases and edge cases: [`skills/codeviz/DATA-SPEC.md`](skills/codeviz/DATA-SPEC.md).

## License

MIT — see [LICENSE](LICENSE).
