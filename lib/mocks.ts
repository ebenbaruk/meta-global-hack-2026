import type { Opportunity, Persona, PayloadOf, TasteProfile } from "./schemas";

/**
 * Deterministic fixtures for META_MOCK=1: the e2e suite and the demo safety net.
 * Content is written against the Ember & Oak persona (data/persona/*).
 */

type PreparedKind = Opportunity["kind"];
type Prepared = { [K in PreparedKind]: { payload: PayloadOf<K>; actionLabel: string } }[PreparedKind];
type MockOpportunity = Opportunity & { prepared: Prepared };

const SIGN = "— Maya";

const BATCHES: MockOpportunity[][] = [
  // ---------- Batch 1: the demo opening ----------
  [
    {
      kind: "email_reply",
      title: "Reply to Lena at Bloom Café",
      why: "40 lb/week wholesale lead. She needs your pricing before Thursday's tasting.",
      sourceIds: ["e1", "notes"],
      urgency: 3,
      prepared: {
        actionLabel: "Send reply",
        payload: {
          to: "Lena Ortiz <lena@bloomcafe.co>",
          subject: "Re: Pricing for 40 lb/week",
          body: [
            "Hi Lena,",
            "So glad the team liked the House Blend. Here's where we land at 40 lb a week:",
            "- House Blend (30 lb): $10.40/lb delivered\n- Oak Street Espresso (10 lb): $11.60/lb delivered\n- Delivery Tuesdays and Fridays, net 15",
            "That's $10.70/lb blended, under your current $11.20, and it's roasted the week you brew it.",
            "And yes to the Guji. I'll bring a bag to Thursday's tasting so you can dial it in for the launch weekend.",
            `See you Thursday,\n${SIGN}`,
          ].join("\n\n"),
        },
      },
    },
    {
      kind: "team_update",
      title: "Share yesterday's numbers with the team",
      why: "Best day in two weeks, driven by the Huila newsletter link.",
      sourceIds: ["sales", "e12"],
      urgency: 2,
      prepared: { actionLabel: "Post to #team", payload: { channel: "#team", message: "", metrics: [], series: [] } },
    },
    {
      kind: "schedule",
      title: "Fix Thursday's double booking",
      why: "Daniel's coffee chat now overlaps the Bloom Café tasting at 10:30.",
      sourceIds: ["c8", "c7", "e9"],
      urgency: 3,
      prepared: {
        actionLabel: "Propose new time",
        payload: {
          event: "Coffee chat: Daniel Okafor (Cascade Seed Partners)",
          conflict: "Overlaps Tasting & pricing with Bloom Café (10:30–11:30)",
          proposed: { start: "2026-11-05T12:00:00", end: "2026-11-05T13:00:00" },
          message: "Hi Sofia, Thursday at 10 now clashes with a client tasting. Could Daniel do noon instead, same spot at our café bar? Coffee's on me. — Maya",
        },
      },
    },
    {
      kind: "social_post",
      title: "Launch post for Guji Natural",
      why: "Jules needs a caption approved by Thursday night for Friday 8 AM.",
      sourceIds: ["e15", "notes"],
      urgency: 2,
      prepared: {
        actionLabel: "Schedule post",
        payload: {
          platform: "instagram",
          caption: [
            "Blueberry, jasmine, cacao nib. ☕",
            "Our new Ethiopia Guji Natural was grown by 300 families around the Hambela station and dried in the sun for three weeks. It tastes like blueberry pie.",
            "Only ~500 bags. Live on the site Friday at 8 AM.",
          ].join("\n\n"),
          imagePrompt:
            "Editorial product photograph of a kraft paper 12 oz specialty coffee bag standing on a pale oak table next to a ceramic cup of pour-over coffee, a small pile of dried red coffee cherries and a few blueberries, soft morning window light from the left, shallow depth of field, 50mm lens, warm natural tones, minimal Scandinavian styling, no text, no logos, no lettering",
          hashtags: ["#specialtycoffee", "#ethiopiancoffee", "#naturalprocess", "#portlandcoffee", "#emberandoak"],
        },
      },
    },
    {
      kind: "task",
      title: "Decide on Northline's bag delay",
      why: "Owen needs your answer by 3 PM or printed bags miss launch morning.",
      sourceIds: ["e7", "c5"],
      urgency: 3,
      prepared: {
        actionLabel: "Add to tasks",
        payload: {
          steps: [
            "Approve the $140 air expedite for PO 7713 (Thu by 5 PM)",
            "Ask Owen for the 200 blank kraft bags too, as a backup",
            "Confirm both on the 1 PM call with Owen",
            "Tell Jules the product shot moves to Thursday evening",
          ],
        },
      },
    },
  ],
  // ---------- Batch 2: digging deeper ----------
  [
    {
      kind: "email_reply",
      title: "Make it right with Tom Becker",
      why: "Stale bag on a birthday gift. Complaints get an answer within 24h.",
      sourceIds: ["e4", "notes"],
      urgency: 3,
      prepared: {
        actionLabel: "Send reply",
        payload: {
          to: "Tom Becker <tom.becker@fastmail.net>",
          subject: "Re: Order #EO-4471 arrived late and stale",
          body: [
            "Hi Tom,",
            "You're right, and I'm sorry. An older bag from our shelf got mixed into your order. That's on us, and we've changed how we rotate stock so it doesn't happen again.",
            "I've refunded the $17 for that bag, and a fresh bag of House Blend roasted this week is on its way to your dad, no charge.",
            "Thanks for telling me straight. I hope the next cup tastes like the one you had at the café.",
            SIGN,
          ].join("\n\n"),
        },
      },
    },
    {
      kind: "email_reply",
      title: "Say yes to Small Batch Radio",
      why: "18,000 home brewers on the West Coast, right after the Guji launch.",
      sourceIds: ["e5"],
      urgency: 2,
      prepared: {
        actionLabel: "Send reply",
        payload: {
          to: "Ana Lima <ana@smallbatchradio.fm>",
          subject: "Re: Podcast invite: Small Batch Radio",
          body: [
            "Hi Ana,",
            "I'd love to. Thursday Nov 12 at 2:00 PM Pacific works for me.",
            "The Guji Natural launches this Friday, so I'll mail you a bag next week for the tasting segment. Brew it on a V60, 15 g to 250 g at 93 °C.",
            `Talk soon,\n${SIGN}`,
          ].join("\n\n"),
        },
      },
    },
    {
      kind: "task",
      title: "Pay Highland Green invoice",
      why: "$3,357 due Nov 19, and the next Huila allocation hinges on Friday.",
      sourceIds: ["e3", "e12"],
      urgency: 2,
      prepared: {
        actionLabel: "Add to tasks",
        payload: {
          steps: [
            "Pay invoice HGI-20931 ($3,357) by ACH, not card (saves $100)",
            "Confirm 2 bags of Huila for the Nov 12 shipment",
            "Reply to Priya: yes to the Huila reorder",
          ],
        },
      },
    },
    {
      kind: "insight",
      title: "Huila sells out before the launch",
      why: "24 bags left and the newsletter doubled demand.",
      sourceIds: ["e12", "sales"],
      urgency: 2,
      prepared: {
        actionLabel: "Save insight",
        payload: {
          headline: "Huila runs out Friday at this pace",
          detail: "24 roasted bags left and green for one roast. Add a \"back Nov 12\" note on the site so launch traffic lands on Guji, not on a sold-out page.",
          stat: "24 bags",
        },
      },
    },
  ],
  // ---------- Batch 3 ----------
  [
    {
      kind: "email_reply",
      title: "Send Daniel the numbers",
      why: "He asked for them before Thursday's coffee chat.",
      sourceIds: ["e2", "notes"],
      urgency: 3,
      prepared: {
        actionLabel: "Send reply",
        payload: {
          to: "Daniel Okafor <daniel@cascadeseed.vc>",
          subject: "Re: Following up: a few numbers before Thursday",
          body: [
            "Hi Daniel,",
            "Here's the short version before Thursday:",
            "- Revenue: Aug $61.8k, Sep $66.4k, Oct $74.1k\n- Gross margin on a retail bag: ~62%\n- 214 active subscriptions, ~4.5% monthly churn",
            "Happy to walk through wholesale on Thursday. We may be adding a 40 lb/week café account this week.",
            SIGN,
          ].join("\n\n"),
        },
      },
    },
    {
      kind: "schedule",
      title: "Move the dentist on launch day",
      why: "Your 9:30 appointment lands in the middle of launch-morning packing.",
      sourceIds: ["c11", "c10"],
      urgency: 2,
      prepared: {
        actionLabel: "Request new time",
        payload: {
          event: "Dentist: Dr. Anita Patel",
          conflict: "Overlaps Launch morning: pack & ship (9:00–10:30)",
          proposed: { start: "2026-11-06T15:00:00", end: "2026-11-06T15:45:00" },
          message: "Hi, this is Maya Chen. Could we move Friday's 9:30 to 3:00 PM the same day? Thank you. — Maya",
        },
      },
    },
    {
      kind: "email_reply",
      title: "Reply to Hannah about a gift",
      why: "A preorder for the Guji launch, the easiest sale of the week.",
      sourceIds: ["e14"],
      urgency: 1,
      prepared: {
        actionLabel: "Send reply",
        payload: {
          to: "Hannah Kim <hannah.kim@gmail.com>",
          subject: "Re: Can I preorder the Guji for a gift?",
          body: [
            "Hi Hannah,",
            "Yes. It goes live Friday at 8 AM at $24 a bag, and preorders ship that same morning.",
            "Add a note at checkout and we'll gift-wrap it and leave the price off.",
            SIGN,
          ].join("\n\n"),
        },
      },
    },
    {
      kind: "insight",
      title: "Wholesale is your growth lever",
      why: "Bloom Café alone would grow wholesale volume by almost half.",
      sourceIds: ["notes", "e1"],
      urgency: 1,
      prepared: {
        actionLabel: "Save insight",
        payload: {
          headline: "Bloom takes wholesale from 85 to 125 lb/week",
          detail: "That's +47% volume with no new roaster: capacity is fine up to ~180 lb. Two more cafés like Bloom and you'd need a second roast day.",
          stat: "+47%",
        },
      },
    },
  ],
];

