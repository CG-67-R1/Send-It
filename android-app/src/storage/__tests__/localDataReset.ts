/**
 * Run: npx tsx src/storage/__tests__/localDataReset.ts
 */
import {
  APP_OWNED_DYNAMIC_STORAGE_PREFIXES,
  APP_OWNED_STATIC_STORAGE_KEYS,
} from '../localDataReset';
import { LEGACY_TRIVIA_BEST_SCORE_KEY, STORAGE_KEYS } from '../../constants/storageKeys';

let failed = 0;

function assert(name: string, pass: boolean, detail?: string): void {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!pass) failed += 1;
}

const registryKeys = Object.values(STORAGE_KEYS);
const missingRegistryKeys = registryKeys.filter(
  (key) => !APP_OWNED_STATIC_STORAGE_KEYS.includes(key)
);

assert(
  'generic local-data wipe includes every registered storage key',
  missingRegistryKeys.length === 0,
  missingRegistryKeys.length ? `missing ${missingRegistryKeys.join(', ')}` : undefined
);
assert(
  'generic local-data wipe includes legacy trivia best-score key',
  APP_OWNED_STATIC_STORAGE_KEYS.includes(LEGACY_TRIVIA_BEST_SCORE_KEY)
);
assert(
  'generic local-data wipe removes dynamic Track Memory best-lap entries',
  APP_OWNED_DYNAMIC_STORAGE_PREFIXES.includes(`${STORAGE_KEYS.TRACK_MEMORY_BEST_LAP}:`)
);
assert(
  'generic local-data wipe has no duplicate static keys',
  new Set(APP_OWNED_STATIC_STORAGE_KEYS).size === APP_OWNED_STATIC_STORAGE_KEYS.length
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll localDataReset tests passed.');
