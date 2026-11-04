import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { TraceEvent } from "./schemas";

/**
 * The only door to the Meta Model API. Every call gets a timeout, one retry,
 * zod validation, a trace event for the Agent Lens, and a mock switch (META_MOCK=1).
 */

export const MODELS = {
  spark: "muse-spark-1.3",
  wonder: "muse-wonder-1.0",
  image: "muse-image-1.0",
  sam: "sam-3.1",
} as const;

export type Tracer = (t: TraceEvent) => void;
const noop: Tracer = () => {};

export const isMock = () => process.env.META_MOCK === "1";

let client: OpenAI | undefined;
function meta(): OpenAI {
  client ??= new OpenAI({
    apiKey: process.env.META_API_KEY,
    baseURL: process.env.META_BASE_URL || "https://api.meta.ai/v1",
    timeout: 30_000,
    maxRetries: 1,
  });
  return client;
}

let traceSeq = 0;
async function traced<T>(
  step: string,
  model: string,
  trace: Tracer,
  run: () => Promise<{ value: T; tokens?: number; detail?: string }>,
  mock: () => T,
  mockDelayMs = 400,
): Promise<T> {
  const started = Date.now();
  const id = `t${Date.now().toString(36)}${(traceSeq++).toString(36)}`;
  if (isMock()) {
    await sleep(mockDelayMs);
    trace({ id, step, model, ms: Date.now() - started, status: "mock", at: Date.now() });
    return mock();
  }
  try {
    const { value, tokens, detail } = await run();
    trace({ id, step, model, ms: Date.now() - started, status: "ok", tokens, detail, at: Date.now() });
    return value;
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 160) : "error";
    trace({ id, step, model, ms: Date.now() - started, status: "error", detail, at: Date.now() });
    throw err;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** zod → JSON schema accepted by `response_format: json_schema` strict mode. */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "output" }) as Record<string, unknown>;
  delete json.$schema;
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const obj = node as Record<string, unknown>;
    if (obj.type === "object" && obj.properties) {
      obj.additionalProperties = false;
      obj.required = Object.keys(obj.properties as object);
    }
    Object.values(obj).forEach(walk);
  };
  walk(json);
  return json;
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function chatJSON<S extends z.ZodType>(opts: {
  step: string;
  name: string;
  schema: S;
  messages: Message[];
  mock: () => z.infer<S>;
  trace?: Tracer;
  effort?: "low" | "medium" | "high";
  model?: string;
}): Promise<z.infer<S>> {
  const model = opts.model ?? MODELS.spark;
  return traced(
    opts.step,
    model,
    opts.trace ?? noop,
    async () => {
      const res = await meta().chat.completions.create({
        model,
        messages: opts.messages,
        reasoning_effort: opts.effort ?? "low",
        response_format: {
          type: "json_schema",
          json_schema: { name: opts.name, strict: true, schema: toStrictJsonSchema(opts.schema) },
        },
      });
      const text = res.choices[0]?.message?.content ?? "";
      const value = opts.schema.parse(JSON.parse(stripFences(text)));
      return { value, tokens: res.usage?.total_tokens };
    },
    opts.mock,
    300 + Math.random() * 900,
  );
}

/** Streaming chat for Dive-in. Yields text deltas. */
export async function* chatStream(opts: {
  step: string;
  messages: Message[];
  mock: () => string;
  trace?: Tracer;
  model?: string;
}): AsyncGenerator<string> {
  const model = opts.model ?? MODELS.spark;
  const trace = opts.trace ?? noop;
  const started = Date.now();
  const id = `t${started.toString(36)}${(traceSeq++).toString(36)}`;
  if (isMock()) {
    for (const word of opts.mock().split(/(?<= )/)) {
      await sleep(25);
      yield word;
    }
    trace({ id, step: opts.step, model, ms: Date.now() - started, status: "mock", at: Date.now() });
    return;
  }
  try {
    const stream = await meta().chat.completions.create({
      model,
      messages: opts.messages,
      stream: true,
      ...(model === MODELS.spark ? { reasoning_effort: "low" as const } : {}),
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
    trace({ id, step: opts.step, model, ms: Date.now() - started, status: "ok", at: Date.now() });
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 160) : "error";
    trace({ id, step: opts.step, model, ms: Date.now() - started, status: "error", detail, at: Date.now() });
    throw err;
  }
}

/** Muse Image → data URL (webp). */
export async function generateImage(opts: {
  step: string;
  prompt: string;
  mock: () => string;
  trace?: Tracer;
}): Promise<string> {
  return traced(
    opts.step,
    MODELS.image,
    opts.trace ?? noop,
    async () => {
      const res = await meta().images.generate({ model: MODELS.image, prompt: opts.prompt, size: "1024x1024" });
      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error("Muse Image returned no image");
      return { value: `data:image/webp;base64,${b64}`, detail: opts.prompt.slice(0, 80) };
    },
    opts.mock,
    1200,
  );
}

/** SAM 3.1 raw output text for one noun phrase (parse it with lib/sam.ts). */
export async function segmentRaw(opts: {
  step: string;
  imageDataUrl: string;
  phrase: string;
  mock: () => string;
  trace?: Tracer;
}): Promise<string> {
  return traced(
    opts.step,
    MODELS.sam,
    opts.trace ?? noop,
    async () => {
      const res = await meta().responses.create({
        model: MODELS.sam,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: opts.phrase },
              { type: "input_image", image_url: opts.imageDataUrl, detail: "auto" },
            ],
          },
        ],
        metadata: { mask_encoding: "one_bit" },
      });
      return { value: res.output_text ?? "", detail: opts.phrase };
    },
    opts.mock,
    700,
  );
}

function stripFences(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
}
