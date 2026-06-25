# codeviz-explain — comprehensive documentation

An opt-in, **on-device** "select-to-explain" layer for a generated codeviz onboarding. The reader
downloads a small language model into their browser once; after that, selecting any text on the page
pops a context-aware explanation **right at the selection**. No server, no API key, no side panel.
Everything runs locally and stays on the reader's machine.

This document is the full reference. For the short operational version see [`SKILL.md`](SKILL.md).

---

## 1. What problem it solves

Reading an unfamiliar system map is a stream of small *"wait, what is this?"* questions: an unfamiliar
table, a foreign key, a term in a request trace. The usual answers (search, ask a teammate, open a
chatbot in another tab) all pull the reader out of the page. This layer puts the answer one selection
away, grounded in the exact thing they highlighted, without their architecture ever leaving the browser.

## 2. How it works (architecture)

The feature is three small assets, inlined into the generated HTML:

| file | role |
|---|---|
| `assets/explain.css` | all UI styling, namespaced `.cvx-*` so it can't collide with the page |
| `assets/explain.js` | the whole layer: engine loader, context extraction, tooltip, selection wiring |
| `assets/inject-explain.js` | a Node script that inlines the two above before `</body>` of each page |

At runtime the layer:

1. Renders a small **💡 Explain** pill and an **offer card** (the opt-in prompt).
2. On opt-in, dynamically imports **WebLLM** from a CDN and creates an engine for the chosen model, streaming download progress into the card. The weights are cached by the browser, so later visits load from disk.
3. Listens for the end of a text selection (`mouseup`). When the reader selects something, it gathers the **structured context** around the selection, builds a prompt, and **streams** the model's reply into a tooltip anchored at the selection.

There is no build step and no framework. The layer is plain ES5-compatible JS in a classic `<script>`.

## 3. The model

