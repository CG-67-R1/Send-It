import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(fileURLToPath(import.meta.url));
const stillsDir = join(root, "assets", "stills");
const videoDir = join(root, "assets", "video");
const audioDir = join(root, "assets", "audio");
const outDir = join(root, "out");
const tmpDir = join(root, "tmp");
const toolsFfmpeg = join(root, "tools", "ffmpeg", "ffmpeg.exe");
const toolsFfprobe = join(root, "tools", "ffmpeg", "ffprobe.exe");

const seq = JSON.parse(readFileSync(join(root, "sequence.json"), "utf8"));

function resolveBin(kind) {
  try {
    if (kind === "ffmpeg") return require("ffmpeg-static");
    return require("ffprobe-static").path;
  } catch {
    /* fall through */
  }
  const local = kind === "ffmpeg" ? toolsFfmpeg : toolsFfprobe;
  if (existsSync(local)) return local;
  return kind;
}

const FFMPEG = resolveBin("ffmpeg");
const FFPROBE = resolveBin("ffprobe");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: opts.silent ? "pipe" : "inherit" });
    let stdout = "";
    let stderr = "";
    if (opts.silent) {
      child.stdout?.on("data", (d) => (stdout += d));
      child.stderr?.on("data", (d) => (stderr += d));
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            `${cmd} exited ${code}${opts.silent ? `\n${stderr}` : ""}`
          )
        );
    });
  });
}

async function probeDuration(path) {
  const { stdout } = await run(
    FFPROBE,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      path,
    ],
    { silent: true }
  );
  return parseFloat(stdout.trim());
}

/** Still sequence length before outro (with crossfades). */
function stillsDuration() {
  const n = seq.clips.length;
  return n * seq.clipSec - (n - 1) * seq.fadeSec;
}

/** Full program length including outro crossfade. */
function programDuration() {
  const outro = seq.outro;
  if (!outro) return seq.durationSec;
  return stillsDuration() + outro.sec - outro.fadeSec;
}

/**
 * Portrait: fill height, crop/pan on left OR right edge (never center-crop).
 * Landscape: cover + mild Ken Burns zoom, horizontal pan follows pan side.
 */
async function renderClip(stillPath, clip, aspectKey, outPath) {
  const aspect = seq.aspects[aspectKey];
  const { width, height } = aspect;
  const fps = seq.fps;
  const frames = Math.round(seq.clipSec * fps);
  const last = frames - 1;
  const pan = clip.pan === "left" ? "left" : "right";
  const z0 = clip.zoom?.from ?? 1.0;
  const z1 = clip.zoom?.to ?? 1.06;

  let vf;
  if (aspectKey === "portrait") {
    // Fill height → wide canvas, then 9:16 crop locked to left OR right with a slow inward pan.
    // (crop uses n=frame index; avoid commas inside the expression.)
    const xExpr =
      pan === "left"
        ? `(iw-ow)*0.12*n/${last}`
        : `(iw-ow)*(1-0.12*n/${last})`;
    vf = [
      `scale=-2:${height}`,
      `fps=${fps}`,
      `crop=${width}:${height}:${xExpr}:0`,
      `setsar=1`,
    ].join(",");
  } else {
    // Landscape: cover frame, mild zoom, bias pan to left/right instead of dead center.
    const zExpr = `${z0}+(${z1}-${z0})*on/${last}`;
    const xExpr =
      pan === "left"
        ? `(iw-iw/zoom)*0.15*on/${last}`
        : `(iw-iw/zoom)*(1-0.15*on/${last})`;
    vf = [
      `scale=${width}:${height}:force_original_aspect_ratio=increase`,
      `crop=${width}:${height}`,
      `zoompan=z='${zExpr}':x='${xExpr}':y='(ih-ih/zoom)/2':d=${frames}:s=${width}x${height}:fps=${fps}`,
      `setsar=1`,
    ].join(",");
  }

  await run(FFMPEG, [
    "-y",
    "-loop",
    "1",
    "-i",
    stillPath,
    "-vf",
    vf,
    "-frames:v",
    String(frames),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outPath,
  ]);
}

