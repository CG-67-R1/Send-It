#!/usr/bin/env node
import assert from 'assert/strict';
import http from 'http';

import { scrapeSource } from '../calendarScrapers.js';

const html = `
  <table>
    <tr>
      <td>27/03/2026</td><td>28/03/2026</td><td></td>
      <td>Penrite Australian Superbike Championship</td><td>2</td><td>Sydney Motorsport Park (NSW)</td>
    </tr>
    <tr>
      <td>28/11/2026</td><td>28/11/2026</td><td></td>
      <td>AUSX Supercross Championships</td><td>4</td><td>Melbourne (VIC)</td>
    </tr>
  </table>
`;

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const { port } = server.address();
  const events = await scrapeSource({
    id: 'club_vic_computime',
    name: 'Computime - Calendar',
    type: 'aggregator_calendar',
    jurisdiction: 'VIC',
    url: `http://127.0.0.1:${port}/calendar`,
  });

  assert(
    events.some((event) => /Australian Superbike Championship/.test(event.name)),
    'road-race championship rows should still be accepted'
  );
  assert(
    !events.some((event) => /Supercross|AUSX/i.test(event.name)),
    'supercross rows must not be emitted as road-race events'
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('Calendar discipline filter checks passed.');