export function mockOpportunities(batch: number): Opportunity[] {
  const list = BATCHES[Math.min(batch, BATCHES.length) - 1] ?? BATCHES[0];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return list.map(({ prepared, ...o }) => o);
}

/** Prepared payload for a mock opportunity, with computed facts (sales, free slots) folded in. */
export function mockPrepared(
  o: Opportunity,
  facts: { metrics: { label: string; value: string; delta: string }[]; slots: { start: string; end: string }[] },
): Prepared {
  if (o.kind === "team_update") {
    const [revenue, web] = facts.metrics;
    return {
      actionLabel: "Post to #team",
      payload: {
        channel: "#team",
        message: [
          `Yesterday was our best day in two weeks: ${revenue?.value ?? "a strong day"} (${revenue?.delta ?? "up"}).`,
          `Web did ${web?.value ?? "most of it"} (${web?.delta ?? "up"}), mostly the newsletter's Huila link. We're down to 24 Huila bags, so @priya let's confirm the Nov 12 reorder.`,
          "Thanks all, great run into launch week.",
        ].join("\n"),
        metrics: facts.metrics,
        series: [],
      },
    };
  }
  return BATCHES.flat().find((m) => m.title === o.title)?.prepared ?? genericPrepared(o, facts.slots[0]);
}

