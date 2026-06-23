# codeviz system-map — data spec, use cases & edge cases

Reference for filling the `@@REPLACE@@` blocks in `assets/system-map.template.html`
(the semantic-zoom atlas engine). Tables below are **TOON** (Token-Oriented Object Notation):
the header `name[rows]{col1,col2,…}:` declares columns once, then each indented line is one
comma-separated row — same data as a table at a fraction of the tokens.

## Field reference
```toon
fields[47]{object,field,req,shape,note}:
  NODES,tier,yes,int,layer index; 0=top
  NODES,w/h,yes,int px,box size; text does not auto-fit
  NODES,label/sub,yes,string,name + one-line subtitle
  NODES,status,yes,enum,built|partial|planned (dot colour)
  NODES,about,yes,string,hover-card sentence
  NODES,resp,yes,string[],responsibilities; shown at deep zoom
  NODES,health,no,{state;p99;err;note},ILLUSTRATIVE health for the overlay; state: up|degraded|down
  DOMAINS,id/tier,yes,string/int,layer id + vertical order
  DOMAINS,label/blurb,yes,string,layer name + short purpose
  DOMAINS,col,yes,hex,layer colour; avoid amber/yellow/orange
  DOMAINS,members,yes,nodeId[],each node in exactly one domain
  EDGES,[from;to;label;style],yes,tuple,style: solid|dash|thick
  EDGES,[4] latency,no,int ms,heat dot + flow speed; illustrative
  EDGE_DETAIL,'from>to',no,string[],hover steps; key must match an edge
  SCENARIOS,id/label,yes,string,tour id + button text
  SCENARIOS,steps,yes,step[],ordered hops (see step fields)
  step,from/to,yes,nodeId,MUST also be an EDGES pair
  step,payload,no,string,wire payload chip (e.g. GET /x)
  step,text,yes,string,what the REQUEST does (one line)
  step,detail,no,html,why it works this way; <b> ok
  step,terms,no,[name;def][],jargon chips for new grads
  step,reply,no,string,actual content returned over this hop (not an ack)
  step,replyText,no,string,narration for the return leg
  step,replyDetail,no,html,why the response is what it is
  step,oneway,no,bool,fire-and-forget; no response leg in the tour
  DATAMODEL,key = nodeId,no,store,keyed by a datastore NODES id; clicking that node opens its ER drill-in
  DATAMODEL,engine/about,no,string,e.g. Postgres/Redis + one-line purpose
  DATAMODEL,grain,no,enum,overview|standard|full — modelled depth; shown in the footer
  DATAMODEL,tables,no,table[],entities/collections (see table fields)
  DATAMODEL,queries,no,query[],join/retrieval paths (see query fields)
  table,name,yes,string,entity name; schema.table ok; unique within the store
  table,about/status,no,string,one-line purpose; status: built|partial|planned
  table,accent,no,hex,explicit card colour — MUST be #rgb/#rrggbb (else ignored)
  table,domain,no,domainId,colour the card by an existing DOMAINS id; else a schema-prefix hash
  table,cols,yes,col[],columns/fields
  col,name,yes,string,column name
  col,type,no,string,data type (nullable renders as type?)
  col,pk/nullable,no,bool,primary key / NULL allowed
  col,fk,no,'table.col',foreign key → connector if the target is in THIS store; else badge only
  col,note,no,string,constraint / meaning (shown on hover)
  query,name,yes,string,what the read does (one line)
  query,about,no,string,why / how the join works
  query,via,no,nodeId,which service issues it
  query,tables,yes,string[],join chain (shown as table ⋈ table); chips jump if the table is in this store
  query,sql,no,string,illustrative SQL; \n for line breaks
  HEALTH_SCEN,id/label/source,no,string,a health snapshot; source: modeled|observed
  HEALTH_SCEN,base/states,no,'up'/{id:{state,p99,err,note}},base resets all healthy; states override per node
```

