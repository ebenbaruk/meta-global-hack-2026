/**
 * Cuts the demo video: one clip per scene (sized on its voiceover), cross-faded together,
 * narration laid on top, loudness normalized.
 *
 * Inputs: video/out/vo/*, video/out/slides/*, video/out/capture/{landing,mobile,desktop}.{mp4,json}
 * Output: video/out/feedforward-demo.mp4 (+ video/out/timeline.json)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { CHIP_SPEEDS, SCENES, type Scene } from "./video-scenes";

const OUT = "video/out";
const FPS = 30;
const XFADE = 0.3;
const LEAD = 0.45; // voice starts this long after a scene begins
const TAIL = 1.0; // and the picture holds this long after it ends
const MAX_TOTAL = 179;

type Marker = { t: number; type: "scene" | "fast-start" | "fast-end" | "end"; id?: string };
type Piece = { from: number; to: number; speed: number };

const durations: Record<string, number> = JSON.parse(readFileSync(`${OUT}/vo/durations.json`, "utf8"));
type Capture = "landing" | "mobile" | "desktop";
const markers: Record<Capture, Marker[]> = {
  landing: JSON.parse(readFileSync(`${OUT}/capture/landing.json`, "utf8")),
  mobile: JSON.parse(readFileSync(`${OUT}/capture/mobile.json`, "utf8")),
  desktop: JSON.parse(readFileSync(`${OUT}/capture/desktop.json`, "utf8")),
};

const ff = (args: string[]) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });
const n3 = (x: number) => x.toFixed(3);
const voFile = (i: number) => `${OUT}/vo/${String(i + 1).padStart(2, "0")}-${SCENES[i].id}.mp3`;

/** The scene's slice of the capture, as normal-speed and sped-up pieces sized to `target` seconds. */
function cut(source: Capture, id: string, target: number): { pieces: Piece[]; length: number } {
  const list = markers[source];
  const i = list.findIndex((m) => m.type === "scene" && m.id === id);
  if (i < 0) throw new Error(`no "${id}" marker in ${source}.json`);
  const start = list[i].t;
  const end = list.slice(i + 1).find((m) => m.type === "scene" || m.type === "end")!.t;

  const waits: [number, number][] = [];
  for (let k = i + 1; list[k] && list[k].t <= end && list[k].type !== "scene"; k++) {
    if (list[k].type === "fast-start") waits.push([list[k].t, list[k + 1]?.t ?? end]);
  }
  const slow = waits.filter(([a, b]) => b - a > 0.6);
  const W = slow.reduce((s, [a, b]) => s + b - a, 0);
  const N = end - start - W;
  const raw = W > 0 ? W / Math.max(target - N, 0.5) : 1;
  const speed = W > 0 ? CHIP_SPEEDS.reduce((best, s) => (Math.abs(s - raw) < Math.abs(best - raw) ? s : best), CHIP_SPEEDS[0]) : 1;

  const pieces: Piece[] = [];
  let at = start;
  for (const [a, b] of slow) {
    if (a > at) pieces.push({ from: at, to: a, speed: 1 });
    pieces.push({ from: a, to: b, speed });
    at = b;
  }
  if (end > at) pieces.push({ from: at, to: end, speed: 1 });
  const length = pieces.reduce((s, p) => s + (p.to - p.from) / p.speed, 0);
  return { pieces, length };
}

/** Filter graph that trims + retimes the pieces of input `inp` into [label]; returns the sped-up windows. */
function retime(inp: number, pieces: Piece[], hold: number, label: string) {
  const parts = pieces.map((_, k) => `[v${k}]`);
  const graph = [`[${inp}:v]split=${pieces.length}${parts.join("")}`];
  const fast: { from: number; to: number; speed: number }[] = [];
  let t = 0;
  pieces.forEach((p, k) => {
    graph.push(`[v${k}]trim=start=${n3(p.from)}:end=${n3(p.to)},setpts=(PTS-STARTPTS)/${p.speed},fps=${FPS}[p${k}]`);
    const len = (p.to - p.from) / p.speed;
    if (p.speed > 1) fast.push({ from: t, to: t + len, speed: p.speed });
    t += len;
  });
  graph.push(`${pieces.map((_, k) => `[p${k}]`).join("")}concat=n=${pieces.length}:v=1:a=0,tpad=stop_mode=clone:stop_duration=${n3(hold)}${label}`);
  return { graph, fast };
}

