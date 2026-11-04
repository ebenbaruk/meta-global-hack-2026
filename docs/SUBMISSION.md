# Submission — Meta Global AI Developer Hackathon 2026

**Due: Nov 4, 9:00 PM ET = Nov 5, 03:00 Paris.** Submit by 01:30 Paris at the latest and keep the rest as buffer.

## Form fields (✱ = required) and our drafts

| Field | Answer / plan |
|---|---|
| ✱ Team name | Feedforward |
| Team members | Eli Benbaruk (ebenbaruk) |
| ✱ Track | **Indie developer track** |
| ✱ Problem statement | **Build for Your World** (bring Meta's models into a domain you know firsthand) |
| Most Viral Track (X post link) | Optional: post the demo video on X with a strong hook ("Stop prompting. Start scrolling.") and paste the link |
| ✱ Project description | Draft below |
| ✱ Public GitHub repo | https://github.com/ebenbaruk/meta-global-hack-2026 → **switch to public before submitting** (`gh repo edit --visibility public --accept-visibility-change-consequences`) after a final audit (no secrets, no `.env`) |
| ✱ 3-minute demo video | YouTube link (unlisted is fine). See the video plan below |
| ✱ Use of Meta products | Draft below |
| ✱ Why Meta's models matter | Draft below |
| Partner tech feedback | Not used (we went direct to the Meta Model API). Leave empty or say so |
| ✱ Likelihood to build with Meta Model API / overall opinion | Eli to choose |
| Survey questions (recommend API, Muse Code, obstacles, comparison, priorities, switching, production blockers) | Answer honestly from build notes. Log obstacles in `docs/BUILD_NOTES.md` while building (e.g. sparse docs, finding the SAM Responses endpoint, voice endpoint not found, reasoning latency) |

### Project description (draft)
Feedforward turns AI agents into a feed. Most people don't know what to prompt, and chat asks them for labor: figure out what AI can do, explain the task, provide context, repeat. But billions of people already know how to scroll. Feedforward is an Instagram-style feed where every card is work an agent has already done for you: the email you need to answer, already drafted; yesterday's sales, with a team update ready to send; your launch post, with its visual generated. Approve, edit, dismiss, or dive into a context-loaded chat. The feed learns from every gesture, a photo of a receipt or whiteboard becomes new cards, and clearly labeled sponsored actions show how a feed of useful work funds itself. Stop prompting. Start scrolling.

### Use of Meta products (draft)
Everything intelligent in Feedforward runs on the Meta Model API:
- **Muse Spark 1.3** is the agent brain. A Signal Miner with strict JSON-schema output finds action opportunities in the user's context, parallel Preparers do the work behind each card, a taste agent rewrites the user's preference memory from gestures, and an Executor uses tool calling.
- **Muse Spark vision + SAM 3.1** power Snap: a photo is understood, the key objects are segmented with pixel masks (Responses API, `@meta-sam/parser`), and those outlines are animated on the card.
- **Muse Image 1.0** generates card visuals and social posts.
- **Muse Wonder** powers the Dive-in chat.

### Why Meta's models matter (draft)
The feed is Meta's native form factor, and Feedforward is what it becomes when agents fill it. That only works with a model family that covers the whole loop: fast structured reasoning and tool use to prepare actions (Muse Spark), vision plus pixel-accurate segmentation to turn the physical world into actions (SAM 3.1), and image generation for the visual language of a feed (Muse Image), all behind one OpenAI-compatible API. Having a single provider for every modality kept the architecture simple enough to ship in one day.

## Demo video plan (produced by the engineer, not by Eli)
Target **2:45–3:00**, 1080p, uploaded to YouTube.
- **Capture**: Playwright (Chromium headless, `recordVideo`) drives the real app against the live API through a scripted run (`scripts/demo.ts`). Record mobile (390×844) and desktop (1440×900, with Agent Lens) passes. Add short waits so the viewer can read each card.
- **Voiceover**: English narration script in `video/script.md`, synthesized with `uvx edge-tts` (a natural neural voice, e.g. `en-US-AndrewNeural`), one clip per scene.
- **Edit**: ffmpeg (available on the machine). Title card → problem (chat = labor) → scenes → architecture slide (Meta models) → closing line. Text overlays via `drawtext` or pre-rendered HTML slides screenshotted by Playwright. Light music optional.
- **Structure**: 0:00 hook "Stop prompting. Start scrolling." · 0:15 the problem · 0:35 live demo (feed materializes, approve, dismiss → retune, Muse Image post, Snap + SAM, sponsored, dive in) · 2:20 under the hood (four Meta models, Agent Lens) · 2:45 closing.
- Output: `video/out/feedforward-demo.mp4` (gitignored).
