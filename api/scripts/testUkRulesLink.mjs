/**
 * UK official rule check must link to the ACU handbook and must not
 * answer from the Australian MoMS index.
 * Run: node scripts/testUkRulesLink.mjs
 */
import assert from 'assert/strict';
import { askChat } from '../roadraceAi.js';

const result = await askChat('What licence do I need for club road race?', {
  mode: 'rules',
  packId: 'uk',
});

assert.equal(result.error, undefined);
assert.equal(result.fromKb, false);
assert.equal(result.momsOnline, undefined);
assert.match(result.content, /does not quote ACU clause numbers/);
assert.doesNotMatch(result.content, /\bMoMS\b/);
assert.doesNotMatch(result.content, /clause\s+\d/i);

const sources = result.sources || [];
assert.ok(sources.length >= 1, 'expected an ACU link');
assert.ok(
  sources.every((source) => !source.clauseId && !source.page),
  'UK rule links must not carry clause numbers or MoMS pages'
);
assert.ok(
  sources.some((source) => String(source.onlineUrl || '').includes('acu.org.uk')),
  'expected an acu.org.uk link'
);

const empty = await askChat('   ', { mode: 'rules', packId: 'uk' });
assert.equal(empty.error, 'message is required');

if (!process.env.OPENAI_API_KEY) {
  const ask = await askChat('When is the next BSB round?', { packId: 'uk' });
  assert.match(ask.error || '', /not configured/);
}

console.log('UK rule check links out to the ACU and does not quote MoMS clauses');
