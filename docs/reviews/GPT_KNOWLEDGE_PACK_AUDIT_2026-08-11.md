# GPT Knowledge Pack Audit — 2026-08-11

Source: Hermes `gpt-knowledge-pack-audit`  
Pack: `docs/gpt-knowledge/`  
Result (original): **P0=1  P1=4  P2=5**  
Remediation (Cursor): **all findings closed 2026-08-11**

---

## Remediation status

| ID | Finding | Status | Fix |
|----|---------|--------|-----|
| P0-1 | Phantom `MODE:COACH\|RIDER` | **FIXED** | `instructions.md` → `MODE:FULL \| MODE:COACH \| MODE:SUSPENSION` |
| P1-1 | Fake standalone technique extracts | **FIXED** | `technique-by-improvement.md` → stub refs to `riding-techniques-combined.md` |
| P1-2 | Missing `overtaking-techniques.md` in missing-list | **FIXED** | Added to `coaching-knowledge-base-index.md` |
| P1-3 | `geometry-calculations.md` absent from authority order | **FIXED** | In README authority order + upload-everything checklist |
| P1-4 | Diagnostic key `smspr` | **FIXED** | Renamed to `smsp`; geometry note points at `sydney_motorsport_park` |
| P2-1 | Bend West turn_count 12 vs array 11 | **FIXED** | `turn_count_official=12`, `turn_count_in_array=11` + numbering note |
| P2-2 | QR all-R without caveat | **FIXED** | `meta.l_r_note` on `queensland_raceway_national` |
| P2-3 | Active refs to missing Track_Riding KB | **FIXED** | Inline `(not in pack — do not invent)` |
| P2-4 | Coverage gap undocumented | **FIXED** | Tables in README + coaching index |
| P2-5 | Stub file no hallucination guard | **FIXED** | Header on `riding-techniques-combined.md` |

### Extra (beyond Hermes audit — GPX session regression)

| Issue | Status | Fix |
|-------|--------|-----|
| Mallala geometry marked anticlockwise / hands nulled or inverted | **FIXED** | Clockwise; rider-locked T2 L, T3 R, T6 L, T7 R |
| Track KB said SMSP layouts “when added” | **FIXED** | Points at `sydney_motorsport_park` + key `smsp` |

---

## Original findings (Hermes)

## P0

P0-1: instructions.md line 17 — phantom MODE:RIDER mode

  MODE:FULL (default) | MODE:COACH|RIDER | MODE:SUSPENSION

The pipe reads as if COACH and RIDER are two alternatives, making RIDER appear to be a valid
mode token. Line 18 contradicts immediately with [[TR_MODE:FULL|COACH|SUSPENSION]] (three
variants only). MODE:RIDER does not exist anywhere else in the pack. A user or app sending
[[TR_MODE:RIDER]] has no defined handler.

Fix: instructions.md line 17 — change to:
  MODE:FULL (default) | MODE:COACH | MODE:SUSPENSION
Drop |RIDER — COACH is the coaching-only mode; RIDER is not a separate token.

---

## P1

P1-1: technique-by-improvement.md lines 24, 32, 66, 81, 98 — "Extracted: body-position.md /
braking-techniques.md" implies standalone files that do not exist.

Neither body-position.md nor braking-techniques.md exists as a standalone file. The content
lives as thin stubs inside riding-techniques-combined.md. The GPT will tell riders it cannot
access "body-position.md" or silently hallucinate it.

Fix: Replace all "Extracted: <file>" references with:
  "Stub in: riding-techniques-combined.md (full extract not yet in pack)"

P1-2: coaching-knowledge-base-index.md §"Missing from this pack" omits overtaking-techniques.md.

riding-techniques-combined.md has a fourth stub section ## overtaking-techniques.md.
It is not listed as missing, so the GPT has no guard against inventing overtaking content.

