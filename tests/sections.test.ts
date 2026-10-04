import { expect, it } from "vitest";
import { defaults } from "../src/core/defaults";
import {
  clone,
  draftFor,
  newMaterial,
  parseState,
  saveWork,
} from "../src/core/model";
import {
  newSection,
  partyInput,
  partyName,
  presetSections,
  renderOutput,
  sectionSources,
  sourceTarget,
} from "../src/core/sections";
import { mergeBundle, readImport, share } from "../src/core/sharing";

it("默认只有借物表，分栏按顺序组合，多人分工、账号、参考和两类说明保留在作品", () => {
  const s = defaults(),
    draft = draftFor(s);
  expect(draft.sections!.map((x) => x.kind)).toEqual(["credits"]);
  const creators = newSection("creators");
  creators.creators = [
    { id: "host", role: "主讲人", name: "讲者", handle: "account", source: "" },
    { id: "assistant", role: "助教", name: "助教甲", handle: "", source: "" },
  ];
  const fixed = newSection("fixedText");
  fixed.text = "固定说明";
  const current = newSection("currentText");
  current.text = "本次说明";
  const refs = newSection("references");
  refs.references = [
    {
      id: "reference",
      title: "参考视频",
      source: "BV1KG411o7Cs",
      authors: ["作者甲@account", "作者乙"],
    },
  ];
  draft.sections = [creators, fixed, current, refs];
  const output = renderOutput(s, draft, s.templates[0]);
  expect(output).toBe(
    "制作人员\n主讲人：讲者@account\n助教：助教甲\n\n固定说明\n\n本次说明\n\n参考\n参考视频 — 作者甲@account / 作者乙 BV1KG411o7Cs\n",
  );
  const work = saveWork(s, draft, output);
  expect(parseState(JSON.parse(JSON.stringify(s))).works[0].sections).toEqual(
    draft.sections,
  );
  draft.sections[0].creators[0].name = "修改";
  expect(work.sections![0].creators[0].name).toBe("讲者");
  expect(
    presetSections(work.sections!).find((s) => s.kind === "currentText")!.text,
  ).toBe("");
  expect(
    presetSections(work.sections!).find((s) => s.kind === "fixedText")!.text,
  ).toBe("固定说明");
});

it("所有栏都可通过输出模板控制格式，内容中的模板字符按原文输出", () => {
  const s = defaults(),
    draft = draftFor(s),
    template = clone(s.templates[0]);
  const creators = newSection("creators");
  creators.title = "STAFF";
  creators.creators = [
    { id: "p", name: "作者甲", handle: "acc", role: "编辑", source: "" },
  ];
  const fixed = newSection("fixedText");
  fixed.text = "{{work.title}}";
  const ref = newSection("references");
  ref.references = [
    { id: "r", title: "视频", source: "BV1KG411o7Cs", authors: [] },
  ];
  draft.sections = [creators, fixed, ref];
  template.layoutSource =
    "{{#rows gap=0}}\n{{#if section.title}}【{{section.title}}】\n{{/if}}{{section.content}}\n{{/rows}}";
  template.creatorSource =
    "{{#rows}}{{name}} ({{role}}) @{{handle}}\n{{/rows}}";
  template.referenceSource = "{{#rows}}{{source}} | {{title}}\n{{/rows}}";
  expect(renderOutput(s, draft, template)).toBe(
    "【STAFF】\n作者甲 (编辑) @acc\n{{work.title}}\n【参考】\nBV1KG411o7Cs | 视频\n",
  );
  expect(() =>
    readImport(
      JSON.stringify({
        ...s,
        templates: [{ ...template, creatorSource: "{{execute}}" }],
      }),
    ),
  ).toThrow("未知");
});

it("分栏预设及最终预设可导出导入，重新分配预设ID", () => {
  const s = defaults(),
    draft = draftFor(s);
  const section = newSection("fixedText");
  section.text = "固定文字";
  s.sectionPresets[0].sections.push(section);
  draft.sections = clone(s.sectionPresets[0].sections);
  s.workPresets.push({
    id: "work-preset",
    name: "最终",
    domainId: draft.domainId,
    nodePresetId: draft.nodePresetId,
    templateId: draft.templateId,
    bindings: draft.bindings,
    publicTexts: [],
    sections: draft.sections,
    sectionPresetId: draft.sectionPresetId,
  });
  const result = mergeBundle(defaults(), share(s, "work", "work-preset"));
  expect(result.sectionPresets).toHaveLength(2);
  expect(result.workPresets[0].sectionPresetId).toBe(
    result.sectionPresets[1].id,
  );
  expect(result.workPresets[0].sections).toEqual(draft.sections);
  expect(
    mergeBundle(defaults(), share(s, "section", "sections-credits"))
      .sectionPresets[1].sections,
  ).toEqual(s.sectionPresets[0].sections);
});

it("BV号保留原样输出，可转换为视频链接，作者账号独立保存", () => {
  expect(sourceTarget(" BV1KG411o7Cs ")).toBe(
    "https://www.bilibili.com/video/BV1KG411o7Cs",
  );
  expect(sourceTarget("https://example.com/video")).toBe(
    "https://example.com/video",
  );
  const s = defaults(),
    p = {
      id: "p",
      ...partyInput("作者甲@account"),
      links: [],
      note: "",
      suffixMode: "default" as const,
      suffix: "",
    };
  expect(partyName(p)).toBe("作者甲@account");
  s.parties.push(p);
  const m = newMaterial(s.sourcePresets[0]);
  m.name = "视频";
  m.sources = ["BV1KG411o7Cs"];
  m.groups[0].partyIds = [p.id];
  s.materials.push(m);
  const d = draftFor(s);
  d.bindings.find((b) => b.nodeId === "music")!.materialIds = [m.id];
  s.templates[0].format.showSources = true;
  // Borrowed material attribution keeps its account in every language.
  expect(renderOutput(s, d, s.templates[0])).toContain("作者甲@account");
  expect(parseState(s).parties[0].handle).toBe("account");
});

it("空分栏不输出，旧版记录沿用原借物表格式", () => {
  const s = defaults(),
    d = draftFor(s);
  d.sections = [
    newSection("creators"),
    newSection("references"),
    newSection("currentText"),
  ];
  expect(renderOutput(s, d, s.templates[0])).toBe("");
  expect(() => saveWork(s, d, "")).toThrow("没有可输出");
  delete d.sections;
  expect(renderOutput(s, d, s.templates[0])).toBe("【借物表】\n");
  expect(sectionSources.layoutSource).toContain("section.content");
});