function renderScene(i: number, scene: Scene): { file: string; duration: number; note: string } {
  const vo = durations[scene.id];
  const file = `${OUT}/scenes/${String(i + 1).padStart(2, "0")}-${scene.id}.mp4`;
  const enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS)];
  const slide = (name: string) => `${OUT}/slides/${name}.png`;

  if (scene.source === "slide") {
    const lead = i === 0 ? 0.9 : LEAD;
    const tail = i === SCENES.length - 1 ? 3.2 : TAIL + 0.3;
    const duration = lead + vo + tail;
    const fades = i === 0 ? ",fade=in:st=0:d=0.6" : i === SCENES.length - 1 ? `,fade=out:st=${n3(duration - 1.2)}:d=1.2` : "";
    ff(["-loop", "1", "-framerate", String(FPS), "-t", n3(duration), "-i", slide(scene.slide!), "-vf", `format=yuv420p${fades}`, ...enc, file]);
    return { file, duration, note: `slide ${scene.slide}` };
  }

  if (scene.id === "hood") {
    // Architecture slide while the pipeline is narrated, then the live Agent Lens.
    const duration = LEAD + vo + TAIL + 0.6;
    const slideLen = LEAD + vo * 0.64;
    const lens = cut("desktop", "hood", duration - slideLen);
    const start = lens.pieces[0].from;
    const lensLen = duration - slideLen + XFADE;
    ff([
      "-loop", "1", "-framerate", String(FPS), "-t", n3(slideLen + XFADE), "-i", slide("architecture"),
      "-ss", n3(start), "-t", n3(lensLen), "-i", `${OUT}/capture/desktop.mp4`,
      "-filter_complex",
      `[0:v]format=yuv420p,setsar=1[a];[1:v]fps=${FPS},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=5[b];` +
        `[a][b]xfade=transition=fade:duration=0.5:offset=${n3(slideLen - 0.2)},trim=duration=${n3(duration)}[v]`,
      "-map", "[v]", ...enc, file,
    ]);
    return { file, duration, note: `architecture ${slideLen.toFixed(1)} s + lens` };
  }

  const target = LEAD + vo + TAIL;
  const { pieces, length } = cut(scene.source, scene.id, target);
  const duration = Math.max(target, length);
  const { graph, fast } = retime(0, pieces, duration - length + 0.1, "[cap]");
  const speed = fast[0]?.speed;
  const note = speed ? `${speed}× for ${fast.reduce((s, f) => s + f.to - f.from, 0).toFixed(1)} s` : "";
  // The "Sped up N×" pill shows exactly while the footage runs fast: bottom left on the desktop
  // layout (over the taste panel, the quietest corner), top right on the mobile stage.
  const chipAt = scene.source === "mobile" ? "W-w-52:44" : "44:H-h-34";
  const chip = (from: string, inp: number) =>
    speed
      ? `;${from}[${inp}:v]overlay=${chipAt}:enable='${fast.map((f) => `between(t,${n3(f.from)},${n3(f.to)})`).join("+")}'[out]`
      : `;${from}null[out]`;
  const chipInput = speed ? ["-loop", "1", "-i", slide(`chip-${speed}`)] : [];

  if (scene.source !== "mobile") {
    ff([
      "-i", `${OUT}/capture/${scene.source}.mp4`,
      ...chipInput,
      "-filter_complex",
      [...graph, `[cap]scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,trim=duration=${n3(duration)}[out0]` + chip("[out0]", 1)].join(";"),
      "-map", "[out]", "-t", n3(duration), ...enc, file,
    ]);
    return { file, duration, note };
  }

  // Mobile: the phone screen with rounded corners on the stage, framed by the bezel, caption on the left.
  ff([
    "-i", `${OUT}/capture/mobile.mp4`,
    "-loop", "1", "-framerate", String(FPS), "-i", slide("stage"),
    "-loop", "1", "-i", slide("mask"),
    "-loop", "1", "-i", slide("bezel"),
    "-loop", "1", "-i", slide(`caption-${scene.id}`),
    ...chipInput,
    "-filter_complex",
    [
      ...graph,
      `[cap]scale=444:960:flags=lanczos,format=rgba[scr]`,
      `[2:v]scale=444:960,format=gray[m]`,
      `[scr][m]alphamerge[phone]`,
      `[1:v][phone]overlay=1068:60:shortest=0[s1]`,
      `[s1][3:v]overlay=0:0[s2]`,
      `[s2][4:v]overlay=0:0,trim=duration=${n3(duration)},format=yuv420p[out0]` + chip("[out0]", 5),
    ].join(";"),
    "-map", "[out]", "-t", n3(duration), ...enc, file,
  ]);
  return { file, duration, note };
}

