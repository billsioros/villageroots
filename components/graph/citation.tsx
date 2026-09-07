export type Segment =
  | { type: "text"; value: string }
  | { type: "citation"; index: number; value: string };

const CITATION_REF = /\[(\d+)\]/g;

export function splitAnswerIntoSegments(content: string, count: number): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  CITATION_REF.lastIndex = 0;
  while ((match = CITATION_REF.exec(content)) !== null) {
    const index = Number(match[1]);
    if (index < 1 || index > count) continue;
    if (match.index > last) {
      segments.push({ type: "text", value: content.slice(last, match.index) });
    }
    segments.push({ type: "citation", index, value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    segments.push({ type: "text", value: content.slice(last) });
  }
  if (segments.length === 0) segments.push({ type: "text", value: content });
  return segments;
}
