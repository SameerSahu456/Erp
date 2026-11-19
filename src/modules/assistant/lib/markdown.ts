// Minimal, safe Markdown → block model for assistant answers.
//
// Deliberately a parser to a typed tree (rendered as React elements by
// `AssistantMarkdown`) rather than HTML: nothing the model writes is ever
// injected as markup. Supports what answers actually use — headings,
// paragraphs, bullet/numbered lists, GFM tables, fenced code, and inline
// bold / italic / code / links.

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; children: Inline[] }
  | { kind: "italic"; children: Inline[] }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; children: Inline[] };

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; content: Inline[] }
  | { kind: "paragraph"; content: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "table"; header: Inline[][]; rows: Inline[][][] }
  | { kind: "code"; text: string }
  | { kind: "rule" };

const INLINE_PATTERN =
  /(\*\*([^*]+)\*\*)|(__([^_]+)__)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))|(\*([^*\s][^*]*)\*)/;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let rest = source;
  while (rest) {
    const match = INLINE_PATTERN.exec(rest);
    if (!match) {
      out.push({ kind: "text", text: rest });
      break;
    }
    if (match.index > 0) out.push({ kind: "text", text: rest.slice(0, match.index) });
    const bold = match[2] ?? match[4];
    if (bold !== undefined) out.push({ kind: "bold", children: parseInline(bold) });
    else if (match[6] !== undefined) out.push({ kind: "code", text: match[6] });
    else if (match[8] !== undefined && match[9] !== undefined)
      out.push({ kind: "link", href: match[9], children: parseInline(match[8]) });
    else if (match[11] !== undefined)
      out.push({ kind: "italic", children: parseInline(match[11]) });
    rest = rest.slice(match.index + match[0].length);
  }
  return out;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const FENCE = /^\s*```/;
const MAX_HEADING_LEVEL = 3;

function splitRow(line: string): Inline[][] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => parseInline(cell.trim()));
}

function isBlockStart(line: string, next: string | undefined): boolean {
  return (
    HEADING.test(line) ||
    BULLET.test(line) ||
    NUMBERED.test(line) ||
    RULE.test(line) ||
    FENCE.test(line) ||
    (line.includes("|") && next !== undefined && TABLE_DIVIDER.test(next))
  );
}

function takeWhile(lines: string[], start: number, test: (line: string) => boolean): number {
  let end = start;
  while (end < lines.length && test(lines[end] ?? "")) end += 1;
  return end;
}

function parseTableAt(lines: string[], index: number): [Block, number] | null {
  const line = lines[index] ?? "";
  if (!line.includes("|") || !TABLE_DIVIDER.test(lines[index + 1] ?? "")) return null;
  const end = takeWhile(lines, index + 2, (l) => l.includes("|") && l.trim() !== "");
  const rows = lines.slice(index + 2, end).map(splitRow);
  return [{ kind: "table", header: splitRow(line), rows }, end];
}

function parseListAt(lines: string[], index: number): [Block, number] | null {
  const line = lines[index] ?? "";
  for (const [pattern, ordered] of [[BULLET, false], [NUMBERED, true]] as const) {
    if (!pattern.test(line)) continue;
    const end = takeWhile(lines, index, (l) => pattern.test(l));
    const items = lines.slice(index, end).map((l) => parseInline(pattern.exec(l)?.[1] ?? ""));
    return [{ kind: "list", ordered, items }, end];
  }
  return null;
}

/** Parse the block that starts at `index`; returns it and the next index. */
function parseBlockAt(lines: string[], index: number): [Block, number] {
  const line = lines[index] ?? "";
  if (FENCE.test(line)) {
    const end = takeWhile(lines, index + 1, (l) => !FENCE.test(l));
    return [{ kind: "code", text: lines.slice(index + 1, end).join("\n") }, end + 1];
  }
  if (RULE.test(line)) return [{ kind: "rule" }, index + 1];
  const heading = HEADING.exec(line);
  if (heading) {
    const level = Math.min(heading[1]?.length ?? 1, MAX_HEADING_LEVEL) as 1 | 2 | 3;
    return [{ kind: "heading", level, content: parseInline(heading[2] ?? "") }, index + 1];
  }
  const structured = parseTableAt(lines, index) ?? parseListAt(lines, index);
  if (structured) return structured;
  let end = index + 1;
  while (
    end < lines.length &&
    (lines[end] ?? "").trim() !== "" &&
    !isBlockStart(lines[end] ?? "", lines[end + 1])
  ) {
    end += 1;
  }
  return [{ kind: "paragraph", content: parseInline(lines.slice(index, end).join("\n")) }, end];
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    if ((lines[index] ?? "").trim() === "") {
      index += 1;
      continue;
    }
    const [block, next] = parseBlockAt(lines, index);
    blocks.push(block);
    index = next;
  }
  return blocks;
}
