# End-to-end tests of the rhp skill

`prompts.json` holds the requests the skill is tested with: short ones, detailed ones, one outside rhp's reach, and ones inside React, Solid, Next.js and Vue apps.

Each test gives one request to an AI agent that has never seen rhp, with only the skill (`skills/rhp`) and the checker (`mcp/`).
The agent works in an empty folder or a copy of a fresh app (`env`), and hands over its chart.
A reviewer then checks the result against the request, renders it at 1280px and 390px, tries its interaction, and scores its design.
What the reviews have in common becomes changes to the skill and the checker.

The prompts are the fixed part: rerun them after changing the skill, and compare.

## What the reviewer scores

Ten scores from 0 to 10: requirements, robustness, overall design, originality, typography, color, layout, phone, fit to the request, and interaction.
For requirements and robustness, 10 means nothing to fix.
For design, 7 is competent but forgettable and 9 would be published as it is.

Originality asks two things.
Could a reader guess which recipe or kit the chart started from?
With its words covered, does the chart still say what it is about?
The reviewer opens the closest recipe beside the result to answer the first.
Inside an app, or with a palette the user gave, the fonts and colors are fixed, and originality is judged on the idea, the marks and the composition.
A plain or minimal request is not scored down for being plain.

One reviewer's score moves by about a point from run to run, so compare averages over six prompts or more, with the same model building and reviewing each time.
