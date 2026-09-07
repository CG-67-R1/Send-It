# Track Details turn GPT review

**Status:** pending owner review. Do not write these into catalog `shape` / `approachFrom` / `orientation` until you approve.

**Coverage:** 239 turns on 19 Track Details circuits.

**Confidence:** 37 high · 111 medium · 91 low.

**Source:** RoadRacer Track Coach knowledge pack (`docs/gpt-knowledge`, `ST/GPTUpload` track guides) plus model memory. Live OpenAI was not called here (no `OPENAI_API_KEY` in this environment; production `/roadrace-ai` is capped at 10 requests / 15 minutes).

**Wording:** replies use **from memory**, never “from the catalog”.

After you mark a turn correct, those three strings are what should land on the matching catalog corner (and any new map-only ids you choose to add).

## Conflicts to check first

- Phillip Island T5–T12 numbering vs geometry JSON’s 12-turn split.
- Morgan Park T3: board/ST left “by the wall” vs geometry ASBK right hairpin.
- SMP Gardner T2 and T8 hands vs geometry.
- The Bend GT: board T1–T9 look like a short 9-turn story; official GT memory is 35 turns / 7.77 km. T10–T35 dots look evenly spaced.
- SMP Brabham 18 dots vs ~16-turn geometry; Druitt T4a/T4b and T15–T18 numbering.
- Calder Park 10 dots vs Thunderdome 4 banked rights.
- Wanneroo board ends at T7; guides often number a separate T8 final sweeper.

## Baskerville Raceway

`baskerville` · anticlockwise · 10 board turns (catalog numbered corners: 9)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Corner / complex | Main straight / start-finish — downhill / crest character in memory | Turn 1 is a complex from memory — opening corner, hilly; hand not locked. | low |
| T2 | Turn 2 (Esses) | Esses / S | T1 exit | Turn 2 is a complex from memory — Esses entry. | medium |
| T3 | Turn 3 (Esses) | Esses / S | T2 exit | Turn 3 is a complex from memory — Esses exit. | medium |
| T4 | Turn 4 | Corner / complex | Esses exit | Turn 4 is a complex from memory — link toward Dunlop; hand not locked. | low |
| T5 | Turn 5 (Dunlop) | Corner / complex | T4 exit | Turn 5 is a complex from memory — Dunlop entry. | medium |
| T6 | Turn 6 (Dunlop) | Corner / complex | Dunlop entry exit | Turn 6 is a complex from memory — Dunlop exit. | medium |
| T7 | Turn 7 (Calvins) | Corner / complex | Dunlop exit | Turn 7 is a complex from memory — Calvins. | medium |
| T8 | Turn 8 (Shell Corner) | Corner / complex | Calvins exit | Turn 8 is a complex from memory — Shell Corner. | medium |
| T9 | Turn 9 (Holden) | Corner / complex | Shell Corner exit | Turn 9 is a complex from memory — Holden, last named board corner before T10. | medium |
| T10 | Turn 10 | Corner / complex | Holden exit | Turn 10 is a complex from memory — extra board dot after Holden; catalog stops at T9. Verify before apply. | low |

## Broadford State Motorcycle Complex

`broadford` · clockwise · 12 board turns (catalog numbered corners: 7)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 (Honda Corner) | Double-apex | Chute / main straight — far right, slight uphill | Turn 1 is a left from memory — opening uphill left of the Honda-named pair (name is Broadford’s, not PI). | medium |
| T2 | Turn 2 (Honda Corner) | Double-apex | T1 left exit — off-camber, do not coast | Turn 2 is a complex from memory — tighter left that finishes the T1–T2 double-apex; off-camber exit. | medium |
| T3 | Turn 3 (Back Kink) | Kink | T2 exit — crest then downhill | Turn 3 is a complex from memory — slight right kink on the back run; fast line often straight-lines T3–T4. | medium |
| T4 | Turn 4 (Back Straight) | Kink | T3 kink — still downhill toward T5 | Turn 4 is a complex from memory — slight left kink / back straight; not a braking corner. | medium |
| T5 | Turn 5 (Uphill Hairpin) | Hairpin | Back straight / ramp — uphill brake | Turn 5 is a right from memory — uphill hairpin, hill helps the stop, off-camber exit. | high |
| T6 | Turn 6 (The Kink) | Kink | T5 downhill — courage test into T7 | Turn 6 is a complex from memory — fast right kink at the bottom; barely a turn, drop-off outside. | medium |
| T7 | Turn 7 (Flip-Flop) | Chicane | T6 exit / short chute — downhill then flat | Turn 7 is a complex from memory — Flip-Flop entry, first right of the 7–8–9 esses. | medium |
| T8 | Turn 8 (Flip-Flop) | Esses / S | T7 right flick | Turn 8 is a complex from memory — Flip-Flop left, snap the bike; off-camber toward T9. | medium |
| T9 | Turn 9 (Flip-Flop) | Esses / S | T8 left flick | Turn 9 is a complex from memory — Flip-Flop exit, drive uphill to the twin-apex rights. | medium |
| T10 | Turn 10 (Twin Apex Rights) | Double-apex | T9 drive — uphill, roll not a big stop | Turn 10 is a right from memory — first of the cambered twin-apex rights. | high |
| T11 | Turn 11 (Twin Apex Rights) | Double-apex | T10 sweeper exit | Turn 11 is a complex from memory — second right of the twin-apex pair; use all the exit for T12. | medium |
| T12 | Turn 12 (final left onto straight) | Corner / complex | T10–T11 exit — downhill, off-camber | Turn 12 is a left from memory — final downhill off-camber left onto the chute; wall outside. | high |

