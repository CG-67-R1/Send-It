/**
 * Parse ST knowledge-base track markdown into app/src/data/tracks.json
 * Run from repo root: node scripts/build-track-catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.join(__dirname, '../ST/motorcycle-track-gpt/knowledge-base/track-analysis');
const OUT = path.join(__dirname, '../app/src/data/tracks.json');

const TRACK_FILES = [
  { file: 'KB_Phillip_Island_Grand_Prix_Circuit.md', id: 'phillip_island' },
  { file: 'KB_Mallala_Motorsport_Park.md', id: 'mallala' },
  { file: 'KB_McNamara_Park_Raceway_Mac_Park.md', id: 'mac_park' },
  { file: 'KB_Morgan_Park_Raceway_Circuit_K.md', id: 'morgan_park' },
  { file: 'KB_One_Raceway_Wakefield_Park.md', id: 'wakefield_park' },
  { file: 'KB_Wanneroo_Raceway_Barbagallo.md', id: 'wanneroo' },
  { file: 'KB_The_Bend_Motorsport_Park_International_Circuit.md', id: 'the_bend' },
  { file: 'KB_Sydney_Motorsport_Park_Gardner_GP_Circuit.md', id: 'sydney_motorsport_park' },
  { file: 'KB_Queensland_Raceway_National_Circuit.md', id: 'queensland_raceway' },
  { file: 'KB_Broadford_State_Motorcycle_Complex.md', id: 'broadford' },
];

function inferDirection(shape, priorityText, titleText) {
  const blob = `${shape} ${priorityText} ${titleText}`.toLowerCase();
  if (shape === 'Straight / link' || /straight|link|start\/finish|main straight/.test(blob)) {
    return 'straight';
  }
  if (/complex|double-apex|lead-in/.test(blob) || shape === 'Corner / complex') {
    return 'complex';
  }
  const leftCount = (blob.match(/\bleft\b/g) || []).length;
  const rightCount = (blob.match(/\bright\b/g) || []).length;
  if (leftCount > rightCount) return 'left';
  if (rightCount > leftCount) return 'right';
  if (/kink/.test(shape.toLowerCase()) && /flick right|tip right|right/.test(blob)) return 'right';
  if (/kink/.test(shape.toLowerCase()) && /flick left|left/.test(blob)) return 'left';
  return 'complex';
}

function parseTrackFile(filePath, trackId) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd());
  const name = lines[0].replace(/^#\s*/, '').trim();
  let layout = '';
  let direction = 'unknown';
  let lengthKm = '';

  for (const line of lines.slice(0, 10)) {
    const layoutMatch = line.match(/^-\s*Layout:\s*(.+)/i);
    if (layoutMatch) layout = layoutMatch[1].trim();
    const dirMatch = line.match(/^-\s*Direction:\s*(.+)/i);
    if (dirMatch) {
      const d = dirMatch[1].toLowerCase();
      if (d.includes('anticlock') || d.includes('anti-clock')) direction = 'anticlockwise';
      else if (d.includes('clockwise') || d.includes('clock-wise')) direction = 'clockwise';
      else direction = 'unknown';
    }
    const kmMatch = line.match(/(\d+\.?\d*)\s*km/i);
    if (kmMatch && !lengthKm) lengthKm = `${kmMatch[1]} km`;
  }

  const sectionRegex = /^##\s+([A-Z]+_S\d+)\s+—\s+(.+)$/;
  const corners = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(sectionRegex);
    if (header) {
      if (current) corners.push(current);
      const titleRaw = header[2].trim();
      if (/overview|key themes/i.test(titleRaw)) {
        current = null;
        continue;
      }
      const turnNumMatch =
        titleRaw.match(/Turn\s*(\d+)/i) ||
        titleRaw.match(/\bT(\d+)\b/i) ||
        titleRaw.match(/^(\d+)\s*[—:-]/);
      const number = turnNumMatch ? parseInt(turnNumMatch[1], 10) : corners.length + 1;
      let label = titleRaw
        .replace(/^Turn\s*\d+\s*[:(]?\s*/i, '')
        .replace(/\).*$/, '')
        .replace(/:\s*.+$/, '')
        .trim();
      if (!label || label.length > 60) {
        label = `Turn ${number}`;
      }
      current = {
        id: `${trackId}_t${number}`,
        number,
        label,
        shape: '',
        direction: 'complex',
        approachFrom: null,
        prioritySnippet: '',
      };
      continue;
    }
    if (!current) continue;
    const shapeMatch = lines[i].match(/^\*\*Shape:\*\*\s*(.+)/);
    if (shapeMatch) current.shape = shapeMatch[1].trim();
    const priorityMatch = lines[i].match(/^\*\*Priority \/ what matters:\*\*\s*(.+)/);
    if (priorityMatch) current.prioritySnippet = priorityMatch[1].slice(0, 120);
  }
  if (current) corners.push(current);

  const byNum = new Map();
  for (const c of corners) {
    if (!byNum.has(c.number)) byNum.set(c.number, c);
  }
  const uniqueCorners = [...byNum.values()].sort((a, b) => a.number - b.number);

  for (let i = 0; i < uniqueCorners.length; i++) {
    const c = uniqueCorners[i];
    c.direction = inferDirection(c.shape, c.prioritySnippet, c.label);
    if (i > 0) {
      const prev = uniqueCorners[i - 1];
      c.approachFrom = `T${prev.number} (${prev.label}) exit`;
    } else {
      c.approachFrom = 'main straight / start-finish';
    }
    delete c.prioritySnippet;
  }

  uniqueCorners.push({
    id: `${trackId}_t_finish`,
    number: null,
    label: 'T-Finish',
    shape: 'Straight',
    direction: 'straight',
    approachFrom: uniqueCorners.length
      ? `T${uniqueCorners[uniqueCorners.length - 1].number} exit onto main straight`
      : 'final corner exit',
    isFinish: true,
  });

  return {
    id: trackId,
    name,
    layout: layout || undefined,
    direction,
    lengthKm: lengthKm || undefined,
    isOther: false,
    corners: uniqueCorners,
  };
}

const tracks = TRACK_FILES.map(({ file, id }) => {
  const fp = path.join(KB_DIR, file);
  if (!fs.existsSync(fp)) {
    console.warn(`Missing: ${file}`);
    return null;
  }
  return parseTrackFile(fp, id);
}).filter(Boolean);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ version: 1, tracks }, null, 2));
console.log(`Wrote ${tracks.length} tracks to ${OUT}`);