function genericPrepared(o: Opportunity, slot: { start: string; end: string } | undefined): Prepared {
  switch (o.kind) {
    case "email_reply":
      return { actionLabel: "Send reply", payload: { to: "", subject: `Re: ${o.title}`, body: `Thanks for reaching out. I'll get back to you by Friday.\n\n${SIGN}` } };
    case "team_update":
      return { actionLabel: "Post to #team", payload: { channel: "#team", message: o.why, metrics: [], series: [] } };
    case "schedule":
      return { actionLabel: "Move meeting", payload: { event: o.title, conflict: o.why, proposed: slot ?? { start: "2026-11-05T12:00:00", end: "2026-11-05T13:00:00" }, message: `Could we move this? ${SIGN}` } };
    case "social_post":
      return { actionLabel: "Schedule post", payload: { platform: "instagram", caption: o.why, imagePrompt: "Specialty coffee bag on an oak table, morning light, no text", hashtags: ["#specialtycoffee"] } };
    case "task":
      return { actionLabel: "Add to tasks", payload: { steps: [o.title] } };
    case "insight":
      return { actionLabel: "Save insight", payload: { headline: o.title, detail: o.why, stat: "—" } };
  }
}

// ---------- Sponsor ----------

const SPONSOR_MOCKS: Record<string, { reason: string; offer: string }> = {
  sp5: { reason: "Jules has no product shot of the Guji bag for Friday's post → same-week studio shoot", offer: "10 edited product photos for $180, this week" },
  sp2: { reason: "Northline's printed Guji bags are late for launch → compostable printed bags in 5 days", offer: "Printed 12 oz bags in 5 days, rush lane for launches" },
  sp1: { reason: "Bloom Café wants Tue + Fri deliveries at 40 lb/week → scheduled pickups from $9", offer: "Same-day wholesale drops from $9, 2 weeks free" },
  sp4: { reason: "You're at the Alder Street market Saturday and want an offline reader → $29", offer: "Offline card reader for market vendors, $29" },
  sp3: { reason: "Daniel wants revenue, margin and churn before Thursday → investor-ready reports", offer: "Investor-ready monthly reports, 30 days free" },
};

