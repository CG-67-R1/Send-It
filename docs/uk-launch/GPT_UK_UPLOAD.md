# UK Custom GPT — upload checklist

Create a **separate** ChatGPT Custom GPT (e.g. “RoadRacer Track Coach UK”) sharing modes with the AU GPT.

## Instructions

Paste BEGIN…END from [`instructions-uk.md`](../gpt-knowledge/instructions-uk.md).

## Knowledge uploads (UK replica + shared engine)

**UK-specific**

- `instructions-uk.md` (optional as Knowledge; Instructions field is enough for the short block)
- `track_geometry_uk.json`
- `TRACK_SPECIFIC_DIAGNOSTIC_UK_v1.json`
- `Track_Knowledge_Base_UK_v2.md`

**Shared with AU (do not fork)**

- `instructions-extended.md`
- `core-diagnostic-pack-v2.1.json`
- `rider-skill-interaction-layer.json`
- `session-learning-v1.json`
- `tire-pressure-weather-troubleshooting-guide.md`
- `tire-wear-patterns-comprehensive.md`
- `tyre-wear-photo-recognition.md`
- `bridgestone-race-tyre-data-extract.md`
- `bike-category-reference.md`
- `geometry-calculations.md`
- technique index / stubs if present

**Do not upload AU-only track files** into the UK GPT (`track_geometry_australia.json`, `TRACK_SPECIFIC_DIAGNOSTIC_AU_v1.json`, `Track_Knowledge_Base_Australia_v2.md`).

## App alignment

In-app Coach/Bike Setup uses [`packs/regions/uk/ai/prompts.json`](../../packs/regions/uk/ai/prompts.json) when the UK pack is primary or selected via pack loader — separate from ChatGPT Knowledge.
