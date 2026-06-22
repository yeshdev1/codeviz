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
- **tour** — opens the guided tour and walks a few request→response hops (default).
- **health** — toggles to Health, then clicks affected systems in the summary to fly to them.
- **zoom** — semantic zoom: continents → services → detail.
- **focus** — clicks a system and lets the degree-of-interest camera fly in.
- **overview** — a gentle pass across all three zoom levels.

Pick the scene that matches the story; `health` and `tour` make the strongest social clips. Report the output path(s) and remind the user MP4 is best for LinkedIn/GitHub, GIF for inline autoplay.

## Customizing
To stage a bespoke sequence, copy `assets/capture.js`, add a scene to the `SCENES` map, and call the same `window.__atlas` hooks the others use: `goLevel('continents|services|detail')`, `startTour(i)` / `next()` / `exitTour()`, `setFocus(id)`, `setHealth(true)` / `setHealthScen(i)`, plus DOM clicks (`#viewmode button[data-v="health"]`, `.hs-row[data-id="…"]`). Keep clips ~5–10s; reach for `--speed`/`--secs` rather than re-encoding by hand.

## Guardrails
- Local + headless only — never publishes anywhere; the user shares the file themselves.
- Don't fabricate features in the clip — only drive interactions the map actually has.
- If `window.__atlas` isn't found, the map isn't a codeviz atlas (or is stale) — say so rather than producing an empty video.
