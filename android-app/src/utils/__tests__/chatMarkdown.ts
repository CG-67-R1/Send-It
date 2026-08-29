/**
 * Run: npx tsx src/utils/__tests__/chatMarkdown.ts
 */
import { stripChatMarkdown } from '../chatMarkdown';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert(
  'strips ## headings',
  stripChatMarkdown('## Answer\nTrail brake later.') === 'Answer\nTrail brake later.'
);
assert(
  'strips bold',
  stripChatMarkdown('Keep **front load** through the apex.') === 'Keep front load through the apex.'
);
assert(
  'strips inline code',
  stripChatMarkdown('Use `sag` numbers from the sheet.') === 'Use sag numbers from the sheet.'
);
assert(
  'strips italic stars',
  stripChatMarkdown('Keep *front load* through the apex.') === 'Keep front load through the apex.'
);
assert(
  'keeps list dashes',
  stripChatMarkdown('- Brake marker\n- Apex') === '- Brake marker\n- Apex'
);
assert(
  'keeps suggest-mode trailer tokens if present',
  stripChatMarkdown('Try Bike Setup.\n[[SUGGEST_MODE:bikesetup]]') ===
    'Try Bike Setup.\n[[SUGGEST_MODE:bikesetup]]'
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll chatMarkdown tests passed.');
