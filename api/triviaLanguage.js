/**
 * Reject trivia that is not a readable English question.
 * Closed-class words ("Which", "This") and circular definitions
 * ("a straight is a straight section") must not reach riders.
 */

const CLOSED_CLASS = new Set([
  'which',
  'what',
  "what's",
  'whats',
  'that',
  'this',
  'these',
  'those',
  'who',
  'whom',
  'whose',
  'where',
  'when',
  'why',
  'how',
  'there',
  'here',
  'it',
  'its',
  'they',
  'them',
  'he',
  'she',
  'we',
  'you',
  'i',
]);

/** Words that do not add a definition. */
const FILLER = new Set([
  'a',
  'an',
  'the',
  'of',
  'to',
  'in',
  'on',
  'for',
  'and',
  'or',
  'is',
  'are',
  'was',
  'be',
  'with',
  'from',
  'by',
  'at',
  'as',
  'section',
  'part',
  'long',
  'very',
  'track',
  'circuit',
]);

function words(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

function subjectOfWhatIs(question) {
  const match = (question || '').trim().match(/^what\s+(?:is|are)\s+(.+?)\??$/i);
  return match ? match[1].trim() : '';
}

function contentTokens(text) {
  return words(text).filter((w) => !FILLER.has(w) && !CLOSED_CLASS.has(w));
}

/**
 * @returns {string[]} human-readable problems. Empty means the item can ship.
 */
export function triviaLanguageIssues(question, answer) {
  const issues = [];
  const q = (question || '').trim();
  const a = (answer || '').trim();
  if (!q) issues.push('missing question');

  const doesMatch = q.match(/^what does\s+(.+?)\s+mean\??$/i);
  if (doesMatch && CLOSED_CLASS.has(words(doesMatch[1])[0] || '')) {
    issues.push(`"${words(doesMatch[1])[0]}" is an ordinary English word, not a term`);
  }

  const subject = subjectOfWhatIs(q);
  const asksForName = /\b(called|stand for|name of)\b/i.test(q);
  if (subject && !asksForName && a.length < 12) {
    issues.push('answer is too short to be a definition');
  }
  if (subject) {
    const subjectWords = words(subject);
    const head = subjectWords[0] || '';
    if (CLOSED_CLASS.has(head)) {
      issues.push(`"${head}" is an ordinary English word, not a term`);
    }
    if (subjectWords.length === 1 && head.length < 3) {
      issues.push('the term is too short to stand alone');
    }
  }

  if (/[,:;]\s*$/.test(a) || /^(sometimes referred|still a matter|good for a)\b/i.test(a)) {
    issues.push('answer is a sentence fragment');
  }

  if (subject) {
    const qTokens = new Set(contentTokens(q));
    const aTokens = contentTokens(a);
    if (aTokens.length > 0 && aTokens.every((token) => qTokens.has(token))) {
      issues.push('answer only repeats the question');
    }
  }

  return issues;
}

export function isReadableTrivia(question, answer) {
  return triviaLanguageIssues(question, answer).length === 0;
}