async function renderOutro(aspectKey, outPath) {
  const aspect = seq.aspects[aspectKey];
  const { width, height } = aspect;
  const fps = seq.fps;
  const outro = seq.outro;
  const src = join(videoDir, outro.file);
  if (!existsSync(src)) throw new Error(`Missing outro video: ${src}`);

  const frames = Math.round(outro.sec * fps);
  const last = Math.max(1, frames - 1);
  const pan = outro.pan === "left" ? "left" : "right";
  const fadeOut = `fade=t=out:st=${Math.max(0, outro.sec - 0.45)}:d=0.45`;
  // Portrait: fill height, crop/pan on left OR right edge (never centre).
  const xExpr =
    pan === "left"
      ? `(iw-ow)*0.1*n/${last}`
      : `(iw-ow)*(1-0.1*n/${last})`;
  const vf =
    aspectKey === "portrait"
      ? [
          `scale=-2:${height}`,
          `fps=${fps}`,
          `crop=${width}:${height}:${xExpr}:0`,
          `setsar=1`,
          fadeOut,
        ].join(",")
      : [
          `scale=${width}:${height}:force_original_aspect_ratio=increase`,
          `crop=${width}:${height}`,
          `fps=${fps}`,
          `setsar=1`,
          fadeOut,
        ].join(",");

  await run(FFMPEG, [
    "-y",
    "-ss",
    String(outro.startSec ?? 0),
    "-i",
    src,
    "-t",
    String(outro.sec),
    "-vf",
    vf,
    "-frames:v",
    String(frames),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outPath,
  ]);
}

async function xfadeAll(clipPaths, outroPath, outPath) {
  const fade = seq.fadeSec;
  const fps = seq.fps;
  const outroFade = seq.outro?.fadeSec ?? 0.5;
  const inputs = [];
  for (const p of clipPaths) inputs.push("-i", p);
  inputs.push("-i", outroPath);

  let filter = "";
  let lastLabel = "[0:v]";
  let currentDur = seq.clipSec;
  const stillCount = clipPaths.length;

  for (let i = 1; i < stillCount; i++) {
    const offset = currentDur - fade;
    const outLabel = `[v${i}]`;
    filter += `${lastLabel}[${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset}${outLabel};`;
    lastLabel = outLabel;
    currentDur = currentDur + seq.clipSec - fade;
  }

  const outroIdx = stillCount;
  const outroOffset = currentDur - outroFade;
  filter += `${lastLabel}[${outroIdx}:v]xfade=transition=fade:duration=${outroFade}:offset=${outroOffset}[vout];`;
  currentDur = currentDur + seq.outro.sec - outroFade;

  const target = seq.durationSec ?? currentDur;
  filter += `[vout]trim=duration=${target},setpts=PTS-STARTPTS,fps=${fps}[vfinal]`;

  await run(FFMPEG, [
    "-y",
    ...inputs,
    "-filter_complex",
    filter,
    "-map",
    "[vfinal]",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outPath,
  ]);
}

