/**
 * Strip common Markdown markers for plain Text bubbles (Coach / Ask).
 * Keeps readable prose; does not attempt a full Markdown parser.
 */
export function stripMarkdownToPlain(input: string): string {
  let s = String(input || '');
  if (!s) return '';

  s = s.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  s = s.replace(/^>\s?/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
