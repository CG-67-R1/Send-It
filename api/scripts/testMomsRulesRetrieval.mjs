/**
 * Paraphrase / retrieval regression checks for Official rule check (no OpenAI required).
 *
 * Usage: node api/scripts/testMomsRulesRetrieval.mjs
 * Exit 0 on pass, 1 on fail.
 */
import { retrieveForRules } from '../qa.js';

/** @type {Array<{ q: string, mustMatch: RegExp, label: string }>} */
const CASES = [
  {
    label: 'helmet camera / GoPro paraphrase',
    q: 'Can I put a GoPro on my lid?',
    mustMatch: /camera|6\.9\.2/i,
  },
  {
    label: 'helmet camera keywords',
    q: 'helmet camera',
    mustMatch: /camera|6\.9\.2/i,
  },
  {
    label: 'tyre warmers paraphrase',
    q: 'Are warming blankets permitted?',
    mustMatch: /tyre warmers? may be used|6\.2[5-7]\.\d/i,
  },
  {
    label: 'tyre warmers keywords',
    q: 'tyre warmers',
    mustMatch: /tyre warmers? may be used/i,
  },
  {
    label: 'club road race licence',
    q: 'What licence do I need for club road race?',
    mustMatch: /licence|license|endorsement|6\./i,
  },
];

function haystack(chunk) {
  return `${chunk.location || ''} ${chunk.clauseId || ''} ${chunk.content || ''}`;
}

async function main() {
  let failed = 0;
  for (const c of CASES) {
    const { chunks, fromKb, available } = await retrieveForRules(c.q, 8);
    if (!available) {
      console.error(`FAIL ${c.label}: MoMS corpus not available`);
      failed += 1;
      continue;
    }
    const joined = chunks.map(haystack).join('\n---\n');
    const ok = fromKb && chunks.length > 0 && c.mustMatch.test(joined);
    const top = chunks.slice(0, 3).map((x) => x.clauseId || x.location).join(' | ');
    if (ok) {
      console.log(`PASS ${c.label}`);
      console.log(`  top: ${top}`);
      if (chunks[0]?.edition) {
        console.log(`  edition: ${chunks[0].edition} effective ${chunks[0].effectiveDate || '?'}`);
      }
    } else {
      console.error(`FAIL ${c.label}`);
      console.error(`  fromKb=${fromKb} n=${chunks.length}`);
      console.error(`  top: ${top || '(none)'}`);
      console.error(`  sample: ${(chunks[0]?.content || '').slice(0, 160).replace(/\s+/g, ' ')}`);
      failed += 1;
    }
  }

  // Metadata check on any successful retrieval
  const sample = await retrieveForRules('tyre warmers', 3);
  if (sample.chunks[0] && !sample.chunks[0].edition) {
    console.error('FAIL edition metadata missing on chunks');
    failed += 1;
  } else if (sample.chunks[0]) {
    console.log(`PASS edition metadata (${sample.chunks[0].edition})`);
  }

  if (failed) {
    console.error(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log(`\nAll ${CASES.length + 1} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
