import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const audioDir = join(root, "assets", "audio");
const outMp3 = join(audioDir, "music.mp3");
const toolsFfmpeg = join(root, "tools", "ffmpeg", "ffmpeg.exe");

mkdirSync(audioDir, { recursive: true });

function resolveFfmpeg() {
  try {
    return require("ffmpeg-static");
  } catch {
    /* fall through */
  }
  if (existsSync(toolsFfmpeg)) return toolsFfmpeg;
  return "ffmpeg";
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
  });
}

const CANDIDATES = [
  {
    url: "https://opengameart.org/sites/default/files/pure_raceway_bpm160.mp3",
    name: "Pure Raceway",
    author: "MintoDog",
    source: "OpenGameArt",
    license: "CC0",
    page: "https://opengameart.org/content/pure-raceway",
  },
  {
    url: "https://opengameart.org/sites/default/files/sky_blue_street_bpm165.mp3",
    name: "Sky Blue Street",
    author: "MintoDog",
    source: "OpenGameArt",
    license: "CC0",
    page: "https://opengameart.org/content/sky-blue-street",
  },
];

async function download(url, dest) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "RoadRacerPromoBuilder/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const size = statSync(dest).size;
  if (size < 50_000) throw new Error(`Download too small (${size} bytes): ${url}`);
}

async function synthesizeFallback(ffmpeg) {
  await run(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=55:duration=14",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=110:duration=14",
    "-f",
    "lavfi",
    "-i",
    "anoisesrc=color=pink:amplitude=0.08:duration=14",
    "-filter_complex",
    [
      "[0:a]volume=0.4,afade=t=in:st=0:d=0.2,afade=t=out:st=12.5:d=1.2[bass]",
      "[1:a]tremolo=f=8:d=0.7,volume=0.18[pulse]",
      "[2:a]highpass=f=600,lowpass=f=5000,volume=0.2[air]",
      "[bass][pulse][air]amix=inputs=3:duration=longest:normalize=0,alimiter=limit=0.9",
    ].join(";"),
    outMp3,
  ]);
  return {
    name: "Synthesized racing bed",
    source: "FFmpeg lavfi",
    license: "Generated in-repo (royalty-free)",
    page: "n/a",
  };
}

async function main() {
  const ffmpeg = resolveFfmpeg();
  let meta = null;

  for (const c of CANDIDATES) {
    try {
      console.log(`Trying ${c.name}…`);
      await download(c.url, outMp3);
      meta = c;
      console.log(`Downloaded ${c.name}`);
      break;
    } catch (err) {
      console.warn(`Failed ${c.name}: ${err.message}`);
    }
  }

  if (!meta) {
    console.warn("Music download failed; synthesizing fallback bed…");
    meta = await synthesizeFallback(ffmpeg);
  }

  writeFileSync(
    join(audioDir, "music-meta.json"),
    JSON.stringify({ ...meta, file: "music.mp3" }, null, 2)
  );
  console.log(`Wrote ${outMp3}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
