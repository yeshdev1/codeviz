---
name: codeviz-datamodel
description: Model the data layer of a codeviz system map — read the real schema and write a DATAMODEL block so clicking a datastore node opens its ER diagram (tables, keys, foreign-key connectors) and a "Joins & retrieval" view of how the data is actually queried. Use after a map exists ("model the database", "add the ER diagram", "show the schema / joins", "/codeviz-datamodel"). Granularity is a dial — see the meta-prompts below.
---

# codeviz-datamodel — the data layer, drillable

The atlas already shows the **systems**. This skill adds the **data** behind the datastores: read the
real schema and write a `DATAMODEL` block into the generated `system-map.html`. After that, clicking a
datastore node (Postgres, the cache, an object store…) opens a drill-in panel with:

- **Schema** — one card per table/entity with its columns, **PK**/**FK** badges, types, and nullability;
  foreign keys are drawn as **connectors** to the table they reference, so the joins are visible.
- **Joins & retrieval** — the notable read paths: each shows its **join chain** (`a ⋈ b ⋈ c`), which
  service issues it, a one-line explanation, and illustrative SQL.

It's keyed by node id: `DATAMODEL['db'] = {…}` makes the `db` node drillable. A node with no entry just
focuses as before. The map stays self-contained — no framework, no live DB connection.

## 1 — Find the map and its datastore nodes
Locate the generated map (default `docs/onboarding/system-map.html`). Read its `var NODES = {…}` and pick
the ids that are **datastores** — relational DBs, caches, search indexes, object stores, queues with state.
(They sit in the lower layers and their `about`/`sub` say so.) Those ids become the keys of `DATAMODEL`.

## 2 — Pick the granularity (the dial)
Decide how deep to model **before** reading the schema — it sets how much you extract and how many tokens
it costs. Default to **standard**. Use a meta-prompt from the next section verbatim (or let the user pick).

| grain | what it captures | rough cost / store |
|---|---|---|
| `overview` | entities + relationships only (PK/FK), no plain columns | ~6–12k |
| `standard` | + key columns, types, the important constraints, 2–4 join/retrieval paths | ~12–25k |
| `full` | every column, nullability, indexes, enums, and per-service access patterns | ~25–50k+ |

Record the chosen depth in each store's `grain:` field — it shows in the panel footer so readers know how
complete the model is.

## 3 — Extract the schema (grounded, never guessed)
Read the **real** source — never invent tables or columns:
- **SQL / migrations**: `schema.sql`, `migrations/**`, `db/structure.sql`
- **ORM models**: Prisma/Drizzle schema, SQLAlchemy, ActiveRecord, Ecto, TypeORM, GORM structs
- **NoSQL / KV**: collection samples, TypeScript interfaces, JSON Schema; for Redis, the key patterns in code
- **Generated**: a GraphQL SDL, an OpenAPI components block

For each table: `name` (`schema.table` is fine), a one-line `about`, optional `status`
(`built|partial|planned`), and `cols[]` — each `{name, type, pk?, fk?'table.col', nullable?, note?}`.
An `fk` that points at another table **in the same store** draws a connector; one pointing at a table in a
*different* store shows as an FK badge only — say so in its `note` (e.g. `'in Postgres'`).

## 4 — Capture the joins / retrieval (how the data moves)
This is what makes it more than a static ERD. Find the **real** read paths — the endpoints/queries that
join tables — and record them as `queries[]`: `{name, via?(a service node id), tables[], about?, sql?}`.
`tables[]` is the join chain shown as chips; `via` ties the read back to the service that runs it; `sql` is
illustrative (use `\n` for line breaks). Skip this for `overview` grain.

## 5 — Write the DATAMODEL block and verify
Insert/replace the `var DATAMODEL = {…}` block (keyed by node id) in `system-map.html`. Then sanity-check:
open the map, zoom to **Services**, click the datastore — its data model should open with the tables, the
FK connectors, and the **Joins & retrieval** tab populated. If you keep the prototype in `playground/`, run
`node playground/promote-atlas.js` to regenerate the template + demo and `node playground/verify-template.js`.

## Granularity meta-prompts
Reusable prompts that drive steps 3–4 at a chosen depth. **Copy one, swap in the store, and run it** — they
exist so the user can dial detail up or down without re-explaining the task each time. Stack the add-ons onto
any base.

**Base — `overview` (entities + relationships):**
> For the datastore `<NODE_ID>` (`<engine>`), read the schema source and produce a `DATAMODEL['<NODE_ID>']`
> entry at **overview** grain: every table/entity with only its primary key and any foreign keys (no other
> columns). Set `grain:'overview'`. Do not invent anything — if a table isn't in the source, omit it.

**Base — `standard` (the sensible default):**
> Model `DATAMODEL['<NODE_ID>']` at **standard** grain: each table with its key columns, types, PK/FK, the
> important `NOT NULL`/unique constraints in `note`, plus 2–4 real join/retrieval paths in `queries[]` (with
> `via` = the service that issues each, and illustrative SQL). Set `grain:'standard'`. Read the real schema;
> mark anything not yet built as `status:'planned'`.

**Base — `full` (exhaustive):**
> Model `DATAMODEL['<NODE_ID>']` at **full** grain: every column with type + nullability, all PK/FK, enums
> and important indexes in `note`, and a thorough `queries[]` covering each service's access patterns. Set
> `grain:'full'`. Strictly from the schema source — never fabricate.

**Add-on — joins & retrieval:**
> Also extract the real read paths for `<NODE_ID>`: scan the services that query it for the queries that
> **join** tables, and add each to `queries[]` as `{name, via, tables:[join chain], about, sql}`.

**Add-on — constraints & indexes:**
> Enrich each table in `<NODE_ID>` with its constraints in `note`: uniques, checks, defaults, and indexed
> columns (mark the index). Don't add columns that aren't in the source.

**Add-on — per-service access:**
> For each service node that talks to `<NODE_ID>`, add one `queries[]` entry showing what that service reads
> or writes and which tables it touches (`via` = that service's node id).

**Narrow the scope (when a store is huge):**
> Only model the tables in `<NODE_ID>` reachable from these entry points: `<tables/endpoints>`. List anything
> you deliberately left out so the model is honestly partial, not silently truncated.

## Guardrails
- **Grounded, never guessed.** Every table/column comes from a real schema source. If you can't find it, say
  so and ask for it — don't fabricate a plausible schema.
- **Mark what isn't real.** Proposed tables get `status:'planned'`; don't let the ERD imply something exists.
- **Modeled, not live.** The footer says "Modeled from the schema source — verify against your live
  database." It's a point-in-time read of the *code*, not an introspection of a running DB.
- **Honest partials.** If you cap a large schema, `log`/note what was dropped — a partial model that says so
  beats one that looks complete but isn't.
- **Reuse the engine.** This only writes the `DATAMODEL` data block; it never rewrites the atlas engine.
