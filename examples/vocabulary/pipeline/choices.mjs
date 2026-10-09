// Decisions made by hand, per artist, after reading data/albums-review.txt.
// also: other MusicBrainz artists whose albums count as this artist's: the artist under another name (Viktor Vaughn is
//   MF DOOM), or a duo with a producer or a DJ where the artist is the only rapper (Eric B. & Rakim, Madvillain), or a
//   joint credit MusicBrainz keeps as its own artist (Method Man & Redman). Their albums skip the Wikipedia check.
// add: albums to keep that only MusicBrainz lists as a studio album, usually a title Wikipedia spells differently
// drop: albums to leave out although both list them, with the reason
// genius: Genius album ids for albums the search finds wrongly, by album title
// names: more names that count as the artist in a part's header (nicknames MusicBrainz lacks)
// members: more names of one member of a group, by the member's name on MusicBrainz (they count as the group, and as
//   that member when the posthumous rule looks for a member who had died)
// attribution: "credited" for a rapper whose part headers name dozens of personas of their own: a part is then theirs
//   unless it names a guest Genius credits on the song

export const CHOICES = {
  "2Pac": { also: ["e263a1d8-8228-4ede-9e17-7acf8470165a"] }, // Makaveli
  "Atmosphere": { add: ["Fishing Blues"] },
  "Beastie Boys": { names: ["Ad-Rock", "Ad Rock", "Adrock", "King Ad-Rock", "MCA", "Mike D"] },
  "Common": { also: ["f0d7c0f3-5caf-4c38-9809-df6a72c8f0f0"], drop: ["A Beautiful Revolution Pt. 1 & 2"] }, // August Greene; the drop is both parts in one
  "De La Soul": { names: ["Posdonus"], members: { "Dave": ["Trugoy", "Trugoy the Dove", "Dove"] } },
  "Das EFX": { names: ["Dray", "Drayz", "Books", "Skoob", "Scoob"] },
  "Death Grips": { names: ["MC Ride", "Ride"] },
  "Del the Funky Homosapien": { also: ["ce886f30-8b8f-4cc8-b854-3749291350fd"] }, // Deltron 3030
  "Foxy Brown": { drop: ["Ill Na Na II: The Fever"] }, // shelved, never released
  "Ice-T": { add: ["7th Deadly Sin"] }, // "The Seventh Deadly Sin" on Wikipedia
  "Kool G Rap": { also: ["fe9fdc3a-107c-46aa-8610-86b1e92c135e"] }, // Kool G Rap & DJ Polo
  // Dr. Octagon and Dr. Dooom; the drop is a reissue of two earlier records
  "Kool Keith": { also: ["3eba5e02-780b-4acd-befb-d23a0c6708dd", "fab9932c-e02c-49fd-86b6-3367ceed1419"], drop: ["Dr. Octagon Pt. 2 / Bosses in the Booth"] },
  "Lil Wayne": { add: ["FWA"] }, // "Free Weezy Album" on Wikipedia
  "Method Man": { also: ["c03e2388-9e1b-4b78-8194-28c0d6ca19a0"] }, // Method Man & Redman
  "MF DOOM": {
    also: [
      "2aa5bd46-43ba-4a09-9c7e-20b07036db51", // Viktor Vaughn
      "343ce4fa-54b3-47b8-bd27-b379cf50f7ff", // King Geedorah
      "4e024037-14b7-4aea-99ad-c6ace63b9620", // Madvillain
      "be0cb2f2-71c3-4e95-a584-c19248951ff4", // DANGERDOOM
      "edc0f73d-6290-4d11-ae34-6b447f850162", // JJ DOOM
    ],
  },
  "Nas": { add: ["[untitled]"] }, // "Untitled" on Wikipedia
  "Rittz": { names: ["Ritzz"] },
  "Rakim": { also: ["925228de-bbe5-4c7b-b76f-78e382ec9148"], geniusArtists: [161762] }, // Eric B. & Rakim
  "Redman": { also: ["c03e2388-9e1b-4b78-8194-28c0d6ca19a0"] }, // Method Man & Redman
  "Royce da 5'9\"": { also: ["38756d43-8b65-4e7f-bfe7-6b0323ab2ab4"] }, // PRhyme
  // Ruby da Cherry and $crim credit their verses to dozens of personas (Oddy Nuff da Snow Leopard, $lick $loth, Yung
  // Plague...) that Genius credits on none of their songs, while real guests (BONES, Germ) are credited
  "$uicideboy$": { attribution: "credited" },
  "Salt-N-Pepa": { names: ["Spinderella"] },
  "Sage Francis": { add: ["Li(f)e"] }, // "Life" on Wikipedia
  "Three 6 Mafia": { add: ["The End"] }, // "Chapter 1: The End" on Wikipedia
  "UGK": { add: ["UGK (Underground Kingz)"] }, // "Underground Kingz" on Wikipedia
  "Wu-Tang Clan": { drop: ["Once Upon a Time in Shaolin…"] }, // one copy, sold at auction, never released
};
