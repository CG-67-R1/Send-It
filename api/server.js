import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getAllHeadlines, fetchCustomHeadlines, BUILTIN_SOURCES } from './scrapers.js';
import { search, getTriviaQuestion } from './qa.js';
import { getCalendarEvents } from './calendar.js';
import { chat as roadraceAiChat, askChat } from './roadraceAi.js';
import { loadRiderAiFaqs } from './riderAiFaqs.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '8mb' }));

const roadraceAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests — try again in a few minutes.' },
});

app.use('/roadrace-ai', roadraceAiLimiter);

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
    endpoints: ['/headlines', '/sources', '/qa/search', '/qa/trivia', '/calendar', '/roadrace-ai/chat', '/roadrace-ai/ask', '/roadrace-ai/faqs'],
  });
});

app.get('/sources', (_, res) => {
  res.json({ sources: BUILTIN_SOURCES });
});

app.get('/headlines', async (req, res) => {
  const bypassCache = req.query.refresh === '1';
  try {
    const headlines = await getAllHeadlines(bypassCache);
    res.json({ headlines, count: headlines.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch headlines', headlines: [] });
  }
});

app.post('/headlines/custom', async (req, res) => {
  const { customSources } = req.body || {};
  if (!Array.isArray(customSources) || customSources.length === 0) {
    return res.json({ headlines: [], count: 0 });
  }
  try {
    const headlines = await fetchCustomHeadlines(customSources);
    res.json({ headlines, count: headlines.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch custom headlines', headlines: [] });
  }
});

app.get('/qa/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    const { results } = await search(q);
    res.json({ results });
  } catch (e) {
    console.error(e);
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
    console.error(e);
    res.status(500).json({ error: 'Trivia failed' });
  }
});

app.get('/calendar', async (req, res) => {
  const bypassCache = req.query.refresh === '1';
  try {
    const events = await getCalendarEvents(bypassCache);
    res.json({ events });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load calendar', events: [] });
  }
});

app.get('/roadrace-ai/faqs', async (_, res) => {
  try {
    const faqs = await loadRiderAiFaqs(true);
    res.json(faqs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load FAQs', coach: [], bikesetup: [] });
  }
});

app.post('/roadrace-ai/ask', async (req, res) => {
  const { message } = req.body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    const result = await askChat(text);
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
    });
  } catch (e) {
    console.error(e);
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
  const validMode = mode === 'bikesetup' ? 'bikesetup' : 'coach';
  const messages = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.trim() }))
    : [];
  messages.push({ role: 'user', content: text || 'Please review the attached file(s).' });
  try {
    const result = await roadraceAiChat(messages, validMode, attachments);
    if (result.error) {
      return res.status(500).json({ error: result.error, reply: '' });
    }
    res.json({ reply: result.content || '' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'AI request failed', reply: '' });
  }
});

app.listen(PORT, () => {
  console.log(`RoadRace Headlines API on http://localhost:${PORT}`);
});
