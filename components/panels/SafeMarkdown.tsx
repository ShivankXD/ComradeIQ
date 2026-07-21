"use client";

import { useState, type ReactNode } from "react";

type SafeMarkdownProps = {
  content: string;
};

const inlineToken = /(`[^`]*`|\[[^\]]+\]\([^)]*\)|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_)/g;

function safeHref(value: string) {
  const href = value.trim();
  if (!href || href.startsWith("#") || href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) return href || "#";
  try {
    const protocol = new URL(href).protocol;
    return ["http:", "https:", "mailto:"].includes(protocol) ? href : "#";
  } catch {
    return "#";
  }
}

function inline(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  inlineToken.lastIndex = 0;

  while ((match = inlineToken.exec(value))) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const token = match[0];
    const key = `inline-${match.index}-${cursor}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key} className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-[#e4f3ee]">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\((.*)\)$/);
      const label = link?.[1] ?? token;
      const href = safeHref((link?.[2] ?? "").trim().split(/\s+/)[0]);
      nodes.push(
        <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="font-medium text-[#8ee7cb] underline decoration-[#8ee7cb]/40 underline-offset-2 hover:text-[#c5f8e8]">
          {label}
        </a>,
      );
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key} className="font-semibold text-[#f2f7f5]">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("~~")) {
      nodes.push(<del key={key} className="text-[#a8b2ad]">{token.slice(2, -2)}</del>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isBlockStart(line: string) {
  return /^(#{1,6}\s|```|>\s?|[-*+]\s+|\d+\.\s+|---+$)/.test(line);
}

function copyWithFallback(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await copyWithFallback(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="my-4 overflow-hidden rounded-xl border border-white/[0.1] bg-[#121514]" aria-label={language ? `${language} code block` : "Code block"}>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2">
        <span className="truncate font-mono text-[11px] text-[#aebbb5]">{language || "text"}</span>
        <button type="button" onClick={() => void copyCode()} className="rounded-md px-2 py-1 text-xs text-[#d5e0db] transition hover:bg-white/[0.09]">{copied ? "Copied" : "Copy code"}</button>
      </div>
      <pre className="max-h-[32rem] overflow-auto p-3 text-[13px] leading-6 text-[#d9e7e1]"><code>{code}</code></pre>
    </section>
  );
}

/**
 * A small renderer for the response formats ComradeIQ supports. It intentionally
 * creates React nodes from plain text rather than injecting HTML from a model.
 */
export function SafeMarkdown({ content }: SafeMarkdownProps) {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenced = line.match(/^```\s*([^\s]*)/);
    if (fenced) {
      const language = fenced[1];
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(<CodeBlock key={`code-${index}`} code={code.join("\n")} language={language} />);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const contentNode = inline(heading[2]);
      const className = level === 1
        ? "mt-7 text-2xl font-semibold tracking-[-0.03em] text-[#f5f8f7] first:mt-0"
        : level === 2
          ? "mt-7 text-xl font-semibold tracking-[-0.025em] text-[#f1f6f4]"
          : "mt-5 text-base font-semibold text-[#eef5f1]";
      if (level === 1) blocks.push(<h2 key={`heading-${index}`} className={className}>{contentNode}</h2>);
      else if (level === 2) blocks.push(<h3 key={`heading-${index}`} className={className}>{contentNode}</h3>);
      else blocks.push(<h4 key={`heading-${index}`} className={className}>{contentNode}</h4>);
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push(<hr key={`rule-${index}`} className="my-6 border-white/[0.1]" />);
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`} className="my-4 border-l-2 border-[#54cba9]/65 pl-4 text-[15px] leading-7 text-[#bdc8c3]">{inline(quote.join(" "))}</blockquote>);
      continue;
    }

    if (index + 1 < lines.length && line.includes("|") && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="my-5 overflow-x-auto rounded-xl border border-white/[0.1]">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <thead className="bg-white/[0.055] text-[#edf4f0]"><tr>{headers.map((header, cellIndex) => <th key={cellIndex} className="border-b border-white/[0.1] px-3 py-2.5 font-medium">{inline(header)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-white/[0.07] last:border-0">{headers.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2.5 align-top leading-6 text-[#c7d1cc]">{inline(row[cellIndex] ?? "")}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      const matcher = isOrdered ? /^\d+\.\s+(.+)$/ : /^[-*+]\s+(.+)$/;
      while (index < lines.length) {
        const item = lines[index].match(matcher);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      const List = isOrdered ? "ol" : "ul";
      blocks.push(
        <List key={`list-${index}`} className={`my-4 space-y-1.5 pl-6 text-[15px] leading-7 text-[#d0d9d5] ${isOrdered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, itemIndex) => {
            const task = item.match(/^\[([ xX])\]\s+(.+)$/);
            return <li key={itemIndex} className={task ? "list-none -ml-6 flex items-start gap-2" : undefined}>
              {task && <input type="checkbox" checked={task[1].toLowerCase() === "x"} disabled aria-label={task[2]} className="mt-2 h-3.5 w-3.5 accent-[#10a37f]" />}
              {inline(task?.[2] ?? item)}
            </li>;
          })}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]) && !(lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]))) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`} className="my-3 text-[15px] leading-7 text-[#d0d9d5]">{inline(paragraph.join(" "))}</p>);
  }

  return <div className="comrade-markdown">{blocks}</div>;
}
