import type { Draft, Format, State, Template } from "./model";
import { stylize } from "./unicode";
export interface Credit {
  name: string;
  allowSuffix: boolean;
  suffixMode: string;
  suffix: string;
}
export interface Row {
  label: string;
  title: string;
  credits: Credit[];
  sources: string[];
  note: string;
  labels?: string[];
  nodeId?: string;
}
export interface Context {
  rows: Row[];
  texts: string[];
  work: { title: string; date: string };
  domain: { name: string };
}
type Ast =
  | { kind: "text"; value: string }
  | { kind: "expr"; value: string }
  | { kind: "header"; title: string; options: Record<string, string> }
  | { kind: "blank"; n: number }
  | {
      kind: "rows" | "texts" | "if";
      gap: number;
      children: Ast[];
      condition?: string;
      nodeGap?: number;
    };
type Value = string | Credit[];
const maxLength = 100_000;
const asCredit = (name: string): Credit => ({
  name,
  allowSuffix: true,
  suffixMode: "default",
  suffix: "",
});
function fail(message: string): never {
  throw new Error(`模板错误：${message}`);
}
function splitOutside(value: string, separator: string) {
  const parts: string[] = [];
  let quoted = false,
    escaped = false,
    start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (c === '"') {
      quoted = !quoted;
      continue;
    }
    if (c === separator && !quoted) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quoted) fail("字符串引号未闭合");
  parts.push(value.slice(start).trim());
  return parts;
}
function strings(value: string): string[] {
  return splitOutside(value, ",").map((s) => {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(s)) return fail("参数必须是双引号字符串");
    try {
      return JSON.parse(s) as string;
    } catch {
      return fail("字符串转义无效");
    }
  });
}
function header(value: string): Ast {
  const match = /^header\s+("(?:[^"\\]|\\.)*")(.*)$/.exec(value);
  if (!match) return fail("header需要一个双引号标题");
  const title = strings(match[1])[0],
    options: Record<string, string> = {};
  let rest = match[2].trim();
  while (rest) {
    const m = /^(left|right|style)\s*=\s*("(?:[^"\\]|\\.)*")(?:\s+|$)/.exec(
      rest,
    );
    if (!m) return fail("header只接受left、right、style字符串参数");
    if (m[1] in options) fail("重复的header参数");
    options[m[1]] = strings(m[2])[0];
    rest = rest.slice(m[0].length).trim();
  }
  if (options.style) stylize("", options.style);
  return { kind: "header", title, options };
}
export function compile(source: string): Ast[] {
  if (source.length > maxLength) return fail("模板超过100000字符");
  const prepared = source.replace(
    /^[ \t]*({{(?:[#/][^{}\n]*|blank\s+\d+)}})[ \t]*(?:\r?\n|$)/gm,
    "$1",
  );
  const root: Ast[] = [],
    stack: { kind: string; body: Ast[] }[] = [{ kind: "root", body: root }];
  let cursor = 0;
  const re = /{{([\s\S]*?)}}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(prepared))) {
    const body = stack.at(-1)!.body;
    const literal = prepared.slice(cursor, m.index);
    if (literal.includes("{{")) fail("标签未闭合");
    if (literal) body.push({ kind: "text", value: literal });
    cursor = re.lastIndex;
    const tag = m[1].trim();
    if (tag.startsWith("/")) {
      const kind = tag.slice(1);
      if (stack.length === 1 || stack.at(-1)!.kind !== kind)
        fail(`结束标签${tag}不匹配`);
      stack.pop();
      continue;
    }
    if (tag.startsWith("#")) {
      const loop = /^#(rows|texts)(?:\s+gap=(\d+))?(?:\s+nodeGap=(\d+))?$/.exec(
        tag,
      );
      if (loop) {
        if (stack.some((s) => s.kind === "rows" || s.kind === "texts"))
          fail("不支持嵌套循环");
        const gap = Number(loop[2] || 0);
        if (gap > 10) fail("空行数必须在0到10之间");
        const nodeGap = loop[3] === undefined ? undefined : Number(loop[3]);
        if (nodeGap !== undefined && (nodeGap > 10 || loop[1] !== "rows"))
          fail("节点间空行必须用于rows且在0到10之间");
        const node: Ast = {
          kind: loop[1] as "rows" | "texts",
          gap,
          nodeGap,
          children: [],
        };
        body.push(node);
        stack.push({ kind: loop[1], body: node.children });
      } else if (tag === "#if title" || tag === "#if sources") {
        if (!stack.some((s) => s.kind === "rows"))
          fail("if title必须位于rows内");
        const node: Ast = {
          kind: "if",
          gap: 0,
          children: [],
          condition: tag.slice(4),
        };
        body.push(node);
        stack.push({ kind: "if", body: node.children });
      } else fail(`不支持的控制标签：${tag}`);
      if (stack.length > 8) fail("嵌套超过7层");
      continue;
    }
    if (tag.startsWith("header")) body.push(header(tag));
    else if (/^blank\s+\d+$/.test(tag)) {
      const n = Number(tag.split(/\s+/)[1]);
      if (n > 10) fail("空行数必须在0到10之间");
      body.push({ kind: "blank", n });
    } else {
      validateExpression(
        tag,
        stack.map((s) => s.kind),
      );
      body.push({ kind: "expr", value: tag });
    }
  }
  const tail = prepared.slice(cursor);
  if (tail.includes("{{")) fail("标签未闭合");
  if (tail) stack.at(-1)!.body.push({ kind: "text", value: tail });
  if (stack.length !== 1) fail(`缺少/${stack.at(-1)!.kind}`);
  return root;
}
function validateExpression(expression: string, scopes: string[]) {
  const [name, ...filters] = splitOutside(expression, "|");
  const globals = ["work.title", "work.date", "domain.name"];
  if (
    !globals.includes(name) &&
    !(
      scopes.includes("rows") &&
      ["label", "labels", "title", "credits", "sources", "note"].includes(name)
    ) &&
    !(scopes.includes("texts") && name === "text")
  )
    fail(`未知或不可用变量：${name}`);
  let type = ["credits", "sources", "labels"].includes(name)
    ? "list"
    : "string";
  for (const filter of filters) {
    const m = /^(join|suffix|style|frame)\s*:\s*(.*)$/.exec(filter);
    if (!m) fail(`不支持的过滤器：${filter}`);
    const args = strings(m![2]);
    if (args.length !== (m![1] === "frame" ? 2 : 1))
      fail(`过滤器${m![1]}参数数量错误`);
    if (m![1] === "join") {
      if (type !== "list") fail("join需要列表");
      type = "string";
    }
    if (m![1] === "frame" && type !== "string") fail("frame需要文字");
    if (m![1] === "style") {
      if (name === "sources") fail("链接不能转换字符样式");
      stylize("", args[0]);
    }
    if (m![1] === "suffix" && name === "sources") fail("链接不能添加敬称");
  }
  if (type === "list") fail(`列表${name}需要join过滤器`);
}
export function render(source: string, context: Context): string {
  const ast = compile(source);
  function nodes(items: Ast[], row?: Row, text = ""): string {
    let result = "";
    for (const node of items) {
      if (node.kind === "text") result += node.value;
      else if (node.kind === "blank") result += "\n".repeat(node.n);
      else if (node.kind === "header")
        result +=
          (node.options.left || "") +
          stylize(node.title, node.options.style || "plain") +
          (node.options.right || "");
      else if (node.kind === "if") {
        if (node.condition === "sources" ? row?.sources.length : row?.title)
          result += nodes(node.children, row, text);
      } else if (node.kind === "rows")
        result += context.rows
          .map((r, i) => {
            const previous = context.rows[i - 1];
            const gap =
              previous &&
              (previous.nodeId ?? previous.label) !== (r.nodeId ?? r.label)
                ? (node.nodeGap ?? node.gap)
                : node.gap;
            return (i ? "\n".repeat(gap) : "") + nodes(node.children, r, text);
          })
          .join("");
      else if (node.kind === "texts")
        result += context.texts
          .map((t) => nodes(node.children, row, t))
          .join("\n".repeat(node.gap));
      else if (node.kind === "expr") {
        const [name, ...filters] = splitOutside(node.value, "|");
        const values: Record<string, Value> = {
          "work.title": context.work.title,
          "work.date": context.work.date,
          "domain.name": context.domain.name,
          label: row?.label || "",
          labels: (row?.labels ?? [row?.label || ""]).map(asCredit),
          title: row?.title || "",
          credits: row?.credits || [],
          sources: (row?.sources || []).map(asCredit),
          note: row?.note || "",
          text,
        };
        let value = values[name];
        for (const f of filters) {
          const match = /^(\w+)\s*:\s*(.*)$/.exec(f)!;
          const args = strings(match[2]);
          if (match[1] === "join")
            value = (value as Credit[]).map((c) => c.name).join(args[0]);
          if (match[1] === "style")
            value =
              typeof value === "string"
                ? stylize(value, args[0])
                : value.map((c) => ({ ...c, name: stylize(c.name, args[0]) }));
          if (match[1] === "frame") value = args[0] + value + args[1];
          if (match[1] === "suffix") {
            const append = (c: Credit) => {
              const suffix = c.suffixMode === "custom" ? c.suffix : args[0];
              return {
                ...c,
                name:
                  !c.allowSuffix ||
                  c.suffixMode === "none" ||
                  !suffix ||
                  c.name.endsWith(suffix)
                    ? c.name
                    : c.name + suffix,
              };
            };
            value =
              typeof value === "string"
                ? append(asCredit(value)).name
                : value.map(append);
          }
        }
        result += value;
      }
      if (result.length > maxLength) fail("输出超过100000字符");
    }
    return result;
  }
  return nodes(ast).replace(/\r\n/g, "\n");
}
export function contextFor(
  s: State,
  draft: Draft,
  language: Template["language"],
  nodeJoiner = "・",
): Context {
  const domain = s.domains.find((d) => d.id === draft.domainId);
  const rows: Row[] = [],
    texts = [...draft.publicTexts];
  const absorbed = new Set(
    draft.bindings.flatMap((b) => b.mergedNodeIds ?? []),
  );
  for (const b of draft.bindings) {
    if (absorbed.has(b.nodeId)) continue;
    const node = domain?.nodes.find((n) => n.id === b.nodeId);
    if (!node) continue;
    if (node.mode === "text") {
      if (b.text.trim()) texts.push(b.text);
      continue;
    }
    const label =
      language === "en"
        ? node.en || node.label
        : language === "ja"
          ? node.ja || node.label
          : node.label;
    const selected = b.materialIds
      .map((id) => s.materials.find((m) => m.id === id))
      .filter((m) => !!m);
    const from = (m: (typeof selected)[number]): Row => ({
      label,
      nodeId: b.nodeId,
      title: b.titleOverrides[m.id] ?? m.name,
      credits: m.groups.flatMap((g) =>
        g.partyIds
          .map((id) => {
            const p = s.parties.find((p) => p.id === id);
            return p
              ? {
                  name: p.name,
                  allowSuffix:
                    g.category.honorific || p.suffixMode === "custom",
                  suffixMode: p.suffixMode,
                  suffix: p.suffix,
                }
              : null;
          })
          .filter((c) => !!c),
      ),
      sources: m.sources,
      note: "",
    });
    if (b.mergedNodeIds?.length) {
      const group = [b.nodeId, ...b.mergedNodeIds];
      const combined = contextFor(
        s,
        {
          ...draft,
          bindings: group.map((id) => ({
            ...draft.bindings.find((x) => x.nodeId === id)!,
            mergedNodeIds: [],
          })),
          publicTexts: [],
        },
        language,
        nodeJoiner,
      ).rows;
      if (combined.length) {
        const labels = group.map((id) => {
          const n = domain!.nodes.find((n) => n.id === id)!;
          return language === "en"
            ? n.en || n.label
            : language === "ja"
              ? n.ja || n.label
              : n.label;
        });
        const names = new Set<string>();
        rows.push({
          label: labels.join(nodeJoiner),
          nodeId: b.nodeId,
          labels,
          title: [
            ...new Set(combined.map((r) => r.title).filter(Boolean)),
          ].join(" / "),
          credits: combined
            .flatMap((r) => r.credits)
            .filter((c) => {
              if (names.has(c.name)) return false;
              names.add(c.name);
              return true;
            }),
          sources: [...new Set(combined.flatMap((r) => r.sources))],
          note: "",
        });
      }
    } else if (b.titleMode) rows.push(...selected.map(from));
    else if (selected.length) {
      const parts = selected.map(from);
      rows.push({
        label,
        nodeId: b.nodeId,
        title: "",
        credits: parts.flatMap((p) => p.credits),
        sources: parts.flatMap((p) => p.sources),
        note: "",
      });
    }
  }
  return {
    rows,
    texts,
    work: { title: draft.title, date: new Date().toLocaleDateString("zh-CN") },
    domain: { name: domain?.name || "" },
  };
}
export function sourceFromFormat(f: Format): string {
  const q = JSON.stringify;
  const style = f.style === "plain" ? "" : ` | style:${q(f.style)}`;
  return `{{header ${q(f.header)} left=${q(f.left)} right=${q(f.right)} style=${q(f.style)}}}\n${f.headerGap ? `{{blank ${f.headerGap}}}\n` : ""}{{#rows gap=${f.rowGap} nodeGap=${f.nodeGap ?? f.rowGap}}}\n${f.labelLeft}{{labels | join:${q(f.nodeJoiner ?? "・")}${style}}}${f.labelRight}${f.labelNewline ? f.delimiter.trimEnd() + "\n" : f.delimiter}{{#if title}}{{title}}${f.titleSeparator}{{/if}}{{credits${f.suffix ? ` | suffix:${q(f.suffix)}` : ""} | join:${q(f.joiner)}}}\n${f.showSources ? '{{#if sources}}\n{{sources | join:"\\n"}}\n{{/if}}\n' : ""}{{/rows}}\n{{#texts}}\n{{text}}\n{{/texts}}`;
}
