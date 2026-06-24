# codeviz

**Interactive system-design onboarding for any codebase** — a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin.

Point it at a repo; it generates linked, interactive HTML that gets a new engineer productive fast: a zoomable **system-design atlas** (every box a real system, every arrow a real call) with a diggable request/response tour, drillable **data models**, and a Structure/Health overlay. Self-contained — opens over `file://`, no server, no CDN. See [`examples/demo/system-map.html`](examples/demo/system-map.html).

## Install

```
/plugin marketplace add yeshdev1/codeviz
/plugin install codeviz
```

## Run only what you need

A full run on a large repo can cost **150k+ tokens**, so every output is opt-in. Run `/codeviz` with no scope to size-scan the repo, see a per-piece token estimate, and pick. Or name a scope:

| command | builds | rough cost* |
|---|---|---|
| `/codeviz map` | the interactive system diagram (`system-map.html` + hub) | ~30–70k |
| `/codeviz steps` | request/response detail + jargon for each tour step | ~8–20k |
| `/codeviz schema` | the static data-model page (`schema.html`) | ~15–35k |
| `/codeviz api` | the full API surface (`api.html`) | ~40–110k |
| `/codeviz theme` | detect the repo's palette and theme the pages | ~3–8k |
| `/codeviz full` | all of the above | ~90–200k |

\* Output tokens, order-of-magnitude; codeviz scales by repo size and shows a real estimate first. Best starter combo: **`map` + `steps`**.

## Data models you can read at a glance

![ER diagram — tables laid out by dependency, with crow's-foot connectors on the real keys](examples/clips/codeviz-datamodel.png)

Click any **datastore** → its full data-model page. codeviz reads the **real** schema (SQL / migrations / ORM / NoSQL samples) and draws an **ER diagram laid out by dependency** — root tables left, junction tables right — with crow's-foot *many→one* cardinality and foreign keys drawn as connectors to the key they point at. **Hover a table to spotlight just its relationships;** junction and hub tables are auto-badged.

A **Dig depth** dial controls detail — Entities → Keys → Columns → Everything. It opens at the level that's actually useful and **warns when you go past it** (*"reference detail, not insight — dig in anyway?"*). Detail you can reach, never detail dumped on you.

```
/codeviz-datamodel              # standard depth, every datastore
/codeviz-datamodel overview     # entities + relationships only
/codeviz-datamodel full         # every column, constraint, index
```

Grounded only: it never invents tables, marks unbuilt ones `planned`, and badges the page *"modeled from the schema — verify against your live database."*

## A guided tour you can dig into

The map's tour walks a real request hop by hop. It's **diggable** — one dial, three depths:

- **Overview** — just the hop, what moves where
- **Walkthrough** — the request and why it works that way (the default)
- **Deep dive** — a from-scratch explanation, every term defined

Same *"you're past what you need — go further?"* gate as the data models. Scenarios live here, on the map — there's no separate scenarios page.

## Record a clip

![Guided tour of a codeviz map — a live request walked end to end](examples/clips/codeviz-tour.gif)

```
/codeviz-capture tour          # map scenes: tour · digtour · health · zoom · focus
/codeviz-capture er            # data-model page scenes: er · digdata
```

Drives the map (and the data-model page) headlessly in Playwright and renders a shareable **MP4** (+ `--gif`). `--speed`/`--secs` tighten the length; `--caption` burns in a lower-third title (rendered in-page, no fonts needed). The `er` / `digdata` / `digtour` scenes self-narrate. Needs Chromium + ffmpeg; runs locally, publishes nothing.

## Real health, not just illustrative

![Health overlay — real container status snapped from Docker into the map](examples/clips/codeviz-health.gif)

The map has a **Structure ↔ Health** toggle. Scenarios are illustrative by default (badged *"modeled — not observed"*). `/codeviz-scenario "database outage"` models a what-if up the call graph and adds a switchable chip. For **real** status:

```
/codeviz-health
```

reads your local **Docker** (container state, uptime, restarts, healthchecks), maps each container to a system, and writes an **observed** snapshot you can toggle to. Point-in-time, not monitoring — and it never fabricates metrics.

## Dig deeper, with a cap

```
/dig-codeviz <step or node>
```

Adds one level of code-grounded explanation (cited `file:line`) to a step. Counts your digs and **hard-stops after 5**, then points you at the files to read — so curiosity can't quietly run up a token bill. ~8–20k per dig.

## How it works

**Plan → Generate → Debug → Deliver.** "Debug" means *interpret* the code so the docs reflect real behaviour (grounded in `file:line`) — not a correctness audit; a real bug spotted while reading goes to a `⚠ Noticed while reading` list, not a fix. Output lands in `docs/onboarding/`.

Authoring reference for the diagram data, scenarios, use cases and edge cases: [`skills/codeviz/DATA-SPEC.md`](skills/codeviz/DATA-SPEC.md).

## License

MIT — see [LICENSE](LICENSE).
