/**
 * Harry's LapTimer .tkk centreline: <hpts> chunk, 12-byte lat/lon/extra records.
 * Coordinates are int32 little-endian × 1e-7 degrees. No turn hands.
 */
export function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function pathLengthM(pts) {
  let n = 0;
  for (let i = 1; i < pts.length; i += 1) n += haversineM(pts[i - 1], pts[i]);
  if (pts.length > 2) n += haversineM(pts[pts.length - 1], pts[0]);
  return n;
}

export function tkkName(buf) {
  const raw = buf.slice(16, 80).toString('ascii');
  return raw.replace(/\0+$/g, '').trim();
}

export function tkkPoints(buf) {
  const start = buf.indexOf(Buffer.from('<hpts'));
  if (start < 0) return [];
  let p = start + 6;
  while (p < buf.length && buf[p] !== 0x3e) p += 1;
  p += 1;
  const pts = [];
  while (p + 12 <= buf.length) {
    if (buf[p] === 0x3c && buf[p + 1] === 0x68) break;
    const lat = buf.readInt32LE(p) / 1e7;
    const lon = buf.readInt32LE(p + 4) / 1e7;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) break;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) break;
    if (Math.abs(lat) < 0.5 && Math.abs(lon) < 0.5) break;
    pts.push({ lat, lon });
    p += 12;
  }
  return pts;
}

export function toGpx(trackId, name, pts) {
  const body = pts
    .map((pt) => `    <trkpt lat="${pt.lat.toFixed(8)}" lon="${pt.lon.toFixed(8)}"></trkpt>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Send-It tkk-to-gpx (Harry's LapTimer .tkk)">
  <trk><name>${trackId}</name><trkseg>
${body}
  </trkseg></trk>
</gpx>
`;
}