## Use cases — how to model common architectures
```toon
usecases[11]{case,model}:
  Monolith + DB,clients→api→data; one api node; flows: read (api→cache→db) + write (api→db)
  Microservices,many nodes in the services layer; one gateway; edges service→service; group by domain not raw tier
  Event-driven/queue,dash edges for events; a workers layer; scenario shows producer→queue→consumer fan-out
  Serverless/functions,functions as services-layer nodes; ext providers below; note cold-start in latency
  Data pipeline/ETL,thick edges for bulk; layers = ingest→transform→store→serve; scenario walks one record through
  Mobile + API,clients layer holds web+mobile; ext layer for push/payments; flow shows token use
  Realtime/streaming,dash edge for the socket; a stream service; scenario: subscribe then server push (the response leg)
  Replicated DB,primary + replicas as separate data nodes; dash edges for replication; reads hit replicas
  CDN/media,thick edge client/api→CDN/storage bypassing the API; bulk chunks read instantly
  Auth/identity,auth service mints tokens; other services trust them; a call back through the gateway is a back-edge
  Data model / ER,add DATAMODEL[storeId] with tables[].cols (pk/fk) + queries[]; clicking a datastore node opens its ER diagram + joins; tune depth with grain
```

## Edge cases — gotchas & how the engine handles them
```toon
edgecases[31]{case,handling}:
  cycle A→B→A,both edges draw; the upward one auto-flags amber (back-edge); layout still resolves
  self-loop A→A,avoid; put it in the node about/resp instead of an edge
  node with no edges,renders as an isolated box in its layer; still hover-able; check it truly belongs
  duplicate edge A→B,they overlap; merge into one edge with a combined label
  real both-ways A↔B,the round-trip animation already implies the reply; add a 2nd edge only if it is a distinct call
  missing latency,edge works; no heat dot; flow uses default speed; tour shows no ms
  disconnected graph,clusters stack by tier; minimap shows all; fine
  huge graph >40 nodes,lean on semantic zoom + DOI focus; use fewer domains; continents is the entry point
  single-node domain,fine; the territory still renders (e.g. Gateway = just one node)
  all-async system,all dash edges; round-trip still shown; still author at least one scenario
  planned/partial node,set status; shown grey/amber; mark honestly — never imply it exists
  very long label,text does not auto-fit the box; pick a concise label/sub or widen w
  scenario hop ≠ edge,BLOCKER: the comet needs a line — add the EDGES pair or the hop will not animate
  step from/to bad id,runtime error; from/to must be NODES keys
  node in 0 or 2 domains,invalid; every node belongs to exactly one domain members[]
  duplicate node id,later silently overwrites earlier; ids must be unique
  domain colour clash,avoid amber/yellow/orange (reserved for status + latency); pick distinct hues
  no scenarios,the tour is empty; always provide ≥1 flow
  reduced-motion user,flow → static chevrons; comet freezes; narration must carry the meaning
  offline / file://,fully supported; no CDN or framework is loaded
  tour response order,requests descend in step order; responses unwind in REVERSE — an upstream node replies only after its downstream returns
  fire-and-forget hop,set oneway:true (e.g. email/queue/webhook); shows as a request with no return leg
  response with no content,omit reply (or set a short ack); the return leg still animates with a default label
  dual hover on a hop,hovering the line shows EDGE_DETAIL (the connection); hovering the tour content label shows the payload/response — two separate tooltips
  health overlay,Structure|Health toggle recolours nodes/edges by health; ILLUSTRATIVE only (badged modeled-not-observed). Set NODES[].health or a node defaults healthy. Never implies live metrics
  health scenarios,HEALTH_SCENARIOS = named snapshots the reader switches between in Health mode (sample / all-healthy / cascade). base:up resets all; states override per node
  real (observed) health,/codeviz-health snapshots Docker (state/uptime/restarts/healthchecks) into a source:observed HEALTH_SCENARIOS entry; point-in-time not continuous; never fabricates metrics
  datastore data model,DATAMODEL[nodeId] (a datastore id) → clicking that node opens an ER drill-in: tables/keys + a Joins & retrieval tab. FK cols draw connectors; no block = the node just focuses
  fk to another store,a col fk pointing at a table in a different store shows as an FK badge with no connector (the target card lives in the other store) — say so in the col note
  non-relational store,model KV/doc stores as tables too (key pattern as the entity); set grain:overview; queries can describe access without sql
  data-model granularity,grain overview|standard|full sets depth; use the /codeviz-datamodel meta-prompts. Modeled from the schema source — verify vs live; never fabricate columns
```

## Invariants (validate before delivering)
- every `from`/`to` in EDGES and SCENARIOS is a NODES key; every scenario hop is also an EDGES pair
- every node belongs to exactly one DOMAINS `members[]`; node ids are unique
- `EDGE_DETAIL` keys match an EDGES pair; domain `col` avoids amber/yellow/orange
- ≥1 scenario; `node --check` passes; required ids present (see SKILL.md Deliver)
