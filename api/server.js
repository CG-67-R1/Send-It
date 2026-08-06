import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getAllHeadlines, fetchCustomHeadlines, BUILTIN_SOURCES } from './scrapers.js';
import { search, getTriviaQuestion } from './qa.js';
import { getCalendarEvents } from './calendar.js';
import { chat as roadraceAiChat, askChat } from './roadraceAi.js';
import { loadRiderAiFaqs } from './riderAiFaqs.js';

const app = express();
const PORT = process.env.PORT || 3001;
const APP_SECRET = process.env.APP_API_SECRET;
const MAX_AI_MESSAGE_CHARS = 4000;

function logError(label, err) {
  console.error(`[${label}]`, err?.message ?? err);
}

/** Shared secret: when APP_API_SECRET is set, require matching x-app-secret header. */
function requireAppSecret(req, res, next) {
  if (!APP_SECRET) return next();
  const h = req.headers['x-app-secret'];
  if (!h || h !== APP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: [
      'https://send-it-ke7r.onrender.com',
      /\.expo\.dev$/,
      /localhost/,
      /^http:\/\/192\.168\./,
      /^http:\/\/10\./,
    ],
    methods: ['GET', 'POST'],
  })
);

// Small default body limit; chat allows 8mb for base64 image attachments.
app.use((req, res, next) => {
  const isChatUpload = req.method === 'POST' && req.path === '/roadrace-ai/chat';
  return express.json({ limit: isChatUpload ? '8mb' : '64kb' })(req, res, next);
});

const roadraceAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests — try again in a few minutes.' },
});

app.use('/roadrace-ai', requireAppSecret, roadraceAiLimiter);
app.use('/headlines/custom', requireAppSecret);

app.get('/health', (_, res) => {
  res.json({
    ok: true,
    roadraceAi: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.get('/', (_, res) => {
  res.json({
    name: 'RoadRacer API',
    health: '/health',
    endpoints: [
      '/headlines',
      '/sources',
      '/qa/search',
      '/qa/trivia',
      '/calendar',
      '/roadrace-ai/chat',
      '/roadrace-ai/ask',
      '/roadrace-ai/faqs',
    ],
  });
});

app.get('/sources', (_, res) => {
  res.json({ sources: BUILTIN_SOURCES });
});

app.get('/headlines', async (req, res) => {
  const bypassCache = req.query.refresh === '1';
  if (bypassCache) {
    if (APP_SECRET) {
      const h = req.headers['x-app-secret'];
      if (!h || h !== APP_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }
  try {
    const headlines = await getAllHeadlines(bypassCache);
    res.json({ headlines, count: headlines.length });
  } catch (e) {
    logError('headlines', e);
    res.status(500).json({ error: 'Failed to fetch headlines', headlines: [] });
  }
});

app.post('/headlines/custom', async (req, res) => {
  const { customSources } = req.body || {};
  if (!Array.isArray(customSources) || customSources.length === 0) {
    return res.json({ headlines: [], count: 0 });
  }
  if (customSources.length > 4) {
    return res.status(400).json({ error: 'A maximum of 4 custom sources is allowed' });
  }
  if (
    customSources.some(
      (source) => !source || typeof source.url !== 'string' || source.url.trim().length === 0
    )
  ) {
    return res.status(400).json({ error: 'Each custom source must include a URL string' });
  }
  try {
    const headlines = await fetchCustomHeadlines(customSources);
    res.json({ headlines, count: headlines.length });
  } catch (e) {
    logError('headlines/custom', e);
    res.status(500).json({ error: 'Failed to fetch custom headlines', headlines: [] });
  }
});

app.get('/qa/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    const { results } = await search(q);
    res.json({ results });
  } catch (e) {
    logError('qa/search', e);
    res.status(500).json({ error: 'Search failed', results: [] });
  }
});

app.get('/qa/trivia', async (req, res) => {
  const used = (req.query.used || '')
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  const rawDifficulty = parseInt(String(req.query.difficulty ?? ''), 10);
  const difficulty = Number.isFinite(rawDifficulty) ? rawDifficulty : undefined;
  const regionParam = (req.query.region || '').toString().toLowerCase();
  const region = regionParam === 'au' ? 'au' : 'global';
  try {
    const payload = await getTriviaQuestion(used, { difficulty, region });
    if (payload.error) {
      return res.status(400).json(payload);
    }
    res.json(payload);
  } catch (e) {
    logError('qa/trivia', e);
    res.status(500).json({ error: 'Trivia failed' });
  }
});

app.get('/calendar', async (req, res) => {
  const bypassCache = req.query.refresh === '1';
  try {
    const events = await getCalendarEvents(bypassCache);
    res.json({ events });
  } catch (e) {
    logError('calendar', e);
    res.status(500).json({ error: 'Failed to load calendar', events: [] });
  }
});

app.get('/roadrace-ai/faqs', async (_, res) => {
  try {
    const faqs = await loadRiderAiFaqs(true);
    res.json(faqs);
  } catch (e) {
    logError('roadrace-ai/faqs', e);
    res.status(500).json({ error: 'Failed to load FAQs', coach: [], bikesetup: [] });
  }
});

app.post('/roadrace-ai/ask', async (req, res) => {
  const { message, mode } = req.body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (text.length > MAX_AI_MESSAGE_CHARS) {
    return res.status(400).json({
      error: `Message too long (max ${MAX_AI_MESSAGE_CHARS} chars)`,
    });
  }
  const askMode = mode === 'rules' ? 'rules' : 'ask';
  try {
    const result = await askChat(text, { mode: askMode });
    if (result.error) {
      return res.status(500).json({
        error: result.error,
        reply: '',
        sources: [],
        fromKb: false,
      });
    }
    res.json({
      reply: result.content || '',
      sources: result.sources || [],
      fromKb: Boolean(result.fromKb),
      ...(result.momsOnline ? { momsOnline: result.momsOnline } : {}),
    });
  } catch (e) {
    logError('roadrace-ai/ask', e);
    res.status(500).json({ error: 'AI request failed', reply: '', sources: [], fromKb: false });
  }
});

app.post('/roadrace-ai/chat', async (req, res) => {
  const { message, mode = 'coach', history = [], attachments = [] } = req.body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (!text && !hasAttachments) {
    return res.status(400).json({ error: 'message or attachments required' });
  }
  if (text.length > MAX_AI_MESSAGE_CHARS) {
    return res.status(400).json({
      error: `Message too long (max ${MAX_AI_MESSAGE_CHARS} chars)`,
    });
  }
  const validMode = mode === 'bikesetup' ? 'bikesetup' : 'coach';
  const messages = Array.isArray(history)
    ? history
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string'
        )
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.trim() }))
    : [];
  messages.push({ role: 'user', content: text || 'Please review the attached file(s).' });
  try {
    const result = await roadraceAiChat(messages, validMode, attachments);
    if (result.error) {
      return res.status(500).json({ error: result.error, reply: '' });
    }
    const payload = { reply: result.content || '' };
    if (result.suggestMode === 'coach' || result.suggestMode === 'bikesetup') {
      payload.suggestMode = result.suggestMode;
    }
    res.json(payload);
  } catch (e) {
    logError('roadrace-ai/chat', e);
    res.status(500).json({ error: 'AI request failed', reply: '' });
  }
});

app.listen(PORT, () => {
  console.log(`RoadRace Headlines API on http://localhost:${PORT}`);
});
