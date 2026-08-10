import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, "assets", "audio");
const outMp3 = join(outDir, "vocal.mp3");
const voice = process.env.PROMO_VOICE || "en-AU-WilliamMultilingualNeural";
const rate = process.env.PROMO_VOICE_RATE || "+18%";
const pitch = process.env.PROMO_VOICE_PITCH || "+6Hz";

mkdirSync(outDir, { recursive: true });

const scriptRaw = readFileSync(join(root, "script.txt"), "utf8");
const lines = scriptRaw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const text = lines.join(" ");

const tmpTxt = join(root, "tmp", "voice-text.txt");
mkdirSync(join(root, "tmp"), { recursive: true });
writeFileSync(tmpTxt, text, "utf8");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    );
  });
}

async function main() {
  console.log(`Generating vocal with ${voice} rate=${rate} pitch=${pitch}…`);
  console.log(`Text: ${text}`);
  await run("python", [
    "-m",
    "edge_tts",
    "--voice",
    voice,
    "--rate",
    rate,
    "--pitch",
    pitch,
    "--file",
    tmpTxt,
    "--write-media",
    outMp3,
  ]);
  if (!existsSync(outMp3)) throw new Error("vocal.mp3 was not created");
  writeFileSync(
    join(outDir, "voice-meta.json"),
    JSON.stringify({ voice, rate, pitch, text, out: "vocal.mp3" }, null, 2)
  );
  console.log(`Wrote ${outMp3}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
