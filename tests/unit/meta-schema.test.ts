import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toStrictJsonSchema } from "@/lib/meta";
import { PAYLOAD_SCHEMAS, MinerOutput } from "@/lib/schemas";

type Node = { type?: string; properties?: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };

function objects(node: unknown, out: Node[] = []): Node[] {
  if (node && typeof node === "object") {
    const n = node as Node;
    if (n.type === "object" && n.properties) out.push(n);
    Object.values(node).forEach((v) => objects(v, out));
  }
  return out;
}

describe("toStrictJsonSchema", () => {
  it("closes every object and requires every key (strict mode)", () => {
    const schema = toStrictJsonSchema(z.object({ a: z.string(), nested: z.object({ b: z.array(z.object({ c: z.number() })) }) }));
    const objs = objects(schema);
    expect(objs).toHaveLength(3);
    for (const o of objs) {
      expect(o.additionalProperties).toBe(false);
      expect(o.required).toEqual(Object.keys(o.properties!));
    }
    expect(schema).not.toHaveProperty("$schema");
  });

  it("converts every card payload schema and the miner output", () => {
    for (const s of [...Object.values(PAYLOAD_SCHEMAS), MinerOutput]) {
      expect(() => toStrictJsonSchema(s)).not.toThrow();
    }
  });
});
