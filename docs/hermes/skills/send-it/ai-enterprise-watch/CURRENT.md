# AI enterprise watch — current landscape

**As of:** 2026-09-06  
**Owner:** weekly-watch rewrites this file. Do not leave stale versions in SKILL.md.

## Headline this week

**GPT-6 Astra GA + Claude Fable/Mythos 5.1 GA — two frontier launches in one week, both in GitHub Copilot within days.** Cursor self-hosted machines add a data-residency-safe agentic tier. No change to Send-It Coach/Ask (`gpt-4o-mini` on Render).

## Enterprise-approvable players (status)

| Player | Enterprise path (supported) | This week |
|--------|------------------------------|-----------|
| **OpenAI** | ChatGPT Enterprise / API; FedRAMP 20x Moderate ([announcement](https://openai.com/index/openai-available-at-fedramp-moderate/)) | **3 Sep:** GPT-6 Astra GA — rolling to Plus/Pro/Business/Enterprise + API + Azure + Bedrock. System card published. 0% honeypot scope-override (vs 48% GPT-5.6 Sol). In GitHub Copilot as of 4 Sep. Daybreak for Frontline Defenders: $1B subsidized defensive-cyber access (MS-ISAC pilot). Does not affect Send-It Coach/Ask (`gpt-4o-mini`). |
| **Anthropic** | Claude Enterprise; API; Bedrock / Vertex / Foundry. EFS (Enterprise Frontier Safeguards) rolling out fall 2026 | **1 Sep:** Fable 5.1 + Mythos 5.1 GA. ~25% cheaper (≤45% agentic). EFS announced: customer-controlled cloud storage replaces Anthropic-held retention — ZDR-equivalent privacy + cross-session misuse detection. 60% fewer cyber false positives. Fable 5.1 in GitHub Copilot (Sep 1). Interim: eligible customers get ZDR on Fable 5/5.1. |
| **Google** | Gemini Enterprise / Vertex; industry SKUs | Gemini 3.8 Flash added to GitHub Copilot (Sep 3, GA). No new Vertex enterprise compliance change. |
| **Microsoft** | M365 Copilot, Foundry, Security Copilot | MAI-Transcribe-2 and MAI-Image-2.6 announced on microsoft.ai — no new enterprise-approval integration. MAI-Code-1.1-Flash and MAI-Cyber-1-Flash (MDASH) from last cycle. |
| **Amazon** | Bedrock (+ GovCloud) | No new AI model or GovCloud listing this week. Infrastructure updates (SageMaker, EC2) only. |
| **GitHub Copilot** | Business / Enterprise admin policies | **4 Sep:** GPT-6 Astra GA in Copilot. **3 Sep:** Gemini 3.8 Flash added; model deprecations Oct 2 (Gemini 3.5/3.6 Flash, Kimi K2.7 Code, Claude Opus 4.7). **2 Sep:** Enterprise-managed default model GA (any model, per-team via managed.json). Content exclusions GA in app + CLI. **1 Sep:** Claude Fable 5.1 GA. Copilot code review can now approve PRs (off by default, admin-controlled, public preview). |
| **Cursor** | Teams / Enterprise: SSO, Privacy Mode, MCP trust, SOC 2, GDPR DPA, HIPAA BAA, OpenTelemetry Export. Enterprise-only: CVP | **2 Sep:** Self-hosted machines GA — tool execution stays inside your network (AWS Lambda, Coder, Cloudflare, Daytona, Modal, Namespace, Vercel, E2B). Dynamic pool scheduling with hibernate/restore. Computer use on Linux/Mac for self-hosted workers. OpenAI model shutoff Nov 12 still pending; no official Cursor pivot announcement yet. |
| **SpaceXAI Grok** | Via Cursor (until Nov 12); Foundry; Bedrock GovCloud | No new enterprise DPA or Foundry listing. xAI remains probable post-shutoff Cursor provider — Watch. |
| **Mistral / Cohere / IBM** | EU / IBM-shop | No material fetch this week. |

## Local fit (Send-It / Cursor / GitHub)

- **Send-It Coach/Ask** — `OPENAI_MODEL` default `gpt-4o-mini` in `ENVIRONMENT.md`. OpenAI API (Render) is **unaffected** by Astra launch and Cursor shutoff. Do not move Coach to Astra or Fable 5.1 without evaluating cost and EFS readiness.
- **Cursor** — P0 transition window: OpenAI models unavailable in Cursor from **Nov 12, 2026**. No official Cursor provider pivot yet. Anthropic (Fable 5.1 via CVP) already works and is now cheaper. Self-hosted machines add a data-residency-safe option for enterprise agentic workflows. Check if any Cursor config pins Opus 4.7 (deprecated Oct 2 in Copilot).
- **GitHub.com `CG-67-R1/Send-It`** — Copilot model deprecation Oct 2: Opus 4.7, Gemini 3.5/3.6 Flash, Kimi K2.7 Code. If Copilot is enabled, admin must check model policies. Copilot PR approval is public preview (off by default — admin action needed to enable).

## Cyber (defensive)

- GPT-6 Astra: 0% honeypot scope-override vs 48% for GPT-5.6 Sol — meaningful alignment signal for agentic security. ExploitBench 100% score (dual-use flag: treat as indicator of capability, not endorsement).
- Fable 5.1: 60% fewer false positives in cybersecurity tasks. Vulnerability discovery (not exploit development) unlocked.
- EFS (Anthropic): resolves the ZDR vs. frontier-safeguards dilemma for regulated enterprise. Customer-controlled cloud infra.
- Daybreak for Frontline Defenders: OpenAI subsidized cyber-AI access for critical infrastructure orgs. 35+ enterprise partner products.
- Cursor CVP: Covers Fable 5.1 (upgraded from 4.x). ZDR off when Cyber mode on — unchanged.
- GitHub Copilot data retention: chat retained for account lifetime (was 28 days since Aug 28 change). Review governance posture if Copilot is or will be enabled.

## Hype to ignore (until official + local fit)

- "World's most intelligent and aligned model" — OpenAI Astra self-reported; no independent auditor.
- "Physics of cyber have fundamentally changed" — Microsoft MAI-Cyber-1-Flash MDASH rhetoric.
- "Fastest, most accurate and cheapest speech recognition in the world" — MAI-Transcribe-2, no independent benchmark.
- OpenAI "$1B Daybreak" — bundles subsidized access + in-kind; not a cash commitment.
- Anthropic MHS "bridging hardware and scientists" — physical lab automation; irrelevant to coding stacks.
- Gemini vertical SKUs ("Gemini for banks") — no enterprise-approval change for this workspace.
- Open-weight model dumps on SageMaker JumpStart (Cosmos3, Muse-Glimmer, Qwen variants) — no enterprise data-use agreements.

## Changelog (last 8 weeks)

| Date | Change |
|-------|--------|
| 2026-09-06 | GPT-6 Astra GA (OpenAI + GitHub Copilot). Fable 5.1 / Mythos 5.1 GA + EFS announced (Anthropic + Copilot). Cursor self-hosted machines GA. GitHub Copilot PR approval (preview). Model deprecations Oct 2 (Opus 4.7, Gemini 3.5/3.6 Flash, Kimi K2.7 Code). Enterprise managed default model GA. Daybreak for Frontline Defenders ($1B, OpenAI cyber). |
| 2026-08-30 | OpenAI terminates Cursor contract (Nov 12 shutoff). GitHub Copilot unified experience + data-retention change (admin action before Sep 28). MAI-Code-1.1-Flash in Copilot. Cursor adds HIPAA BAA + OpenTelemetry (enterprise). |
| 2026-08-29 | Initial CURRENT.md. Grok 4.6 GovCloud Bedrock; Copilot global model policy GA; GPT-5.6 Aug ChatGPT update (incremental); Gemini FS SKU = noise. |