(() => {
  mkdirSync(`${OUT}/scenes`, { recursive: true });
  const clips = SCENES.map((s, i) => {
    const c = renderScene(i, s);
    console.log(`${s.id.padEnd(10)} ${c.duration.toFixed(2)} s  ${c.note}`);
    return c;
  });

  // Scene start times on the final timeline (each cross-fade overlaps the previous clip).
  const starts: number[] = [];
  clips.reduce((t, c, i) => ((starts[i] = t), t + c.duration - XFADE), 0);
  const total = starts.at(-1)! + clips.at(-1)!.duration;
  if (total > MAX_TOTAL) console.warn(`WARNING: ${total.toFixed(1)} s is over the ${MAX_TOTAL} s budget`);

  const inputs = clips.flatMap((c) => ["-i", c.file]);
  const vo = SCENES.flatMap((_, i) => ["-i", voFile(i)]);
  const n = clips.length;
  const graph: string[] = [];
  let prev = "[0:v]";
  for (let i = 1; i < n; i++) {
    const out = i === n - 1 ? "[v]" : `[x${i}]`;
    graph.push(`${prev}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${n3(starts[i])}${out}`);
    prev = out;
  }
  SCENES.forEach((_, i) => {
    const lead = i === 0 ? 0.9 : LEAD;
    const ms = Math.round((starts[i] + lead) * 1000);
    graph.push(`[${n + i}:a]aresample=48000,adelay=${ms}|${ms}[a${i}]`);
  });
  graph.push(
    `${SCENES.map((_, i) => `[a${i}]`).join("")}amix=inputs=${n}:normalize=0:dropout_transition=0,` +
      `apad,atrim=duration=${n3(total)},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]`,
  );
  ff([
    ...inputs, ...vo,
    "-filter_complex", graph.join(";"),
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", String(FPS), "-movflags", "+faststart",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    `${OUT}/feedforward-demo.mp4`,
  ]);

  const timeline = SCENES.map((s, i) => ({ id: s.id, start: +starts[i].toFixed(2), duration: +clips[i].duration.toFixed(2), note: clips[i].note }));
  writeFileSync(`${OUT}/timeline.json`, JSON.stringify({ total: +total.toFixed(2), scenes: timeline }, null, 2));
  console.log(`\n${OUT}/feedforward-demo.mp4  ${Math.floor(total / 60)}:${(total % 60).toFixed(1).padStart(4, "0")}`);
  timeline.forEach((s) => console.log(`  ${String(Math.floor(s.start / 60))}:${(s.start % 60).toFixed(1).padStart(4, "0")}  ${s.id}`));
})();
