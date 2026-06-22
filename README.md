# codeviz

**Interactive system-design onboarding for any codebase** — a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin.

Point it at a repo and it generates linked, *interactive* HTML pages that get a new engineer productive fast: a zoomable **system-design atlas** (every box a real system, every arrow a real call, with an animated request/response tour and a Structure/Health overlay), a data-model page, and a deep API page. See [`examples/demo/system-map.html`](examples/demo/system-map.html).

## Install

```
/plugin marketplace add yeshdev1/codeviz
/plugin install codeviz
```

## Run only what you need (and see the cost first)

codeviz is **granular** — each output is opt-in, because a full run on a large repo can cost **150k+ tokens**. Run `/codeviz` with **no scope** and it size-scans the repo, shows a token estimate per piece, and lets you pick which to generate and drop the rest. Or name a scope to skip the dialog:

| command | does this one thing | rough cost* |
|---|---|---|
| `/codeviz map` | boot the **interactive system-design diagram** (`system-map.html` + hub) | ~30–70k |
| `/codeviz steps` | add **detailed request/response descriptions + jargon** to each guided-tour step | ~8–20k |
| `/codeviz schema` | the **data model** page (`schema.html`) | ~15–35k |
| `/codeviz api` | the **full API surface**, in depth (`api.html`) | ~40–110k |
| `/codeviz theme` | detect the repo's palette and **theme** the pages | ~3–8k |
| `/codeviz full` | everything above | ~90–200k |
| `/codeviz` | **estimate + pick** which of the above to run | — |

\* Rough order-of-magnitude (output tokens); codeviz scales it by repo size and shows a real estimate before running. Lowest-cost high-value combo for a newcomer: **`map` + `steps`**.

## Dig deeper, with a budget cap

```
/dig-codeviz <step or node>
```

Adds **one** level of code-grounded explanation (read from the real source, cited `file:line`) to a step of an existing map. It counts your digs in `docs/onboarding/.codeviz-dig.json` and **hard-stops after 5** — past that it points you at the files to read instead, so curiosity can't quietly run up a token bill. ~8–20k per dig.

## Record a clip

```
/codeviz-capture health   # or: tour · zoom · focus · overview
/codeviz-capture tour --speed 2 --secs 5 --caption "A live request, end to end"
```

Drives the map headlessly (Playwright) and renders a shareable **MP4** (+ optional `--gif`) of the chosen scene — for a PR, README, or LinkedIn. For a tight social clip, `--speed 2 --secs 5` compresses the motion into ~5s (not a hard cut), and `--caption "<text>"` burns in a lower-third title (rendered in-page, so no fonts needed — shows in both MP4 and GIF). Needs Chromium + ffmpeg; runs locally, publishes nothing.

## Real health, not just illustrative

The map has a **Structure ↔ Health** toggle with switchable health scenarios (sample incident / all-healthy / cascade) — illustrative by default, badged *"modeled — not observed."*

**Model your own** what-ifs with `/codeviz-scenario "database outage"` — it computes the blast radius up the call graph and adds a switchable scenario chip. To overlay **real** status:

```
/codeviz-health
```

reads your local **Docker** (container state, uptime, restarts, healthchecks), maps each container to a system, and writes an **observed** snapshot into the map you can toggle to. It's a point-in-time snapshot, not continuous monitoring — and it never fabricates metrics.

## What it does (briefly)

Mechanism: **Plan → Generate → Debug → Deliver**. "Debug" means *interpret* the code so the docs reflect real behaviour (grounded in `file:line`) — **not** a correctness audit; a real bug spotted while reading is flagged to a `⚠ Noticed while reading` list, not fixed. Output lands in `docs/onboarding/` and opens over `file://` (the system map is self-contained — no CDN).

Authoring reference for the diagram's data model, use cases and edge cases: [`skills/codeviz/DATA-SPEC.md`](skills/codeviz/DATA-SPEC.md).

## License

MIT — see [LICENSE](LICENSE).