Default: **`Llama-3.2-3B-Instruct-q4f16_1-MLC`** — Meta's small instruct model, 4-bit quantized,
roughly **1.8 GB**, run on **WebGPU** via **[WebLLM / MLC](https://github.com/mlc-ai/web-llm)**.

Why this one: it is the sweet spot for this task. Big enough to give crisp, correct 2–4 sentence
explanations of schema and request-flow concepts; small enough to download once and run in a browser tab
on a typical laptop GPU.

Swap `MODEL_ID` at the top of `assets/explain.js` for any [WebLLM prebuilt model](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts):

| goal | model id | approx size |
|---|---|---|
| lighter / faster download | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | ~0.9 GB |
| lighter, strong quality | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | ~1.0 GB |
| **default (balanced)** | `Llama-3.2-3B-Instruct-q4f16_1-MLC` | ~1.8 GB |
| higher quality | `Qwen2.5-3B-Instruct-q4f16_1-MLC` | ~2.0 GB |
| higher quality | `Phi-3.5-mini-instruct-q4f16_1-MLC` | ~2.2 GB |

Also update `MODEL_LABEL` and `MODEL_SIZE` (used only in the UI copy) to match.

## 4. Installing / running

After a map exists, inline the layer into the output dir (idempotent — safe to re-run):

```
node skills/codeviz-explain/assets/inject-explain.js <output-dir>      # default: docs/onboarding
```

It targets `system-map.html`, `data-model.html`, `index.html`, `schema.html`, `api.html` (whichever
exist) and injects the layer once per page (it no-ops on pages that already have it).

Because the injector reads the layer from the asset files, the recommended pipeline when you change the
layer is: regenerate the base HTML (`render-pages.js` / `promote-atlas.js`), then re-inject. This is also
why injection is the **last** Deliver step.

It is exposed as `/codeviz-explain` and offered as the optional final step of `/codeviz`.

## 5. The reader experience

1. A **💡 Explain** pill sits bottom-left. Clicking it shows: *"Download a local AI model (~1.8 GB)… Enable / Not now."*
2. On **Enable**, the model downloads **while the page stays visible** — a progress bar in the card. The choice is remembered in `localStorage`, so a return visit loads straight from cache.
3. Once ready, **selecting any text** pops an **On-device explanation** bubble at the selection. It streams in token by token. Esc, a click away, a scroll, or a new selection dismisses it. Nothing opens on the side.

The pill's status dot reflects state: grey (idle), amber pulsing (loading), green (ready), red (error / no WebGPU).

## 6. Context extraction (the grounding)

This is what makes the explanation about *that exact thing* rather than the bare words. On each
selection the layer walks up the DOM from the selected node and assembles a context object:

- **In a data model** (`data-model.html`): the **column** (name, data type, whether it's a primary or foreign key, the FK target, any note) plus its **table** (name, one-line purpose, role badge such as *junction* / *hub*, and the full column list) plus the **datastore** it belongs to.
- **In the guided tour** (`#narr` on the map): the **scenario step** (the hop `from → to` and its one-line description).
- **Anywhere else**: the nearest block element's text (a paragraph, list item, cell), capped in length.

That object is serialized into the prompt under a `Context:` block alongside the selected text, and the
model is instructed (via the system prompt) to explain in 2–4 plain-English sentences, defining jargon
and inventing nothing beyond the context. Selected text is capped at 1000 characters so a stray *Select
All* can't balloon the prompt.

Example — selecting `order_id` on an FK row sends, in effect:

```
Selected text: "order_id"
Context:
- kind: column
- column: order_id
- dataType: uuid
- foreignKey: true
- references: orders.id
- table: order_items
- tableAbout: Line items — many per order.
- tableRole: junction
- tableColumns: id, order_id, product_id, qty, price_cents
- datastore: Database
```

## 7. Privacy & security

- **On-device.** The model and every inference run in the reader's browser. The **only** network traffic is the one-time weight download from the WebLLM/HuggingFace CDN. After that the page works offline and nothing the reader selects is ever sent anywhere. This is the central design choice — surface it to users.
- **No markup injection.** Model output is written with `textContent`, never `innerHTML`, so a response can never inject HTML/JS into the page. Context pulled from the DOM goes into the prompt as text, never re-rendered as markup. The one place progress text is set via `innerHTML` is HTML-escaped.
- **Namespaced.** All DOM and CSS is namespaced `.cvx-*`; the layer can't clobber the generated page's own ids/classes.

## 8. Requirements & compatibility

- **A WebGPU browser** — Chrome or Edge (recent), or any Chromium-based browser with WebGPU enabled. The layer feature-detects `navigator.gpu` and shows a clear message if it's missing.
- **Over `file://`** it works in Chrome (a secure context there, so WebGPU is available). If a browser blocks the cross-origin module import from a `file://` page, serve the folder (`python3 -m http.server`) and open it over `http://localhost`.
- **Hardware.** A 3B model needs roughly 2–3 GB of GPU memory; on a low-VRAM machine, switch `MODEL_ID` to a 1B/1.5B model.

## 9. Configuration reference

All knobs are at the top of `assets/explain.js`:

| constant | purpose |
|---|---|
| `MODEL_ID` | the WebLLM prebuilt to load |
| `MODEL_LABEL`, `MODEL_SIZE` | UI copy only (the offer card / progress) |
| `WEBLLM_URL` | the ESM entry point (`https://esm.run/@mlc-ai/web-llm` by default) |
| `SYS` | the system prompt that sets tone, length and the "don't invent" rule |
| `PREF` | the `localStorage` key for the reader's opt-in choice |

Inference tunables (`temperature: 0.4`, `max_tokens: 320`) are in the `generate()` call.

## 10. Testing

The engine is behind a seam: if `window.__cvExplainEngine = { generate(system, user, onToken) }` is set
before the layer initializes, it is used **instead of** WebLLM. That makes the entire pipeline
(selection → context extraction → prompt → tooltip) testable without downloading any weights. See the
two `select-to-explain` tests in `test/system-map.spec.js`, which drive it with a mock engine that echoes
the extracted context and assert the tooltip content, its position (a bubble, not a panel), and dismissal.

## 11. Limitations

- The system-map diagram is a `<canvas>`, so its nodes aren't selectable text. Select-to-explain works on the **DOM** text: the data-model ER tables/columns/explanations and the tour narration. (That's where "what is this table/row?" lives.)
- The first download is large and depends on the reader's connection; subsequent loads are cache-fast.
- Explanation quality is bounded by a small model. It's tuned for short, grounded explanations, not deep reasoning.

## 12. Troubleshooting

| symptom | fix |
|---|---|
| pill dot is red, "no WebGPU" | use Chrome/Edge, or enable WebGPU; check `chrome://gpu` |
| model import fails over `file://` | serve the folder and open over `http://localhost` |
| out-of-memory on load | switch `MODEL_ID` to a 1B/1.5B model |
| want to re-show the offer after dismissing | click the **💡 Explain** pill again |
| explanations feel thin | swap `MODEL_ID` to a 3B+ model, or raise `max_tokens` |
