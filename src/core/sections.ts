import {
  clone,
  uid,
  type Draft,
  type OutputSection,
  type Party,
  type State,
  type Template,
} from "./model";
import {
  contextFor,
  render,
  type Context,
  type Credit,
  type Row,
} from "./template";

export const sectionNames: Record<OutputSection["kind"], string> = {
  credits: "借物表",
  creators: "制作人员",
  fixedText: "固定说明",
  currentText: "本次说明",
  references: "参考来源",
};
export function newSection(kind: OutputSection["kind"]): OutputSection {
  return {
    id: uid(),
    kind,
    title:
      kind === "creators" ? "制作人员" : kind === "references" ? "参考" : "",
    text: "",
    creators: [],
    references: [],
  };
}
export function presetSections(sections: OutputSection[]) {
  return clone(sections).map((s) =>
    s.kind === "currentText" ? { ...s, text: "" } : s,
  );
}
export const sectionSources = {
  layoutSource:
    "{{#rows gap=1}}\n{{#if section.title}}{{section.title}}\n{{/if}}{{section.content}}\n{{/rows}}",
  creatorSource:
    "{{#rows gap=0}}\n{{#if role}}{{role}}：{{/if}}{{name}}{{#if handle}}@{{handle}}{{/if}}{{#if source}} {{source}}{{/if}}\n{{/rows}}",
  referenceSource:
    '{{#rows gap=0}}\n{{#if title}}{{title}}{{/if}}{{#if credits}} — {{credits | join:" / "}}{{/if}}{{#if source}} {{source}}{{/if}}\n{{/rows}}',
  fixedTextSource: "{{#rows}}{{section.content}}\n{{/rows}}",
  currentTextSource: "{{#rows}}{{section.content}}\n{{/rows}}",
};
export function sourceTarget(value: string) {
  const source = value.trim();
  return /^BV[0-9a-z]+$/i.test(source)
    ? `https://www.bilibili.com/video/${source}`
    : source;
}
export function partyName(p: Party) {
  return (
    p.name + (p.handle?.trim() ? "@" + p.handle.trim().replace(/^@/, "") : "")
  );
}
export function partyInput(value: string): Pick<Party, "name" | "handle"> {
  const index = value.lastIndexOf("@");
  return index > 0 && index < value.length - 1
    ? {
        name: value.slice(0, index).trim(),
        handle: value.slice(index + 1).trim(),
      }
    : { name: value.trim() };
}
const credit = (name: string): Credit => ({
  name,
  allowSuffix: false,
  suffixMode: "none",
  suffix: "",
});
const row = (): Row => ({
  label: "",
  title: "",
  credits: [],
  sources: [],
  note: "",
});
export function sectionContext(
  section: OutputSection,
  context: Context,
): Context {
  return {
    ...context,
    texts: [],
    rows:
      section.kind === "creators"
        ? section.creators
            .filter((p) => p.name.trim())
            .map((p) => ({
              ...row(),
              role: p.role,
              name: p.name,
              handle: p.handle.replace(/^@/, ""),
              source: p.source,
            }))
        : section.kind === "fixedText" || section.kind === "currentText"
          ? [{ ...row(), title: section.title, content: section.text }]
          : section.references
              .filter((r) => r.title.trim() || r.source.trim())
              .map((r) => ({
                ...row(),
                title: r.title,
                source: r.source,
                credits: r.authors.filter(Boolean).map(credit),
              })),
  };
}
export function renderOutput(s: State, draft: Draft, template: Template) {
  const context = contextFor(
    s,
    draft,
    template.language,
    template.format.nodeJoiner,
  );
  if (!draft.sections) return render(template.source, context);
  const rows = draft.sections.flatMap((section) => {
    let content = "";
    if (section.kind === "credits") content = render(template.source, context);
    else if (section.kind === "fixedText" || section.kind === "currentText") {
      const key =
        section.kind === "fixedText" ? "fixedTextSource" : "currentTextSource";
      content = section.text.trim()
        ? render(
            template[key] ?? sectionSources[key],
            sectionContext(section, context),
          )
        : "";
    } else
      content = render(
        template[
          section.kind === "creators" ? "creatorSource" : "referenceSource"
        ] ??
          sectionSources[
            section.kind === "creators" ? "creatorSource" : "referenceSource"
          ],
        sectionContext(section, context),
      );
    return content.trim()
      ? [
          {
            ...row(),
            nodeId: section.id,
            title: section.title,
            content: content.trimEnd(),
          },
        ]
      : [];
  });
  return render(template.layoutSource ?? sectionSources.layoutSource, {
    ...context,
    rows,
    texts: [],
  });
}
