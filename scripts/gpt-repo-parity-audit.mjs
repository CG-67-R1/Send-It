#!/usr/bin/env node
/**
 * GPT → repo parity audit (3 passes).
 * Usage: node scripts/gpt-repo-parity-audit.mjs
 * Env: API_URL (default production Render)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QA_DIR = path.join(ROOT, 'Q&A');
const API_URL = (process.env.API_URL || 'https://send-it-ke7r.onrender.com').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.AUDIT_TIMEOUT_MS || 90000);
const GPT_URL =
  'https://chatgpt.com/g/g-67d6286ffa8c819197902afc89091eeb-trackday-rider-ai';

const CORE_QA_JSON = new Set([
  'knowledge.json',
  'README.md',
  'trivia-bank.json',
  'Q&A.json',
  'Q&A_with_ratings.json',
  'AUS_Q&A.json',
]);

function tokenize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function overlapScore(expected, actual) {
  const exp = new Set(tokenize(expected));
  const act = new Set(tokenize(actual));
  if (!exp.size || !act.size) return 0;
  let hit = 0;
  for (const t of exp) if (act.has(t)) hit++;
  return hit / exp.size;
}

function scoreLabel(ratio) {
  if (ratio >= 0.35) return 'PASS';
  if (ratio >= 0.2) return 'PARTIAL';
  return 'FAIL';
}

async function loadFaqPayload() {
  const raw = JSON.parse(await fs.readFile(path.join(ROOT, 'api', 'data', 'rider_ai_faqs.json'), 'utf8'));
  return raw;
}

async function inventoryPdfJson() {
  const files = await fs.readdir(QA_DIR);
  const pdfs = [];
  for (const file of files) {
    if (!file.endsWith('.json') || CORE_QA_JSON.has(file)) continue;
    const fp = path.join(QA_DIR, file);
    try {
      const data = JSON.parse(await fs.readFile(fp, 'utf8'));
      const contentLen = (data.content || '').trim().length;
      const blocksLen = Array.isArray(data.contentBlocks)
        ? data.contentBlocks.map((b) => b.text || '').join('').length
        : 0;
      const qaCount = Array.isArray(data.qa) ? data.qa.length : 0;
      pdfs.push({
        file,
        origin: data.origin || file,
        title: data.title || path.basename(file, '.json'),
        contentChars: Math.max(contentLen, blocksLen),
        qaCount,
        usable: contentLen > 200 || blocksLen > 200 || qaCount > 0,
      });
    } catch {
      pdfs.push({ file, origin: file, title: file, contentChars: 0, qaCount: 0, usable: false });
    }
  }
  return pdfs.sort((a, b) => a.file.localeCompare(b.file));
}

async function pass1Inventory(faqs) {
  const qaFiles = (await fs.readdir(QA_DIR)).filter((f) => f.endsWith('.json'));
  const pdfDerived = await inventoryPdfJson();
  const usablePdfs = pdfDerived.filter((p) => p.usable);
  const emptyPdfs = pdfDerived.filter((p) => !p.usable);

  const instructionSections = [
    { id: 'prompt:coach_system', location: 'api/roadraceAi.js', section: 'COACH_SYSTEM', usedBy: ['Coach chat'] },
    { id: 'prompt:bikesetup_system', location: 'api/roadraceAi.js', section: 'BIKESETUP_SYSTEM', usedBy: ['Bike Setup chat'] },
    { id: 'prompt:ask_system', location: 'api/roadraceAi.js', section: 'ASK_SYSTEM', usedBy: ['Q&A Ask'] },
    { id: 'prompt:shared_rules', location: 'api/roadraceAi.js', section: 'SHARED_RULES', usedBy: ['Coach', 'Bike Setup'] },
    { id: 'faq:global_principles', location: 'api/data/rider_ai_faqs.json', section: 'global_principles', usedBy: ['Coach', 'Bike Setup'] },
    { id: 'faq:novice_guidelines', location: 'api/data/rider_ai_faqs.json', section: 'novice_guidelines', usedBy: ['Coach', 'Bike Setup'] },
    { id: 'gpt:legacy_url', location: 'app/constants/api.ts', section: 'TRACKDAY_RIDER_AI_URL', usedBy: ['None (unused)'] },
  ];

  const gptMirrorFiles = [
    {
      id: 'gpt-export:rider_ai_faqs',
      name: 'Rider AI Coach + Setup FAQ export (schema v2)',
      repoPath: 'api/data/rider_ai_faqs.json',
      coachFaqs: faqs.coach?.length || 0,
      bikesetupFaqs: faqs.bikesetup?.length || 0,
      note: 'Likely primary GPT knowledge export; also bundled for app dropdowns',
    },
  ];

  return {
    gptReference: { name: 'Trackday Rider AI', url: GPT_URL, note: 'Live GPT file list not API-accessible; inventory below is repo mirror + inferred GPT sections' },
    instructionSections,
    gptMirrorFiles,
    qaCoreFiles: qaFiles.filter((f) => CORE_QA_JSON.has(f)),
    pdfDerived,
    usablePdfs,
    emptyPdfs,
    pdfCount: pdfDerived.length,
    usablePdfCount: usablePdfs.length,
    emptyPdfCount: emptyPdfs.length,
  };
}

async function pass2Map(inv, faqs) {
  const rows = [];

  for (const sec of inv.instructionSections) {
    rows.push({
      gptItem: sec.section,
      canonicalId: sec.id,
      repoPath: sec.location,
      coach: sec.usedBy.includes('Coach chat') || sec.usedBy.includes('Coach'),
      ask: sec.usedBy.includes('Q&A Ask'),
      bikesetup: sec.usedBy.includes('Bike Setup chat') || sec.usedBy.includes('Bike Setup'),
      status: sec.usedBy[0] === 'None (unused)' ? 'ORPHAN' : 'OK',
      gap: sec.usedBy[0] === 'None (unused)' ? 'Legacy URL not wired to UI' : '',
    });
  }

  rows.push({
    gptItem: 'Coach + Bike Setup FAQs (20+20)',
    canonicalId: 'faq:coach+bikesetup',
    repoPath: 'api/data/rider_ai_faqs.json',
    coach: true,
    ask: false,
    bikesetup: true,
    status: 'OK',
    gap: 'Ask mode does not retrieve these FAQs — only injected into Coach/Bike Setup prompts',
  });

  rows.push({
    gptItem: 'Australian track corner knowledge',
    canonicalId: 'track:*:corner:*',
    repoPath: '(missing)',
    coach: false,
    ask: false,
    bikesetup: false,
    status: 'MISSING',
    gap: 'coach_015 references uploaded track knowledge but no structured track/corner store in repo',
  });

  for (const p of inv.usablePdfs) {
    rows.push({
      gptItem: p.title,
      canonicalId: `doc:${path.basename(p.file, '.json')}`,
      repoPath: `Q&A/${p.file}`,
      coach: false,
      ask: true,
      bikesetup: false,
      status: 'PARTIAL',
      gap: 'Ask retrieval only; Coach does not use PDF corpus',
    });
  }

  for (const p of inv.emptyPdfs) {
    rows.push({
      gptItem: p.title,
      canonicalId: `doc:${path.basename(p.file, '.json')}`,
      repoPath: `Q&A/${p.file}`,
      coach: false,
      ask: false,
      bikesetup: false,
      status: 'BROKEN',
      gap: 'PDF scrape empty (likely image-only PDF) — content not available to app',
    });
  }

  rows.push({
    gptItem: 'Seed Q&A + documents',
    canonicalId: 'knowledge:seed',
    repoPath: 'Q&A/knowledge.json',
    coach: false,
    ask: true,
    bikesetup: false,
    status: 'OK',
    gap: 'Small seed set only (12 qa, 2 docs)',
  });

  rows.push({
    gptItem: 'Trivia banks',
    canonicalId: 'trivia:*',
    repoPath: 'Q&A/Q&A_with_ratings.json, AUS_Q&A.json, trivia-bank.json',
    coach: false,
    ask: false,
    bikesetup: false,
    status: 'OK',
    gap: 'Trivia tab only — separate from coach GPT flows',
  });

  return rows;
}

function buildTestQuestions(faqs) {
  const questions = [];

  const pickCoach = (id) => {
    const item = faqs.coach.find((f) => f.id === id);
    if (!item) return null;
    return { id, mode: 'coach', question: item.question, expected: item.answer, source: 'rider_ai_faqs.coach' };
  };
  const pickSetup = (id) => {
    const item = faqs.bikesetup.find((f) => f.id === id);
    if (!item) return null;
    return { id, mode: 'bikesetup', question: item.question, expected: item.answer, source: 'rider_ai_faqs.bikesetup' };
  };

  const coachIds = [
    'coach_003', 'coach_004', 'coach_006', 'coach_007', 'coach_008', 'coach_011', 'coach_012',
    'coach_015', 'coach_019', 'coach_020',
  ];
  const setupIds = [
    'bikesetup_001', 'bikesetup_002', 'bikesetup_003', 'bikesetup_004', 'bikesetup_005',
    'bikesetup_006', 'bikesetup_007', 'bikesetup_008', 'bikesetup_009', 'bikesetup_010',
  ];

  for (const id of coachIds) {
    const q = pickCoach(id);
    if (q) questions.push(q);
  }
  for (const id of setupIds) {
    const q = pickSetup(id);
    if (q) questions.push(q);
  }

  const askExtras = [
    { id: 'ask_seed_1', mode: 'ask', question: 'What is trail braking?', expected: 'Carrying a small amount of front brake into the turn after turn-in, then releasing gradually.', source: 'knowledge.json seed' },
    { id: 'ask_seed_2', mode: 'ask', question: 'What is the apex of a corner?', expected: 'The point where the bike is closest to the inside of the corner', source: 'knowledge.json seed' },
    { id: 'ask_seed_3', mode: 'ask', question: 'What does BP mean in motorcycle riding?', expected: 'Body position', source: 'knowledge.json seed' },
    { id: 'ask_principle_1', mode: 'ask', question: 'Should you invent tyre pressure numbers without knowing the tyre brand?', expected: 'should not invent pressure numbers', source: 'rider_ai_faqs global_principles' },
    { id: 'ask_principle_2', mode: 'ask', question: 'What order should bike setup diagnosis follow?', expected: 'tyre pressure, temperature and conditions, compound and tyre state, rider input, suspension, geometry', source: 'rider_ai_faqs global_principles' },
    { id: 'ask_track_gap', mode: 'ask', question: 'What is the coaching advice for turn 6 at Phillip Island?', expected: 'curated track corner knowledge', source: 'GPT track files (expected gap)' },
    { id: 'ask_track_gap_2', mode: 'ask', question: 'How do I fix running wide at turn 3 Broadford?', expected: 'corner-specific curated knowledge', source: 'GPT track files (expected gap)' },
    { id: 'ask_hist_1', mode: 'ask', question: 'Who is Casey Stoner?', expected: 'Australian MotoGP world champion', source: 'Q&A PDF corpus' },
    { id: 'ask_hist_2', mode: 'ask', question: 'What is the Isle of Man TT?', expected: 'road racing event on the Isle of Man', source: 'Q&A PDF corpus' },
    { id: 'ask_setup_cross', mode: 'ask', question: 'My rear tyre is sliding on corner exit — is it setup or technique?', expected: 'separate rider technique from bike setup', source: 'coach_019 / cross-mode' },
  ];

  questions.push(...askExtras);
  return questions.slice(0, 30);
}

async function callAsk(question) {
  const res = await fetch(`${API_URL}/roadrace-ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.json();
  return { status: res.status, ...body };
}

async function callCoach(question, mode) {
  const res = await fetch(`${API_URL}/roadrace-ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode,
      message: question,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.json();
  return { status: res.status, reply: body.reply || body.content || '', error: body.error };
}

async function pass3Test(questions) {
  const healthRes = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const health = await healthRes.json();
  if (!health.roadraceAi) {
    return { skipped: true, reason: 'roadraceAi false — OPENAI_API_KEY not set on API', results: [] };
  }

  const results = [];
  for (const q of questions) {
    const row = { ...q, ask: null, coach: null };

    if (q.mode === 'ask' || q.mode === 'coach' || q.mode === 'bikesetup') {
      try {
        const askOut = await callAsk(q.question);
        const askText = askOut.reply || '';
        const askRatio = overlapScore(q.expected, askText);
        row.ask = {
          score: scoreLabel(askRatio),
          overlap: Number(askRatio.toFixed(3)),
          fromKb: askOut.fromKb,
          sources: (askOut.sources || []).length,
          error: askOut.error,
          excerpt: askText.slice(0, 220),
        };
      } catch (e) {
        row.ask = { score: 'ERROR', error: e.message };
      }
    }

    const coachMode = q.mode === 'bikesetup' ? 'bikesetup' : 'coach';
    if (q.mode === 'coach' || q.mode === 'bikesetup') {
      try {
        const coachOut = await callCoach(q.question, coachMode);
        const coachText = coachOut.reply || '';
        const coachRatio = overlapScore(q.expected, coachText);
        row.coach = {
          score: scoreLabel(coachRatio),
          overlap: Number(coachRatio.toFixed(3)),
          error: coachOut.error,
          excerpt: coachText.slice(0, 220),
        };
      } catch (e) {
        row.coach = { score: 'ERROR', error: e.message };
      }
    } else if (q.mode === 'ask') {
      row.coach = { score: 'N/A', note: 'ask-only question' };
    }

    results.push(row);
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  return { skipped: false, health, results };
}

function summarizeTests(results) {
  const askScored = results.filter((r) => r.ask && !['N/A', 'ERROR'].includes(r.ask.score));
  const coachScored = results.filter((r) => r.coach && !['N/A', 'ERROR'].includes(r.coach.score));
  const count = (arr, label) => arr.filter((r) => r.score === label).length;
  return {
    ask: {
      total: askScored.length,
      pass: count(askScored.map((r) => r.ask), 'PASS'),
      partial: count(askScored.map((r) => r.ask), 'PARTIAL'),
      fail: count(askScored.map((r) => r.ask), 'FAIL'),
    },
    coach: {
      total: coachScored.length,
      pass: count(coachScored.map((r) => r.coach), 'PASS'),
      partial: count(coachScored.map((r) => r.coach), 'PARTIAL'),
      fail: count(coachScored.map((r) => r.coach), 'FAIL'),
    },
  };
}

function renderMarkdown(inv, mapRows, testOut, questions) {
  const date = new Date().toISOString().slice(0, 10);
  const summary = testOut.skipped ? null : summarizeTests(testOut.results);
  let md = `# GPT → Repo Parity Audit — ${date}\n\n`;
  md += `**API:** ${API_URL}  \n`;
  md += `**GPT reference:** [Trackday Rider AI](${GPT_URL})  \n`;
  md += `**Note:** Live Custom GPT file list is not API-accessible. Pass 1 inventories the **repo mirror** of GPT knowledge plus code prompts.\n\n`;

  md += `## Pass 1 — Inventory\n\n`;
  md += `### Instruction sections (repo)\n\n`;
  md += `| ID | Section | Location | Used by |\n|----|---------|----------|--------|\n`;
  for (const s of inv.instructionSections) {
    md += `| ${s.id} | ${s.section} | ${s.location} | ${s.usedBy.join(', ')} |\n`;
  }

  md += `\n### GPT mirror / knowledge files\n\n`;
  md += `| Asset | Path | Count / size |\n|-------|------|-------------|\n`;
  for (const g of inv.gptMirrorFiles) {
    md += `| ${g.name} | ${g.repoPath} | coach=${g.coachFaqs}, bikesetup=${g.bikesetupFaqs} |\n`;
  }
  md += `| Q&A core JSON | Q&A/*.json (core) | ${inv.qaCoreFiles.length} files |\n`;
  md += `| PDF-derived JSON | Q&A/*.json | ${inv.pdfCount} total, ${inv.usablePdfCount} usable, **${inv.emptyPdfCount} empty** |\n`;

  if (inv.emptyPdfs.length) {
    md += `\n**Empty PDF scrapes (content not in app):**\n`;
    for (const p of inv.emptyPdfs) md += `- \`${p.file}\`\n`;
  }

  if (inv.usablePdfs.length) {
    md += `\n**Usable PDF-derived files:**\n`;
    for (const p of inv.usablePdfs) {
      md += `- \`${p.file}\` — ${p.contentChars} chars, ${p.qaCount} qa pairs\n`;
    }
  }

  md += `\n## Pass 2 — Map (GPT item → repo → surfaces)\n\n`;
  md += `| GPT / knowledge item | Canonical ID | Repo path | Coach | Ask | Setup | Status | Gap |\n`;
  md += `|----------------------|--------------|-----------|:-----:|:---:|:-----:|--------|-----|\n`;
  for (const r of mapRows) {
    md += `| ${r.gptItem} | ${r.canonicalId} | ${r.repoPath} | ${r.coach ? '✓' : ''} | ${r.ask ? '✓' : ''} | ${r.bikesetup ? '✓' : ''} | ${r.status} | ${r.gap} |\n`;
  }

  md += `\n### Critical gaps (fix Turn 6 in one place)\n\n`;
  md += `1. **No \`track:{id}:corner:{n}\` canonical store** — corner fixes would require hunting FAQs, prompts, and PDFs.\n`;
  md += `2. **Coach does not RAG the PDF corpus** — Ask-only retrieval; Coach relies on FAQs + model.\n`;
  md += `3. **${inv.emptyPdfCount} GPT-linked PDFs scraped empty** — performanceridingtechniques and others may exist in GPT but not in repo text.\n`;
  md += `4. **Duplicate truth risk** — same topic may exist in FAQ answer + Ask KB + model improvisation.\n\n`;

  md += `## Pass 3 — Test (30 questions vs production API)\n\n`;
  if (testOut.skipped) {
    md += `**Skipped:** ${testOut.reason}\n`;
  } else {
    md += `**Health:** \`${JSON.stringify(testOut.health)}\`  \n`;
    md += `**Scoring:** token overlap vs expected curated answer (≥0.35 PASS, ≥0.20 PARTIAL)\n\n`;
    md += `| Surface | PASS | PARTIAL | FAIL | Total |\n|---------|------|---------|------|-------|\n`;
    md += `| Ask | ${summary.ask.pass} | ${summary.ask.partial} | ${summary.ask.fail} | ${summary.ask.total} |\n`;
    md += `| Coach/BikeSetup | ${summary.coach.pass} | ${summary.coach.partial} | ${summary.coach.fail} | ${summary.coach.total} |\n\n`;

    md += `| ID | Question | Expected source | Ask | Coach |\n|----|----------|-----------------|-----|-------|\n`;
    for (const r of testOut.results) {
      const askS = r.ask ? `${r.ask.score} (${r.ask.overlap ?? '-'})` : '-';
      const coachS = r.coach ? `${r.coach.score} (${r.coach.overlap ?? r.coach.note ?? '-'})` : '-';
      md += `| ${r.id} | ${r.question.slice(0, 55)}… | ${r.source} | ${askS} | ${coachS} |\n`;
    }

    md += `\n### Track-corner gap tests (expected weak)\n\n`;
    for (const r of testOut.results.filter((x) => x.id.startsWith('ask_track'))) {
      md += `- **${r.id}:** Ask ${r.ask?.score} — ${r.ask?.excerpt || r.ask?.error || ''}\n`;
    }
  }

  md += `\n## Recommended canonical model\n\n`;
  md += `- **Authoring:** Custom GPT (curated)\n`;
  md += `- **Production truth:** \`knowledge/canonical/\` with IDs like \`track:phillip_island:corner:06\`\n`;
  md += `- **Derived:** \`rider_ai_faqs.json\` generated from canonical store (no hand-maintained copies)\n`;
  md += `- **Runtime:** Coach + Ask both retrieve canonical records; cite ID in responses\n\n`;

  return md;
}

async function main() {
  console.log('GPT → repo parity audit\n');
  const faqs = await loadFaqPayload();
  const inv = await pass1Inventory(faqs);
  const mapRows = await pass2Map(inv, faqs);
  const questions = buildTestQuestions(faqs);
  console.log(`Pass 3: running ${questions.length} questions against ${API_URL}`);
  const testOut = await pass3Test(questions);
  const md = renderMarkdown(inv, mapRows, testOut, questions);
  const outDir = path.join(ROOT, 'docs', 'reviews');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `GPT_REPO_PARITY_AUDIT_${new Date().toISOString().slice(0, 10)}.md`);
  await fs.writeFile(outPath, md, 'utf8');
  console.log(`Wrote ${outPath}`);
  if (!testOut.skipped) {
    const s = summarizeTests(testOut.results);
    console.log(`Ask: ${s.ask.pass} pass / ${s.ask.partial} partial / ${s.ask.fail} fail`);
    console.log(`Coach: ${s.coach.pass} pass / ${s.coach.partial} partial / ${s.coach.fail} fail`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
