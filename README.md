# codeviz

**Interactive system-design onboarding for any codebase** — a [Claude Code](https://docs.claude.com/en/docs/claude-code) plugin.

Point it at a repo and it generates a small set of linked, illustrated, *interactive* HTML pages that get a new engineer productive fast. The priority order is deliberate:

> **(1) how the systems talk to each other → (2) the data model → (3) the API in depth.**

A newcomer needs the *map* before the *territory*.

## What you get

- **`system-map.html`** — the centerpiece: an interactive `<canvas>` where **every box is a real system and every arrow is a real call**. Click any box for its role and why it exists; pick a scenario to **auto-play a real request hop-by-hop** (a comet travels the active edge with a progress bar + narration).
- **`schema.html`** — the data model, grouped by domain.
- **`api.html`** — the API surface, in depth.
- **`index.html`** — a hub linking them, on a shared component library (`harness.css`).

See [`examples/demo/system-map.html`](examples/demo/system-map.html) for a live demo (open it in a browser — it loads icons from a CDN, so be online).

## Install

```
/plugin marketplace add yeshdev1/codeviz
/plugin install codeviz
```

Then, in any repository:

```
/codeviz
```

## How it works — Plan → Generate → Debug → Deliver

- **Plan** — detect the stack (manifests, compose, infra, env).
- **Generate** — build the system-to-system map *first* (nodes = real systems, edges = real calls, 1–3 critical end-to-end flows), then the data model, then the deep API page.
- **Debug** — *interpret* the code so the docs reflect real behaviour (grounded in `file:line`). This is **not** a correctness audit; if a real bug turns up while reading, it's flagged to a `⚠ Noticed while reading` list, not fixed.
- **Deliver** — assemble the hub, validate every page, hand over the path.

## Repo layout

```
.claude-plugin/
  plugin.json          # plugin manifest
  marketplace.json     # makes this repo directly installable
skills/codeviz/
  SKILL.md             # the orchestration
  assets/
    harness.css        # the component library + canvas/tracer/modal CSS
    system-map.template.html  # runnable interactive-diagram template
commands/codeviz.md    # the /codeviz entry point
examples/demo/         # a rendered demo
```

## License

MIT — see [LICENSE](LICENSE).

---

The interactive-diagram engine and component library were reverse-engineered from a hand-built set of system-design pages. Contributions welcome.
