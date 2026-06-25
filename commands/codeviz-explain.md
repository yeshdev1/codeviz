---
description: Add an opt-in, on-device select-to-explain layer to a generated codeviz onboarding (local LLM in the browser; explains whatever the reader selects, inline)
---

Run the **codeviz-explain** skill on `$ARGUMENTS` (an output dir; default `docs/onboarding`).

Inject the **select-to-explain** layer into the generated pages so the reader can download a local LLM
into their browser and then select any text — a table, a column, a tour step — for a context-aware
explanation right at the selection (no server, offline after the one-time model download).

```
node <skill>/assets/inject-explain.js <output-dir>
```

Requires a generated map (run **/codeviz** first). The reader opts in via an in-page prompt; the model
(WebLLM · Llama-3.2-3B on WebGPU) runs entirely in their browser. Needs a WebGPU browser (Chrome/Edge).
Tell the user the layer is injected and that nothing leaves the device after the one-time weight download.
