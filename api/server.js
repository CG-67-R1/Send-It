import express from 'express';
import cors from 'cors';
import { getAllHeadlines, fetchCustomHeadlines, BUILTIN_SOURCES } from './scrapers.js';
import { search, getTriviaQuestion } from './qa.js';
import { getCalendarEvents } from './calendar.js';
import { chat as roadraceAiChat } from './roadraceAi.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.get('/', (_, res) => {
  res.json({
    name: 'RoadRacer API',
    health: '/health',
    endpoints: ['/headlines', '/sources', '/qa/search', '/qa/trivia', '/calendar', '/roadrace-ai/chat'],
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

app.post('/roadrace-ai/chat', async (req, res) => {
  const { message, mode = 'coach', history = [] } = req.body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'message is required' });
  }
  const validMode = mode === 'bikesetup' ? 'bikesetup' : 'coach';
  const messages = Array.isArray(history)
    ? history
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.trim() }))
    : [];
  messages.push({ role: 'user', content: text });
  try {
    const result = await roadraceAiChat(messages, validMode);
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
