import { Fragment } from "react";
import { humaniseDates } from "@/lib/format";

// Tiny markdown renderer for Hindsight reflect answers: headings, bullet/numbered lists, bold, paragraphs.
// Builds React elements (never raw HTML), so model output cannot inject markup.

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "p"; text: string };

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ kind: "h", level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const kind = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1];
      const last = blocks.at(-1);
      if (last && last.kind === kind) last.items.push(text);
      else blocks.push({ kind, items: [text] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

function Inline({ text }: { text: string }) {
  const parts = humaniseDates(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part.replace(/(^|\s)\*(\S[^*]*)\*/g, "$1$2")}</Fragment>
        ),
      )}
    </>
  );
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="grid gap-2 text-sm leading-relaxed">
      {parseBlocks(text).map((b, i) => {
        if (b.kind === "h") {
          return b.level <= 2 ? (
            <h3 key={i} className="mt-1 text-base font-semibold">
              <Inline text={b.text} />
            </h3>
          ) : (
            <h4 key={i} className="mt-1 text-sm font-semibold text-soil">
              <Inline text={b.text} />
            </h4>
          );
        }
        if (b.kind === "p") {
          return (
            <p key={i}>
              <Inline text={b.text} />
            </p>
          );
        }
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={i} className={b.kind === "ul" ? "list-disc space-y-1 pl-5" : "list-decimal space-y-1 pl-5"}>
            {b.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
