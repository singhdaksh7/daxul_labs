import React from 'react';

/**
 * Restricted markdown subset renderer. Never uses dangerouslySetInnerHTML:
 * every piece of text is emitted as a React text node (auto-escaped), so raw
 * HTML in the source is shown as literal text, never executed.
 *
 * Supported: # ## ### headings, paragraphs, **bold**, *italic*, `code`,
 * [text](url) links (https/http/mailto/tel or site-relative only), - / * / 1.
 * lists, > blockquotes, --- rules.
 *
 * Usable from server and client components: <SafeMarkdown source={string} />
 */

export const POLICY_MAX_LENGTH = 50000;

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  // Strip control chars / whitespace tricks like "java\tscript:"
  const normalised = trimmed.replace(/[\u0000-\u001f\u007f\s]+/g, '');
  if (/^(javascript|data|vbscript|file):/i.test(normalised)) return false;
  return SAFE_URL.test(trimmed);
}

/**
 * Server-side sanitiser for stored markdown. Removes raw HTML tags/comments,
 * inline event-handler attributes and javascript:/data:/vbscript: URLs.
 * Returns the cleaned text and whether anything was stripped.
 */
export function sanitizeMarkdown(source: string): { clean: string; changed: boolean } {
  let out = source.replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
  // HTML comments and whole <script>/<style>/<iframe> blocks including content
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  // Any remaining tags (opening, closing, self-closing, unterminated)
  out = out.replace(/<\/?[a-zA-Z!?][^<>]*>/g, '');
  // Unterminated tag openers: drop the "<" so no tag can ever form
  out = out.replace(/<(?=\/?[a-zA-Z!?])/g, '');
  // Stray event-handler attributes (e.g. onerror=...) that survived outside a tag
  out = out.replace(/\bon[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Dangerous URL schemes (also in markdown link targets)
  out = out.replace(/\b(?:javascript|vbscript|data)\s*:/gi, '');
  return { clean: out, changed: out !== source.replace(/\r\n?/g, '\n') };
}

type InlineNode = React.ReactNode;

function renderInline(text: string, keyPrefix: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/;
  let rest = text;
  let i = 0;
  while (rest.length > 0) {
    const m = pattern.exec(rest);
    if (!m) {
      nodes.push(rest);
      break;
    }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    } else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (lm && isSafeUrl(lm[2])) {
        const external = /^https?:/i.test(lm[2]);
        nodes.push(
          <a
            key={key}
            href={lm[2]}
            className="underline underline-offset-2"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
          >
            {lm[1]}
          </a>,
        );
      } else {
        // Unsafe link: render the label only
        nodes.push(lm ? lm[1] : token);
      }
    }
    rest = rest.slice(m.index + token.length);
  }
  return nodes;
}

export function SafeMarkdown({ source, className }: { source: string; className?: string }) {
  const lines = (source || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let k = 0;

  const flushPara = () => {
    if (para.length) {
      const key = `p${k++}`;
      blocks.push(
        <p key={key} className="mb-4 leading-relaxed">
          {renderInline(para.join(' '), key)}
        </p>,
      );
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const key = `l${k++}`;
      const items = list.items.map((it, idx) => <li key={idx}>{renderInline(it, `${key}-${idx}`)}</li>);
      blocks.push(
        list.ordered ? (
          <ol key={key} className="mb-4 list-decimal space-y-1 pl-6">{items}</ol>
        ) : (
          <ul key={key} className="mb-4 list-disc space-y-1 pl-6">{items}</ul>
        ),
      );
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      const key = `q${k++}`;
      blocks.push(
        <blockquote key={key} className="mb-4 border-l-2 border-current/40 pl-4 opacity-80">
          {renderInline(quote.join(' '), key)}
        </blockquote>,
      );
      quote = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      const key = `h${k++}`;
      const level = h[1].length;
      const cls = level === 1 ? 'mb-4 mt-6 text-2xl font-bold' : level === 2 ? 'mb-3 mt-6 text-xl font-bold' : 'mb-2 mt-4 text-lg font-semibold';
      const Tag = (`h${level}`) as 'h1' | 'h2' | 'h3';
      blocks.push(<Tag key={key} className={cls}>{renderInline(h[2], key)}</Tag>);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push(<hr key={`hr${k++}`} className="my-6 border-current/20" />);
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    const q = /^>\s?(.*)$/.exec(line);
    if (q) {
      flushPara();
      flushList();
      quote.push(q[1]);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  flushAll();

  return <div className={className}>{blocks}</div>;
}

export default SafeMarkdown;