## Calder Park Raceway

`calder_park` · clockwise · 10 board turns (catalog numbered corners: 3)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Hairpin | Front straight / start-finish | Turn 1 is a right from memory if this is the Thunderdome — 24° banked right. Club-circuit T1 may differ. | low |
| T2 | Turn 2 | Corner / complex | T1 exit | Turn 2 is a right from memory on the Thunderdome (banked). Extra board dots are not in that 4-turn memory. | low |
| T3 | Turn 3 | Hairpin | T2 exit | Turn 3 is a right from memory on the Thunderdome (banked). | low |
| T4 | Turn 4 | Corner / complex | T3 exit | Turn 4 is a right from memory on the Thunderdome — last banked right onto the front straight. | low |
| T5 | Turn 5 | Unknown — verify | Not in Thunderdome 4-turn memory | Turn 5 is a complex from memory — no locked Calder road-course T5. Do not invent a racing line. | low |
| T6 | Turn 6 | Unknown — verify | Not in Thunderdome 4-turn memory | Turn 6 is a complex from memory — unverified board dot. | low |
| T7 | Turn 7 | Unknown — verify | Not in Thunderdome 4-turn memory | Turn 7 is a complex from memory — unverified board dot. | low |
| T8 | Turn 8 | Unknown — verify | Not in Thunderdome 4-turn memory | Turn 8 is a complex from memory — unverified board dot. | low |
| T9 | Turn 9 | Unknown — verify | Not in Thunderdome 4-turn memory | Turn 9 is a complex from memory — unverified board dot. | low |
| T10 | Turn 10 | Unknown — verify | Not in Thunderdome 4-turn memory | Turn 10 is a complex from memory — unverified board dot. | low |

## Hidden Valley Raceway

`hidden_valley` · anticlockwise · 14 board turns (catalog numbered corners: 14)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Hairpin | Long main straight (~1.1 km) — big stop | Turn 1 is a left from memory — tight hairpin off the straight, multiple lines. | medium |
| T2 | Turn 2 | Esses / S | T1 hairpin exit — uphill esses start | Turn 2 is a left from memory — esses / uphill sector. | medium |
| T3 | Turn 3 | Esses / S | T2 exit | Turn 3 is a right from memory — middle of the esses. | medium |
| T4 | Turn 4 | Esses / S | T3 exit | Turn 4 is a left from memory — esses exit. | medium |
| T5 | Turn 5 | Corner / complex | Esses exit | Turn 5 is a right from memory — ~90° , passing zone in the geometry notes. | medium |
| T6 | Turn 6 | Hairpin | T5 exit | Turn 6 is a left from memory — very slow hairpin. | medium |
| T7 | Turn 7 | Corner / complex | T6 hairpin exit | Turn 7 is a right from memory — local name Ducati in the geometry notes; blind / late-apex stories. | medium |
| T8 | Turn 8 | Corner / complex | T7 exit | Turn 8 is a right from memory — linked with T9. | medium |
| T9 | Turn 9 | Esses / S | T8 exit | Turn 9 is a left from memory — flip-flop with T8. | medium |
| T10 | Turn 10 | Corner / complex | T9 exit | Turn 10 is a left from memory — commitment, off-camber noted in media. | medium |
| T11 | Turn 11 | Corner / complex | T10 exit | Turn 11 is a left from memory — linked final sector. | medium |
| T12 | Turn 12 | Kink | T11 exit | Turn 12 is a right from memory — flick sequence with T13. | medium |
| T13 | Turn 13 | Kink | T12 flick exit | Turn 13 is a right from memory — second flick before the last left. | medium |
| T14 | Turn 14 | Corner / complex | T13 exit | Turn 14 is a left from memory — onto the main straight; exit drive is the lap. | medium |

## Lakeside Park

`lakeside` · anticlockwise · 9 board turns (catalog numbered corners: 8)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | BP Bend | Corner / complex | Main straight / start-finish | Turn 1 is a complex from memory — BP Bend, first stop after the straight. | medium |
| T2 | The Karrussell | Sweeper | BP Bend exit | Turn 2 is a complex from memory — The Karussell, banked bowl. | medium |
| T3 | Turn 3 | Corner / complex | Karussell exit | Turn 3 is a complex from memory — link toward the Bus Stop; hand not locked. | low |
| T4 | The Bus Stop | Chicane | T3 exit | Turn 4 is a complex from memory — Bus Stop entry. | medium |
| T5 | The Bus Stop | Chicane | Bus Stop entry exit | Turn 5 is a complex from memory — Bus Stop exit. Catalog approach text still says Hungry — numbering drift. | low |
| T6 | Dunlop Bridge | Corner / complex | Bus Stop exit | Turn 6 is a complex from memory — Dunlop Bridge on this board (older notes used Hungry / Shell Bridge here). | low |
| T7 | Hungry Corner | Corner / complex | Dunlop Bridge exit | Turn 7 is a complex from memory — Hungry Corner on this board. | medium |
| T8 | Eastern Loop | Sweeper | Hungry exit | Turn 8 is a complex from memory — Eastern Loop. | medium |
| T9 | Ford Corner | Corner / complex | Eastern Loop exit | Turn 9 is a complex from memory — Ford Corner, last onto the main straight. Catalog has no T9 row. | medium |

## McNamara Park Raceway (Mac Park)

