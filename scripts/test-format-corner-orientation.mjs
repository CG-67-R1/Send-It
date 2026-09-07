#!/usr/bin/env node
/** Standalone check of the Track Details orientation fallback wording. */
function formatCornerOrientation(corner) {
  const reviewed = corner.orientation?.trim();
  if (reviewed) return reviewed;
  if (corner.number != null) {
    return `Turn ${corner.number} is a ${corner.direction} from memory. Use the map dots and your own markers — do not invent a racing line from this page.`;
  }
  return 'Use the map and your own markers for orientation.';
}

const fallback = formatCornerOrientation({ number: 1, direction: 'right' });
if (!fallback.includes('from memory')) {
  console.error('FAIL fallback missing from memory');
  process.exit(1);
}
if (/from the catalog/i.test(fallback)) {
  console.error('FAIL fallback still says from the catalog');
  process.exit(1);
}
const reviewed = formatCornerOrientation({
  number: 1,
  direction: 'right',
  orientation: 'Turn 1 is a right from memory — Doohan.',
});
if (reviewed !== 'Turn 1 is a right from memory — Doohan.') {
  console.error('FAIL reviewed orientation not used');
  process.exit(1);
}
console.log('PASS formatCornerOrientation uses from memory and prefers reviewed copy');
