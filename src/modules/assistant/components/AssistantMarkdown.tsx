import { Fragment, memo, useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";

import { parseMarkdown, type Block, type Inline } from "../lib/markdown";

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((node, i) => {
    const key = `${node.kind}-${i}`;
    if (node.kind === "text") return <Fragment key={key}>{node.text}</Fragment>;
    if (node.kind === "bold") {
      return (
        <strong key={key} className="font-semibold">
          {renderInline(node.children)}
        </strong>
      );
    }
    if (node.kind === "italic") return <em key={key}>{renderInline(node.children)}</em>;
    if (node.kind === "code") {
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono">
          {node.text}
        </code>
      );
    }
    // Only in-app routes become links. External URLs render as plain text so
    // an answer can never send the user (or data in a query string) off-site.
    if (node.href.startsWith("/") && !node.href.startsWith("//")) {
      return (
        <Link key={key} to={node.href} className="text-primary underline underline-offset-2">
          {renderInline(node.children)}
        </Link>
      );
    }
    return <Fragment key={key}>{renderInline(node.children)}</Fragment>;
  });
}

function MarkdownTable({ block }: { block: Extract<Block, { kind: "table" }> }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {block.header.map((cell, i) => (
              <TableHead key={i} className="h-8 whitespace-nowrap px-2.5">
                <Typography variant="table-header">{renderInline(cell)}</Typography>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {block.rows.map((row, r) => (
            <TableRow key={r}>
              {row.map((cell, c) => (
                <TableCell key={c} className="px-2.5 py-1.5 align-top">
                  <Typography variant="table-cell">{renderInline(cell)}</Typography>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MarkdownBlock({ block }: { block: Block }) {
  if (block.kind === "heading") {
    return (
      <Typography variant={block.level === 1 ? "body-strong" : "card-title"}>
        {renderInline(block.content)}
      </Typography>
    );
  }
  if (block.kind === "paragraph") {
    return (
      <Typography variant="body-sm" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        {renderInline(block.content)}
      </Typography>
    );
  }
  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {block.items.map((item, i) => (
          <li key={i}>
            <Typography variant="body-sm" asChild>
              <span className="[overflow-wrap:anywhere]">{renderInline(item)}</span>
            </Typography>
          </li>
        ))}
      </ListTag>
    );
  }
  if (block.kind === "table") return <MarkdownTable block={block} />;
  if (block.kind === "code") {
    return (
      <pre className="max-w-full overflow-x-auto rounded-md bg-muted p-2.5">
        <Typography variant="mono" asChild>
          <code>{block.text}</code>
        </Typography>
      </pre>
    );
  }
  return <hr className="border-border" />;
}

/** Renders an assistant answer. Memoised: re-parses only when the text changes. */
export const AssistantMarkdown = memo(function AssistantMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {blocks.map((block, i) => (
        <MarkdownBlock key={`${block.kind}-${i}`} block={block} />
      ))}
    </div>
  );
});
