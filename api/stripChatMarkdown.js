/**
 * RoadRace AI replies are shown in a plain Text bubble (no Markdown renderer).
 * Keep in sync with app/src/utils/chatMarkdown.ts
 * @param {string} text
 * @returns {string}
 */
export function stripChatMarkdown(text) {
  if (!text) return '';
  let s = String(text);

  s = s.replace(/```[\w-]*\r?\n?([\s\S]*?)```/g, '$1');
  s = s.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '');
  s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  s = s.replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '$1');
  s = s.replace(/__([^_\n]+)__/g, '$1');
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/^[ \t]*([-*_]){3,}[ \t]*$/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}
