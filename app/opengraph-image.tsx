import { ImageResponse } from "next/og";

export const alt = "Feedforward: Stop prompting. Start scrolling.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1e0a2b";
const CREAM = "#fff3e8";
const LILAC = "#d9a8ff";
const YELLOW = "#f4f75a";

const MODELS = [
  ["Muse Spark 1.3", LILAC],
  ["Muse Image 1.0", "#ff9cc2"],
  ["SAM 3.1", "#93e2b0"],
] as const;

/** Fetches a Google font as TTF (what next/og reads). Falls back to the default font if offline. */
async function googleFont(query: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${query}&display=swap`)).text();
    const url = css.match(/src: url\((.+?\.ttf)\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The share card: cream paper, the hero line, the lilac marker, the three model chips. */
export default async function OpengraphImage() {
  const [display, mono] = await Promise.all([googleFont("Fraunces:opsz,wght,SOFT@48,900,100"), googleFont("Space+Mono:wght@700")]);
  const fonts = [
    ...(display ? [{ name: "Fraunces", data: display, weight: 900 as const, style: "normal" as const }] : []),
    ...(mono ? [{ name: "Space Mono", data: mono, weight: 700 as const, style: "normal" as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM, color: INK, fontFamily: "Fraunces" }}>
        <div style={{ display: "flex", height: 44, alignItems: "center", background: LILAC, borderBottom: `3px solid ${INK}`, paddingLeft: 64, fontSize: 17, fontWeight: 700, letterSpacing: 2, fontFamily: "Space Mono", whiteSpace: "nowrap" }}>
          INBOX READ · 3 REPLIES DRAFTED · THURSDAY CLASH FIXED · LAUNCH POST READY · ZERO PROMPTS
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 64px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="52" height="52" viewBox="0 0 40 40">
              <path d="M9 4.5h15.5L33 13v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3Z" fill={LILAC} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <path d="M24.5 4.5V13H33" fill={YELLOW} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
              <path d="M13 27.5 24 16.5M16 16h8.5v8.5" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 38, fontWeight: 900 }}>feedforward</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 44, fontSize: 100, fontWeight: 900, lineHeight: 1, letterSpacing: -2 }}>
            <span>Stop prompting.</span>
            <div style={{ display: "flex", marginTop: 8 }}>
              <span>Start&nbsp;</span>
              <span style={{ background: LILAC, borderRadius: 18, padding: "0 16px", transform: "rotate(-1deg)" }}>scrolling.</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto", fontFamily: "Space Mono", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
            <span style={{ marginRight: 6 }}>BUILT ON</span>
            {MODELS.map(([name, tone]) => (
              <span key={name} style={{ display: "flex", alignItems: "center", gap: 10, border: `3px solid ${INK}`, borderRadius: 999, padding: "8px 18px", background: "#fffdfb" }}>
                <span style={{ width: 16, height: 16, borderRadius: 999, background: tone, border: `2px solid ${INK}` }} />
                {name.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", right: 60, top: 290, display: "flex", alignItems: "center", justifyContent: "center", width: 196, height: 196, borderRadius: 999, background: YELLOW, border: `3px solid ${INK}`, boxShadow: `6px 6px 0 ${INK}`, transform: "rotate(10deg)", fontFamily: "Space Mono", fontSize: 22, fontWeight: 700, textAlign: "center", letterSpacing: 2, padding: 24 }}>
          A FEED OF FINISHED WORK
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
