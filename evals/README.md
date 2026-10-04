# End-to-end tests of the rhp skill

`prompts.json` holds the requests the skill is tested with: short ones, detailed ones, one outside rhp's reach, and ones inside React, Solid, Next.js and Vue apps.

Each test gives one request to an AI agent that has never seen rhp, with only the skill (`skills/rhp`) and the checker (`mcp/`).
The agent works in an empty folder or a copy of a fresh app (`env`), and hands over its chart.
A reviewer then checks the result against the request, renders it at 1280px and 390px, tries its interaction, and scores its design.
What the reviews have in common becomes changes to the skill and the checker.

The prompts are the fixed part: rerun them after changing the skill, and compare.
