/**
 * Extract text from a PDF and write it to the knowledge base as Markdown.
 * Usage:
 *   node pdfToCoachingKb.js "<path-to.pdf>"              → coaching KB (riding-techniques + GPTUpload)
 *   node pdfToCoachingKb.js technical "<path-to.pdf>"     → technical KB (suspension + GPTUpload)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KB_RIDING = path.resolve(__dirname, '..', 'ST', 'motorcycle-track-gpt', 'knowledge-base', 'riding-techniques');
const KB_TECHNICAL = path.resolve(__dirname, '..', 'ST', 'motorcycle-track-gpt', 'knowledge-base', 'suspension');
const KB_GPT_UPLOAD = path.resolve(__dirname, '..', 'ST', 'GPTUpload');

/** Turn raw PDF text into cleaner Markdown (paragraphs, optional headings). */
function toMarkdown(text) {
  if (!text || !String(text).trim()) return '';
  let out = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  // Normalize multiple newlines to double (paragraph break)
  out = out.replace(/\n{3,}/g, '\n\n');
  // Lines that look like section headings: short, often title case or caps
  const lines = out.split('\n');
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    const looksLikeHeading =
      trimmed.length < 80 &&
      (/\d+\.\s+[A-Z]/.test(trimmed) ||
        /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed) ||
        trimmed.endsWith(':'));
    if (looksLikeHeading && result.length > 0 && result[result.length - 1] !== '') {
      result.push('');
      result.push('### ' + trimmed);
    } else {
      result.push(trimmed);
    }
  }
  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function safeBasename(pdfPath) {
  const base = path.basename(pdfPath, path.extname(pdfPath));
  return base.replace(/\s+/g, '-').replace(/[^\w\-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'extracted-pdf';
}

async function run() {
  const isTechnical = process.argv[2] === 'technical';
  const pdfPath = process.argv[isTechnical ? 3 : 2];
  if (!pdfPath) {
    console.error('Usage: node pdfToCoachingKb.js [technical] "<path-to.pdf>"');
    process.exit(1);
  }

  const resolvedPdf = path.resolve(pdfPath);
  try {
    await fs.access(resolvedPdf);
  } catch {
    console.error('File not found:', resolvedPdf);
    process.exit(1);
  }

  const title = path.basename(resolvedPdf, path.extname(resolvedPdf));
  const slug = safeBasename(resolvedPdf);
  const outFileName = slug + '.md';

  console.log('Reading PDF:', resolvedPdf, isTechnical ? '(technical KB)' : '(coaching KB)');

  const buffer = await fs.readFile(resolvedPdf);
  const data = await pdfParse(buffer);
  const rawText = data.text || '';
  const content = toMarkdown(rawText);

  const kbLabel = isTechnical ? 'Technical (bike setup / suspension) knowledge base' : 'Coaching knowledge base extract';
  const md = `# ${title}

${kbLabel}. Source: PDF — "${title}".

**Scraped**: ${new Date().toISOString().slice(0, 10)} | **Pages**: ${data.numpages ?? '?'}

---

${content}
`;

  const kbDir = isTechnical ? KB_TECHNICAL : KB_RIDING;
  await fs.mkdir(kbDir, { recursive: true });
  const outPathKb = path.join(kbDir, outFileName);
  await fs.writeFile(outPathKb, md, 'utf-8');
  console.log('Written:', outPathKb);

  await fs.mkdir(KB_GPT_UPLOAD, { recursive: true });
  const outPathGpt = path.join(KB_GPT_UPLOAD, outFileName);
  await fs.writeFile(outPathGpt, md, 'utf-8');
  console.log('Written:', outPathGpt);

  console.log('Done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
