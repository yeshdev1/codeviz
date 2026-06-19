# codeviz — Ecosystem & Enhancement Roadmap

A curated, opinionated map of the open-source projects, standards, and tools that would take codeviz
from a hand-tuned skill to an **industry-standard, contributor-friendly engine** that can sift through
*extremely complex* codebases and produce visually rich, hard-to-replicate, interactive architecture
diagrams.

Each entry says **what it is**, **why it matters for codeviz specifically**, and where it slots into the
delivery order you care about:

> **(A) get the interactive HTML/integration right → (B) finalize the `.md` spec/skill → (C) then add a build pipeline.**

Legend for the gap each item closes:
`🧠 comprehension` (parse big codebases) · `🎨 render` (visuals) · `📐 layout` (auto-placement) ·
`🤖 agents` (new prompt modes / red-team) · `✅ quality` (tests/CI) · `📦 DX` (contributor infra) ·
`📚 standard` (architecture conventions).

> **Links & versions verified 2026-06-19** via a live web pass over every project. Archived/renamed/deprecated
> projects are flagged inline with **⛔**; canonical-link or version corrections with **↻**. Version numbers
> are point-in-time and drift — treat them as "current as of mid-2026," not pinned requirements.

---

## 0. The core problem to solve first

Today the LLM *manually* lists nodes/edges and hand-places them on an 880×510 grid. That is what makes
the output beautiful — and what stops it scaling to a 2M-line monorepo or staying honest under churn.
The single highest-leverage architectural change is a **two-stage pipeline**:

1. **Mechanical extraction** — a tool walks the repo and emits a *candidate* graph (systems, calls, data
   model, routes) grounded in real `file:line` facts. Deterministic, fast, exhaustive.
2. **LLM curation** — Claude prunes, names, groups by tier, picks the 1–3 critical flows, and writes the
   "claim + one-line why" prose. The model does judgment, not enumeration.

Almost every "🧠 comprehension" and "📐 layout" tool below exists to power stage 1 so the model stops
guessing and the diagram stays true on huge codebases. This is the thing that makes it "not easy to replicate."

---

## A. Get the interactive HTML right (do this first)

### A1. Graph rendering engines — beyond hand-placed canvas `🎨`
The current canvas is gorgeous but caps out around a few dozen hand-placed nodes. To survive complex repos:

