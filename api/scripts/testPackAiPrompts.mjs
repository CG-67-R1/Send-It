/**
 * Pack-aware RoadRace AI prompt regression checks (no OpenAI network calls).
 *
 * Usage: node api/scripts/testPackAiPrompts.mjs
 * Exit 0 on pass, 1 on fail.
 */
import {
  askChat,
  buildAskSystemPrompt,
  buildCoachSystemPrompt,
  buildRulesSystemPrompt,
} from '../roadraceAi.js';

let failed = 0;

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const auCoach = buildCoachSystemPrompt('coach', 'novice', 'au');
const ukCoach = buildCoachSystemPrompt('coach', 'novice', 'uk');
const ukBike = buildCoachSystemPrompt('bikesetup', 'novice', 'uk');
const auAsk = buildAskSystemPrompt('au');
const ukAsk = buildAskSystemPrompt('uk');
const ukRules = buildRulesSystemPrompt('uk');

assert('AU coach keeps Australian context', /Australian track day riding/.test(auCoach));
assert('UK coach uses UK context', /UK track days and British road racing/.test(ukCoach));
assert('UK coach does not inherit AU home text', !/Australian track day riding/.test(ukCoach));
assert('UK bike setup uses UK/BSB context', /UK track days and BSB-style racing/.test(ukBike));
assert('AU Ask remains Australia-first', /Australia first/.test(auAsk));
assert('UK Ask becomes United Kingdom-first', /United Kingdom first/.test(ukAsk));
assert('UK Ask uses ACU rule mode name', /ACU Standing Regulations/.test(ukAsk));
assert('UK rules prompt names ACU regulations', /ACU Standing Regulations/.test(ukRules));
assert('UK rules prompt does not require MoMS citations', !/Citation .+MoMS/.test(ukRules));

const unsupportedRules = await askChat('What licence do I need?', { mode: 'rules', packId: 'uk' });
assert('UK rules mode does not use AU MoMS KB', unsupportedRules.fromKb === false);
assert('UK rules mode returns safe unsupported message', /not available/.test(unsupportedRules.content));
assert('UK rules mode points at governing-body rules', /governing-body rule book/.test(unsupportedRules.content));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}

console.log('\nAll pack-aware AI prompt tests passed');
