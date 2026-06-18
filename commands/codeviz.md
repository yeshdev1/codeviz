---
description: Generate an interactive system-design onboarding harness for this codebase (system map → data model → deep API)
---

Run the **codeviz** skill on $ARGUMENTS (default: the current repository).

Follow its mechanism — **Plan → Generate → Debug (interpret) → Deliver** — in priority order:
1. the interactive system-to-system map (most effort, comes first),
2. the data model,
3. the API in depth (deepest, comes last).

Output the linked pages to `docs/onboarding/`. "Debug" means *interpret* the code to explain what it does — not audit correctness; if you spot a real bug while reading, flag it to a `⚠ Noticed while reading` list and move on.
