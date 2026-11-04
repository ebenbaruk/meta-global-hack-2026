import type { SnapVision } from "./agents/snap";

/** The demo photo the mock pipeline replays (public/demo/invoice.webp). */
export const SNAP_DEMO = { src: "/demo/invoice.webp", width: 1280, height: 1280 } as const;

/** Spark vision output recorded live on the demo invoice. SAM outputs live in tests/fixtures/sam-<phrase>.txt. */
const RECORDED: SnapVision = {
  scene: "Invoice on a wood table next to a burlap sack of green coffee and a metal scoop.",
  title: "Log Highland Green invoice · $3,357",
  actionLabel: "Log expense",
  summary: "This matches the Highland Green email for the Oct 30 delivery. $3,357 due Nov 19 for Guji Natural and Huila Washed green.",
  objects: [
    {
      phrase: "paper",
      label: "Invoice"
    },
    {
      phrase: "sack",
      label: "Green coffee sack"
    },
    {
      phrase: "scoop",
      label: "Coffee scoop"
    },
    {
      phrase: "coffee beans",
      label: "Green coffee beans"
    }
  ],
  lines: [
    {
      label: "Ethiopia Guji Natural, Grade 1 240 kg",
      amount: "$2,136.00"
    },
    {
      label: "Colombia Huila Washed 140 kg",
      amount: "$1,036.00"
    },
    {
      label: "Freight & handling",
      amount: "$185.00"
    },
    {
      label: "Total",
      amount: "$3,357.00"
    }
  ],
  intents: [
    {
      kind: "task",
      title: "Pay Highland invoice by Nov 19",
      why: "$3,357 due Nov 19 for Guji 240kg and Huila 140kg, pay by ACH",
      sourceIds: [
        "e3"
      ]
    },
    {
      kind: "email_reply",
      title: "Confirm Huila allocation by Nov 6",
      why: "Only 24 bags left, confirm 2-bag Huila allocation to ship Nov 12",
      sourceIds: [
        "e3",
        "e12"
      ]
    }
  ]
};

export const snapVisionMock = (): SnapVision => structuredClone(RECORDED);
