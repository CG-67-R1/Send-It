/**
 * RoadRace AI replies are shown in a plain Text bubble (no Markdown renderer).
 * GPT still emits headings/bold by default — strip those tokens for the phone UI.
 */
export function stripChatMarkdown(text: string): string {
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
