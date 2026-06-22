---
name: codeviz-scenario
description: Turn a health/failure scenario the USER describes into a modeled HEALTH_SCENARIOS entry on a codeviz system map — computing the blast radius from the call graph and appending it as a switchable scenario. Use when someone wants to model a what-if ("what if the database goes down?", "model a payment-provider outage", "cache degraded at peak", "add a scenario where auth is slow", "/codeviz-scenario"). Modeled/hypothetical, not observed. For REAL status use /codeviz-health.
---

# codeviz-scenario — model your own health scenarios

Lets a user **model their own** health/failure scenarios in plain language and adds each as a switchable **`HEALTH_SCENARIOS`** entry on the generated `system-map.html`. The map's scenario picker is data-driven, so every scenario you add just shows up as a new chip in Health mode. These are **modeled (hypothetical)** — they keep the "modeled — not observed" badge. (For real status from Docker, use **/codeviz-health**.)

Modes (from `$ARGUMENTS`): **add** (default — describe a scenario) · **list** · **remove `<id>`** · **suggest** (auto-propose one what-if per critical system).

## 1 — Read the map
Open the target `system-map.html` (default `docs/onboarding/system-map.html`). Parse `var NODES`, `var EDGES` (each `['from','to','label','style',lat?]` = *from* **calls** *to*), and the existing `var HEALTH_SCENARIOS` (to avoid id clashes and for `list`/`remove`).

## 2 — Understand what the user is modeling
From their description identify **seed systems** and their failure mode:
- which node(s) the user says **fail/degrade** (match by id/label/sub — ask if ambiguous),
- the **state**: `down` (outage) or `degraded` (slow / erroring / overloaded),
- optional explicit metrics the user gives (`p99`, `err`) — use them verbatim.
If the user fully specifies states themselves, honor exactly what they said and skip the inference in step 3.

## 3 — Compute the blast radius from the call graph
Otherwise infer the cascade by propagating impairment **up the call edges** (a system is hurt when something it *calls* is hurt):
- Start from each seed node at its given state.
- For every edge `A → B` where **B is impaired**, the **caller `A`** is impacted:
  - sync (`solid`) dependency on a **down** node → `A` likely **down** (or **degraded** if it has an obvious fallback like a cache/retry); on a **degraded** node → `A` **degraded**.
  - async (`dash`) dependency (event/queue/webhook) → usually **degraded** at most, often still **up** (fire-and-forget tolerates it) — say which and why.
  - bulk (`thick`) → **degraded**.
- Recurse upward, **damping one level each hop** (down → degraded → up): real systems have timeouts, retries, circuit breakers and caches that blunt cascades.
- For each affected node write a one-line `note` naming the path, e.g. `degraded — calls Postgres (down) via sync SQL`.

**This is a hypothesis from static structure** — it cannot see retries/breakers/caches/timeouts. Keep `source:'modeled'` and say so.

## 4 — Append the scenario to the map
Add an entry to the `HEALTH_SCENARIOS` array (unique kebab-case `id`, short human `label`):

```js
{ id:'db-outage', label:'Database outage', source:'modeled', base:'up', states:{
    db:{ state:'down', note:'modeled outage (seed)' },
    rest:{ state:'down', p99:null, err:1, note:'down — sync SQL to Postgres (down)' },
    auth:{ state:'degraded', note:'degraded — session writes to Postgres' },
    storage:{ state:'degraded', note:'degraded — metadata writes to Postgres' }
} }
```

`base:'up'` keeps every other system healthy; `states` carry the seed + cascade. Only invent `p99`/`err` if the user gave them or they're clearly directional (e.g. an outage → `err:1`); otherwise omit. Edit the file in place; don't disturb other scenarios. (`remove` deletes the named entry; `list` prints id · label · source · #affected.)

## 5 — `suggest` mode
Propose one scenario per **critical** system (high in-degree, or a datastore/gateway/3rd-party). For each, run steps 3–4 to model `<system> down`. Show the user the list and add the ones they pick — don't dump all of them silently.

## 6 — Report
Tell the user: the new scenario's `id`/`label`, the modeled blast radius (`down: … · degraded: …`), and how it's reasoned. Remind them it's **modeled** and how to view it: open `system-map.html` → **Health** → pick the new chip. Re-run to add more.

## Guardrails
- Modeled, not observed — always `source:'modeled'`; never imply these are live.
- The cascade is **inferred from the call graph**, not a behaviour simulation — state that retries/circuit-breakers/caches/timeouts are not modeled.
- Don't fabricate precise metrics; prefer a `note` over a made-up number.
- Keep ids unique; never overwrite or reorder the user's other scenarios.
