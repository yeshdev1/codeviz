---
name: dig-codeviz
description: Dig one level deeper into the real code behind a codeviz onboarding step — read the source and expand that step's explanation with file:line-grounded detail. Tracks how many times you've dug and HARD-STOPS after 5 to cap token spend. Use after a codeviz map exists, when a step/node needs a deeper, code-level explanation ("dig into X", "explain step 3 deeper", "/dig-codeviz").
---

# Dig deeper (codeviz)

Adds **one level** of deeper, code-grounded explanation to a codeviz onboarding step (a tour hop, an edge, or a node) by reading the actual source. It is **bounded**: a hard cap of **5 digs per onboarding** so a curious reader can't quietly burn a huge token budget. Each dig costs roughly **8–20k tokens** (scales with how much source it must read).

## 1 — Read the dig counter (state)
State lives next to the onboarding output, default `docs/onboarding/.codeviz-dig.json`:

```json
{ "digs": 0, "cap": 5, "log": [ { "n": 1, "target": "rest>db", "added": "RLS policy bodies + the connection-pool path" } ] }
```

- Read it. If it doesn't exist, treat `digs = 0` (create it on the first successful dig).
- **If `digs >= cap` (5): STOP. Do not dig.** Tell the user verbatim-ish:
  > "You've hit the 5-dig cap for this onboarding. Past this, you're better off reading the code directly — start with: `<the file:line list from the log>`. Further digs cost tokens for little marginal insight. Reset by deleting `docs/onboarding/.codeviz-dig.json` if you really need more."
  Then exit without reading more source.

## 2 — Dig exactly one level
- **Pick the target.** Use what the user named ("step 3", "the auth→db edge", "Postgres"); else the most recently discussed step; else ask which one.
- **Go one layer deeper than the current explanation** — read the REAL source behind that step (start from the `file:line` already cited on the node/edge/step) and surface the *next* layer only:
  - the actual function/handler body the hop runs,
  - the data shapes / SQL / query it builds,
  - error handling, retries, timeouts, transactions, auth checks it performs,
  - the next downstream call it makes (and where).
- **Write the new layer** into that step's `detail`/`replyDetail` in the generated `system-map.html` (or append a short "Deeper" note), grounded in `file:line`. Add only the *new* layer — never repeat what's already shown.
- Keep it tight: a few sentences + the citations. This is depth, not a rewrite.

## 3 — Update the counter and report
- Increment `digs`, append `{ n, target, added }` to `log`, write the state file.
- Tell the user: **"Dig N/5 on `<target>` — <one line of what got deeper>. <5−N> digs left."**
- At **N = 5**: deliver the explanation, then add: **"That was the last dig (5/5) — stopping here to save tokens. Read the cited files for more."**

## Guardrails
- **One level per invocation.** Don't pre-spend the budget by digging 5 times at once.
- **Every dig must add new, code-grounded detail with `file:line`** — no paraphrasing what's already there. If you can't find the source, say so and **do not** increment the counter (a failed dig isn't a dig).
- Never fabricate behaviour. "Debug" here means *interpret* the code, not audit it — if you spot a real bug, flag it briefly and move on.
- The cap is per onboarding (per state file), not per session.