`mac_park` · clockwise · 12 board turns (catalog numbered corners: 12)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | The Hairpin | Hairpin | Main straight / start-finish | Turn 1 is a complex from memory — The Hairpin, first-gear stop after the chute. | high |
| T2 | Turn 2 (blind crest) | Corner / complex | Hairpin exit — uphill toward the crest | Turn 2 is a complex from memory — blind crest pair with T3; do not invent a line over the rise. | medium |
| T3 | Turn 3 | Kink | T2 crest exit | Turn 3 is a right from memory — linked with the crest; treat T2–T3 as one sequence. | medium |
| T4 | Turn 4 (Left-hander) | Corner / complex | T3 exit | Turn 4 is a left from memory — left-hander after the crest pair. | medium |
| T5 | Turn 5 (Right-hand sweeper) | Sweeper | T4 exit | Turn 5 is a right from memory — right-hand sweeper, carry roll speed. | medium |
| T6 | Turn 6 (chicane entry) | Kink | T5 sweeper exit | Turn 6 is a complex from memory — chicane entry / first half of the 6–7 pair. | medium |
| T7 | Turn 7 (fast left sweeper / crest) | Sweeper | T6 chicane exit — often over a crest | Turn 7 is a left from memory — fast left sweeper / crest after the chicane. | medium |
| T8 | Turn 8 (Fast Right) | Sweeper | T7 exit | Turn 8 is a right from memory — fast right, spectator / Clubhouse approach in memory. | medium |
| T9 | Turn 9 (Clubhouse Hairpin) | Hairpin | T8 exit — short straight, serious braking | Turn 9 is a complex from memory — Clubhouse hairpin, off-camber exit in the guide. | medium |
| T10 | Turn 10 (esses / blind crest) | Esses / S | Clubhouse hairpin exit | Turn 10 is a left from memory — esses / blind crest, first flick of the 10–11 pair. | medium |
| T11 | Turn 11 (esses right) | Esses / S | T10 left flick exit | Turn 11 is a right from memory — esses right, stay in sequence for the last corner. | medium |
| T12 | Turn 12 (final left onto main straight) | Hairpin | T11 esses exit | Turn 12 is a complex from memory — final left onto the main straight; exit drive is the lap. | medium |

## Mallala Motorsport Park

`mallala` · clockwise · 9 board turns (catalog numbered corners: 9)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Kink / lead-in complex | Main straight / start-finish — settle early, bump risk at the first apex | Turn 1 is a complex from memory — kink / lead-in, get the bike calm for the left that follows. | medium |
| T2 | Turn 2 (tight left) | Tight left / hairpin-ish | T1 kink exit — inner loop | Turn 2 is a left from memory — tight left, late-ish apex, exit matters more than entry. | high |
| T3 | Turn 3 (right hairpin) | Hairpin | T2 exit — short run to the far hairpin | Turn 3 is a right from memory — right hairpin, rider-verified; square it if you need a stable drive. | high |
| T4 | Turn 4 (straight / not a corner) | Fast sweeper / long radius | T3 hairpin exit — long top section | Turn 4 is a complex from memory — long sweeper / almost a straight; hand not locked. | medium |
| T5 | Turn 5 (northern hairpin) | Medium-speed bend | T4 long section exit | Turn 5 is a complex from memory — northern hairpin / medium bend; hand not locked. | medium |
| T6 | Turn 6 | Fast kink / setup | T5 exit — position for the big stop | Turn 6 is a left from memory — setup kink for the hairpin; rider-verified left. | high |
| T7 | Turn 7 | Tight hairpin / major braking | T6 kink exit — heavy stop | Turn 7 is a right from memory — right hairpin, late apex, rear-spin risk on exit. | high |
| T8 | Turn 8 | Kink / transition | T7 hairpin exit — connector | Turn 8 is a complex from memory — kink / connector; hand not locked. | medium |
| T9 | Turn 9 (onto main straight) | Final turn / drive corner | T8 exit — last corner onto the main straight | Turn 9 is a complex from memory — final drive onto the straight; compression dip on exit in memory. | medium |

## Morgan Park Raceway (Circuit K)

`morgan_park` · clockwise · 12 board turns (catalog numbered corners: 9)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Kink | Main straight / start-finish | Turn 1 is a complex from memory — right-hand decelerating entry, linked with T2 as one arc. | medium |
| T2 | Turn 2 | Sweeper | T1 exit — still in the opening pair | Turn 2 is a complex from memory — second half of the opening sweep; geometry says right, ST says left of a pair. | low |
| T3 | Turn 3 (Blind Left-hander by the Wall) | Corner / complex | T1–T2 exit — uphill to the wall | Turn 3 is a left from memory — blind left by the wall (Track Details / ST). Geometry ASBK note says T3 right hairpin — do not ship a hand until you pick one. | low |
| T4 | Turn 4 (Heavy Braking Right-Hairpin) | Hairpin | T3 exit — uphill-to-flat heavy stop | Turn 4 is a right from memory — heavy-braking right hairpin, classic slow-in. | medium |
| T5 | Turn 5 (Long Sweeping Left) | Sweeper | T4 hairpin exit | Turn 5 is a left from memory — long sweeping left. | medium |
| T6 | Turn 6 (Right-Hand Flick) | Kink | T5 sweeper exit | Turn 6 is a right from memory — right-hand flick. | medium |
| T7 | Turn 7 (Left-hand tight corner) | Hairpin | T6 flick exit | Turn 7 is a left from memory — tight left before the fast esses. | medium |
| T8 | Turn 8 (Fast Esses) | Esses / S | T7 exit — high-speed transition | Turn 8 is a complex from memory — fast esses entry (often T8–T9 as one S). | medium |
| T9 | Turn 9 (Fast Esses) | Esses / S | T8 flick exit | Turn 9 is a complex from memory — fast esses exit, then drive to the banked right. | medium |
| T10 | Turn 10 (Fast Banked Right) | Sweeper | Esses exit | Turn 10 is a right from memory — fast banked right, positive camber. | medium |
| T11 | Turn 11 (Final Chicane) | Chicane | T10 banked-right exit | Turn 11 is a complex from memory — final chicane entry; hand not locked on the official diagram. | low |
| T12 | Turn 12 (Final Chicane onto Main Straight) | Chicane | T11 chicane entry exit | Turn 12 is a complex from memory — final chicane onto the main straight; verify the last flick hand. | low |