async function buildAudioMix(outPath) {
  const vocal = join(audioDir, "vocal.mp3");
  const music = join(audioDir, "music.mp3");
  const whoosh = join(audioDir, "whoosh.wav");
  const chime = join(audioDir, "ui-chime.wav");
  for (const p of [vocal, music, whoosh, chime]) {
    if (!existsSync(p)) throw new Error(`Missing audio: ${p}`);
  }

  const dur = seq.durationSec;
  const cuts = seq.sfxCutsSec;
  const whooshInputs = cuts.flatMap(() => ["-i", whoosh]);
  const chimeAt = cuts[cuts.length - 1];
  const outroStart = stillsDuration() - (seq.outro?.fadeSec ?? 0.5);

  const parts = [];
  parts.push(
    `[0:a]atrim=0:${dur},asetpts=PTS-STARTPTS,volume=0.24,afade=t=out:st=${Math.max(0, dur - 0.6)}:d=0.55[music]`
  );
  parts.push(
    `[1:a]atrim=0:${dur},asetpts=PTS-STARTPTS,volume=1.2,alimiter=limit=0.95[vocal]`
  );

  const whooshLabels = [];
  for (let i = 0; i < cuts.length; i++) {
    const delayMs = Math.round(cuts[i] * 1000);
    const inIdx = 2 + i;
    const lab = `w${i}`;
    parts.push(
      `[${inIdx}:a]volume=0.55,adelay=${delayMs}|${delayMs},apad=whole_dur=${dur}[${lab}]`
    );
    whooshLabels.push(`[${lab}]`);
  }

  const chimeIdx = 2 + cuts.length;
  const chimeDelay = Math.round(chimeAt * 1000);
  parts.push(
    `[${chimeIdx}:a]volume=0.7,adelay=${chimeDelay}|${chimeDelay},apad=whole_dur=${dur}[chime]`
  );

  // Extra whoosh into the bike outro
  const outroWhooshIdx = chimeIdx + 1;
  const outroDelay = Math.round(Math.max(0, outroStart) * 1000);
  parts.push(
    `[${outroWhooshIdx}:a]volume=0.65,adelay=${outroDelay}|${outroDelay},apad=whole_dur=${dur}[woutro]`
  );

  const mixInputs = [
    "[music]",
    "[vocal]",
    ...whooshLabels,
    "[chime]",
    "[woutro]",
  ].join("");
  const n = 2 + whooshLabels.length + 2;
  parts.push(
    `${mixInputs}amix=inputs=${n}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.89,atrim=0:${dur},asetpts=PTS-STARTPTS[aout]`
  );

  await run(FFMPEG, [
    "-y",
    "-i",
    music,
    "-i",
    vocal,
    ...whooshInputs,
    "-i",
    chime,
    "-i",
    whoosh,
    "-filter_complex",
    parts.join(";"),
    "-map",
    "[aout]",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outPath,
  ]);
}

async function mux(videoPath, audioPath, outPath) {
  await run(FFMPEG, [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    "-movflags",
    "+faststart",
    outPath,
  ]);
}

async function buildAspect(aspectKey) {
  const aspect = seq.aspects[aspectKey];
  const clipDir = join(tmpDir, aspectKey);
  mkdirSync(clipDir, { recursive: true });

  const clipPaths = [];
  for (let i = 0; i < seq.clips.length; i++) {
    const clip = seq.clips[i];
    const still = join(stillsDir, clip.file);
    if (!existsSync(still)) throw new Error(`Missing still: ${still}`);
    const out = join(clipDir, `clip${i}.mp4`);
    console.log(`[${aspectKey}] pan=${clip.pan} ${clip.file}…`);
    await renderClip(still, clip, aspectKey, out);
    clipPaths.push(out);
  }

  const outroPath = join(clipDir, "outro.mp4");
  console.log(`[${aspectKey}] outro ${seq.outro.file}…`);
  await renderOutro(aspectKey, outroPath);

  const videoOnly = join(tmpDir, `${aspectKey}-video.mp4`);
  console.log(`[${aspectKey}] Crossfading stills → outro…`);
  await xfadeAll(clipPaths, outroPath, videoOnly);

  const audioPath = join(tmpDir, "mix.m4a");
  if (!existsSync(audioPath)) {
    console.log("Mixing audio…");
    await buildAudioMix(audioPath);
  }

  mkdirSync(outDir, { recursive: true });
  const finalOut = join(outDir, aspect.out);
  console.log(`[${aspectKey}] Muxing → ${aspect.out}`);
  await mux(videoOnly, audioPath, finalOut);

  const dur = await probeDuration(finalOut);
  console.log(`[${aspectKey}] duration=${dur.toFixed(2)}s → ${finalOut}`);
  return { out: finalOut, duration: dur };
}

async function main() {
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const audioPath = join(tmpDir, "mix.m4a");
  if (existsSync(audioPath)) rmSync(audioPath);

  const prog = programDuration();
  console.log(`ffmpeg: ${FFMPEG}`);
  console.log(
    `stills=${stillsDuration().toFixed(2)}s + outro → ~${prog.toFixed(2)}s (target ${seq.durationSec}s)`
  );

  const results = [];
  for (const key of Object.keys(seq.aspects)) {
    results.push(await buildAspect(key));
  }

  writeFileSync(
    join(outDir, "build-meta.json"),
    JSON.stringify(
      {
        builtAt: new Date().toISOString(),
        results,
        sequence: seq,
      },
      null,
      2
    )
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
