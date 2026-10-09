// The article: its text, and the charts in their places

import { number } from "./data.js";
import { Ranking } from "./Ranking.jsx";
import { Albums, Eras, ordinal } from "./Field.jsx";
import { Picked } from "./Picked.jsx";
import {
  TOTALS, MOST, SECOND, RICHEST, RICHEST_2019, FEWEST, UNCOUNTED, RISERS, FALLERS, KEPT_TOP, THINNER, MOST_THINNED, MOST_GROWN,
  DEBUT, LATER, LAST_ROW, STILL_FINDING, VETERANS, ERA_MEDIANS, CHECK, GUESTS, SAMPLE, DOUBLED, COUNTED, LOWEST_THEN, LOWEST_NOW,
  LONG, DENSER, LUPE, POSTHUMOUS, ARCHIVAL, OTHER_LANGUAGE,
} from "./facts.js";

const n = (x) => number.format(x);
const pct = (x) => `${Math.round(x * 100)}%`;
const list = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);
const era = (e) => ERA_MEDIANS.find((m) => m.era === e);

// A page that carries <meta name="back-link" content="<url>" data-label="<name>"> (the rhp site's copy of the article)
// shows a link back there in place of the kicker
const back = document.querySelector('meta[name="back-link"]');

export function Article() {
  return (
    <main class="article">
      <header class="masthead">
        {back
          ? <p class="kicker"><a class="back" href={back.content}>← {back.dataset.label}</a></p>
          : <p class="kicker">Hip hop’s vocabulary, every album counted</p>}
        <h1>Every word they <em>ever</em> rapped</h1>
        <p class="dek">
          In 2014 a ranking of rap’s largest vocabularies counted each rapper’s first {n(SAMPLE)} words.
          We counted all of them: {n(TOTALS.words)} words on {n(TOTALS.albums)} official albums by the same {TOTALS.rappers} rappers.
          {" "}{RICHEST.name} still uses the most different words for the words rapped. {MOST.name} has used the most of all.
        </p>
        <p class="byline">A follow-up to Matt Daniels’ <a href="https://pudding.cool/projects/vocabulary/index.html">The Largest Vocabulary in Hip Hop</a> (The Pudding, 2014, updated 2019). Lyrics from Genius, albums from MusicBrainz and Wikipedia, October 2026.</p>
      </header>

      <section class="prose">
        <p>
          The original ranking gave every rapper the same yardstick: the number of different words in their first {n(SAMPLE)} lyrics, about three to five albums.
          It put {RICHEST_2019.name} first, with {n(RICHEST_2019.pudding)} different words, and it measured the start of each career only.
          Today {DOUBLED} of the {TOTALS.rappers} rappers have at least twice that many words of their own on official albums.
        </p>
        <p>
          Here every official studio album counts, through October 2026, for the {TOTALS.rappers} rappers the 2019 update ranked.
          Mixtapes, compilations, live albums, remix albums and albums released after a rapper’s death are left out.
          So are guests: when a verse belongs to someone else, its words do not count for the album’s rapper.
          That takes about {pct(GUESTS)} of the words off the median rapper’s albums.
        </p>
        <p>
          In the chart below, each bar is a row of the rapper’s albums in release order.
          An album is as wide as the words it brought that none of the rapper’s earlier albums had, so the bar is every different word the rapper has used.
          <strong> Click or tap any rapper</strong> to take their albums off the shelf.
        </p>
      </section>

      <section class="figure">
        <Ranking />
      </section>

      <section class="prose">
        <h2>Two ways to be first</h2>
        <p>
          Counted over every album, {MOST.name} has used the most different words: {n(MOST.unique)}, across {MOST.albums.length} albums and {n(MOST.words)} words.
          {" "}{SECOND.name} follows with {n(SECOND.unique)}, on {SECOND.albums.length} albums.
          A total like this rewards a long career as much as a varied one, because every album adds words.
        </p>
        <p>
          The fair comparison keeps the 2019 yardstick of {n(SAMPLE)} words, but measures the whole career: the number of different words in every run of {n(SAMPLE)} words in a row, averaged.
          Switch the chart to <strong>Per {n(SAMPLE)} words</strong> to see it.
          {" "}{RICHEST.name} leads there too, with {n(RICHEST.fair)} different words in an average run, against {n(RICHEST.pudding)} in 2019’s count of the first.
          {" "}{FEWEST.name} uses the fewest, {n(FEWEST.fair)}.
          {UNCOUNTED.length ? ` ${UNCOUNTED.length} rappers have fewer than ${n(SAMPLE)} words of their own on official albums and are left out of this view.` : ""}
        </p>
        <p>
          Among the {COUNTED} rappers both counts rank, {KEPT_TOP} of 2019’s top ten are still in the top ten.
          The biggest climbs are {list(RISERS.map((m) => `${m.a.name} (${ordinal(m.from)} in 2019, ${ordinal(m.to)} now)`))}.
          The biggest falls are {list(FALLERS.map((m) => `${m.a.name} (${ordinal(m.from)} in 2019, ${ordinal(m.to)} now)`))}.
        </p>
      </section>

      <section class="figure">
        <div class="figure-head">
          <h3>What each album adds</h3>
          <p>The new words an album brings, by its place in a career: the median rapper’s album as the spine, the middle half of rappers as the whisker.</p>
        </div>
        <Albums />
      </section>

      <section class="prose">
        <h2>Every album after the first adds fewer new words</h2>
        <p>
          A debut brings the median rapper {n(DEBUT.new)} different words, all of them new.
          The {ordinal(LATER.album)} album brings {n(LATER.new)} words the rapper had never used on an album before, and by the {ordinal(LAST_ROW.album)}, only {pct(LAST_ROW.share)} of an album’s different words are new to the rapper.
          The rest are words they had already used on an earlier album.
        </p>
        <p>
          Fewer new words does not mean plainer writing.
          An album’s density, its different words in every 1,000, does not depend on the albums before it, and it can rise late in a career.
          Of the {LONG} rappers with five albums or more, {DENSER} made their latest album denser than their debut.
          {LUPE ? ` Lupe Fiasco’s first two albums had ${n(LUPE.first[0].density)} and ${n(LUPE.first[1].density)} different words per 1,000; ${LUPE.later} of his ${LUPE.count - 2} albums since are denser than both, and his densest is ${LUPE.densest.title} (${LUPE.densest.year}), with ${n(LUPE.densest.density)}.` : ""}
          {" "}Each rapper’s breakdown charts it, album by album.
        </p>
        <p>
          Some keep finding new ones.
          Of the {VETERANS} rappers with eight albums or more, the latest album of {list(STILL_FINDING.map((s) => `${s.a.name} (${s.last.title}, ${pct(s.share)} new)`))} brought the largest share of new words.
          {OTHER_LANGUAGE.length ? ` ${list(OTHER_LANGUAGE.map((o) => `${o.name}’s ${o.album.title} (${o.album.year})`))} ${OTHER_LANGUAGE.length === 1 ? "is" : "are"} left out of that comparison: mostly in Spanish, ${OTHER_LANGUAGE.length === 1 ? "it brings" : "they bring"} new words for that reason, and ${OTHER_LANGUAGE.length === 1 ? "its" : "their"} words count like any others in the totals.` : ""}
        </p>
      </section>

      <section class="figure">
        <div class="figure-head">
          <h3>Every era, whole careers</h3>
          <p>Each face is one rapper’s different words per {n(SAMPLE)}, over every album they made, by the era the 2019 article gave them.</p>
        </div>
        <Eras />
      </section>

      <section class="prose">
        <h2>The generations, counted again</h2>
        <p>
          In 2019 the rappers of the {LOWEST_THEN.era} had the lowest median, {n(LOWEST_THEN.then)} different words in their first {n(SAMPLE)}, and the article credited a change in song structure: more repeated choruses, more singing.
          Over whole careers, {LOWEST_NOW.era === LOWEST_THEN.era ? `the ${LOWEST_NOW.era} still have the lowest median` : `the ${LOWEST_NOW.era} now have the lowest median`}: {n(LOWEST_NOW.now)} different words per {n(SAMPLE)}.
          The other eras’ medians are {list(ERA_MEDIANS.filter((m) => m !== LOWEST_NOW && m.now != null).map((m) => `${n(m.now)} for the ${m.era}`))}.
        </p>
        <p>
          Careers move both ways.
          Of the {COUNTED} rappers with at least {n(SAMPLE)} words of their own, {THINNER.length} use fewer different words over the whole career than in their own first {n(SAMPLE)}; {MOST_THINNED.name} fell the most ({n(MOST_THINNED.sample.first)} at first, {n(MOST_THINNED.fair)} over the career).
          {" "}{MOST_GROWN.name} grew the most, from {n(MOST_GROWN.sample.first)} to {n(MOST_GROWN.fair)}.
        </p>
      </section>

      <Picked />

      <section class="method">
        <h2>How this was counted</h2>
        <p>
          <b>Rappers.</b> The {TOTALS.rappers} rappers of the 2019 update, with its eras, from its published data.
        </p>
        <p>
          <b>Albums.</b> Official studio albums released under the rapper’s name, alone or jointly, typed by MusicBrainz and checked against each rapper’s discography on Wikipedia.
          Albums under another name count when the rapper is its only rapper, as a persona (MF DOOM as Viktor Vaughn) or in a duo with a producer (Eric B. & Rakim, Madvillain).
          Each album’s standard edition counts, without bonus tracks or skits.
          Albums Genius has the lyrics of fewer than 80% of songs for are left out ({TOTALS.left - TOTALS.posthumous}, mostly obscure or released in the last weeks), and so are albums of instrumentals; each rapper’s breakdown names its own.
        </p>
        <p>
          <b>Posthumous albums.</b> Every album counted here is one the rapper released in their lifetime.
          An album released after a rapper’s death is left out, and so is a group’s album on which members who had died rap a tenth of the words or more.
          That leaves out {TOTALS.posthumous} albums: {list(POSTHUMOUS.map((p) => `${p.albums.length > 1 ? `${p.albums.length} of ${p.name}’s` : `${p.name}’s`} (${p.albums.map((al) => `${al.title}, ${al.year}`).join("; ")})`))}.
          {ARCHIVAL.length ? ` An archival line does not make an album posthumous: ${list(ARCHIVAL.map((al) => `${al.title} (${al.name}, ${al.year})`))} count${ARCHIVAL.length === 1 ? "s" : ""}, though a member who had died raps ${ARCHIVAL.length === 1 ? "" : "about "}${pct(Math.max(...ARCHIVAL.map((al) => al.late)))} of ${ARCHIVAL.length === 1 ? "its" : "the"} words${ARCHIVAL.length === 1 ? "" : " at most"}.` : ""}
        </p>
        <p>
          <b>Words.</b> Lyrics from Genius, by the 2019 rules: lowercase, apostrophes removed, every spelling its own word, so <i>pimp</i>, <i>pimps</i>, <i>pimping</i> and <i>pimpin</i> are four.
          A part of a song counts when Genius names no performer for it, or names the rapper, an alias of theirs, or a member of their group.
          Ad-libs count; skits do not.
          Transcription still varies (<i>shorty</i> and <i>shawty</i> are two words), and so does how much of a song Genius credits to whom: a chorus that quotes another song counts as the rapper’s when Genius credits it to them.
          Vocal sounds and stutters (<i>oh-woah-oh-oh</i>, <i>f-f-filet</i>) count as words, as they did in 2019, but are never shown as examples.
        </p>
        <p>
          <b>A check.</b> Counted the same way, each rapper’s first {n(SAMPLE)} words come out close to 2019’s published counts.
          For the {CHECK.rappers} rappers with at least {n(SAMPLE)} words of their own on official albums, the correlation is {CHECK.r.toFixed(2)}, the median difference {pct(CHECK.median)}, and {CHECK.within} are within 10%.
          2019 counted every voice on a song, guests included; counted that way too, the median difference is {pct(CHECK.everyVoice)}.
          The larger differences come from the releases sampled: 2019 also took EPs and mixtapes, for rappers who had made few albums by then.
        </p>
        <p>
          The code, the album lists and every decision made by hand are in <a href="https://github.com/bezda-team/rhp/tree/master/examples/vocabulary">the example’s folder</a>; the lyrics themselves are not published.
          Charts drawn with <a href="https://rhp.vercel.app">rhp</a>.
        </p>
      </section>
    </main>
  );
}
