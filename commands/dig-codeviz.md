---
description: Dig one code level deeper into a codeviz onboarding step (caps at 5 digs to save tokens)
---

Run the **dig-codeviz** skill on $ARGUMENTS (the step / edge / node to dig into; default: the most recently discussed one).

Dig exactly **one** level deeper into the real source behind that step, grounded in `file:line`, and append it to the generated `system-map.html`. Track the dig count in `docs/onboarding/.codeviz-dig.json` and **hard-stop after 5 digs** — tell the user to read the cited files instead. Each dig costs ~8–20k tokens.
