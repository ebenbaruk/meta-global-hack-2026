/** The 12 scenes of the demo video: narration (one voiceover clip each) and the footage they sit on. */

export type Source = "slide" | "mobile" | "desktop";

export type Scene = {
  id: string;
  source: Source;
  /** Slide name (video/slides/<slide>.html) for slide scenes. */
  slide?: string;
  /** Short caption shown next to the phone / as a lower third. */
  caption?: { title: string; tag?: string };
  text: string;
};

export const VOICE = "en-US-AndrewMultilingualNeural";
export const RATE = "+0%";

/** Speed factors the edit may use for waits on model calls; video-slides renders one chip each. */
export const CHIP_SPEEDS = [2, 3, 4, 5, 6, 8, 10, 12, 16];

export const SCENES: Scene[] = [
  {
    id: "hook",
    source: "slide",
    slide: "title",
    text: "Every AI product today hands you an empty box, and asks: what do you want? Most people don't know.",
  },
  {
    id: "problem",
    source: "slide",
    slide: "problem",
    text: "Chat asks you for labor. Figure out what the AI can do, explain the task, paste the context, repeat. But three billion people already know an interface that asks nothing of them. The feed.",
  },
  {
    id: "intro",
    source: "mobile",
    caption: { title: "A feed of work, already done", tag: "Muse Spark 1.3" },
    text: "This is Feedforward. Meet Maya, she runs a small coffee roastery. She opens the app, and agents running on Muse Spark have already read her inbox, her calendar and her sales, and are preparing work for her, live.",
  },
  {
    id: "approve",
    source: "mobile",
    caption: { title: "One swipe to send", tag: "Executor" },
    text: "A wholesale café wants her pricing. The reply is already drafted, in her voice. One swipe, and it's sent.",
  },
  {
    id: "team",
    source: "mobile",
    caption: { title: "Numbers pulled, update written", tag: "Muse Spark 1.3" },
    text: "Yesterday's web sales jumped by a third. The numbers are pulled, and the update for her team is ready to post.",
  },
  {
    id: "learn",
    source: "desktop",
    caption: { title: "Every gesture retunes the feed", tag: "Ranker" },
    text: "Not what she needs right now? Two dismissals, and the feed retunes itself. It's a recommendation algorithm, but it recommends actions.",
  },
  {
    id: "image",
    source: "mobile",
    caption: { title: "Launch post, visual included", tag: "Muse Image 1.0" },
    text: "Her new coffee launches Friday. The launch post is written, and Muse Image renders the visual.",
  },
  {
    id: "snap",
    source: "mobile",
    caption: { title: "Snap the real world", tag: "Muse Spark vision + SAM 3.1" },
    text: "The physical world feeds the feed too. She snaps a supplier invoice. Muse Spark reads it, SAM 3.1 segments it pixel by pixel, and the expense is ready to log.",
  },
  {
    id: "sponsored",
    source: "mobile",
    caption: { title: "Sponsored, and explained", tag: "Invented brands" },
    text: "And because it's a feed, it pays for itself. Sponsored actions match her plans this week, not her browsing. Labeled, explained, and one swipe away from gone.",
  },
  {
    id: "divein",
    source: "mobile",
    caption: { title: "Dive in, with full context", tag: "Muse Spark 1.3" },
    text: "When she wants to go deeper, she dives in. The chat already knows the full context. Make it shorter, and the new draft goes straight back onto the card.",
  },
  {
    id: "hood",
    source: "desktop",
    slide: "architecture",
    caption: { title: "Every call, visible", tag: "Agent Lens" },
    text: "Under the hood: a Miner finds opportunities, parallel Preparers do the work, a Ranker learns from every gesture, and an Executor acts. Three Meta models, and every call is visible in the Agent Lens.",
  },
  {
    id: "close",
    source: "slide",
    slide: "closing",
    text: "Chat asks you for labor. The feed gives you leverage. Feedforward.",
  },
];
