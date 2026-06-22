---
description: Snapshot real local health (Docker state/uptime/restarts/healthchecks) into the codeviz system map as an observed scenario
---

Run the **codeviz-health** skill on $ARGUMENTS (default: `docs/onboarding/system-map.html` + the local Docker stack).

Read the **real** local environment — `docker compose ps` / `docker inspect` for container state, health, uptime and restart counts — map each container to a system-map node, and write an **observed** health scenario (`id:'live'`, `source:'observed'`) into the map's `HEALTH_SCENARIOS`. Then the reader can switch to **Health → Live** and see what's actually up / degraded / down.

It's a **point-in-time snapshot, not continuous monitoring** — label it with the capture time and re-run to refresh. Read-only Docker only; never fabricate metrics; if nothing's running, say so.