/** Rotates through the fixtures by batch, skipping sponsors already shown. */
export function mockSponsorPick(pool: Persona["sponsors"], batch: number) {
  const ordered = Object.keys(SPONSOR_MOCKS)
    .map((id) => pool.find((s) => s.id === id))
    .filter((s): s is Persona["sponsors"][number] => Boolean(s));
  const pick = ordered[(batch - 1) % Math.max(1, ordered.length)] ?? pool[0];
  const fixture = SPONSOR_MOCKS[pick.id];
  return {
    sponsorId: pick.id,
    reason: fixture?.reason ?? `Launching Guji Natural on Friday → ${pick.brand} can help`,
    offer: fixture?.offer ?? pick.offer,
    cta: pick.cta,
  };
}

// ---------- Taste ----------

const KIND_LABEL: Record<string, string> = {
  email_reply: "email replies",
  team_update: "team updates",
  schedule: "calendar fixes",
  social_post: "social posts",
  task: "task lists",
  insight: "insights",
  snap: "snap cards",
  sponsored: "sponsored offers",
};

export function mockTasteNotes(history: TasteProfile["history"]): string[] {
  const tally = new Map<string, { approve: number; dismiss: number }>();
  for (const h of history) {
    const t = tally.get(h.kind) ?? { approve: 0, dismiss: 0 };
    if (h.verdict === "dismiss") t.dismiss++;
    else t.approve++;
    tally.set(h.kind, t);
  }
  const notes: string[] = [];
  for (const [kind, t] of tally) {
    if (t.dismiss > t.approve) notes.push(`Skips ${KIND_LABEL[kind]}`);
    else if (t.approve > 0) notes.push(`Approves ${KIND_LABEL[kind]} fast`);
  }
  return notes.length ? notes.slice(0, 5) : ["Still learning her preferences"];
}

// ---------- Image ----------

/** A tasteful placeholder "photo": warm gradient, a coffee bag, a cup with steam, a few beans. */
export function mockImage(prompt: string): string {
  let h = 0;
  for (const c of prompt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = 18 + (h % 22); // ambers and browns
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,82%)"/><stop offset="1" stop-color="hsl(${hue + 8},35%,62%)"/></linearGradient>
<radialGradient id="light" cx="0.25" cy="0.15" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="bag" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="hsl(${hue + 6},38%,58%)"/><stop offset="1" stop-color="hsl(${hue + 4},34%,46%)"/></linearGradient>
</defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<rect width="1024" height="1024" fill="url(#light)"/>
<rect y="700" width="1024" height="324" fill="hsl(${hue + 10},30%,48%)" opacity="0.35"/>
<ellipse cx="420" cy="760" rx="210" ry="26" fill="#000" opacity="0.12"/>
<path d="M260 300 L580 300 L600 750 L240 750 Z" fill="url(#bag)"/>
<path d="M260 300 L300 250 L540 250 L580 300 Z" fill="hsl(${hue + 6},34%,66%)"/>
<rect x="318" y="430" width="204" height="150" rx="10" fill="#f6efe6" opacity="0.92"/>
<circle cx="420" cy="505" r="38" fill="none" stroke="hsl(${hue},40%,32%)" stroke-width="6"/>
<ellipse cx="760" cy="760" rx="150" ry="20" fill="#000" opacity="0.14"/>
<path d="M650 600 L870 600 L850 740 Q760 770 670 740 Z" fill="#f4ede4"/>
<ellipse cx="760" cy="600" rx="110" ry="22" fill="hsl(${hue},55%,22%)"/>
<path d="M870 630 Q930 640 915 690 Q900 725 855 715" fill="none" stroke="#f4ede4" stroke-width="16" stroke-linecap="round"/>
<path d="M730 560 Q705 520 735 480 Q765 440 740 400" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.55"/>
<path d="M785 565 Q760 525 790 485 Q820 445 795 405" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.4"/>
<g fill="hsl(${hue},50%,20%)"><ellipse cx="190" cy="830" rx="22" ry="15" transform="rotate(-25 190 830)"/><ellipse cx="240" cy="860" rx="22" ry="15" transform="rotate(20 240 860)"/><ellipse cx="610" cy="850" rx="22" ry="15" transform="rotate(-10 610 850)"/><ellipse cx="900" cy="860" rx="22" ry="15" transform="rotate(35 900 860)"/></g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
