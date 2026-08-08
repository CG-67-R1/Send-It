/**
 * Strip common Markdown markers for plain Text bubbles (Coach / Ask).
 * Keeps readable prose; does not attempt a full Markdown parser.
 */
export function stripMarkdownToPlain(input: string): string {
  let text = String(input || '');
  if (!text) return '';

  text = text.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