| Project | Why for codeviz |
|---|---|
| **[Cytoscape.js](https://github.com/cytoscape/cytoscape.js)** | Purpose-built graph viz: nodes/edges/compound (nested) nodes, built-in layouts, events, styling. The most natural upgrade path for the system map — keeps interactivity, gains scale. |
| **[Sigma.js](https://github.com/jacomyal/sigma.js)** + **[graphology](https://github.com/graphology/graphology)** | WebGL graph rendering for **thousands** of nodes at 60fps. graphology is the in-memory graph model + algorithms (centrality, communities) you'd use to auto-cluster a monorepo into tiers. **↻ pin Sigma v3 (3.0.3) — v4 is still alpha.** graphology 0.26. |
| **[Pixi.js](https://github.com/pixijs/pixijs)** | WebGL 2D renderer if you outgrow `<canvas>` 2D for the comet/tracer animations on large graphs. |
| **[React Flow / xyflow](https://github.com/xyflow/xyflow)** | Best-in-class node-based UI (pan/zoom/minimap/handles). Adopt only if you move to a build step; gives "drag to refine layout" for free. |
| **[D3.js](https://github.com/d3/d3)** | The substrate for bespoke, "not-easy-to-replicate" visuals (force layouts, arc diagrams, custom transitions). Pair with the canvas you already have. **↻ maintenance mode** (no release since v7.9.0, Mar 2024); for standard charts prefer **Observable Plot**, keep D3 for bespoke work. |
| **[three.js](https://github.com/mrdoob/three.js)** | Optional "wow" tier — a 3D/2.5D system map for marketing demos. Use sparingly; it can hurt legibility. |

> **Recommendation:** keep the vanilla-canvas template as the *default* (zero-build, file:// friendly), and
> add a **Cytoscape.js + graphology** renderer as the "thorough / large-repo" mode behind the same skill.

### A2. Auto-layout — kill the manual `x,y` grid `📐`
Hand-placing nodes is the #1 thing that won't scale and the #1 source of overlap bugs.

| Project | Why |
|---|---|
| **[elkjs](https://github.com/kieler/elkjs)** (Eclipse Layout Kernel) | Industry-standard layered/hierarchical layout — *exactly* the "tiers top→bottom" model codeviz uses. Feed it nodes+edges, get clean coordinates. This is the one to adopt. |
| **[dagre](https://github.com/dagrejs/dagre)** / **[dagre-d3](https://github.com/dagrejs/dagre-d3)** | Simpler DAG layout; good fallback / lighter weight than ELK. **↻ only the `@dagrejs` packages are maintained** (original `cpettitt/*` abandoned); the `dagre-d3` *renderer* is stale (last release 2017) — use dagre for layout + your own renderer, or prefer elkjs. |
| **[cola.js (WebCola)](https://github.com/tgdwyer/WebCola)** | Constraint-based layout — pin tiers to rows, keep related systems together, avoid overlaps as a hard constraint. |
| **[Graphviz](https://graphviz.org/)** / **[viz-js](https://github.com/mdaines/viz-js)** (WASM) | The classic. `dot` produces excellent layered layouts; viz-js runs it in the browser/node with no native dep. **↻ Graphviz canonical source is GitLab** (`gitlab.com/graphviz/graphviz`); use the `@viz-js/viz` package (the legacy pre-v3 `viz.js` is superseded). |

### A3. Animation & polish — the "comet" and transitions `🎨`
| Project | Why |
|---|---|
| **[GSAP](https://github.com/greensock/GSAP)** | Production-grade timeline animation for the request-tracer walkthrough (hop sequencing, easing, pause/resume). **↻ now 100% free** (incl. SplitText/MorphSVG/ScrollTrigger) after the Webflow acquisition — drop any "paid plugin" framing. |
| **[anime.js](https://github.com/juliangarnier/anime)** | Lightweight, MIT — good middle ground for the comet/edge-highlight animations without a heavy dep. |
| **[Lenis](https://github.com/darkroomengineering/lenis)** | Smooth-scroll for the long schema/API pages to feel premium. |

### A4. Self-contained output — remove the CDN dependency `🎨 ✅`
The README admits the page needs to be online for the Lucide icon CDN. For an offline-friendly artifact:

| Project | Why |
|---|---|
| **[Lucide](https://github.com/lucide-icons/lucide)** | Bundle the *used* icons as inline SVG (tree-shaken) instead of `unpkg`. Makes `file://` work offline — a real polish/credibility win. |
| **[Iconify](https://github.com/iconify/iconify)** | If you want a vastly larger icon set with on-demand offline bundling. |

---

## B. Sift through extremely complex codebases (powers stage-1 extraction) `🧠`

These are the engine room. They let the skill *find* the real systems/calls/schema/routes mechanically so
the LLM only curates. **Multi-language** support is the priority for "no edge cases remain."

### B1. Universal, multi-language parsing
| Project | Why for codeviz |
|---|---|
| **[tree-sitter](https://github.com/tree-sitter/tree-sitter)** + grammars | The cornerstone. Fast, incremental parsers for 100+ languages with a uniform query API. Extract imports, route definitions, DB calls, SDK inits across *any* stack. This is what makes "extremely complex codebases" tractable. |
| **[ast-grep](https://github.com/ast-grep/ast-grep)** | tree-sitter-powered structural search by pattern. Perfect for "find every `fetch`/`axios`/router-mount/`stripe.()`/queue `.add()`" — i.e. the exact edge-detection grep the skill does today, but AST-accurate and language-agnostic. |
| **[Semgrep](https://github.com/semgrep/semgrep)** | Rule-based, cross-language pattern extraction with a huge rule registry. Author rules per framework to pull edges/routes reliably. |
| **[Comby](https://github.com/comby-tools/comby)** | Lightweight structural matching when a full grammar is overkill. **↻ low-activity** (last release Jun 2022) — prefer ast-grep/tree-sitter for AST-aware search. |

### B2. Whole-repo code intelligence (cross-file relationships)
| Project | Why |
|---|---|
| **[SCIP](https://github.com/sourcegraph/scip)** + **[scip-* indexers](https://github.com/sourcegraph)** | Sourcegraph's Code Intelligence Protocol: precise cross-repo defs/refs. Build a real call graph (who-calls-whom across files) instead of grep heuristics. |
| **[LSIF](https://github.com/sourcegraph/scip-typescript)** | **⛔ deprecated.** The `lsif-node`/LSIF family is archived (2022) and its authors point to **SCIP** (`scip-typescript`, `scip-go`, …); Sourcegraph dropped LSIF read support in v4.6. Use SCIP — link points there now. |
| **[Stack Graphs](https://github.com/github/stack-graphs)** | **⛔ archived by GitHub (2025-09-09), read-only** ("we recommend you fork it"). Not a safe dependency; treat as historical / fork-only. |
| **[multilspy](https://github.com/microsoft/multilspy)** / **[Language Server Protocol](https://github.com/microsoft/language-server-protocol)** | Drive real language servers programmatically to get types, defs, references. The most accurate "what does this call touch" signal. |
| **[Glean](https://github.com/facebookincubator/Glean)** | Meta's code-indexing system for very large codebases — reference architecture for scale. |

### B3. Dependency / call graphs per ecosystem (pragmatic, ready today)
| Stack | Project | Use |
|---|---|---|
| JS/TS | **[dependency-cruiser](https://github.com/sverweij/dependency-cruiser)**, **[madge](https://github.com/pahen/madge)** | Module dep graphs + cycles → seed nodes/edges. **↻ madge is low-activity** (no release since v8.0.0, Aug 2024); **Skott** + dependency-cruiser are livelier alternatives. |
| JS/TS | **[Nx graph](https://github.com/nrwl/nx)**, **[Turborepo](https://github.com/vercel/turborepo)** | Monorepo project graph — natural tier/cluster boundaries. |
| Python | **[pydeps](https://github.com/thebjorn/pydeps)**, **[import-linter](https://github.com/seddonym/import-linter)**, **[code2flow](https://github.com/scottrogowski/code2flow)** | Import graphs + call graphs. **↻ code2flow is dormant** (no commits/releases since Jan 2023). |
| Go | **[go-callvis](https://github.com/ondrajz/go-callvis)**, `go mod graph`, **[goda](https://github.com/loov/goda)** | Package + call visualization. **↻ go-callvis canonical repo is `ondrajz/go-callvis`** (moved from TrueFurby). |
| Java/JVM | `jdeps` (bundled JDK tool, not a repo — see JDK docs), **[Dependency-Track](https://github.com/DependencyTrack/dependency-track)** | Class/module dependencies. |
| Rust | `cargo-modules`, `cargo tree` | Module + crate graphs. |
| Any | **[CodeQL](https://github.com/github/codeql)** | Deep semantic queries (data flow, call paths) when you need ground truth. |

### B4. Schema & API extraction (powers `schema.html` / `api.html`)
| Project | Why |
|---|---|
| **[Atlas](https://github.com/ariga/atlas)** / **[SchemaSpy](https://github.com/schemaspy/schemaspy)** | Introspect live DBs / DDL into a schema model + ER data — feeds the data-model page honestly. |
| **[Prisma](https://github.com/prisma/prisma)** DMMF, **[SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy)** metadata, **[Drizzle](https://github.com/drizzle-team/drizzle-orm)** | Read ORM schemas directly instead of regexing migrations. **↻ Prisma DMMF is an internal, *unstable* API** (`Prisma.dmmf` / `@prisma/get-dmmf`), not a first-class dependency — pin Prisma and expect breakage. |
| **[OpenAPI](https://github.com/OAI/OpenAPI-Specification)** + **[Redocly CLI](https://github.com/Redocly/redocly-cli)** / **[Swagger Parser](https://github.com/APIDevTools/swagger-parser)** | If a spec exists, parse it for the API page; if not, generate one from routes. **↻ OpenAPI is at 3.2.0** (not 3.1.0); use `spec.openapis.org`, not swagger.io. Swagger Parser (v12) is distinct from the deprecated `swagger-cli`. |
| **[protobuf](https://github.com/protocolbuffers/protobuf)** + **[gRPC](https://github.com/grpc/grpc)**, **[AsyncAPI](https://github.com/asyncapi/spec)** | Cover RPC and event-driven systems — the "dashed async edges" deserve first-class extraction. **↻ protobuf and gRPC are two separate projects** — link both. |

---

## C. Architecture standards — so the output is *credible*, not just pretty `📚`

Aligning codeviz with recognized models is what makes engineers trust and adopt it.

| Project / Standard | Why |
|---|---|
| **[C4 model](https://c4model.com/)** + **[Structurizr](https://structurizr.com/)** | The de-facto standard for system/container/component diagrams. Map codeviz's "tiers" to C4 levels; optionally emit a Structurizr DSL alongside the HTML so teams can diff architecture as code. **↻ the old `structurizr/cli`·`/lite`·`/java` repos were archived 2026-02-04** — migrate to **Structurizr vNext** (the DSL itself stays actively maintained). |
| **[Backstage](https://github.com/backstage/backstage)** (+ TechDocs, software catalog) | Spotify's developer-portal standard. Emitting a `catalog-info.yaml` / system model lets codeviz output drop straight into a company's existing portal. Huge adoption lever. |
| **[mingrammer/diagrams](https://github.com/mingrammer/diagrams)** | "Diagram as code" with cloud-provider icon sets — reference for the visual vocabulary of infra diagrams. |
| **[Mermaid](https://github.com/mermaid-js/mermaid)** | Ubiquitous in READMEs/GitHub. Offer a Mermaid export so the system map embeds anywhere, even where JS is disabled. |
| **[PlantUML](https://github.com/plantuml/plantuml)** | Same idea for shops standardized on it. |
| **[arc42](https://arc42.org/)** | Documentation structure to model the `.md` deliverable on. |
| **ADR / [adr-tools](https://github.com/npryce/adr-tools)** | The `⚠ Noticed while reading` list and "why this system exists" prose map naturally to architecture decision records. **↻ npryce/adr-tools is unmaintained** (last release 2018) — prefer **log4brains**, **adr-manager**, or the lightweight `adr.github.io` markdown convention. |

---

## D. New prompt modes — generate & red-team (not just discovery) `🤖`

You called this out: the skill must also handle *"build me this and red-team it with a bunch of haiku
agents."* That means codeviz grows from a **describe-what-exists** tool into a **design + adversarially-stress**
tool. The orchestration substrate:

| Project | Why |
|---|---|
| **[Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python)** ([TS](https://github.com/anthropics/claude-agent-sdk-typescript)) | The supported way to spawn fan-out worker agents (e.g. a fleet of Haiku critics) programmatically with tools. |
| **Claude Code subagents / Workflow** | Already in this harness: a workflow can fan out N Haiku "red-team" agents over the proposed design, each attacking a dimension (single points of failure, scaling cliffs, security, data-loss, cost), then synthesize. Use `claude-haiku-4-5` for the cheap-and-many critics, `claude-opus-4-8` to synthesize. |
| **[promptfoo](https://github.com/promptfoo/promptfoo)** | Eval + LLM red-teaming harness. Wrap generated designs/docs in test suites so contributions don't regress quality. |
| **[Inspect](https://github.com/UKGovernmentBEIS/inspect_ai)** (UK AISI) | Rigorous eval framework if you want graded, reproducible benchmarks for "is this diagram correct/complete." **↻ repo is `UKGovernmentBEIS/inspect_ai`.** |
| **[garak](https://github.com/NVIDIA/garak)** | LLM vulnerability/red-team scanner — reference patterns for the "attack the design" loop. |
| **[LangGraph](https://github.com/langchain-ai/langgraph)** / **[AutoGen](https://github.com/microsoft/autogen)** / **[CrewAI](https://github.com/crewAIInc/crewAI)** | Multi-agent topologies if you ever orchestrate outside Claude Code. (Within Claude Code, prefer the native Workflow/Agent tools.) **↻ AutoGen is in maintenance mode** — Microsoft now points new projects to the **Agent Framework** (`microsoft/agent-framework`, converges AutoGen + Semantic Kernel). |

**Suggested mode taxonomy for the skill** (so prompts route cleanly and *no edge case remains*):
- `discover` — current behavior: document what exists.
- `design` — propose a system from a spec; output the same interactive map marked `planned`/`partial`.
- `red-team` — fan out Haiku critics against an existing or proposed design; surface failure modes into a
  scored "Resilience" panel on the hub (reuse the `⚠ Noticed while reading` UI pattern).
- `evolve` — diff two points in git history and animate how the architecture changed.
- `verify` — re-run extraction and flag where the doc has drifted from the code (anti-staleness).

---

## E. Quality gates — validate the generated artifact `✅`

The skill does `node --check` today. Industry-standard means proving the *interactive* output actually works.

| Project | Why |
|---|---|
| **[Playwright](https://github.com/microsoft/playwright)** | Headless-render each generated page, click boxes, run a scenario, assert the comet animates and modals open. The real "does the HTML work" test. Also screenshots for visual regression. |
| **[jsdom](https://github.com/jsdom/jsdom)** / **[happy-dom](https://github.com/capricorn86/happy-dom)** | Lightweight DOM to unit-test the inline tracer/canvas JS without a browser. |
| **[acorn](https://github.com/acornjs/acorn)** / **[Espree](https://github.com/eslint/js/tree/main/packages/espree)** | Parse the inline `<script>` blocks programmatically (stronger than `node --check`) and assert the required IDs (`archCanvas`, `scenSeg`, …) exist before delivery. **↻ Espree now lives in the `eslint/js` monorepo.** |
| **[axe-core](https://github.com/dequelabs/axe-core)** / **[pa11y](https://github.com/pa11y/pa11y)** | Accessibility audits — the template already uses ARIA; keep it honest. |
| **[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)** | Performance/best-practices budget on the output. **↻ distinct from Lighthouse core and lags it** (LHCI bundles LH 12.x; core is 13.x). **Unlighthouse** is a faster site-wide alternative. |
| **[html-validate](https://gitlab.com/html-validate/html-validate)** + **[W3C Nu](https://github.com/validator/validator)** | Validate markup of every emitted page. **↻ html-validate canonical repo is on GitLab** (GitHub is a read-only mirror). |
| **[Vitest](https://github.com/vitest-dev/vitest)** / **[Jest](https://github.com/jestjs/jest)** | Test runner for any extraction/transform code you add. **↻ Jest is `jestjs/jest`** (now under the OpenJS Foundation, not Meta). |

---

## F. Contributor & repo infrastructure — "industry standard" DX `📦`

What an outside contributor expects to find. Most of these are missing today.

| Project | Why |
|---|---|
| **[Biome](https://github.com/biomejs/biome)** *(or [ESLint](https://github.com/eslint/eslint) + [Prettier](https://github.com/prettier/prettier))* | Lint + format the JS/CSS assets and any tooling. Biome = one fast tool, minimal config. |
| **[Husky](https://github.com/typicode/husky)** + **[lint-staged](https://github.com/lint-staged/lint-staged)** + **[commitlint](https://github.com/conventional-changelog/commitlint)** | Pre-commit hooks + Conventional Commits → clean history, automatable releases. |
| **[Changesets](https://github.com/changesets/changesets)** *(or [semantic-release](https://github.com/semantic-release/semantic-release))* | Version the plugin properly (the `plugin.json` is at `0.1.0` with placeholder author — fix that too). |
| **[GitHub Actions](https://github.com/features/actions)** | CI: run the quality gates in §E on every PR, render the demo, publish to Pages. |
| **[Renovate](https://github.com/renovatebot/renovate)** / **Dependabot** | Keep deps current once you have any. |
| **[EditorConfig](https://editorconfig.org/)**, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, `.github/` | Table stakes for outside contributions. **↻ EditorConfig spec lives at `editorconfig/specification`** (the old `editorconfig/editorconfig` repo is just a tracker). |
| **[Vite](https://github.com/vitejs/vite)** / **[esbuild](https://github.com/evanw/esbuild)** | *Only if/when* you add a build step (bundling icons, the Cytoscape renderer). Keep the zero-build default path alongside it. **↻ Vite 8 now defaults to the Rust Rolldown bundler** (replacing Rollup); **esbuild is in deliberate feature-freeze** by its solo maintainer (no HMR/type-checking planned) — solid as a stable transform/bundle lib, don't expect new high-level features. |
| **[Astro](https://github.com/withastro/astro)** / **[Starlight](https://github.com/withastro/starlight)** | If the project's own docs site grows beyond the README. |

---

## G. Reference projects to learn from (prior art) `📚 🎨`

Study these for ideas and to articulate *why codeviz is different* (interactive, request-tracing,
grounded-in-source, LLM-curated):

| Project | What to borrow |
|---|---|
| **CodeSee** (codebase maps) | Auto-generated codebase maps — UX patterns for navigating large systems. **⛔ defunct as a standalone product** — CodeSee Inc. wound down in 2024 and was folded into **GitKraken** DevEx; study it as a concept only. |
| **[Sourcetrail](https://github.com/CoatiSoftware/Sourcetrail)** (archived) | Interactive source explorer — the gold standard for symbol-level navigation; mine its UX. |
| **[Gource](https://github.com/acaudwell/Gource)** | Animated repo-history visualization — inspiration for the `evolve` mode. |
| **[Excalidraw](https://github.com/excalidraw/excalidraw)** / **[tldraw](https://github.com/tldraw/tldraw)** | Hand-drawn / infinite-canvas aesthetics and editing UX if you ever let users *edit* the generated map. |
| **[Carbon Design](https://github.com/carbon-design-system/carbon)**, **[Radix](https://github.com/radix-ui/primitives)** | Component-library rigor to evolve `harness.css` toward a real design system (tokens, a11y). |
| **[Observable Framework](https://github.com/observablehq/framework)** | Data-driven, self-contained interactive pages — kindred spirit to your output model. |
| **[Mermaid](https://github.com/mermaid-js/mermaid)** / **[Structurizr](https://structurizr.com/)** | Already listed — also the benchmark to beat on legibility. |

---

## Suggested adoption order (matches your HTML → md → build sequencing)

**Phase 1 — make the interactive artifact bulletproof & scalable (HTML/integration first)**
1. Adopt **ELK (elkjs)** for auto-layout — removes manual `x,y`, fixes overlap, scales node count.
2. Bundle **Lucide** icons inline — offline `file://` works.
3. Add a **Cytoscape.js + graphology** "large-repo" renderer behind the existing template as a second mode.
4. Stand up **Playwright** smoke tests that render + click every generated page.

**Phase 2 — make extraction mechanical, then finalize the `.md` spec/skill**
5. Add a **tree-sitter / ast-grep** extraction stage (stage 1) feeding candidate nodes/edges to the LLM.
6. Add **schema** (Atlas/ORM introspection) and **API** (OpenAPI/route) extractors.
7. Rewrite `SKILL.md` around the **two-stage pipeline** and the **mode taxonomy** (`discover` / `design` /
   `red-team` / `evolve` / `verify`), with the **Claude Agent SDK / Workflow** fan-out for red-teaming.
8. Align prose/structure with **C4** + optionally emit **Mermaid** and **Structurizr DSL** exports.

**Phase 3 — only then, build/release infra**
9. **Biome + Husky + commitlint + Changesets + GitHub Actions** CI running the §E gates.
10. Add `CONTRIBUTING.md`, templates, fix `plugin.json`/`marketplace.json` placeholders, publish the demo to Pages.
11. Introduce **Vite/esbuild** *only* for the bundled-renderer mode; keep zero-build as the default.

---

### One-line rationale per gap
- **Scales to complex repos** → tree-sitter, ast-grep, SCIP, dependency-cruiser, graphology, Sigma.js.
- **Stays visually rich & hard to replicate** → Cytoscape.js + ELK + GSAP on top of the bespoke canvas.
- **Earns engineer trust** → C4/Structurizr/Backstage/Mermaid alignment + Playwright-proven interactivity.
- **Handles new prompt modes** → Claude Agent SDK + Workflow fan-out (Haiku critics) + promptfoo evals.
- **Ready for contributors** → Biome, Husky, commitlint, Changesets, Actions, Playwright, CONTRIBUTING.
