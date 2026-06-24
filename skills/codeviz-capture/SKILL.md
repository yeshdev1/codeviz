---
name: codeviz-capture
description: Record a short, shareable clip (MP4 + optional GIF) of a generated codeviz system map — driving it headlessly with Playwright to showcase a feature (guided tour, Health overlay, semantic zoom, focus). Use when someone wants a video/GIF/demo of their map for a PR, README, or LinkedIn ("record a clip", "make a gif of the tour", "capture the health view", "/codeviz-capture").
---

# codeviz-capture — film your system map

Drives a generated `system-map.html` in headless Chromium (via its `window.__atlas` hook), records the session, and renders a clean **MP4** (and optional **GIF**) with ffmpeg. The map is self-contained and offline, so no server is needed.

## Prerequisites (tell the user how if missing)
- **Node** + **Playwright Chromium**: `npx playwright install chromium` (and `@playwright/test` available — it ships with this repo; in another project: `npm i -D @playwright/test`).
- **ffmpeg** for MP4/GIF (`brew install ffmpeg` / `apt install ffmpeg`). Without it the tool still outputs a raw `.webm`.
- A generated map (`docs/onboarding/system-map.html`) — run **/codeviz** first.

## Run it
The bundled tool is `assets/capture.js` (next to this skill). From the repo root:

```
node <skill>/assets/capture.js --map docs/onboarding/system-map.html --scene tour --gif
```

Flags: `--map <path>` (default `docs/onboarding/system-map.html`) · `--scene <name>` · `--out <file.mp4>` (default `codeviz-<scene>.mp4`) · `--gif` (also emit a GIF) · `--w`/`--h` (viewport, default 1280×800) · `--speed <x>` (time-compress, `2` = twice as fast) · `--secs <n>` (hard-trim the clip to ~n seconds) · `--caption "<text>"` (burn a lower-third caption into the clip).

## Tighten & brand (5-second social clips)
The raw scenes run ~7–10s. To land a tight, captioned demo:

```
node <skill>/assets/capture.js --map docs/onboarding/system-map.html --scene tour \
  --speed 2 --secs 5 --caption "Guided tour — a live request, end to end" --gif
```

- **`--speed 2`** time-compresses the motion (so ~10s of tour becomes ~5s of *action*, not a cut-off clip); **`--secs 5`** then caps the exact length. Use them together for a tight ~5s — `--secs` alone just trims, `--speed` alone just speeds up.
- **`--caption`** bakes the text in as a lower-third pill, rendered in-page (so it needs no system fonts or ffmpeg `drawtext` — works on any box, shows up in both MP4 and GIF). Keep it to one short line; it stays on screen for the whole clip.

## Scenes (`--scene`)
Map scenes (drive `system-map.html` via `window.__atlas`):
- **tour** — opens the guided tour and walks a few request→response hops (default).
- **digtour** — the *diggable* tour: steps one scenario through Overview → Walkthrough → Deep dive, including the "past recommended depth" gate. Shows progressive disclosure of a flow.
- **health** — toggles to Health, then clicks affected systems in the summary to fly to them.
- **zoom** — semantic zoom: continents → services → detail.
- **focus** — clicks a system and lets the degree-of-interest camera fly in.
- **datamodel** — opens a datastore's in-map data-model modal.
- **overview** — a gentle pass across all three zoom levels.

Companion-page scenes (pass **`--map …/data-model.html`** — these drive the page's DOM, no `window.__atlas`):
- **er** — the rebuilt ER diagram: reveals the dependency layout, then hovers tables (junction, hub, then a foreign-key row) to spotlight their relationships.
- **digdata** — the data-model **Dig depth** dial: walks Entities → Keys → Columns, then trips the gate past the recommended level and accepts it.

Pick the scene that matches the story; `health`, `tour`, `digtour` and `er` make the strongest social clips. Report the output path(s) and remind the user MP4 is best for LinkedIn/GitHub, GIF for inline autoplay.

The feature scenes **`er` · `digdata` · `digtour` self-narrate** — they rewrite a shared lower-third caption as the demo progresses (via the `cap(p, text, ms)` helper), so each beat gets its own explanation. Record them at **1× (no `--speed`)** so the captions stay readable; they run ~8–11s. `--caption` isn't needed for these (the scene drives its own); for the other scenes, `--caption` sets one static line as before.

## Customizing
To stage a bespoke sequence, copy `assets/capture.js`, add a scene to the `SCENES` map, and call the same `window.__atlas` hooks the others use: `goLevel('continents|services|detail')`, `startTour(i)` / `next()` / `exitTour()`, `setFocus(id)`, `setHealth(true)` / `setHealthScen(i)`, plus DOM clicks (`#viewmode button[data-v="health"]`, `.hs-row[data-id="…"]`). Keep clips ~5–10s; reach for `--speed`/`--secs` rather than re-encoding by hand.

## Guardrails
- Local + headless only — never publishes anywhere; the user shares the file themselves.
- Don't fabricate features in the clip — only drive interactions the map actually has.
- If `window.__atlas` isn't found, the map isn't a codeviz atlas (or is stale) — say so rather than producing an empty video.
