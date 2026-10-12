/**
 * Coach/Ask model env resolver + GPT-6 request shaping.
 * Run: node scripts/testCoachModel.mjs
 * No OpenAI key required.
 */
import {
  DEFAULT_COACH_MODEL,
  buildChatCompletionRequest,
  getCoachModel,
  getCoachReasoningEffort,
  getCoachVisionModel,
  isGpt6FamilyModel,
  normalizeOpenAiUsage,
  withGpt6ResponsesOptions,
} from '../roadraceAi.js';

let failed = 0;
const saved = {};

function stash(keys) {
  for (const key of keys) saved[key] = process.env[key];
}

function restore() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function setEnv(map) {
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function assert(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

stash(['COACH_MODEL', 'OPENAI_MODEL', 'OPENAI_VISION_MODEL', 'COACH_REASONING_EFFORT']);

try {
  setEnv({
    COACH_MODEL: undefined,
    OPENAI_MODEL: undefined,
    OPENAI_VISION_MODEL: undefined,
    COACH_REASONING_EFFORT: undefined,
  });
  assert('default is gpt-6-luna', getCoachModel() === DEFAULT_COACH_MODEL && DEFAULT_COACH_MODEL === 'gpt-6-luna');
  assert('blank COACH_MODEL falls back', (setEnv({ COACH_MODEL: '  ' }), getCoachModel() === 'gpt-6-luna'));
  assert('OPENAI_MODEL alias', (setEnv({ COACH_MODEL: undefined, OPENAI_MODEL: 'gpt-4o' }), getCoachModel() === 'gpt-4o'));
  assert(
    'COACH_MODEL wins over OPENAI_MODEL',
    (setEnv({ COACH_MODEL: 'gpt-6-luna', OPENAI_MODEL: 'gpt-4o' }), getCoachModel() === 'gpt-6-luna')
  );
  assert(
    'vision follows coach model',
    (setEnv({ COACH_MODEL: 'gpt-6-luna', OPENAI_VISION_MODEL: undefined }), getCoachVisionModel() === 'gpt-6-luna')
  );
  assert(
    'OPENAI_VISION_MODEL override',
    (setEnv({ OPENAI_VISION_MODEL: 'gpt-4o' }), getCoachVisionModel() === 'gpt-4o')
  );

  assert('gpt-6-luna is GPT-6 family', isGpt6FamilyModel('gpt-6-luna'));
  assert('gpt-4o-mini is not GPT-6 family', !isGpt6FamilyModel('gpt-4o-mini'));
  setEnv({ COACH_MODEL: 'gpt-6-luna', COACH_REASONING_EFFORT: undefined });
  assert('Luna default reasoning is none', getCoachReasoningEffort('gpt-6-luna') === 'none');
  setEnv({ COACH_REASONING_EFFORT: 'medium' });
  assert('COACH_REASONING_EFFORT override', getCoachReasoningEffort('gpt-6-luna') === 'medium');
  assert('4o-mini has no reasoning effort', getCoachReasoningEffort('gpt-4o-mini') === '');

  const mini = buildChatCompletionRequest('gpt-4o-mini', {
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 48,
    temperature: 0,
  });
  assert('4o-mini keeps max_tokens', mini.max_tokens === 48 && mini.max_completion_tokens === undefined);
  assert('4o-mini has temperature', mini.temperature === 0);
  assert('4o-mini has no reasoning_effort', mini.reasoning_effort === undefined);

  setEnv({ COACH_REASONING_EFFORT: undefined });
  const luna = buildChatCompletionRequest('gpt-6-luna', {
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 48,
    temperature: 0,
  });
  assert('Luna uses max_completion_tokens', luna.max_completion_tokens === 48 && luna.max_tokens === undefined);
  assert('Luna pins reasoning_effort none', luna.reasoning_effort === 'none');
  assert('Luna keeps temperature at none', luna.temperature === 0);

  setEnv({ COACH_REASONING_EFFORT: 'medium' });
  const lunaMed = buildChatCompletionRequest('gpt-6-luna', {
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 32,
    temperature: 0,
  });
  assert('Luna drops temperature when reasoning is not none', lunaMed.temperature === undefined);
  assert('Luna medium effort', lunaMed.reasoning_effort === 'medium');

  setEnv({ COACH_REASONING_EFFORT: undefined });
  const responsesMini = withGpt6ResponsesOptions('gpt-4o-mini', { model: 'gpt-4o-mini', input: 'q' });
  assert('Responses 4o-mini unchanged', responsesMini.reasoning === undefined);
  const responsesLuna = withGpt6ResponsesOptions('gpt-6-luna', { model: 'gpt-6-luna', input: 'q' });
  assert('Responses Luna sets reasoning.effort none', responsesLuna.reasoning?.effort === 'none');

  const usage = normalizeOpenAiUsage({
    prompt_tokens: 100,
    completion_tokens: 20,
    total_tokens: 120,
    prompt_tokens_details: { cached_tokens: 40 },
    completion_tokens_details: { reasoning_tokens: 5 },
  });
  assert('usage input/output', usage?.input === 100 && usage?.output === 20);
  assert('usage cached/reasoning', usage?.cached === 40 && usage?.reasoning === 5);
  assert('null usage', normalizeOpenAiUsage(null) === null);
} finally {
  restore();
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll coach-model tests passed');
