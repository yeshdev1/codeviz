---
description: Model the data layer — read the real schema and make each datastore node drillable into its ER diagram + joins/retrieval
---

Run the **codeviz-datamodel** skill on $ARGUMENTS (default: `docs/onboarding/system-map.html`; may name specific datastores and a granularity — `overview` · `standard` · `full`).

Read the **real** schema (SQL / migrations / ORM models / NoSQL samples), then write a `DATAMODEL` block into the map keyed by datastore node id. After that, clicking a datastore in the map opens its **ER diagram** — tables, PK/FK badges, types, and foreign-key **connectors** — plus a **Joins & retrieval** tab showing how the data is actually queried (join chains, the issuing service, illustrative SQL).

Granularity is a dial: default **standard**; use the skill's **meta-prompts** to go `overview` (entities + relationships only) or `full` (every column, constraint, index, per-service access). Grounded only — never invent tables or columns; mark unbuilt ones `planned`; it's modeled from the schema source, not a live DB introspection.
