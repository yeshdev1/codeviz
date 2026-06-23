---
description: Record a shareable clip (MP4/GIF) of a generated codeviz system map — tour, health, zoom, or focus
---

Run the **codeviz-capture** skill on $ARGUMENTS (a scene: `tour` · `health` · `zoom` · `focus` · `datamodel` · `overview`; default `tour`. May also include `--map <path>` · `--gif` · `--speed <x>` · `--secs <n>` · `--caption "<text>"`).

For a tight, branded social clip, pair `--speed 2 --secs 5` (≈5s of motion, not a cut-off) with a one-line `--caption` (burned in as a lower-third pill, no fonts needed).

Drive the generated `system-map.html` headlessly with the bundled `assets/capture.js` (Playwright + ffmpeg), record the chosen scene, and render an **MP4** (and optional **GIF**). Needs Chromium (`npx playwright install chromium`) and ffmpeg; tell the user how if missing, and run **/codeviz** first if no map exists. Report the output path — MP4 for LinkedIn/GitHub, GIF for inline autoplay. Local only; never publishes.