## Phillip Island Grand Prix Circuit

`phillip_island` · anticlockwise · 12 board turns (catalog numbered corners: 11)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Doohan Corner | Sweeper | Gardner Straight / start-finish — high-speed run, often a bump after the line | Turn 1 is a right from memory — Doohan, late apex, then short drive toward Southern Loop. | high |
| T2 | Southern Loop | Hairpin | T1 (Doohan) exit — still carrying speed, scrub or one downshift | Turn 2 is a left from memory — Southern Loop, double-apex bowl, do not park mid-corner right. | high |
| T3 | Stoner Corner | Kink | Southern Loop exit — downhill acceleration | Turn 3 is a left from memory — Stoner, high-speed kink, track drops at the apex; set up left for Miller braking. | high |
| T4 | Miller Corner (formerly Honda Corner) | Hairpin | Stoner exit — downhill, wind-sensitive braking | Turn 4 is a right from memory — Miller (ex Honda), late apex, prime outbrake zone. | high |
| T5 | Siberia | Kink | Miller exit — short drive, stay ready to flick left | Turn 5 is a left from memory — Siberia, tight exit left to set Hayshed; not a full hairpin. | high |
| T6 | Hayshed | Kink | Siberia exit — short chute under the Hayshed landmark | Turn 6 is a right from memory — Hayshed, fast commitment kink, inside-curb bump; map lists complex. | high |
| T7 | Lukey Heights entry | Corner / complex | Hayshed exit — still leaned, uphill toward Lukey | Turn 7 is a left from memory — Lukey Heights entry, uphill left that never quite settles until the crest. | medium |
| T8 | Lukey Heights proper | Corner / complex | Lukey entry — charge uphill, one downshift before the crest | Turn 8 is a right from memory — Lukey Heights proper, blind crest right, apex on top then drop toward MG. | high |
| T9 | MG Hairpin | Hairpin | Lukey crest exit — steep downhill, front loads hard | Turn 9 is a right from memory — MG Hairpin, downhill, avoid the far-outside entry bump. | high |
| T10 | Turn 10 | Kink | MG exit — pick the bike up and drive | Turn 10 is a left from memory — shallow kink after MG, more acceleration zone than a aimed-for apex. | medium |
| T11 | Turn 11 | Sweeper | T10 kink exit — brief straight, then commit left | Turn 11 is a left from memory — sweeping left after MG toward Gardner’s; front can go light over the rise. | medium |
| T12 | Gardner's | Sweeper | T11 exit — last left onto Gardner Straight | Turn 12 is a left from memory — Gardner’s, final sweeper onto the main straight; exit drive is the lap. | high |

## Queensland Raceway (National Circuit)

