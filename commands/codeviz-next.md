---
description: Suggest the next component to build/visualize for a codeviz system design — a fresh idea every time (writes next-steps.html)
---

Run the **codeviz-next** skill on `$ARGUMENTS` (an output dir; default `docs/onboarding`).

Read the generated map's real state — partial & planned nodes, whether a data model and flows exist —
and emit **`next-steps.html`**, an advisor that suggests the next component to build or visualize and
shows a **different suggestion every time it's opened** (plus an *Another idea →* button).

```
node <skill>/assets/render-next.js <output-dir>
```

Requires a generated map (run **/codeviz** first). It's an advisor: it points at the right next step and
the command that builds it (`/codeviz-datamodel`, `/codeviz steps`, `/codeviz-scenario`, …). Tell the
user the output path and that reopening the page surfaces a fresh suggestion each time.
