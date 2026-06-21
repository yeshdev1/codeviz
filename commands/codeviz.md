---
description: Generate interactive system-design onboarding for this codebase — scoped & token-estimated (system map · steps · schema · api · theme · full)
---

Run the **codeviz** skill on $ARGUMENTS.

`$ARGUMENTS` may start with a **scope** so the user only pays for what they need:
`map` · `steps` · `schema` · `api` · `theme` · `full` (anything after the scope is the target path; default: current repo).

- **No scope** → do the skill's **Scope & estimate** step first: size-scan the repo, show a per-scope token estimate, and let the user pick which to run and drop the rest. Do **not** silently generate everything.
- **A scope given** → run only that (e.g. `/codeviz map` = just the interactive diagram; `/codeviz full` = everything).

Then follow the mechanism — **Plan → Generate → Debug (interpret) → Deliver** — building the system-to-system map first. Output to `docs/onboarding/`. "Debug" means *interpret* the code to explain what it does — not audit correctness; flag any real bug to a `⚠ Noticed while reading` list and move on.

To go deeper into a specific step afterward, use **/dig-codeviz** (one code level per call, caps at 5).
