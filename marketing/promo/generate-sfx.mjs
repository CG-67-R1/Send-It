import { spawn } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const audioDir = join(root, "assets", "audio");
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

async function main() {
  const ffmpeg = resolveFfmpeg();
  const whoosh = join(audioDir, "whoosh.wav");
  const chime = join(audioDir, "ui-chime.wav");

  // Short noise burst with lowpass + fade = serviceable whoosh (no external download).
  await run(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anoisesrc=color=pink:amplitude=0.4:duration=0.35",
    "-af",
    "lowpass=f=1200,highpass=f=200,afade=t=in:st=0:d=0.02,afade=t=out:st=0.12:d=0.23,volume=0.7",
    whoosh,
  ]);

  // Soft UI chime for the final beat.
  await run(ffmpeg, [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=880:duration=0.12",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1320:duration=0.18",
    "-filter_complex",
    "[0:a]afade=t=out:st=0.06:d=0.06,volume=0.35[a0];[1:a]adelay=60|60,afade=t=out:st=0.1:d=0.08,volume=0.28[a1];[a0][a1]amix=inputs=2:duration=longest:normalize=0",
    chime,
  ]);

  writeFileSync(
    join(audioDir, "sfx-meta.json"),
    JSON.stringify(
      {
        whoosh: "whoosh.wav",
        chime: "ui-chime.wav",
        note: "Synthesized with FFmpeg lavfi (pink noise + sine). Royalty-free.",
      },
      null,
      2
    )
  );
  console.log(`Wrote ${whoosh}`);
  console.log(`Wrote ${chime}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
