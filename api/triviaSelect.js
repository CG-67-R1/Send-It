/**
 * Trivia selection helpers: unique-by-text picking, option shuffle, 70/30 AU mix.
 */

export function uniqueQuestionKey(text) {
  let s = (text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  s = s.replace(/^pick the correct statement:\s*/, '');
  s = s.replace(/\bapproximately\b/g, 'about');
  s = s.replace(/\babout what number of\b/g, 'about how many');
  s = s.replace(/\bacross what number of\b/g, 'across how many');
  s = s.replace(/\bwhat number of times\b/g, 'how many times');
  return s;
}

export function itemDifficultyRating(item) {
  const raw = item?.difficulty_rating;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (Number.isFinite(n)) return n;
  return item?.difficulty === 'hard' ? 8 : 2;
}

export function filterAvailableIndices(bank, usedIndices, getQuestionText) {
  const usedSet = new Set(usedIndices);
  const usedKeys = new Set(
    usedIndices
      .filter((i) => i >= 0 && i < bank.length)
      .map((i) => uniqueQuestionKey(getQuestionText(bank[i])))
      .filter(Boolean)
  );

  return bank
    .map((_, i) => i)
    .filter((i) => {
      if (usedSet.has(i)) return false;
      const key = uniqueQuestionKey(getQuestionText(bank[i]));
      return !key || !usedKeys.has(key);
    });
}

/**
 * Pick one bank index from available indices, collapsing shuffled-option duplicates
 * into a single question. Widens the difficulty band until enough unique questions exist.
 */
export function pickTriviaIndex(bank, availableIndices, difficulty, random = Math.random) {
  if (availableIndices.length === 0) return -1;

  const groups = new Map();
  for (const i of availableIndices) {
    const item = bank[i];
    const key = uniqueQuestionKey(item?.question || item?.q || '');
    if (!key) continue;
    let group = groups.get(key);
    if (!group) {
      group = { indices: [], rating: itemDifficultyRating(item) };
      groups.set(key, group);
    }
    group.indices.push(i);
  }

  const unique = [...groups.values()];
  if (unique.length === 0) {
    return availableIndices[Math.floor(random() * availableIndices.length)];
  }

  let pool = unique;
  if (typeof difficulty === 'number' && Number.isFinite(difficulty)) {
    for (const window of [1, 2, 4, 10]) {
      const inBand = unique.filter((g) => Math.abs(g.rating - difficulty) <= window);
      if (inBand.length >= 4 || (window === 10 && inBand.length > 0)) {
        pool = inBand;
        break;
      }
    }
  }

  const group = pool[Math.floor(random() * pool.length)];
  return group.indices[Math.floor(random() * group.indices.length)];
}

export function shuffleTriviaOptions(options, correctIndex, random = Math.random) {
  const items = (options || []).map((text, i) => ({ text, correct: i === correctIndex }));
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return {
    options: items.map((x) => x.text),
    correctIndex: Math.max(0, items.findIndex((x) => x.correct)),
  };
}

/** 7 Australian + 3 world questions in every block of 10 (70 / 30). */
export function regionForTriviaOrder(questionIndex) {
  const slot = ((questionIndex % 10) + 10) % 10;
  return slot === 3 || slot === 6 || slot === 9 ? 'global' : 'au';
}
