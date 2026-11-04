/** The 13 scenes of the demo video: narration (one voiceover clip each) and the footage they sit on. */

export type Source = "slide" | "landing" | "mobile" | "desktop";

export type Scene = {
  id: string;
  source: Source;
  /** Slide name (video/slides/<slide>.html) for slide scenes. */
  slide?: string;
  /** Caption shown next to the phone (mobile scenes only). */
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
    id: "landing",
    source: "landing",
    text: "This is Feedforward. Agents built on three Meta models, Muse Spark, Muse Image and SAM, do the work first. You just scroll through what's done.",
  },
  {
    id: "intro",
    source: "desktop",
    text: "Meet Maya. She runs a small coffee roastery. She opens the app, and agents on Muse Spark have already read her inbox, her calendar and her sales. Every card is prepared live, and every call shows up on the right, in the Agent Lens.",
  },
  {
    id: "approve",
    source: "mobile",
    caption: { title: "One swipe to send", tag: "Executor" },
    text: "On her phone: a wholesale café wants her pricing. The reply is already drafted, in her voice. One swipe, and it's sent.",
  },
  {
    id: "team",
    source: "desktop",
    text: "Yesterday's web sales jumped by a third. The numbers are pulled, and the update for her team is ready to post.",
  },
  {
    id: "image",
    source: "desktop",
    text: "Her new coffee launches Friday. The launch post is written, and Muse Image renders the visual.",
  },
  {
    id: "snap",
    source: "desktop",
    text: "The physical world feeds the feed too. She snaps a supplier invoice. Muse Spark reads it, SAM 3.1 outlines it pixel by pixel, and the expense is ready to log.",
  },
  {
    id: "sponsored",
    source: "mobile",
    caption: { title: "Sponsored, and explained", tag: "Invented brands" },
    text: "And because it's a feed, it pays for itself. Sponsored actions match her plans this week, not her browsing. Labeled, explained, and one swipe away from gone.",
  },
  {
    id: "divein",
    source: "desktop",
    text: "When she wants to go deeper, she dives in. The chat already knows the full context. Make it shorter, and the new draft goes straight back onto the card.",
  },
  {
    id: "learn",
    source: "desktop",
    text: "Every gesture teaches it. Two dismissals, and her taste profile shifts. It's a recommendation algorithm, but it recommends actions.",
  },
  {
    id: "hood",
    source: "desktop",
    slide: "architecture",
    text: "Under the hood: a Miner finds opportunities, parallel Preparers do the work, a Ranker learns from every gesture, and an Executor acts, only when she approves. Day or night, every call is visible in the Agent Lens.",
  },
  {
    id: "close",
    source: "slide",
    slide: "closing",
    text: "Chat asks you for labor. The feed gives you leverage. Feedforward.",
  },
];
