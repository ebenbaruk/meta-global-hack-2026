/** Synthesizes one voiceover clip per scene (cached by text) and writes their durations. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RATE, SCENES, VOICE } from "./video-scenes";

const dir = "video/out/vo";
mkdirSync(dir, { recursive: true });

const probe = (file: string) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());

const durations: Record<string, number> = {};
SCENES.forEach((scene, i) => {
  const base = `${dir}/${String(i + 1).padStart(2, "0")}-${scene.id}`;
  const key = `${VOICE}|${RATE}|${scene.text}`;
  const fresh = existsSync(`${base}.mp3`) && existsSync(`${base}.txt`) && readFileSync(`${base}.txt`, "utf8") === key;
  if (!fresh) {
    for (let attempt = 1; ; attempt++) {
      try {
        execFileSync("uvx", ["edge-tts", "--voice", VOICE, `--rate=${RATE}`, "--text", scene.text, "--write-media", `${base}.mp3`], { stdio: "pipe" });
        break;
      } catch (err) {
        if (attempt >= 8) throw err;
        execFileSync("sleep", [String(attempt * 2)]);
      }
    }
    writeFileSync(`${base}.txt`, key);
  }
  durations[scene.id] = probe(`${base}.mp3`);
  console.log(`${scene.id.padEnd(10)} ${durations[scene.id].toFixed(2)} s`);
});
const total = Object.values(durations).reduce((a, b) => a + b, 0);
console.log(`total narration ${total.toFixed(1)} s`);
writeFileSync(`${dir}/durations.json`, JSON.stringify(durations, null, 2));
