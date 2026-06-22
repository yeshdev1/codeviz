---
description: Model your own what-if health scenario on the codeviz map (computes the blast radius and adds it as a switchable scenario)
---

Run the **codeviz-scenario** skill on $ARGUMENTS (a scenario description, e.g. "database outage" / "payment provider slow" / "cache down at peak"; or `list` / `remove <id>` / `suggest`).

Turn the user's description into a **modeled** `HEALTH_SCENARIOS` entry on `docs/onboarding/system-map.html`: identify the failing system(s), compute the blast radius up the call graph (callers of an impaired system are impacted, damped each hop), and append it so it shows as a new chip in **Health** mode. These are **hypothetical** (badged "modeled — not observed") — for real status use **/codeviz-health**. Don't fabricate metrics; keep ids unique; never disturb the user's other scenarios.
