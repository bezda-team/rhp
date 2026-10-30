# The Super Mario Bros. speedrun

A poster of the ten fastest Super Mario Bros. Any% runs, each counted in frames off a perfect run.
Niftski's 4:54.332 (August 2026) is the world record, 4 frames off the perfect 4:54.265; LeKukie's 4:54.365, the record before it, was 6 frames off.
Its look follows a Reddit poster about the time companies took to reach a $1 trillion valuation ("The $1 trillion speedrun", r/Infographics, 1xhp3w8): a retro leaderboard with a lit world-record row, a runner at the end of each track, a DNF row, the next split and the small print.

- `mario-speedrun.html`: the poster, an rhp chart with its data in the page. 1080 by 1350 CSS pixels (4:5, as the reference).
  A click, a tap or the keyboard picks a run: its row takes the record row's gold box, name and time, adds its frames off perfect beside its month, and grows to the record row's height while the row picked before shrinks back, so the chart's height never changes (the rows from the picked one down move down by the extra height).
  Only the record's row carries the "New world record" badge. Pointing at a row tints it; a click beside the chart goes back to the record.
  On load every bar and its runner grow from zero at the NES's own pace, one block per frame at 60.0988 frames a second, so each bar takes as long to grow as its run lost to a perfect one (Niftski's 0.07 s, eddiecatgaming's 1.07 s); `PACE` in the page slows them all alike, and with reduced motion they are drawn at full length.
  Narrower than 900 pixels, each runner's name goes above its track, so the tracks keep their length.
  Under the poster, a line links `data.json` and `fetch-data.mjs`; "Made with rhp" links rhp's GitHub repository.
- `mario-speedrun.png`: the poster saved through its own download button, 2160 by 2700, with the record picked.
- `previews/` (made by `export.mjs`, not committed): the PNG at the sizes Reddit shows it.
- `poster.template.html`: the editable page; `build.mjs` puts the data and rhp's download block into it.
- `data.json`: the leaderboard's top ten (time, frames off perfect, date, run and video links), the record before the current one, and Wikipedia's world record history, with the date they were read.
- `fetch-data.mjs`: reads them again and checks them.

## The data

The runs are the top ten of the [Super Mario Bros. leaderboard](https://www.speedrun.com/smb1) on speedrun.com: Any%, NTSC, each runner's best verified run (two runners tie for 8th place, so the tenth run is in 10th place).
Timing starts when the player takes control of Mario and stops when he touches the axe in World 8-4.
The perfect run is 4:54.265, the fastest tool-assisted run within the real-time rules (2019), which the community and the press take to be the best possible ([Kotaku](https://kotaku.com/speedrunner-smashes-a-computer-assisted-super-mario-bro-1834457319), [Polygon](https://www.polygon.com/super-mario-bros-niftski-speedrun-world-record/)).
The fastest tool-assisted run, 4:54.032, presses left and right at once, which the rules do not allow, so it is not the measure here.

A run's frames off perfect are (its time − 4:54.265) × 60.0988, the NES's frame rate; `fetch-data.mjs` stops if any run comes out more than a tenth of a frame from a whole number.
Each block of a bar is one frame, and the bars start at the perfect run: drawn from zero, the ten runs, all within 1.1 seconds of 4:54, would be bars of the same length.
The record before the current one comes from [Wikipedia's record history](https://en.wikipedia.org/wiki/Super_Mario_Bros._speedrunning#Any%_world_record_progression), and `fetch-data.mjs` checks that its last record is the leaderboard's first run.
"World 8-4, the last level, 4 frames to go": since 2023 the best runs match the perfect run up to World 8-4, so the 4 frames can only come from the last level (Wikipedia, citing [Ars Technica](https://arstechnica.com/gaming/2023/09/record-breaking-super-mario-bros-speedrun-approaches-robotic-perfection/) and [GamesRadar+](https://www.gamesradar.com/theres-a-new-super-mario-bros-speedrun-world-record-and-its-only-22-frames-away-from-literal-perfection/)).

To read the leaderboard again and rebuild:

```sh
node examples/real/mario-speedrun/fetch-data.mjs
node examples/real/mario-speedrun/build.mjs
node examples/real/mario-speedrun/export.mjs   # the PNG through the download button, and Reddit-size previews
```

The rhp checker reports no problems at 1280, 1024, 768, 390, 360 and 320 pixels (`npx -y @bezda/rhp-mcp check examples/real/mario-speedrun/mario-speedrun.html`).
Open the HTML with an internet connection for rhp and the fonts (Press Start 2P and Inter, from Google Fonts).
