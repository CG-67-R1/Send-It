# AI enterprise watch 2026-08-29

## Headline

Limited progress. No architecture change for Send-It. Two environment items worth knowing: Grok 4.6 on AWS GovCloud Bedrock, and GitHub Copilot’s global model policy going GA.

## Outcomes (relevant only)

- **Grok 4.6 is now on Amazon Bedrock in AWS GovCloud (US)** (AWS What’s New, 28 Aug 2026). Same model family already used in Cursor. Useful if a future workload needs a **gov/regulated inference path**; it is **not** proof that xAI itself has FedRAMP High. **Supported.** Local fit: Watch, not switch Coach.
- **GitHub Copilot global model policy is generally available** (GitHub Changelog, 26 Aug; enforcement rolling through 1 Sep). Unconfigured GA models follow the org default (on). **Open-weight models and models that require data retention (explicitly including Fable 5) stay off by default.** Plugin marketplace `autoUpdate` can be set per extra marketplace. **Supported.** Local fit: only if Copilot is enabled on `CG-67-R1`; this repo is GitHub.com, not GHE Server.
- **Send-It Coach/Ask** is still documented as default `gpt-4o-mini`. That is behind current OpenAI enterprise lineup (GPT-5.5 / 5.6). **Inference** from `ENVIRONMENT.md` vs OpenAI’s current cards — not a this-week release. Action is optional: evaluate a current cheap OpenAI model for Coach **without** moving to retention-heavy or High-cyber models.

## No material change

- **OpenAI GPT-5.6 August ChatGPT update** — new Sol/Luna builds for ChatGPT; Codex/Work still on July GPT-5.6. Same Preparedness ratings (High cyber, High bio/chem). Not a new class of model. **Noise** for this app unless Coach is upgraded.
- **Anthropic Fable 5 / Mythos 5** — still the June 9 / July 1 story. Classifiers + 30-day retention on Fable 5; Mythos 5 is Glasswing/partner, not self-serve. **No step forward this week.**
- **Cursor Enterprise / CVP** — Opus 4.7/4.8/5 cyber-off for approved security groups; Mythos not in CVP; ZDR off for those requests. Unchanged this week.
- **Gemini Enterprise for Financial Services** (25 Aug, preview) — banking SKU + MCP connectors. **Not relevant** to RoadRacer.
- **Microsoft MAI-Cyber-1-Flash / Project Perception / MDASH** — real for M365 E5/security tenants. **Not relevant** to Expo/Render.

## Hype (unsubstantiated or recycled)

- Late-August pieces framing **Claude Fable 5 as a debut / first Mythos-class** — Fable 5 GA was **9 Jun 2026**, briefly suspended, restored **1 Jul**. “Mythos-class” is Anthropic’s product label, not an independent standard. Recycled.
- **“Physics of cyber have fundamentally changed” / autonomous AI attacking customers** (Microsoft Perception launch remarks) — unmeasured claim. Product is a vendor SOC/agent harness, not a new physics.
- **Cursor trusted by 64% of Fortune 500** — marketing on cursor.com/enterprise; not a release or a control you can use.
- Scoreboard dumps (DeepSeek V4 Pro, Nemotron, Muse Glimmer, “GPT-5.6 Cyber / Daybreak Red”) without official enterprise data-use terms — treat as **noise** until a trust-center or changelog listing exists.

## Local fit

- **Send-It:** Persist current Coach-on-OpenAI design. Watch a **mini-class** upgrade; do **not** put Fable 5 on the public Coach (retention). FM-ENT-012 / FM-ENT-020 — few high-value workflows; buy commodity chat, do not rebuild the stack for a weekly model name.
- **Cursor / GitHub / GHE:** Persist Cursor. If Copilot is ever enabled on the org, set Fable 5 **explicitly** (on only with a retention decision, or leave off). GHE Server: no action.
- **Cyber:** Persist defensive posture. CVP is only worth applying if you have a **Cursor Enterprise** security group doing dual-use defensive work and can accept Anthropic retention. FM-SEC-003 (data leak via prompts/logs), FM-SEC-004 (MCP supply chain). Do not chase Perception/MDASH without a Microsoft security tenant.

## Sources

- https://aws.amazon.com/about-aws/whats-new/2026/08/spacexai-grok-4-6-govcloud/
- https://x.ai/news/grok-4-6-microsoft-foundry
- https://x.ai/news/grok-4-6-vertex-ai
- https://github.blog/changelog/2026-08-26-global-model-policy-generally-available/
- https://github.blog/changelog/2026-06-09-claude-fable-5-is-generally-available-for-github-copilot/
- https://github.blog/changelog/2026-08-26-enterprise-managed-settings-now-support-autoupdate-for-plugin-marketplaces/
- https://deploymentsafety.openai.com/gpt-5-6-august-update
- https://openai.com/index/openai-available-at-fedramp-moderate/
- https://www.anthropic.com/news/redeploying-fable-5
- https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5
- https://cursor.com/docs/enterprise
- https://cursor.com/docs/account/enterprise/cyber-safeguards
- https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise-for-financial-services/
- https://microsoft.ai/news/introducing-mai-cyber-1-flash-inside-mdash/

## Honesty

- **Supported:** GovCloud Grok listing; Copilot global policy and Fable 5 retention default; Fable 5 June/July timeline; Cursor CVP scope; GPT-5.6 August system-card ratings.
- **Inference:** Coach still on `gpt-4o-mini` from `ENVIRONMENT.md` (Render env not re-read this run).
- **Unsupported:** that xAI has its own FedRAMP High; that Perception changes attacker physics.
- **Speculation:** none required for actions this week.
