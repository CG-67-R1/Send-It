/**
 * UK official rule check must link out and must not quote Australian MoMS.
 * Run: node scripts/testRulesLinkOut.mjs
 */
import { askChat, rulesLinkOut } from '../roadraceAi.js';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const savedKey = process.env.OPENAI_API_KEY;
delete process.env.OPENAI_API_KEY;

const uk = await askChat('What is the noise limit for a club road race?', {
  mode: 'rules',
  packId: 'uk',
});
assert('UK rules check does not need OpenAI', !uk.error);
assert('UK rules check returns the ACU rule book', uk.rulebook?.shortName === 'ACU');
assert(
  'UK rules check links to the ACU site',
  uk.rulebook?.sourcePage === 'https://www.acu.org.uk'
);
assert(
  'UK rules check links to the Standing Regulations',
  uk.rulebook?.handbook === 'https://www.acu.org.uk/sport/standing-regulations.aspx'
);
assert('UK rules check has no clause sources', Array.isArray(uk.sources) && uk.sources.length === 0);
assert('UK rules check does not attach MoMS', uk.momsOnline == null);
assert('UK reply does not cite MoMS', !/MoMS|Manual of Motorcycle Sport/i.test(uk.content || ''));
assert('UK reply does not invent a clause number', !/clause\s+\d/i.test(uk.content || ''));
assert('UK reply names the Standing Regulations page', (uk.content || '').includes(uk.rulebook?.handbook));

const au = await askChat('What is the noise limit?', { mode: 'rules', packId: 'au' });
assert(
  'Australia still uses the MoMS path',
  Boolean(au.error) && /OPENAI_API_KEY/.test(au.error) && au.rulebook == null
);

const missing = await askChat('What is the noise limit?', { mode: 'rules' });
assert('A missing pack stays on the MoMS path', Boolean(missing.error) && missing.rulebook == null);

assert('Non-UK packs have no link-out', rulesLinkOut('au') == null && rulesLinkOut(undefined) == null);

if (savedKey) process.env.OPENAI_API_KEY = savedKey;

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('All rules link-out checks passed');