`queensland_raceway` · clockwise · 6 board turns (catalog numbered corners: 5)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 (Kitty's Corner) | Kink | Dick Johnson / main straight — often just a roll | Turn 1 is a right from memory — Kitty’s Corner, fast right, not a big stop. | high |
| T2 | Turn 2 (left hairpin) | Hairpin | Kitty’s exit — hard straight-line brake, slight uphill | Turn 2 is a left from memory — left hairpin (bike National). Car maps sometimes number this T3. | high |
| T3 | Turn 3 (The Switchback) | Esses / S | T2 exit — drift right, then the switchback | Turn 3 is a complex from memory — Switchback entry (shallow right kink of the T3–T4 pair). | high |
| T4 | Turn 4 (The Switchback) | Esses / S | T3 kink exit | Turn 4 is a complex from memory — Switchback left, tighter than T3; clip the left curb in the guide. | high |
| T5 | Turn 5 (Spitfire / Thunderbolt hairpin) | Hairpin | Back straight after the switchback — long brake | Turn 5 is a right from memory — Spitfire / Thunderbolt hairpin, mid apex, off-camber exit. | high |
| T6 | Turn 6 (final corner onto main straight) | Kink | T5 exit — stay left for radius, then stand it up | Turn 6 is a right from memory — final bend onto the main straight; exit speed is the lap. | high |

## Sandown Raceway

`sandown` · anticlockwise · 13 board turns (catalog numbered corners: 5)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Hairpin | Pit straight — 90° stop onto the back straight | Turn 1 is a right from memory — 90° right off the pit straight (geometry). Catalog also says hairpin. | medium |
| T2 | Turn 2 | Kink | T1 exit — back-straight complex, fastest sector | Turn 2 is a right from memory — right of the T2–T4 back-straight complex. | medium |
| T3 | Turn 3 | Sweeper | T2 exit | Turn 3 is a right from memory — right hairpin at the end of the back straight, passing zone. | medium |
| T4 | Turn 4 | Kink | T3 hairpin exit | Turn 4 is a left from memory — left sweeper out of the hairpin. | medium |
| T5 | Turn 5 | Corner / complex | T4 exit — infield starts; GPX-approximate from here | Turn 5 is a left from memory — left; verify on a Supercars / venue map. | low |
| T6 | Turn 6 | Kink | T5 exit | Turn 6 is a right from memory — right kink; verify. | low |
| T7 | Turn 7 | Corner / complex | T6 exit | Turn 7 is a left from memory — verify on the official National map. | low |
| T8 | Turn 8 | Corner / complex | T7 exit | Turn 8 is a right from memory — verify. | low |
| T9 | Turn 9 | Corner / complex | T8 exit | Turn 9 is a left from memory — verify. | low |
| T10 | Turn 10 | Corner / complex | T9 exit | Turn 10 is a right from memory — verify. | low |
| T11 | Turn 11 | Corner / complex | T10 exit | Turn 11 is a left from memory — left infield; verify. | low |
| T12 | Turn 12 | Corner / complex | T11 exit | Turn 12 is a right from memory — right before the final hairpin; verify. | low |
| T13 | Turn 13 | Hairpin | T12 exit | Turn 13 is a left from memory — final left hairpin onto the pit straight; exit drive is the lap. | medium |

## Sydney Motorsport Park (Brabham Circuit)

`smp_brabham` · anticlockwise · 18 board turns (catalog numbered corners: 11)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Sweeper | Main straight / start-finish — same T1 as Gardner | Turn 1 is a left from memory — same fast left as Gardner. | medium |
| T2 | Turn 2 | Hairpin | T1 exit | Turn 2 is a complex from memory — hairpin after T1; Gardner board says left, geometry says right. Lock before apply. | low |
| T3 | Turn 3 | Sweeper | T2 exit | Turn 3 is a complex from memory — left in the Brabham geometry notes. | medium |
| T4 | Turn 4 | Sweeper | T3 exit | Turn 4 is a complex from memory — right in the Brabham geometry notes. | medium |
| T5 | Turn 5 | Hairpin | T4 exit | Turn 5 is a complex from memory — left sweeper in the geometry notes (catalog says hairpin). | low |
| T6 | Turn 6 | Hairpin | T5 exit | Turn 6 is a complex from memory — right in the geometry notes. | medium |
| T7 | Turn 7 | Hairpin | T6 exit | Turn 7 is a complex from memory — Corporate Hill, long blind right over a rise. | medium |
| T8 | Turn 8 | Kink | Corporate Hill exit — Amaroo South extension begins in the geometry note | Turn 8 is a complex from memory — left as the southern extension starts. | low |
| T9 | Turn 9 | Hairpin | T8 exit | Turn 9 is a complex from memory — right in the geometry notes. | low |
| T10 | Turn 10 | Kink | T9 exit | Turn 10 is a complex from memory — left in the geometry notes. | low |
| T11 | Turn 11 | Hairpin | T10 exit | Turn 11 is a complex from memory — right in the geometry notes. | low |
| T12 | Turn 12 | Corner / complex | T11 exit — southern infield | Turn 12 is a complex from memory — left southern infield; verify on the official Brabham map. Track Details lists 18 dots vs geometry ~16. | low |
| T13 | Turn 13 | Corner / complex | T12 exit | Turn 13 is a complex from memory — right southern infield; verify. | low |
| T14 | Turn 14 | Corner / complex | T13 exit | Turn 14 is a complex from memory — left southern infield; verify. | low |
| T15 | Turn 15 | Corner / complex | T14 exit | Turn 15 is a complex from memory — right southern infield; verify. | low |
| T16 | Turn 16 | Corner / complex | T15 exit | Turn 16 is a complex from memory — geometry’s last left onto the main straight; extra board dots after this are unverified. | low |
| T17 | Turn 17 | Corner / complex | Beyond the 16-turn geometry count | Turn 17 is a complex from memory — no locked Brabham 17 in the geometry file. Do not invent a racing line. | low |
| T18 | Turn 18 | Corner / complex | Beyond the 16-turn geometry count | Turn 18 is a complex from memory — extra board dot after the geometry lap. Verify or drop before apply. | low |

## Sydney Motorsport Park (Druitt Circuit)

`smp_druitt` · anticlockwise · 9 board turns (catalog numbered corners: 6)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Kink | Main straight / start-finish — shared with Gardner | Turn 1 is a complex from memory — same fast left as Gardner. | medium |
| T2 | Turn 2 | Sweeper | T1 exit | Turn 2 is a complex from memory — right in the Druitt geometry notes. | medium |
| T3 | Turn 3 | Kink | T2 exit | Turn 3 is a complex from memory — left in the Druitt geometry notes. | medium |
| T4 | Turn 4a | Hairpin | T3 exit | Turn 4a is a complex from memory — first half of the northern-loop hairpin / T4 pair. | low |
| T4 | Turn 4b | Hairpin | T4a exit | Turn 4b is a complex from memory — second half of the T4 pair; not a separate official number. | low |
| T15 | Turn 15 | Corner / complex | Northern loop — board jumps to Gardner-style late numbers | Turn 15 is a complex from memory — Druitt board reuses late Gardner numbers; geometry’s northern loop is T5–T9. Verify against the official Druitt map. | low |
| T16 | Turn 16 | Corner / complex | T15 exit on this board | Turn 16 is a complex from memory — late Druitt board number; treat as northern-loop, not Gardner T16. | low |
| T17 | Turn 17 | Corner / complex | T16 exit on this board | Turn 17 is a complex from memory — late Druitt board number; verify. | low |
| T18 | Turn 18 (final) | Corner / complex | T17 exit on this board | Turn 18 is a complex from memory — board’s final onto the straight; geometry’s last Druitt is T9 left. | low |

## Sydney Motorsport Park (Gardner GP Circuit)

`smp_gardner` · anticlockwise · 11 board turns (catalog numbered corners: 11)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Sweeper | Main straight / start-finish — pit-wall end, old drag-strip bumps | Turn 1 is a left from memory — fastest SMSP corner, long fast left; do not over-slow. | high |
| T2 | Turn 2 (Southern Hairpin) | Hairpin | T1 exit — hard straight-line brake | Turn 2 is a left from memory on the Track Details board (Southern Hairpin). Geometry says a right hairpin — lock the hand before apply. | low |
| T3 | Turn 3 (medium-speed right over tunnel) | Corner / complex | T2 exit — first right of the lap in the ST guide, over the tunnel | Turn 3 is a right from memory — medium right over the tunnel; front light on the crest. | medium |
| T4 | Turn 4 (right-hand sweeper, Corporate Hill entry) | Sweeper | Tunnel / T3 exit | Turn 4 is a right from memory — Corporate Hill entry sweeper, early apex over an inside bump. | medium |
| T5 | Turn 5 | Corner / complex | T4 exit — keep tight to set the left flick | Turn 5 is a left from memory — fast left flick uphill, throttle early in the guide. | medium |
| T6 | Turn 6 (BMW / MotoRide corner) | Kink | T5 exit | Turn 6 is a left from memory — BMW / MotoRide, late apex; drive sets up the hill. | medium |
| T7 | Turn 7 (Corporate Hill) | Corner / complex | T6 drive — uphill, blind | Turn 7 is a right from memory — Corporate Hill, long blind right over a rise. Not a left. | high |
| T8 | Turn 8 (right kink / chute to T9) | Kink | Corporate Hill exit — short chute | Turn 8 is a right from memory on the board — slight kink toward the T9 hairpin. Geometry says left kink; verify. | low |
| T9 | Turn 9 (Hairpin) | Hairpin | T8 chute — downhill, very fast approach | Turn 9 is a right from memory — sharp hairpin at the bottom of the hill, outbrake zone. | high |
| T10 | Turn 10 | Corner / complex | T9 hairpin exit — reset left for the last corner | Turn 10 is a left from memory — left after the hairpin; high inside curb in the guide. | medium |
| T11 | Turn 11 (final corner) | Hairpin | T10 exit — late from the far right, V the corner | Turn 11 is a left from memory — final hairpin onto the main straight; off-camber, crest on exit. | high |

## The Bend Motorsport Park (GT Circuit)

`the_bend_gt` · clockwise · 35 board turns (catalog numbered corners: 9)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 (right sweeper / entry) | Sweeper | Main straight / start-finish | Turn 1 is a right from memory on this board — right sweeper / entry. Official 7.77 km GT T1 is a sharp right; confirm this dot is that corner. | low |
| T2 | Turn 2 (left hairpin) | Hairpin | T1 exit | Turn 2 is a left from memory on this board — left hairpin. Official GT T2 is a sweeping right — do not apply until the board is reconciled. | low |
| T3 | Turn 3 (right hairpin) | Hairpin | T2 exit | Turn 3 is a right from memory on this board — right hairpin (official GT T3 is a tight right). | low |
| T4 | Turn 4 (right sweeper / infield loop) | Sweeper | T3 exit | Turn 4 is a right from memory on this board — infield-loop sweeper (official GT T4 is a left kink). | low |
| T5 | Turn 5 (left hairpin) | Hairpin | T4 exit | Turn 5 is a left from memory on this board — left hairpin (official GT T5 is a long left sweeper). | low |
| T6 | Turn 6 (infield complex / esses) | Esses / S | T5 exit | Turn 6 is a complex from memory on this board — infield esses (official GT T6 is a right). | low |
| T7 | Turn 7 (right hairpin / back section) | Hairpin | T6 exit | Turn 7 is a right from memory on this board — right hairpin / back section (official GT T7 is a left). | low |
| T8 | Turn 8 (left hairpin) | Hairpin | T7 exit | Turn 8 is a left from memory on this board — left hairpin (official GT T8 is a right). | low |
| T9 | Turn 9 (right sweeper) | Sweeper | T8 exit | Turn 9 is a right from memory on this board — right sweeper (official GT T9 is a sharp right). | low |
| T10 | Turn 10 | Corner / complex | Official GT sector 2 — after T9 | Turn 10 is a left from memory on the 7.77 km GT participant map. This Track Details dot is evenly spaced — treat as unverified against the board. | low |
| T11 | Turn 11 | Corner / complex | Official GT T10 exit | Turn 11 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T12 | Turn 12 | Corner / complex | Official GT T11 exit | Turn 12 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T13 | Turn 13 | Corner / complex | Official GT T12 exit | Turn 13 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified. | low |
| T14 | Turn 14 | Corner / complex | Official GT T13 exit | Turn 14 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T15 | Turn 15 | Corner / complex | Official GT T14 exit | Turn 15 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T16 | Turn 16 | Corner / complex | Official GT T15 exit | Turn 16 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T17 | Turn 17 | Corner / complex | Official GT T16 exit | Turn 17 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified. | low |
| T18 | Turn 18 | Corner / complex | Official GT T17 exit | Turn 18 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T19 | Turn 19 | Corner / complex | Official GT T18 exit | Turn 19 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T20 | Turn 20 | Corner / complex | Official GT T19 exit | Turn 20 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T21 | Turn 21 | Corner / complex | Official GT T20 exit | Turn 21 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T22 | Turn 22 | Corner / complex | Official GT sector 3 — after T21 | Turn 22 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T23 | Turn 23 | Corner / complex | Official GT T22 exit | Turn 23 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified. | low |
| T24 | Turn 24 | Corner / complex | Official GT T23 exit | Turn 24 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T25 | Turn 25 | Corner / complex | Official GT T24 exit | Turn 25 is a right from memory — sharp on the 7.77 km GT map. Board placement unverified. | low |
| T26 | Turn 26 | Corner / complex | Official GT T25 exit | Turn 26 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T27 | Turn 27 | Corner / complex | Official GT T26 exit | Turn 27 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T28 | Turn 28 | Corner / complex | Official GT T27 exit | Turn 28 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T29 | Turn 29 | Corner / complex | Official GT T28 exit | Turn 29 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T30 | Turn 30 | Corner / complex | Official GT T29 exit | Turn 30 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T31 | Turn 31 | Corner / complex | Official GT T30 exit | Turn 31 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T32 | Turn 32 | Corner / complex | Official GT T31 exit | Turn 32 is a right from memory — tight on the 7.77 km GT map. Board placement unverified. | low |
| T33 | Turn 33 | Corner / complex | Official GT T32 exit | Turn 33 is a left from memory on the 7.77 km GT map. Board placement unverified. | low |
| T34 | Turn 34 | Corner / complex | Official GT T33 exit | Turn 34 is a right from memory on the 7.77 km GT map. Board placement unverified. | low |
| T35 | Turn 35 | Corner / complex | Official GT T34 exit | Turn 35 is a right from memory — onto the main straight on the 7.77 km GT map. Board placement unverified. | low |

## The Bend Motorsport Park (International Circuit)

`the_bend_international` · clockwise · 18 board turns (catalog numbered corners: 13)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 (Big Stop hairpin) | Hairpin | 1 km uphill main straight — crest then level, 300/200/100 boards on the left | Turn 1 is a right from memory — Big Stop hairpin, first-gear right, depth-perception trap on the wide entry. | high |
| T2 | Turn 2 | Kink | T1 hairpin exit — rise and dip | Turn 2 is a left from memory — first of the T2–T3 left-right; do not rush T2 and kill T3. | medium |
| T3 | Turn 3 | Corner / complex | T2 exit — bike still transitioning | Turn 3 is a right from memory — tight / hairpin-style right of the T2–T3 pair; exit drive matters. | medium |
| T4 | Turn 4 | Sweeper | T3 exit — short drive, almost flat | Turn 4 is a complex from memory — slight right kink, nearly flat-out; ST and geometry disagree on the hand (ST right kink vs geometry left kink). | low |
| T5 | Turn 5 | Sweeper | T4 kink — still quick, crest/drop | Turn 5 is a complex from memory — fast sweeper; ST says left, geometry says right kink. Camber falls off outside. | low |
| T6 | Turn 6 (long left hairpin, off-camber) | Hairpin | Short straight after T5 — 150/100 boards, hard brake | Turn 6 is a left from memory — long off-camber left that comes back on itself; do not hug inside too early. | high |
| T7 | Turn 7 | Esses / S | T6 exit — uphill, blind entry to the hardest sector | Turn 7 is a complex from memory — esses entry (guide: fast kink over a crest into 7–10). | medium |
| T8 | Turn 8 | Esses / S | T7 crest — still in the blind sequence | Turn 8 is a complex from memory — second esses element; one mistake cascades. | medium |
| T9 | Turn 9 | Corner / complex | T8 exit — start shedding speed | Turn 9 is a complex from memory — esses right, brush the brakes as you swap lean. | medium |
| T10 | Turn 10 | Esses / S | T9 exit — sequence tightens | Turn 10 is a complex from memory — esses exit, hug the right apex in the guide, then a short straight. | medium |
| T11 | Turn 11 (fast right after crest) | Sweeper | Short run after T10 — crest, stay left until the kerb appears | Turn 11 is a right from memory — fast right after a crest; tall inside kerb, do not turn in early. | high |
| T12 | Turn 12 (left, leads to back straight) | Corner / complex | T11 exit — quick downshift, little runoff on exit | Turn 12 is a left from memory — left onto the back straight; exit has no extra asphalt. | high |
| T13 | Turn 13 (hairpin end of back straight) | Hairpin | Back straight — uphill, on-camber entry | Turn 13 is a right from memory — hairpin at the end of the back straight; camber falls off on exit. | high |
| T14 | Turn 14 (right hairpin) | Hairpin | T13 exit — upright and brake immediately | Turn 14 is a right from memory — slow right hairpin, late apex, passing only if already alongside. | high |
| T15 | Turn 15 | Esses / S | T14 exit — S-pair starts | Turn 15 is a complex from memory — first of 15–16, tightens more than a kink. | medium |
| T16 | Turn 16 | Esses / S | T15 exit — use all the track, then left | Turn 16 is a complex from memory — second of the S; carry speed if T15 was honest. | medium |
| T17 | Turn 17 (right hairpin, heavy braking) | Hairpin | Short burst out of T16 — 100 m board, last-lap pass zone | Turn 17 is a right from memory — heavy-braking right hairpin. | high |
| T18 | Turn 18 (final left onto main straight) | Corner / complex | T17 exit — immediate left onto the 1 km straight | Turn 18 is a left from memory — flowing final left, ~120 km/h class in the guide; exit is the straight. | high |

## One Raceway (Wakefield Park)

`wakefield_park` · clockwise · 10 board turns (catalog numbered corners: 9)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 (Left Kink) | Kink | Main straight / start-finish | Turn 1 is a left from memory — left kink, setup not a hero stop. | medium |
| T2 | Turn 2 (Right Hairpin) | Hairpin | T1 kink exit | Turn 2 is a right from memory — right hairpin, first real stop. | medium |
| T3 | Turn 3 (Left Bend over Crest) | Corner / complex | T2 hairpin exit — uphill | Turn 3 is a left from memory — left over a crest, front can go light. | medium |
| T4 | Turn 4 (Left-hander) | Corner / complex | T3 crest exit | Turn 4 is a left from memory — second left, keep the bike settled. | medium |
| T5 | Turn 5 (Right-hander) | Corner / complex | T4 exit | Turn 5 is a right from memory — right-hander before the Fish Hook. | medium |
| T6 | Turn 6 (The Fish Hook) | Hairpin | T5 exit | Turn 6 is a complex from memory — Fish Hook entry, tight pair with T7. | medium |
| T7 | Turn 7 (The Fish Hook) | Hairpin | T6 Fish Hook entry exit | Turn 7 is a complex from memory — Fish Hook exit; catalog folds 6 & 7 together. | medium |
| T8 | Turn 8 (Left kink) | Kink | Fish Hook exit | Turn 8 is a left from memory — left kink, positioning for the fast right. | medium |
| T9 | Turn 9 (Fast Right Sweeper) | Sweeper | T8 kink exit | Turn 9 is a complex from memory — fast right sweeper; map lists complex. | medium |
| T10 | Turn 10 (Final Hairpin, The Sweeper) | Hairpin | T9 sweeper exit | Turn 10 is a left from memory — final hairpin (“The Sweeper” in the old guide), drive onto the straight. | medium |

## Wanneroo Raceway (Barbagallo)

`wanneroo` · clockwise · 7 board turns (catalog numbered corners: 8)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Cat Corner | Kink | Main straight / start-finish — ~800 m run, dip on turn-in | Turn 1 is a right from memory — Cat Corner, sweeping right, dusty/sandy runoff outside. | high |
| T2 | Turn 2 | Kink | Cat Corner exit — crest, bike can go light | Turn 2 is a complex from memory — usually a flat-out left link toward T3; positioning corner. | medium |
| T3 | Turn 3 | Kink | T2 exit — right-left combo starts | Turn 3 is a left from memory — first of the T3–T4 flick; map says left. | medium |
| T4 | Turn 4 | Hairpin | T3 exit — cut back toward the Basin | Turn 4 is a complex from memory — quick left of the T3–T4 pair in the guide; map lists complex. | medium |
| T5 | Turn 5 | Hairpin | T4 exit — short straight, brake for the Basin | Turn 5 is a right from memory — more a braking-zone / approach right than a slow hairpin. | medium |
| T6 | Kolb Corner (The Basin) | Hairpin | T5 downhill — rear goes light on the brakes | Turn 6 is a complex from memory — Kolb / The Basin, banked bowl, drop in and climb out. | high |
| T7 | Turn 7 (final onto main straight) | Kink | Basin climb-out — crest, then last corner onto the straight | Turn 7 is a left from memory — Track Details treats this as the last left onto the straight (guides often split T7 crest + T8 final sweeper). | medium |

## Winton Motor Raceway

`winton` · clockwise · 12 board turns (catalog numbered corners: 8)

| Turn | Label | Shape | Approach | Orientation | Conf |
| ---: | --- | --- | --- | --- | --- |
| T1 | Turn 1 | Chicane | BP Ultimate / main straight — opening esses in current memory | Turn 1 is a complex from memory — Motorsport News Esses entry; hand not locked. | medium |
| T2 | Turn 2 | Chicane | T1 esses entry exit | Turn 2 is a complex from memory — Esses exit onto the climb toward Honda. | medium |
| T3 | Turn 3 | Sweeper | Esses exit / old-grid run | Turn 3 is a left from memory — Honda Corner (PitBoard “Turn three” / old Turn 1). | medium |
| T4 | Turn 4 | Sweeper | Honda exit | Turn 4 is a right from memory — Nissan Corner, immediate right after Honda. | medium |
| T5 | Turn 5 | Hairpin | Foott Waste Straight | Turn 5 is a left from memory — Roll Over, long left, time-gain zone in PitBoard memory. | medium |
| T6 | Turn 6 | Corner / complex | Roll Over exit | Turn 6 is a right from memory — Penrite, sharp right before Kitome. | medium |
| T7 | Turn 7 (often grouped with 8–9) | Sweeper | T6 exit | Turn 7 is a left from memory — Kitome northern hairpin, passing spot. Board groups 7–9. | medium |
| T8 | Turn 8 (often grouped with 7–9) | Hairpin | Kitome exit / Shannons Straight in map memory | Turn 8 is a right from memory — Northern BM; linked riding in PitBoard. Exact National numbering can drift. | low |
| T9 | Turn 9 (often grouped with 7–8) | Corner / complex | T8 exit — eastern complex | Turn 9 is a complex from memory — Advanced Petroleum infield entry; approximate. | low |
| T10 | Turn 10 | Corner / complex | T9 exit | Turn 10 is a complex from memory — Advanced Petroleum mid; JSON sub-split, confirm on an official map. | low |
| T11 | Turn 11 | Corner / complex | Eastern complex exit | Turn 11 is a complex from memory — return / white-line discipline toward the S/F straight. | low |
| T12 | Turn 12 | Corner / complex | T11 exit | Turn 12 is a complex from memory — last link, trail-brake then open onto BP Ultimate Straight. | low |

