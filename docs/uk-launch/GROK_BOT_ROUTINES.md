# RoadRacer_UK — routines to assign

Grok Bot: a **skill** is how to do the job; a **routine** is when it runs. Assign routines only after one manual run looks right. The bot **drafts**; you **post**. Time zone is **Europe/London** (UK paddock morning). If you read results from Australia, Monday 08:00 London is late afternoon AEST.

Open the RoadRacer_UK bot → paste a block below → confirm schedule, timezone, and “never post”. Then **Test run**. Manage later via View conversation details → Routines.

Do **not** assign auto-reply, auto-DM, fake-review, or “every new X post” listeners.

## Assign now (steady state)

Three routines. That is enough until the UK listing is live and you have used the Monday brief twice.

| # | Routine | When | Skill it runs | You do after |
|---|---------|------|---------------|--------------|
| 1 | Weekly exposure brief | Monday 08:00 | Scout last 7 days; rank ≤7; 0–3 actions | Pick 0–2 to act on |
| 2 | Partner calendar | Wednesday 08:00 | Next 14 days of MSV / No Limits / clubs / BSB | Approve one email or QR ask, or skip |
| 3 | Weekend circuit brief | Friday 08:00 | This weekend’s circuits + 3 unpublished hooks | Post at most one helpful reply, or save a clip idea |

### 1 — Create: Weekly exposure brief

```text
Create a routine owned by this Bot.

Name: Weekly exposure brief
Schedule: every Monday at 08:00, Europe/London
Do: run MODE:SCOUT for the last 7 days on X and the open web.

Inputs: UK launch state from the latest knowledge card in this chat (not live / TestFlight / App Store live / Play also live). If missing, assume not live and say so.

Watch: first/novice track days; Brands Hatch, Donington, Cadwell, Silverstone, Snetterton, Oulton, Thruxton, Knockhill, Anglesey, Mallory Park; BSB; Bemsee; Thundersport GB; NG Road Racing; No Limits; MSV Bike Trackdays; MCN; BikeSocial; Visordown; ACU CTC/BRA; riders asking how to learn a circuit or keep notes between sessions.

Return in this conversation only:
- Headline (1 line)
- Top opportunities ≤7: who/where, link, why now, score 1–5, confidence tag, suggested move, unpublished hook
- Do not pitch
- Actions for the human (0–3)

Never: post, reply, DM, email, follow, leave a review, or invent a Play app id / X handle.
If sources are down or empty: post “no usable sources this week” and stop. Do not reuse last week’s list.
Skip: crashes, fatalities, pile-ons, licence rows, politics, MotoGP-only vanity.
```

### 2 — Create: Partner calendar

```text
Create a routine owned by this Bot.

Name: Partner calendar
Schedule: every Wednesday at 08:00, Europe/London
Do: check official calendars for the next 14 days only.

Sources (official pages, not forums):
- https://bike.msvtrackdays.com
- https://www.nolimitstrackdays.com
- https://www.bemsee.net
- https://www.thundersportgb.com
- https://www.ngroadracing.org
- https://www.britishsuperbike.com
- https://www.acu.org.uk

Return in this conversation only:
- Table: date, venue, operator/club, why it fits Track Walk / Coach, suggested ask (QR on briefing / 10-min demo / paddock flyer)
- At most one unpublished 150-word email draft if a new high-fit date appeared
- 0–2 actions for the human

Never: send the email, claim a partnership, invent dates, or contact anyone.
If a calendar page fails: name the URL and skip that row. Do not guess the date.
```

### 3 — Create: Weekend circuit brief

```text
Create a routine owned by this Bot.

Name: Weekend circuit brief
Schedule: every Friday at 08:00, Europe/London
Do: MODE:SCOUT the last 72 hours plus this coming weekend’s UK bike track days and club/BSB meetings.

Prefer circuits we can name in the app: Brands Hatch, Donington, Cadwell Park, Silverstone, Snetterton, Oulton Park, Thruxton, Knockhill, Anglesey, Mallory Park.

Return in this conversation only:
- Which circuits are live this weekend
- Top 5 brand-safe conversations (link, score, why)
- 3 unpublished hooks: helpful-only, soft Track Walk mention, one-line App Store CTA (only if launch state is App Store live)
- Do not pitch list

Never: post or reply. Skip crash/fatality threads.
If nothing UK and on-circuit this weekend: say “quiet weekend” and stop.
```

## Assign by phase

| Phase | Keep | Add | Pause |
|-------|------|-----|--------|
| Soft launch / TestFlight | 1, 2 | — | 3 if you will not be at a circuit |
| Launch week (listing goes live) | 1, 2, 3 | **4 — Launch-week daily** for 7 days | Pause 4 on day 8 |
| Steady live | 1, 2, 3 | **5 — BSB Saturday pulse** only on BSB weekends | Keep 5 paused in empty weeks |
| Quiet winter | 1, 2 | — | Pause 3 and 5 |

### 4 — Create: Launch-week daily (temporary)

Enable the day the UK App Store listing goes live. Pause after seven runs.

```text
Create a routine owned by this Bot.

Name: Launch-week daily
Schedule: every day at 08:00, Europe/London, for the next 7 days only
Do: MODE:SCOUT the last 24 hours. Same watchlist as Weekly exposure brief.

Return: top 5 opportunities, 1 unpublished reply if score ≥4, 0–2 actions.
Never: post. After the 7th run, pause this routine and say “launch-week daily complete — resume Monday weekly only.”
If launch state is still not live: skip and say so.
```

### 5 — Create: BSB Saturday pulse (seasonal)

Create it now, **leave it paused**. Enable the Friday before a BSB round; pause Sunday night.

```text
Create a routine owned by this Bot. Leave it paused until I enable it.

Name: BSB Saturday pulse
Schedule: Saturday 08:00, Europe/London
Do: MODE:SCOUT last 72 hours of paddock, support-class, and track-day-adjacent talk for this weekend’s BSB circuit.

CTA if any: “save notes between sessions” — never “official BSB app”.
Return: ranked sampling / flyer / creator-clip chances ≤5, plus 2 unpublished hooks.
Never: post. Skip crashes and fatalities.
If there is no BSB round this weekend: post “no BSB this weekend” and stop.
```

## Do not assign

| Tempting routine | Why not |
|------------------|---------|
| Auto-reply / auto-like / follow-unfollow | Human posts only; looks like spam |
| “Every new mention of Brands Hatch” | Too broad; burns usage; pitches into pile-ons |
| Daily forever after launch week | Noise. Monday + Friday is enough |
| Review App Store / Play every night | Play id is not in the repo; listing review is on-demand `MODE:REVIEW` |
| Coach / tyre-pressure answers | Wrong bot — that is the UK Coach GPT |
| TT / NW200 “roads coach” content | Culture only; do not sell the app as a public-road coach |

On-demand only (no schedule): `MODE:REVIEW` on listing/flyer copy, `MODE:DRAFT` for one operator email, `MODE:DRAFT` for one X reply you already chose.

## After you paste a create-routine block

1. Confirm owning bot = RoadRacer_UK, timezone = Europe/London.
2. Confirm approval boundary: **never send, post, or email**.
3. **Test run** on a quiet input. Check it stopped without posting and named sources.
4. Enable. If a source site changes layout, test again.

Save a skill only after a manual run you liked:

```text
Save the process we just used as a skill called “{routine name}”.
Include sources, scoring, output format, skip list, and the rule that posting always needs my approval.
```
