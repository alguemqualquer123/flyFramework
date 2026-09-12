// Template parser: converte o HTML de um .fly em AST.

export type Attr = {
  name: string;
  value: string;
  dynamic: boolean;
};

export type Node =
  | { type: "element"; tag: string; attrs: Attr[]; children: Node[]; island?: IslandKind; islandId?: number }
  | { type: "if"; tag: string; attrs: Attr[]; test: string; children: Node[] }
  | { type: "for"; tag: string; attrs: Attr[]; item: string; index: string | null; of: string; children: Node[] }
  | { type: "suspense"; attrs: Attr[]; children: Node[] }
  | { type: "slot"; name?: string }
  | { type: "text"; segments: Segment[] };

export type IslandKind = "load" | "visible" | "idle";

export type Segment = { kind: "text"; value: string } | { kind: "expr"; value: string };

function parseExpr(raw: string): string {
  // Remove chaves envolventes: { expr }
  let s = raw.trim();
  if (s.startsWith("{") && s.endsWith("}")) s = s.slice(1, -1).trim();
  return s;
}

function splitSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  let i = 0;
  let buf = "";
  while (i < text.length) {
    if (text[i] === "{") {
      let depth = 0;
      let j = i;
      let inStr: string | null = null;
      for (; j < text.length; j++) {
        const c = text[j];
        if (inStr) {
          if (c === inStr && text[j - 1] !== "\\") inStr = null;
        } else if (c === '"' || c === "'" || c === "`") {
          inStr = c;
        } else if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
          if (depth === 0) break;
        }
      }
      if (buf) { segs.push({ kind: "text", value: buf }); buf = ""; }
      segs.push({ kind: "expr", value: parseExpr(text.slice(i, j + 1)) });
      i = j + 1;
    } else {
      buf += text[i];
      i++;
    }
  }
  if (buf) segs.push({ kind: "text", value: buf });
  return segs;
}

function parseAttrs(content: string): Attr[] {
  const attrs: Attr[] = [];
  let i = 0;
  while (i < content.length) {
    while (i < content.length && /\s/.test(content[i])) i++;
    if (i >= content.length) break;
    const start = i;
    while (i < content.length && /[\w:.-]/.test(content[i])) i++;
    const name = content.slice(start, i);
    if (!name) { i++; continue; }
    let value = "";
    if (content[i] === "=") {
      i++;
      if (content[i] === '"' || content[i] === "'") {
        const q = content[i]; i++;
        const s = i;
        while (i < content.length && content[i] !== q) i++;
        value = content.slice(s, i); i++;
      } else if (content[i] === "{") {
        let depth = 0;
        const s = i;
        for (; i < content.length; i++) {
          if (content[i] === "{") depth++;
          else if (content[i] === "}") { depth--; if (depth === 0) { i++; break; } }
        }
        value = content.slice(s, i);
      } else {
        const s = i;
        while (i < content.length && !/\s/.test(content[i]) && content[i] !== ">") i++;
        value = content.slice(s, i);
      }
    }
    attrs.push({ name, value, dynamic: value.includes("{") });
  }
  return attrs;
}

export function parseTemplate(input: string): Node[] {
  const nodes: Node[] = [];
  let i = 0;
  let islandSeq = 0;

  function findTagEnd(start: number): number {
    let inStr: string | null = null;
    let depth = 0;
    for (let j = start; j < input.length; j++) {
      const c = input[j];
      if (inStr) {
        if (c === inStr && input[j - 1] !== "\\") inStr = null;
      } else if (c === '"' || c === "'" || c === "`") {
        inStr = c;
      } else if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
      } else if (c === ">" && depth === 0 && inStr === null) {
        return j;
      }
    }
    return -1;
  }

  function parseChildren(stopTag: string | null): Node[] {
    const out: Node[] = [];
    while (i < input.length) {
      if (input[i] === "<") {
        if (input.startsWith("</", i)) {
          const end = findTagEnd(i);
          const tag = input.slice(i + 2, end).trim();
          i = end + 1;
          if (tag === stopTag) return out;
          continue;
        }
        if (input.startsWith("<!--", i)) {
          const end = input.indexOf("-->", i);
          i = end === -1 ? input.length : end + 3;
          continue;
        }
        // abertura de tag
        const end = findTagEnd(i);
        if (end === -1) break;
        const inner = input.slice(i + 1, end);
        const selfClosing = inner.endsWith("/");
        const tagContent = selfClosing ? inner.slice(0, -1) : inner;
        const spaceIdx = tagContent.search(/\s/);
        const tag = (spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx)).trim();
        const attrContent = spaceIdx === -1 ? "" : tagContent.slice(spaceIdx + 1);

        i = end + 1;

        if (tag === "slot") {
          const sAttrs = parseAttrs(attrContent);
          const nameAttr = sAttrs.find((a) => a.name === "name");
          out.push({ type: "slot", name: nameAttr ? nameAttr.value : undefined });
          continue;
        }

        const attrs = parseAttrs(attrContent);
        const ifAttr = attrs.find((a) => a.name === "if");
        const forAttr = attrs.find((a) => a.name === "for");
        const restAttrs = attrs.filter((a) => a.name !== "if" && a.name !== "for");

        if (tag.toLowerCase() === "suspense") {
          const children = selfClosing ? [] : parseChildren(tag);
          out.push({ type: "suspense", attrs: restAttrs.filter((a) => !a.name.startsWith("client:")), children });
          continue;
        }

        // Partial hydration (islands): client:load | client:visible | client:idle
        const islandAttr = attrs.find((a) => /^client:(load|visible|idle)$/.test(a.name));
        const children = selfClosing ? [] : parseChildren(tag);

        if (ifAttr) {
          out.push({ type: "if", tag, attrs: restAttrs, test: parseExpr(ifAttr.value), children });
          continue;
        }
        if (forAttr) {
          const expr = parseExpr(forAttr.value);
          const ofIdx = expr.lastIndexOf(" of ");
          const left = expr.slice(0, ofIdx).trim();
          const ofExpr = expr.slice(ofIdx + 4).trim();
          let item = left, index: string | null = null;
          const paren = /\(([^,]+),\s*([^)]+)\)/.exec(left);
          if (paren) { item = paren[1].trim(); index = paren[2].trim(); }
          out.push({ type: "for", tag, attrs: restAttrs, item, index, of: ofExpr, children });
          continue;
        }
        if (islandAttr) {
          const kind = islandAttr.name.split(":")[1] as IslandKind;
          out.push({ type: "element", tag, attrs: restAttrs.filter((a) => !a.name.startsWith("client:")), children, island: kind, islandId: islandSeq++ });
          continue;
        }
        out.push({ type: "element", tag, attrs: restAttrs, children });
      } else {
        const next = input.indexOf("<", i);
        const text = next === -1 ? input.slice(i) : input.slice(i, next);
        i = next === -1 ? input.length : next;
        if (text.trim()) out.push({ type: "text", segments: splitSegments(text) });
      }
    }
    return out;
  }

  return parseChildren(null);
}
