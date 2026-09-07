# AI enterprise watch 2026-08-30

## Headline
**OpenAI terminates Cursor contract** (Nov 12, 2026 shutoff) — largest workspace-relevant event this cycle. GitHub Copilot converging to unified agent experience with data-retention policy change by Sep 28.

## Outcomes (relevant only)

### 1. OpenAI → Cursor contract termination (P0 for this workspace)
- **Date:** Aug 28, 2026  
- **Source:** [openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/](https://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/) — **Supported**  
- OpenAI notified SpaceX it will wind down its Cursor contract. Proposed shutoff: **November 12, 2026**. Rationale: xAI (now part of SpaceX) admitted under oath to violating OpenAI ToS; Musk's companies have prior contract breaches; OpenAI also cited its upcoming `Astra` model and dual-use accountability duties.  
- **Impact for this workspace:** GPT-4o, GPT-4.1, GPT-5.6 series will cease to be available in Cursor from Nov 12. Cursor will need to pivot to Anthropic, xAI (Grok), MAI, or other providers — or broker a new agreement. The shutoff does **not** affect the Send-It Render API (`OPENAI_MODEL` in `.env`) because that calls the OpenAI API directly, not through Cursor.  
- **Action window:** ~10 weeks. Watch Cursor for its provider roadmap response.

### 2. GitHub Copilot: unified experience + data-retention change (admin action needed by Sep 28)
- **Date:** Aug 28, 2026  
- **Source:** [github.blog/changelog/2026-08-28-upcoming-changes-to-github-copilot-policies-and-billing](https://github.blog/changelog/2026-08-28-upcoming-changes-to-github-copilot-policies-and-billing) — **Supported**  
- Copilot Chat (github.com + Mobile) and Copilot cloud agent will merge into a **single unified experience** no earlier than Sep 28. Key change: **chat data retained for life of account** (was 28 days). This is a data-governance change for any org with Copilot enabled.  
- Billing: Copilot Business/Enterprise sign-ups reopen Sep 1; new upfront-per-seat billing from Sep 1 (new seats) and Oct 1 (existing). Code review default shifting from Lite → Balanced (Sep 28).  
- **Impact:** `CG-67-R1/Send-It` is on GitHub.com. If Copilot is enabled on the org, the data-retention change from 28 days → indefinite is a governance trigger. Admins should review the unified experience policy before Sep 28 and decide opt-in/opt-out explicitly.

### 3. GitHub Copilot weekly releases (Aug 24): MCP + Slack/Teams agents GA
- **Source:** [github.blog/changelog/2026-08-28-github-copilot-weekly-releases-august-24](https://github.blog/changelog/2026-08-28-github-copilot-weekly-releases-august-24) — **Supported**  
- Copilot app Customize tab GA (MCP servers, plugins, skills, canvases in one place). Copilot in Slack/Teams now supports shared agent sessions. Copilot CLI on native Rust runtime (faster). JetBrains enterprise controls for plugins, MCP, telemetry, and agent permissions now enforced.  
- Copilot code review now handles bot-authored PRs (including Copilot cloud agent PRs) and very large PRs (>300 files / >20,000 lines).  
- **Impact:** If this org enables Copilot Business/Enterprise, the JetBrains enterprise controls and expanded code review are meaningful. No immediate action for this GitHub.com-only repo.

### 4. Cursor Enterprise: HIPAA BAA + OpenTelemetry Export (new)
- **Source:** [cursor.com/docs/enterprise](https://cursor.com/docs/enterprise) — **Supported (doc observation)**  
- Cursor Enterprise docs now list HIPAA BAA and OpenTelemetry Export as enterprise-tier capabilities alongside existing SOC 2 Type II, GDPR DPA, SSO/SCIM, Privacy Mode, and CVP. Inference: regulatory surface area expanding.  
- **Impact:** Useful only if org has HIPAA compliance duties. No action for Send-It Render/Vercel/EAS stack.

### 5. Microsoft MAI-Code-1.1-Flash (new coding model)
- **Source:** [microsoft.ai/news/mai-code-1-1-flash-br-better-faster-at-a-quarter-of-the-cost/](https://microsoft.ai/news/mai-code-1-1-flash-br-better-faster-at-a-quarter-of-the-cost/) — **Supported (headline; full post not fetched)**  
- Microsoft's own MAI coding model at 1/4 the cost. Available in GitHub Copilot and Excel. Context: Microsoft is hill-climbing its own models into Copilot to reduce dependency on OpenAI — likely accelerated by the xAI/SpaceX dynamic.  
- **Impact:** If GitHub Copilot is adopted, MAI-Code-1.1-Flash may become the default code-completion model at lower cost. No action until org enables Copilot.

## No material change

- **OpenAI** — No new model GA since GPT-5.6 (last week). "Jalapeño" inference chipset announced (Aug 25) — infrastructure news, not a model capability change. Thailand startup fund = noise.
- **Anthropic** — Model Hardware Standard (MHS) preview (Aug 27): specification for AI agents to operate physical lab equipment (microscopes, liquid handlers, robotic arms) via MCP. Research labs only; **not** an enterprise software or coding capability. No new Claude model GA.
- **Anthropic text watermark** (Aug 14) — Claude-generated text now carries an invisible watermark. Inference: relevant to content authenticity; not a capability change for Send-It Coach/Ask.
- **Google** — No new Gemini Enterprise GA this week. Vertex AI model drops (Cosmos3, Muse-Glimmer, Qwen) on SageMaker JumpStart = SageMaker noise.
- **Amazon Bedrock** — Grok 4.6 GovCloud listing already noted last week (Aug 28 listing confirmed). AgentCore Memory fine-grained access control + namespace variables (Aug 28) — Bedrock agentic feature, not relevant to this stack. AWS Transform FedRAMP Class C (Aug 28) — AWS infra service, not AI model.
- **SpaceXAI/xAI** — Grok Bot (Aug 11/29): consumer X-integration multi-agent product. No enterprise data-retention agreement. Grok 4.6 marketplace expansion (Foundry, Gemini, Bedrock, GitHub Copilot) already covered last week. Note: xAI is now the replacement model provider in Cursor following the OpenAI shutoff announcement.
- **Mistral / Cohere / IBM** — No material fetch this week.

## Hype (unsubstantiated or recycled)

- **"Physics of cyber have fundamentally changed"** — Microsoft launch rhetoric around MAI-Cyber-1-Flash / Perception / MDASH. No independent verification that autonomous AI attacks are now the dominant threat vector. **Hype** (recycled from prior Microsoft Security blog language).
- **OpenAI "Astra" references** — OpenAI's Aug 28 statement mentions upcoming model "Astra" in context of dual-use accountability. No capability claims assessed yet; insufficient public detail to evaluate. **Speculation** — do not treat as a new class of capability until system card published.
- **Grok Bot "always-on agents"** — Consumer product with no enterprise DPA, no SSO, no admin controls. Not enterprise-approvable. **Consumer noise** until xAI publishes an enterprise data-use agreement for Grok Bot.
- **Anthropic MHS "bridging the gap between hardware, scientists, and models"** — Lab automation for scientific research orgs. Marketing-adjacent framing for a niche integration standard. **Not relevant** to software/app development stacks; not hype exactly but not a send-it/Cursor capability.
- **MAI-Image-2.6 "No. 2 on Arena"** — Arena leaderboard ranking is not an enterprise approval signal. **Noise** for this stack.

## Local fit

- **Send-It Coach/Ask:** No change. API still calls OpenAI directly (`OPENAI_MODEL`, default `gpt-4o-mini`). OpenAI shutoff of Cursor does **not** affect the Render API key. No model change recommended — avoid Fable 5 (prompt retention), avoid GPT-5.6 High-cyber (dual-use friction). `gpt-4o-mini` remains valid at current cost/quality level.
- **Cursor / GitHub / GHE:** **P0 attention item** — OpenAI models will be unavailable in Cursor from Nov 12, 2026. Cursor will pivot to Grok (xAI is already SpaceX), Anthropic, or MAI. Current Cursor Privacy Mode + CVP for Anthropic models (Opus 4.7/4.8/5) remain valid. Watch Cursor's response to the shutoff. GitHub Copilot data-retention policy change (Sep 28) requires admin review if Copilot is enabled on `CG-67-R1`.
- **Cyber (defensive):** OpenAI's stated accountability over "Astra" (dual-use) suggests future models will carry higher friction for security-adjacent tasks. Anthropic text watermarking (Claude outputs now watermarked) is relevant for any content pipeline. No new CVP/ZDR changes this week.

## Sources
- [OpenAI: Our decision on Cursor following its acquisition by SpaceX](https://openai.com/index/our-decision-on-cursor-following-its-acquisition-by-spacex/) — Aug 28, 2026
- [OpenAI News feed](https://openai.com/news/) — fetched Aug 30, 2026
- [Anthropic Newsroom](https://www.anthropic.com/news) — fetched Aug 30, 2026
- [Anthropic: Model Hardware Standard preview](https://www.anthropic.com/news/model-hardware-standard-research-preview) — Aug 27, 2026
- [GitHub Changelog](https://github.blog/changelog/) — fetched Aug 30, 2026
- [GitHub: Upcoming changes to Copilot policies and billing](https://github.blog/changelog/2026-08-28-upcoming-changes-to-github-copilot-policies-and-billing) — Aug 28, 2026
- [GitHub: Copilot weekly releases Aug 24](https://github.blog/changelog/2026-08-28-github-copilot-weekly-releases-august-24) — Aug 28, 2026
- [GitHub: Copilot code review expanded capabilities](https://github.blog/changelog/2026-08-27-copilot-code-review-resolution-reasons-and-expanded-capabilities) — Aug 27, 2026
- [AWS What's New](https://aws.amazon.com/new/) — fetched Aug 30, 2026
- [xAI / SpaceXAI news](https://x.ai/news) — fetched Aug 30, 2026
- [Microsoft AI news](https://microsoft.ai/news/) — fetched Aug 30, 2026
- [Cursor Enterprise docs](https://cursor.com/docs/enterprise) — fetched Aug 30, 2026

## Honesty
- OpenAI contract termination: **Supported** (official OpenAI blog post, verbatim Nov 12, 2026 shutoff date)
- GitHub Copilot data-retention change: **Supported** (official GitHub Changelog)
- Cursor HIPAA BAA / OpenTelemetry: **Supported** (doc observation, not a press announcement)
- MAI-Code-1.1-Flash cost claim ("quarter of the cost"): **Supported** (Microsoft AI headline; full post not fetched — exact benchmark basis not verified)
- OpenAI "Astra" future model: **Speculation** — referenced in contract letter, no public system card
- Anthropic MHS not relevant to software stacks: **Inference**
- Grok Bot enterprise unapproved: **Supported** (no enterprise DPA/SSO in any fetched page)