Fix: Add to §"Missing from this pack":
  - overtaking-techniques.md (stub header only in riding-techniques-combined.md; full extract not in pack)

P1-3: geometry-calculations.md absent from README authority order AND from README upload checklist.

coaching-knowledge-base-index.md lists it in the upload table but README §"Authority order"
and the README upload section do not mention it. An operator following only the README would
not upload it.

Fix: README.md §"Authority order" — add:
  → geometry-calculations.md  (chassis maths reference; illustrative, not prescriptive)

P1-4: TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json key "smspr" — trailing 'r' mismatch.

All other references use "SMSP". Key-based lookups for "smsp" or "sydney_motorsport_park"
will not match "smspr" and the coaching bias will silently not apply.

Fix: Rename key "smspr" to "smsp". Add geometry_note that SMSP layouts are not yet in
track_geometry_australia.json (the MD file warns about this; the JSON is silent).

*(Note: after 2026-08-11 GPX geometry add, SMSP layouts ARE in geometry under `sydney_motorsport_park`; remediation updated the note accordingly.)*

---

## P2

P2-1: Bend West turn_count=12 declared, array has 11 entries (T10 skipped per official map).

numbering_note documents the skip. But declared turn_count=12 vs array length=11 means any
code or GPT counting array elements sees 11 and may think there is an error.

Fix: track_geometry_australia.json "bend_west_3410m" — either set turn_count=11 with a note
that the official map numbering runs to 12 with a gap, or add turn_count_official=12 /
turn_count_in_array=11 fields.

P2-2: Queensland Raceway National — all 6 turns listed as "R" with no uncertainty caveat.

map_source_note says "PNG export... map date August 11 2009" (pre-2011 resurface). No
l_r_note or uncertainty flag in meta. All other tracks with uncertain L/R data have explicit
caveats (One Raceway, Broadford).

Fix: track_geometry_australia.json "queensland_raceway_national" meta — add:
  "l_r_note": "All turns show R from 2009 map — verify against current layout; track resurfaced 2011."

P2-3: technique-by-improvement.md lines 10, 31 — active-looking references to Track_Riding_KB_AllTracks_v1.md.

Body text reads:
  Track-Specific: Reference points in Track_Riding_KB_AllTracks_v1.md
  Track-Specific: Brake markers in Track_Riding_KB_AllTracks_v1.md

A GPT scanning these early in context may attempt retrieval. The footer disclaimer (line 121)
correctly flags it as missing but is too late in the file.

Fix: Add "(not in pack — do not invent)" inline at each occurrence.

P2-4: Track coverage gap not documented.

Diagnostic JSON covers: mallala, smspr, phillip_island, broadford, mac_park.
Geometry JSON covers: one_raceway, winton, broadford, phillip_island, hidden_valley, qr_national, the_bend.
Only broadford and phillip_island are in both. Riders at Winton, QR, Bend etc. get no
coaching bias — silently.

Fix: README.md or coaching-knowledge-base-index.md — add a coverage table.

P2-5: riding-techniques-combined.md has zero-content stubs (overtaking: header only;
braking/cornering: one-line description). No GPT guard against hallucination at the top of
the file.

coaching-knowledge-base-index.md correctly labels it "Stub — limited detail". But the file
itself has no self-protecting header.

Fix: Add at top of riding-techniques-combined.md:
  "Content stubs only. GPT must not fill gaps from general knowledge.
  State 'full technique guides not in this pack' for any detail request beyond what is written here."

---

## Confirmed OK (Hermes + post-fix recheck)

JSON validity: all 5 live JSON files parse.
Upload checklist: all 17 checklist files present.
map_zone / rider-view naming: instructions prohibit echoing compass labels.
MODE map: FULL / COACH / SUSPENSION only.
No-invent + fix-priority chain: consistent.
Turn counts: Bend West documented mismatch only; all others match.
Stub missing-list: body-position, cornering, braking, overtaking all listed.
