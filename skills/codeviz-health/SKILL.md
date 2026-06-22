---
name: codeviz-health
description: Snapshot REAL local health (Docker container state, uptime, restarts, healthchecks) and write it into a generated codeviz system map as an "observed" health scenario the reader can toggle to. Use after a codeviz map exists and the stack is running locally ("show real health", "check what's up/down", "/codeviz-health"). It is a point-in-time snapshot, not continuous monitoring.
---

# codeviz-health — real health into the map

The codeviz Health overlay ships only **illustrative** scenarios (badged "modeled — not observed"). This skill reads the **actual local environment** and adds an **observed** health scenario to the generated `system-map.html`, so the same diagram shows what's really up, degraded, or down right now.

It is a **point-in-time snapshot** taken when you run it — not a live stream. Re-run to refresh. Be honest about that.

## 1 — Find the map and its node ids
Locate the generated `system-map.html` (default `docs/onboarding/system-map.html`). Read its `var NODES = {…}` to get the node ids and the compose/service names each node cites (in its `about`/notes, e.g. `auth:9999`, `rest:3000`).

## 2 — Gather real health (Docker first; fall back gracefully)
Prefer Docker Compose if a `docker-compose.y*ml` is present; else plain Docker. Run read-only commands:

- `docker compose ps --format json` (or `docker ps --format '{{json .}}'`) — names, state, status, health.
- `docker inspect <id> --format '{{json .State}} {{.RestartCount}}'` per container — `State.Status` (running/exited/restarting/dead), `State.Health.Status` (healthy/unhealthy/starting), `RestartCount`, `StartedAt` (→ uptime).
- Optional extra signals (use if present, never block on them): a compose `healthcheck`, a `/healthz`/`/readyz` endpoint reachable on a mapped port (`curl -sS -m2`), `docker stats --no-stream` for CPU/mem pressure.

If Docker isn't available/running, say so and offer the alternatives (k8s `kubectl get pods`, a `health.json` the user provides, or systemd/`pm2`) — don't fabricate.

## 3 — Map containers → nodes, derive state
Match each container/compose-service to a node id by the service name appearing in the node id/label/sub/about (e.g. compose service `auth` → node `auth`). For each matched node derive:

- **state**: `running` + healthy (or no healthcheck) → `up`; `running` + unhealthy **or** `RestartCount` high (≳3) → `degraded`; `exited`/`restarting`/`dead`/missing → `down`.
- **p99 / err**: only if you have a real source (healthcheck latency, an endpoint, metrics). **Omit if unknown — never invent numbers.**
- **note**: short real fact — uptime, restart count, exit code, or "no healthcheck".

A node with no matching container is left out of the snapshot (it shows healthy by default) — flag those so the reader knows they're unverified.

## 4 — Write the observed scenario into the map
Insert (or replace an existing `id:'live'`) entry at the **front** of the `HEALTH_SCENARIOS` array in `system-map.html`:

```js
{ id:'live', label:'Live · <ISO-8601 time>', source:'observed', at:'<ISO-8601 time>', base:'up', states:{
    auth:{ state:'up', note:'up 3h12m' },
    rest:{ state:'degraded', note:'2 restarts in 10m' },
    smtp:{ state:'down', note:'exited (137)' }
} }
```

`source:'observed'` makes the map drop the "modeled" badge for this scenario and show **"● Observed. Live snapshot · <time> from Docker — point-in-time, not continuous."** `base:'up'` means every other node shows healthy; only the matched ones carry real state.

## 5 — Report
Tell the user: the snapshot time, the counts (`N up · M degraded · K down`), the down/degraded names with their real reason, and any nodes that had **no container to check** (unverified). Remind them to open `system-map.html`, switch to **Health**, and pick the **Live** scenario — and to re-run for a fresh snapshot.

## Guardrails
- Read-only Docker commands only; never start/stop/kill containers.
- **Never fabricate metrics.** Omit p99/err you can't observe; state must come from real container status.
- It's a **snapshot, not monitoring** — always label it with the capture time and say so.
- If nothing is running, report that honestly (everything "down"/unverified is itself useful signal) rather than inventing health.
