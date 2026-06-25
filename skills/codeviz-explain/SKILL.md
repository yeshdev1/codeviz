---
name: codeviz-explain
description: Add an opt-in, on-device "select-to-explain" layer to a generated codeviz onboarding — the reader downloads a local LLM into their browser, then selecting any text (a table, a column, a tour step) pops a context-aware explanation right at the selection. Runs entirely in the browser via WebLLM/WebGPU; offline after the one-time model download, nothing leaves the device. Use after a codeviz map exists ("let readers ask the page", "explain on selection", "/codeviz-explain").
---

# codeviz-explain — select anything, explain it on-device

The map and data models show **what** the system is. This adds a reader-driven **why**: highlight any
text and a small **local** language model explains that exact thing — a table, a foreign key, a tour
step — in a tooltip anchored at the selection. No server, no API key, no side panel; after a one-time
in-browser model download it runs fully offline on the reader's own device.

> **Full reference:** [`DOCS.md`](DOCS.md) — architecture, the model + alternatives, context-extraction
> internals, privacy/security, requirements, configuration, testing, limitations, and troubleshooting.

## The model
**WebLLM (MLC)** running **`Llama-3.2-3B-Instruct` (q4f16_1, ~1.8 GB)** on **WebGPU** — the best-in-class
in-browser instruct model for this size: strong enough for crisp 2–4 sentence explanations, small enough
to download once and cache. Swap `MODEL_ID` at the top of `assets/explain.js` for any WebLLM prebuilt:
- lighter / faster download → `Llama-3.2-1B-Instruct-q4f16_1-MLC` (~0.9 GB) or `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` (~1.0 GB)
- higher quality → `Qwen2.5-3B-Instruct-q4f16_1-MLC`, `Phi-3.5-mini-instruct-q4f16_1-MLC`

The weights download from the MLC/HuggingFace CDN **once** (the one moment the page goes online), are
cached in the browser, and every inference after that is local.

## Run it
After a map exists, inline the layer into the generated pages (idempotent — safe to re-run):

```
node <skill>/assets/inject-explain.js <output-dir>      # default: docs/onboarding
```

It injects `assets/explain.css` + `assets/explain.js` before `</body>` of `system-map.html`,
`data-model.html`, `index.html`, `schema.html`, `api.html` (whichever exist).

## What the reader sees
1. A small **💡 Explain** pill (bottom-left). Clicking it offers: *"Download a local AI model (~1.8 GB)…"* with **Enable / Not now**.
2. On **Enable**, the model downloads **in the browser while the page stays visible** — a progress bar in the pill's card; the choice is remembered (`localStorage`), so a return visit loads it straight from cache.
3. Once ready, **selecting any text** pops an **On-device explanation** bubble *at the selection*. It streams in. Esc, a click away, or a new selection dismisses it. Nothing opens on the side.

## How the explanation stays grounded
On each selection the layer walks the DOM up from the selected node and gathers the **structured context**
around it, then hands that to the model with the selected text:
- in a data model: the **column** (name, type, PK/FK, the FK target, any note) and its **table** (name, one-line purpose, role badge, full column list) and the **datastore**;
- in the tour: the **scenario step** (the hop, the one-line description);
- otherwise: the nearest block's text.

So selecting `order_id` doesn't just send two words — it sends "FK column `order_id` (uuid) on table
`order_items`, references `orders.id`, in the Postgres store," and the model explains *that*.

## Requirements & privacy
- A **WebGPU** browser — **Chrome or Edge** (recent), or Chrome-based. The layer feature-detects WebGPU and shows a clear message if absent.
- Works over `file://` in Chrome (a secure context there). If a browser blocks the cross-origin model import over `file://`, serve the folder (`python3 -m http.server`) and open over `http://localhost`.
- **Privacy:** the model and all inference run in the browser. The only network traffic is the one-time weight download from the CDN; after that it's offline and nothing the reader selects leaves their machine. Say this plainly to users — it's the whole point.

## Notes / gotchas
- The system map's diagram is a `<canvas>`, so its nodes aren't selectable text — selection-explain works on the **DOM** text: the data-model ER tables/columns/explanations and the tour narration panel. (That's where "what is this table/row?" lives anyway.)
- Model output is inserted with `textContent`, never `innerHTML` — it can't inject markup into the page.
- Test the plumbing without the weights by setting `window.__cvExplainEngine = { generate(system,user,onToken){…} }` before the layer loads; it's used in place of WebLLM (see `test/system-map.spec.js`).
- All UI is namespaced `.cvx-*` so it can't collide with the generated page's own styles.
