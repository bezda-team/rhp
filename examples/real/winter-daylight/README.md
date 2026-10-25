# B.C.'s first winter without clock changes

The poster compares the clock labels of the same sunrise and sunset on December 21, 2026, using permanent UTC-7 and the previous UTC-8 winter setting.
It leads with Vancouver and lets readers choose five other British Columbia cities.
The additional finish-time control calculates the daylight remaining before sunset, without counting twilight.

## Rebuild

```sh
node examples/real/winter-daylight/analyze.mjs
node examples/real/winter-daylight/build.mjs
```

Open `winter-daylight.html` in a browser or serve the repository locally.
Fonts are embedded; RHP and the download module load from their pinned CDN versions.
The fit and PNG controls come from the current RHP skill's download utility.
The published gallery page is https://rhp.vercel.app/gallery/real-posters/winter-daylight/.
It appears in the Posters section with the gallery's navigation and visitor counter.

## Data and interpretation

`data.json` records the six source rows, their dates and source URLs.
The tables were inspected on October 24, 2026, through the web search provider's cached full table extracts, which identified their month and year as December 2026.
Timeanddate produces the astronomical calculations used here.
The data includes civil dawn, sunrise, sunset, civil dusk and the source's seconds-resolution day length.

The source already includes the new UTC-7 setting.
Subtracting one hour produces the counterfactual previous winter setting for the same date.
Subtracting another hour from the source before doing that comparison would double-adjust it and is incorrect.
This is not a comparison of two years or a claim that daylight duration changes.
The displayed duration is calculated from minute-rounded endpoints, so it can differ slightly from rounding the source's independent seconds-resolution duration.

For Vancouver, the source gives 09:05 sunrise, 17:16 sunset, 08:27 civil dawn and 08:11:01 day length.
The rendered comparison therefore shows 491 minutes of daylight and 16 minutes before sunset after a 17:00 finish.
The previous clock setting gives 08:05 sunrise and 16:16 sunset, with the same 491 minutes between the rounded endpoints.
`analyze.mjs` recomputes these values and checks the one-hour shift and unchanged durations for all six cities.

The cities illustrate the southern coast, interior and north; they are not a representative or population-weighted sample.
All six selected cities move to UTC-7 year-round, while some other B.C. communities follow different practices.
Civil dawn is not the first detectable morning light.
December 21 is not necessarily the date of the latest sunrise or earliest sunset.
Actual visible sunlight depends on clouds, terrain and the local horizon.
No health, safety or energy-use effect is estimated.

Primary sources:

