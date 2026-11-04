import { describe, expect, it } from "vitest";
import { parseSam, transformPath } from "@/lib/sam";

// One real record shape from the parser docs: a 60×27 mask at (211, 228) in a 320×334 frame.
const RAW =
  "<0f>0<|box;x1=211;y1=228;x2=270;y2=254;w=320;h=334|>" +
  "<|mask;x=0;y=0;data=27,60,~!!!!M!0c[0o91w?q1!pIH4pPRVp2B3'7`e.ioeAf6-k/#Xd8%dX9x(|>\n";

describe("parseSam", () => {
  it("returns boxes and outlines in image coordinates", async () => {
    const [obj] = await parseSam(RAW, "button");
    expect(obj.label).toBe("button");
    expect(obj.box).toEqual({ x1: 211, y1: 228, x2: 271, y2: 255 }); // half-open bounds
    const nums = obj.svgPath.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(210);
    expect(Math.max(...xs)).toBeLessThanOrEqual(272);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(227);
    expect(Math.max(...ys)).toBeLessThanOrEqual(256);
  });

  it("returns nothing for an empty response (no match is not an error)", async () => {
    expect(await parseSam("", "cup")).toEqual([]);
  });
});

describe("transformPath", () => {
  it("scales then offsets x/y pairs", () => {
    expect(transformPath("M1 2L3 4", 2, 3, 10, 20)).toBe("M12 26L16 32");
  });
});
