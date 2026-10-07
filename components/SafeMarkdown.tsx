import React from "react";

/**
 * Tiny restricted-markdown renderer. Supports: #/##/### headings, paragraphs,
 * - / * bullet lists, 1. numbered lists, **bold**, and [text](url) links where
 * url is http(s) or mailto only. Everything is emitted as React text nodes, so
 * raw HTML in the source is shown as literal text and never executed. No
 * dangerouslySetInnerHTML anywhere.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, url] = link;
      if (SAFE_URL.test(url)) {
        const external = url.toLowerCase().startsWith("http");
        return (
          <a
            key={key}
            href={url}
            className="text-daxul-lime underline underline-offset-2 hover:text-white"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
          </a>
        );
      }
      return <span key={key}>{label}</span>; // unsafe scheme: show label only
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string }
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let current: Block | null = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ kind: "h", level: h[1].length as 1 | 2 | 3, text: h[2] });
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (!current || current.kind !== "ul") {
        flush();
        current = { kind: "ul", items: [] };
      }
      current.items.push(ul[1]);
      continue;
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      if (!current || current.kind !== "ol") {
        flush();
        current = { kind: "ol", items: [] };
      }
      current.items.push(ol[1]);
      continue;
    }
    if (!current || current.kind !== "p") {
      flush();
      current = { kind: "p", lines: [] };
    }
    current.lines.push(line.trim());
  }
  flush();
  return blocks;
}

export default function SafeMarkdown({ source }: { source: string }) {
  const blocks = parse(source);
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.kind) {
          case "h": {
            const cls =
              b.level === 1
                ? "text-xl font-black uppercase tracking-tight text-white pt-2"
                : b.level === 2
                ? "text-lg font-extrabold uppercase tracking-tight text-white pt-2"
                : "text-sm font-bold uppercase tracking-wider text-daxul-lime pt-1";
            const Tag = (b.level === 1 ? "h2" : b.level === 2 ? "h3" : "h4") as "h2" | "h3" | "h4";
            return (
              <Tag key={key} className={cls}>
                {renderInline(b.text, key)}
              </Tag>
            );
          }
          case "ul":
            return (
              <ul key={key} className="list-disc pl-6 space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="list-decimal pl-6 space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={`${key}-${j}`}>{renderInline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={key}>
                {b.lines.map((ln, j) => (
                  <React.Fragment key={`${key}-${j}`}>
                    {j > 0 && <br />}
                    {renderInline(ln, `${key}-${j}`)}
                  </React.Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