- [B.C. time policy](https://www2.gov.bc.ca/gov/content/governments/celebrating-british-columbia/daylight-saving-time).
- [Vancouver](https://www.timeanddate.com/sun/canada/vancouver?month=12&year=2026).
- [Victoria](https://www.timeanddate.com/sun/canada/victoria?month=12&year=2026).
- [Kelowna](https://www.timeanddate.com/sun/canada/kelowna?month=12&year=2026).
- [Kamloops](https://www.timeanddate.com/sun/canada/kamloops?month=12&year=2026).
- [Prince George](https://www.timeanddate.com/sun/canada/prince-george?month=12&year=2026).
- [Prince Rupert](https://www.timeanddate.com/sun/canada/prince-rupert?month=12&year=2026).
- [Sun calculator definitions and limitations](https://www.timeanddate.com/sun/help).
- [Twilight definitions](https://www.timeanddate.com/astronomy/different-types-twilight.html).

## Audience evidence and editorial choice

This follows demonstrated interest in the actual morning/evening trade-off, rather than assuming that interest in clock changes guarantees interest in this chart.

- [VictoriaBC discussion, September 29, 2026](https://www.reddit.com/r/VictoriaBC/comments/1wta7hk/permanent_daylight_saving_time_the_darkness_has/) debates darker morning journeys and daylight after work.
  The search-index snapshot reported approximately 1,751 votes when inspected on October 24; comments were read on the underlying page.
- [AskACanadian discussion, September 18, 2026](https://www.reddit.com/r/AskACanadian/comments/1wk11vj/are_you_happy_about_permanent_daylight_savings/) contains similar questions and disputed sunrise estimates, including a warning about accidentally adding an hour twice.
  The search-index snapshot reported approximately 1,323 votes; comments were read on the underlying page.
- The alternate candidate was where accepted recycling actually goes, motivated by [this Edmonton discussion, September 22, 2026](https://www.reddit.com/r/Edmonton/comments/1wnaqta/changes_to_the_garbage_recycle_and_compost_bins/).
  It would require audited local destination data to answer the participants' question, rather than substituting a generic global plastic-recycling percentage.

The B.C. comparison has a direct current audience connection and a verified November 1 policy date.
The 5 p.m. threshold makes the result concrete without assuming everyone has that schedule.
Interest appears plausible from repeated substantive discussion; no vote forecast is made.

The title, body and first source-and-tools comment are in `post.txt`.
The DataIsBeautiful rules inspected on October 24 require an original qualifying visualization, an OC tag, a plain descriptive title and source/tool disclosure in the first top-level comment.
No Reddit submission has been made.

## Visual and interaction choices

Path: careful.
Form: paired daylight arcs on the top half of a 24-hour sun clock, using RHP Bar blocks to hold SVG arcs.
The shared angular scale runs from 6 a.m. at the left through noon at the top to 6 p.m. at the right.
The unused night half is omitted without stretching the daytime hours to a different angular scale.
Gold and dashed blue distinguish the new and previous winter settings without relying on color alone.
The source recipe supplies only arc technique; this poster has no activity picking, rotating hand, bezel, grouped activity key or hub readout driven by hover.

The winter-sky ground, warm daylight arc and cool prior setting connect the appearance to morning and evening light.
From the trade-off row down, the background switches to the daylight yellow with navy text, values and controls.
The upper sky gradient ends at that full-width boundary and casts a short shadow over the lower panel.
DM Serif Display supplies editorial headline and number shapes; Manrope handles explanatory text.
Both fonts are embedded under their accompanying OFL licenses.
The artwork consists of SVG clock geometry implemented in the poster.

The location selector changes the headline, arcs, endpoint labels, dawn and after-work calculation together.
Both ends of both arcs interpolate over 600 milliseconds, changing their positions and lengths together.
The yellow sun icons follow the same interpolated times and remain centered on the sunrise and sunset values.
Their tapered rays read clearly on phones as well as the full poster, with the rays facing the bar omitted.
Concave bar ends curve closely around the sun disks with a small gap, and the sky gradient remains visible around the artwork without a circular backing.
The open side of each sun follows the bar during location changes.
The clock-setting legend sits below the dial, event times and chart caption, above the yellow section.
Rapid location changes settle on the latest choice, and reduced-motion preferences skip interpolation.
The finish-time slider changes the reader's comparison threshold rather than selecting a plotted dot.
Its visible track and thumb are ordinary HTML, with a native range input handling keyboard and touch, so Safari's native-control painting does not change their appearance in the PNG.
Keyboard focus is shown around the thumb; clicking, dragging and touch do not add a border around the whole slider.
Neither hover nor leaving the poster changes the selected city or finish time.
The PNG utility preserves the current state and exports the full natural poster when the view is fitted.
If a download starts during an arc transition, both arcs settle to the selected location before capture and remain there afterward.

The desktop layout uses a 1080-pixel-wide poster with natural height to allow the larger dial and extra space above and below it.
The dial fills the content width, with the sunrise and sunset values directly beneath it on both desktop and phone layouts.
Final image dimensions and export/browser checks are recorded in `validation.json` after rendering.
Review uses the full export and a version scaled to a 390-pixel display width.
Direct inspection of Reddit's live feed and expanded media UI was unavailable, so representative scaled displays are used rather than claiming a live Reddit preview check.
