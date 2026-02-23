import express from 'express';
import cors from 'cors';
import { getAllHeadlines, fetchCustomHeadlines, BUILTIN_SOURCES } from './scrapers.js';
import { search, getTriviaQuestion } from './qa.js';
import { getCalendarEvents } from './calendar.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ ok: true });
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
  try {
    const payload = await getTriviaQuestion(used);
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

app.listen(PORT, () => {
  console.log(`RoadRace Headlines API on http://localhost:${PORT}`);
});
