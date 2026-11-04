import type { Card } from "@/lib/schemas";

/** Sample cards for previews and tests. Persona: Maya Chen, Ember & Oak Coffee Roasters, Portland. */

const NOW = Date.UTC(2026, 10, 4, 16, 30);

/** A warm "coffee bag on a counter" gradient, inline so no network is needed. */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs>
<radialGradient id="g" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#f3c78b"/><stop offset=".45" stop-color="#a0522d"/><stop offset="1" stop-color="#2a140b"/></radialGradient>
<linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1410"/><stop offset="1" stop-color="#0d0907"/></linearGradient>
</defs>
<rect width="400" height="400" fill="url(#g)"/>
<ellipse cx="200" cy="345" rx="120" ry="18" fill="#000" opacity=".35"/>
<path d="M130 120 L270 120 L285 340 L115 340 Z" fill="url(#b)"/>
<rect x="150" y="190" width="100" height="70" rx="8" fill="#f4e6d0"/>
<text x="200" y="222" font-family="Georgia,serif" font-size="15" text-anchor="middle" fill="#2a140b">GUJI</text>
<text x="200" y="243" font-family="Georgia,serif" font-size="10" text-anchor="middle" fill="#7a4a2a">NATURAL</text>
</svg>`;
export const SAMPLE_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const base = { urgency: 2 as const, createdAt: NOW, status: "ready" as const };

export const SAMPLE_CARDS: Card[] = [
  {
    ...base,
    id: "fx-email",
    kind: "email_reply",
    urgency: 3,
    title: "Reply to Lena at Bloom Café",
    why: "40 lb/week wholesale lead waiting since yesterday. She needs pricing to beat $11.20/lb.",
    source: [{ id: "e1", type: "email", label: "Pricing for 40 lb/week" }],
    actionLabel: "Send reply",
    payload: {
      to: "Lena Ortiz <lena@bloomcafe.co>",
      subject: "Re: Pricing for 40 lb/week",
      body: "Hi Lena,\n\nThrilled Bloom wants to make the switch. At 40 lb a week we can do $10.60/lb delivered for House Blend and $11.40/lb for Oak Street Espresso, so you land at $10.80/lb blended.\n\nDelivery: Tuesdays and Fridays before 8am. Terms: Net 15, first invoice after the second delivery.\n\nAnd yes to the Guji Natural. I'll bring a fresh bag to Thursday's tasting at 10:30 so you can dial it in as a guest pour-over for launch weekend.\n\nThank you for the trust.\n— Maya",
    },
  },
  {
    ...base,
    id: "fx-team",
    kind: "team_update",
    title: "Post the weekly numbers to #team",
    why: "Monday stand-up skipped numbers. Web sales are up ahead of the Guji launch.",
    source: [{ id: "sales", type: "sales", label: "Sales, last 14 days" }],
    actionLabel: "Post to #team",
    payload: {
      channel: "#team",
      message:
        "Week in numbers: web is up 18% and wholesale is steady. Guji Natural pre-orders hit 46 bags before we even announced. Diego, let's roast an extra 10 kg Thursday. Great work, everyone.",
      metrics: [
        { label: "Revenue", value: "$9,840", delta: "+18%" },
        { label: "Bags sold", value: "412", delta: "+11%" },
        { label: "Wholesale", value: "$2,310", delta: "-3%" },
      ],
      series: [1180, 1240, 1150, 1320, 1290, 1410, 1380, 1460, 1420, 1530, 1610, 1580, 1690, 1760],
    },
  },
  {
    ...base,
    id: "fx-schedule",
    kind: "schedule",
    urgency: 3,
    title: "Move Daniel's coffee chat",
    why: "Thursday 10:00 with Daniel overlaps the Bloom Café tasting at 10:30.",
    source: [
      { id: "c8", type: "event", label: "Coffee chat: Daniel Okafor" },
      { id: "c7", type: "event", label: "Tasting with Bloom Café" },
    ],
    actionLabel: "Move & notify",
    payload: {
      event: "Coffee chat: Daniel Okafor",
      conflict: "Thu 10:00 – 11:00 overlaps Tasting & pricing with Bloom Café (10:30)",
      proposed: { start: "2026-11-05T08:30:00", end: "2026-11-05T09:30:00" },
      message:
        "Hi Daniel, a wholesale tasting landed on Thursday at 10:30. Could we do 8:30 instead? Coffee's on me, and I'll have the numbers you asked for.",
    },
  },
  {
    ...base,
    id: "fx-social",
    kind: "social_post",
    title: "Announce Guji Natural on Instagram",
    why: "Launch is Friday and nothing has gone out yet. Thursday evening posts do best for you.",
    source: [{ id: "notes", type: "note", label: "Launch plan" }],
    actionLabel: "Schedule post",
    image: SAMPLE_IMAGE,
    imageStatus: "ready",
    payload: {
      platform: "instagram",
      caption:
        "Friday, something new lands on the bar. Ethiopia Guji Natural: blueberry, jasmine, and a finish like dark honey. Roasted in small batches right here on Belmont. #GujiNatural",
      imagePrompt: "A matte black coffee bag labeled Guji Natural on a warm wooden café counter, morning light",
      hashtags: ["#GujiNatural", "#PortlandCoffee", "#SpecialtyCoffee", "#EmberAndOak"],
    },
  },
  {
    ...base,
    id: "fx-social-loading",
    kind: "social_post",
    title: "Behind the roast: Guji Natural",
    why: "Diego roasts the launch batch Thursday. A process post builds anticipation.",
    source: [{ id: "c9", type: "event", label: "Production roast" }],
    actionLabel: "Schedule post",
    imageStatus: "loading",
    payload: {
      platform: "threads",
      caption: "Thursday 2pm, Diego fires up the roaster for the first Guji Natural batch. Watch this space.",
      imagePrompt: "Coffee roaster drum with steam and amber light",
      hashtags: ["#RoastDay"],
    },
  },
  {
    ...base,
    id: "fx-task",
    kind: "task",
    title: "Prep launch morning",
    why: "Friday 9:00 pack & ship needs labels, bags, and the dentist moved.",
    source: [{ id: "c10", type: "event", label: "Launch morning" }],
    actionLabel: "Create task",
    payload: {
      steps: [
        "Print 60 shipping labels for Guji pre-orders",
        "Confirm Northline launch bags arrive Thursday by noon",
        "Reschedule the 9:30 dentist appointment to next week",
        "Set up the pour-over station and tasting cards on the café bar",
      ],
    },
  },
  {
    ...base,
    id: "fx-insight",
    kind: "insight",
    urgency: 1,
    title: "Subscriptions are your fastest lever",
    why: "Spotted while pulling numbers for Daniel.",
    source: [{ id: "sales", type: "sales", label: "Sales, last 14 days" }],
    actionLabel: "Save as task",
    payload: {
      stat: "+38%",
      headline: "Subscription orders grew faster than any channel",
      detail:
        "Roaster's Choice subscriptions are up 38% over two weeks with zero promotion. Adding Guji Natural as the December pick could convert launch buyers into recurring revenue.",
    },
  },
  {
    ...base,
    id: "fx-snap",
    kind: "snap",
    title: "Receipt from Highland Green",
    why: "You snapped a photo. SAM found 3 line items.",
    source: [{ id: "photo", type: "photo", label: "Photo" }],
    actionLabel: "Log expense",
    payload: { summary: "Green coffee invoice, $3,357.00", width: 400, height: 400, objects: [], lines: [] },
  },
  {
    ...base,
    id: "fx-sponsored",
    kind: "sponsored",
    urgency: 1,
    title: "PickupPilot",
    why: "You're adding a wholesale account with fixed delivery days.",
    source: [{ id: "sp1", type: "sponsor", label: "PickupPilot" }],
    actionLabel: "Book a pickup",
    sponsored: { brand: "PickupPilot", reason: "You're committing to Tuesday and Friday deliveries for Bloom Café." },
    payload: {
      offer: "Scheduled same-day wholesale deliveries across Portland from $9 a drop. First 2 weeks free for new accounts.",
      cta: "Book a pickup",
    },
  },
];
