import { parseImageStream, recordsOfKind, decodeMaskToSVGPath, type ResponsesEvent } from "@meta-sam/parser";

export interface SamObject {
  label: string;
  box: { x1: number; y1: number; x2: number; y2: number };
  svgPath: string; // image pixel coordinates
}

/** Parse SAM 3.1 Responses output text into boxes + SVG outlines (in source-image pixels). */
export async function parseSam(outputText: string, label: string): Promise<SamObject[]> {
  if (!outputText.trim()) return [];
  async function* events(): AsyncIterable<ResponsesEvent> {
    const lane = { item_id: "m", output_index: 0, content_index: 0 };
    yield { type: "response.output_text.delta", ...lane, delta: outputText };
    yield { type: "response.output_text.done", ...lane, text: outputText };
    yield { type: "response.completed" };
  }
  const parsed = parseImageStream(events());
  for await (const _ of parsed) void _;
  const result = await parsed.finalResult;
  const boxes = recordsOfKind(result.records, "box");
  return recordsOfKind(result.records, "mask").map((m) => {
    const b = boxes.find((x) => x.objectId === m.objectId) ?? m.bounds;
    const rel = decodeMaskToSVGPath(m.mask);
    return {
      label,
      box: { x1: b.left, y1: b.top, x2: b.right, y2: b.bottom },
      svgPath: transformPath(
        rel,
        (m.bounds.right - m.bounds.left) / m.mask.width,
        (m.bounds.bottom - m.bounds.top) / m.mask.height,
        m.bounds.left,
        m.bounds.top,
      ),
    };
  });
}

/** Mask paths live in the mask's own raster space; map them into source-image pixels. */
export function transformPath(path: string, sx: number, sy: number, dx: number, dy: number): string {
  let i = 0;
  return path.replace(/-?\d+(?:\.\d+)?/g, (n) => {
    const v = i++ % 2 === 0 ? Number(n) * sx + dx : Number(n) * sy + dy;
    return String(Math.round(v * 10) / 10);
  });
}
