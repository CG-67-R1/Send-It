/**
 * Run: npx tsx src/storage/__tests__/trackWalkCornerAliases.ts
 */
import { trackWalkCornerIdMatches } from '../trackWalkCornerAliases';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

assert(
  'current corner ids still match directly',
  trackWalkCornerIdMatches('smp_druitt', 'smp_druitt_t6', 'smp_druitt_t6')
);

for (const [currentId, legacyId] of [
  ['smp_druitt_t5', 'smp_druitt_t4b'],
  ['smp_druitt_t6', 'smp_druitt_t15'],
  ['smp_druitt_t7', 'smp_druitt_t16'],
  ['smp_druitt_t8', 'smp_druitt_t17'],
  ['smp_druitt_t8', 'smp_druitt_t18'],
] as const) {
  assert(
    `${legacyId} legacy note appears on ${currentId}`,
    trackWalkCornerIdMatches('smp_druitt', currentId, legacyId)
  );
}

assert(
  'legacy aliases are scoped to Druitt',
  !trackWalkCornerIdMatches('smp_gardner', 'smp_druitt_t8', 'smp_druitt_t18')
);
assert(
  'unrelated old corner does not attach to a current corner',
  !trackWalkCornerIdMatches('smp_druitt', 'smp_druitt_t6', 'smp_druitt_t18')
);
assert('missing saved id does not match', !trackWalkCornerIdMatches('smp_druitt', 'smp_druitt_t6', undefined));

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}

console.log('\nAll trackWalkCornerAliases tests passed');
