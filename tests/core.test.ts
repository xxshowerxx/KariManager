import { describe, it, expect } from "vitest";
import { defaults, defaultFormat } from "../src/core/defaults";
import {
  draftFor,
  newMaterial,
  parseState,
  saveWork,
  usage,
  validateMaterial,
  clone,
  materialPath,
} from "../src/core/model";
import {
  compile,
  contextFor,
  render,
  sourceFromFormat,
} from "../src/core/template";
import { styles, stylize } from "../src/core/unicode";
import { readImport, share, mergeBundle } from "../src/core/sharing";
function fixture() {
  const s = defaults();
  s.parties.push({
    id: "p",
    name: "作者甲",
    links: ["https://example.com"],
    note: "私人",
    suffixMode: "default",
    suffix: "",
  });
  const m = newMaterial(s.sourcePresets[0]);
  m.id = "m";
  m.name = "测试模型";
  m.path = "D:\\素材\\测试.pmx";
  m.note = "私人素材备注";
  m.groups[0].partyIds = ["p"];
  s.materials.push(m);
  const d = draftFor(s);
  d.bindings.find((b) => b.nodeId === "model")!.materialIds = ["m"];
  return { s, m, d };
}
describe("素材、作品与使用次数", () => {
  it("默认只有MMD，来源预设仅含空分类，完整节点覆盖文章分类", () => {
    const s = defaults();
    expect(parseState(s)).toEqual(s);
    expect(s.domains.map((d) => d.name)).toEqual(["MMD"]);
    expect(s.domains[0].nodes).toHaveLength(13);
    expect(s.parties).toEqual([]);
    expect(
      s.sourcePresets.every((p) => p.categories.some((c) => c.author)),
    ).toBe(true);
  });
  it("作者必填，名称、URL或路径任一足够", () => {
    const { s, m } = fixture();
    m.name = "";
    expect(() => validateMaterial(m, s)).not.toThrow();
    m.path = "";
    m.sources = ["https://example.com"];
    expect(() => validateMaterial(m, s)).not.toThrow();
    m.sources = [];
    expect(() => validateMaterial(m, s)).toThrow("至少");
    m.name = "测试";
    m.groups[0].partyIds = [];
    expect(() => validateMaterial(m, s)).toThrow("作者");
  });
  it("同一作品更新一次计数，新作品增加，归档保留，软删除可恢复", () => {
    const { s, m, d } = fixture();
    const first = saveWork(s, d, "快照", "2026-10-04T00:00:00Z");
    d.workId = first.id;
    d.bindings.find((b) => b.nodeId === "motion")!.materialIds = [m.id];
    saveWork(s, d, "更新快照", "2026-10-05T00:00:00Z");
    expect(usage(s, m.id)).toHaveLength(1);
    expect(s.works[0].date).toBe("2026-10-04T00:00:00Z");
    d.workId = "";
    saveWork(s, d, "新作品");
    expect(usage(s, m.id)).toHaveLength(2);
    s.works[0].archived = true;
    expect(usage(s, m.id)).toHaveLength(2);
    s.works[0].deletedAt = new Date().toISOString();
    expect(usage(s, m.id)).toHaveLength(1);
    s.works[0].deletedAt = null;
    expect(usage(s, m.id)).toHaveLength(2);
  });
  it("历史快照不随素材修改，更新不丢补充信息", () => {
    const { s, m, d } = fixture();
    const w = saveWork(s, d, "旧作者");
    w.note = "备注";
    w.publishUrl = "https://example.com/work";
    m.name = "新模型";
    s.parties[0].name = "新作者";
    expect(w.output).toBe("旧作者");
    d.workId = w.id;
    expect(saveWork(s, d, "新作者").note).toBe("备注");
  });
  it("无素材输出和失效引用不能建立作品", () => {
    const { s, d } = fixture();
    d.bindings.forEach((b) => (b.materialIds = []));
    expect(() => saveWork(s, d, "只有标题")).toThrow("至少");
    d.bindings[0].materialIds = ["missing"];
    expect(() => saveWork(s, d, "输出")).toThrow("已删除");
    expect(s.works).toHaveLength(0);
  });
  it("目录迁移根据相对路径定位，拒绝目录穿越", () => {
    const { s, m } = fixture();
    s.folders.push({
      id: "f",
      name: "模型",
      path: "E:\\Models",
      category: "模型",
      recursive: true,
      extensions: ["pmx"],
      sourcePresetId: "",
    });
    m.folderId = "f";
    m.relativePath = "角色\\模型.pmx";
    expect(materialPath(m, s)).toBe("E:\\Models\\角色\\模型.pmx");
    m.relativePath = "..\\outside.pmx";
    expect(() => parseState(s)).toThrow("目录内");
  });
});
describe("输出模板", () => {
  it("中文不输出模型名，音乐可显示标题，不同行作者不去重", () => {
    const { s, d } = fixture();
    d.bindings.find((b) => b.nodeId === "motion")!.materialIds = ["m"];
    d.bindings.find((b) => b.nodeId === "music")!.materialIds = ["m"];
    const text = render(s.templates[0].source, contextFor(s, d, "zh"));
    expect(text).toBe(
      "【借物表】\n【音乐】测试模型 — 作者甲\n【模型】作者甲\n【动作】作者甲\n",
    );
  });
  it("来源链有序，多个作者以斜杠隔开，日语只给适用项加敬称", () => {
    const { s, m, d } = fixture();
    s.parties.push(
      {
        id: "sw",
        name: "软件",
        links: [],
        note: "",
        suffixMode: "default",
        suffix: "",
      },
      {
        id: "p2",
        name: "作者乙",
        links: [],
        note: "",
        suffixMode: "none",
        suffix: "",
      },
    );
    m.groups.unshift({
      category: {
        id: "software",
        label: "制作软件",
        author: false,
        honorific: false,
      },
      partyIds: ["sw"],
    });
    m.groups[1].partyIds.push("p2");
    const text = render(s.templates[3].source, contextFor(s, d, "ja"));
    expect(text).toContain("モデル：软件 / 作者甲様 / 作者乙");
    expect(text).not.toContain("测试模型");
  });
  it("装饰、分隔符、空行与固定文字可配置", () => {
    const { s, d } = fixture();
    d.publicTexts = ["感谢"];
    const f = {
      ...defaultFormat("zh"),
      left: "── ",
      right: " ──",
      headerGap: 2,
      rowGap: 1,
      joiner: "、",
    };
    const text = render(sourceFromFormat(f), contextFor(s, d, "zh"));
    expect(text).toContain("── 借物表 ──\n\n\n【模型】作者甲\n感谢\n");
  });
  it("未知语法、越界空行、列表未join、非法作用域和嵌套循环报错", () => {
    for (const source of [
      "{{unknown}}",
      "{{blank 11}}",
      "{{#rows}}{{credits}}{{/rows}}",
      "{{#if title}}x{{/if}}",
      "{{#rows}}{{/texts}}",
      '{{header "x" style="missing"}}',
      "{{#rows}}{{#rows}}{{label}}{{/rows}}{{/rows}}",
      "{{unclosed",
    ])
      expect(() => compile(source)).toThrow();
  });
  it("链接不能变体，数据不作为模板再次执行", () => {
    const { s, d } = fixture();
    s.parties[0].name = "{{blank 9}}";
    expect(render(s.templates[0].source, contextFor(s, d, "zh"))).toContain(
      "{{blank 9}}",
    );
    expect(() =>
      compile('{{#rows}}{{sources | style:"bold" | join:" / "}}{{/rows}}'),
    ).toThrow("链接");
  });
  it("同一名字的后缀只追加一次", () => {
    const { s, d } = fixture();
    s.parties[0].name = "作者様";
    expect(render(s.templates[3].source, contextFor(s, d, "ja"))).not.toContain(
      "様様",
    );
  });
});
describe("Unicode字符样式", () => {
  it("20种可选样式均能转换且保留中文日文emoji", () => {
    expect(styles).toHaveLength(20);
    for (const [id] of styles) {
      const out = stylize("Ab9模型様🎵", id);
      expect(out.endsWith("模型様🎵")).toBe(true);
      if (id !== "plain") expect(out.startsWith("Ab")).toBe(false);
    }
  });
  it("处理字母符号区例外与大写样式", () => {
    expect(stylize("BEMego", "script")).toBe("ℬℰℳℯℊℴ");
    expect(stylize("h", "italic")).toBe("ℎ");
    expect(stylize("CHNPQRZ", "double-struck")).toBe("ℂℍℕℙℚℝℤ");
    expect(stylize("ab", "negative-squared-uppercase")).toBe("🅰🅱");
  });
});
describe("预设分享与恢复", () => {
  it("默认分享去掉固定素材和私人数据，可选公开素材也移除本地路径", () => {
    const { s, d } = fixture();
    s.workPresets.push({
      id: "wp",
      name: "组合",
      domainId: d.domainId,
      nodePresetId: d.nodePresetId,
      bindings: clone(d.bindings),
      templateId: d.templateId,
      publicTexts: [],
    });
    const b = share(s, "work", "wp");
    expect(
      b.data.workPresets![0].bindings.flatMap((x) => x.materialIds),
    ).toEqual([]);
    expect(b.data.materials).toBeUndefined();
    const publicBundle = share(s, "work", "wp", true);
    expect(publicBundle.data.materials![0].path).toBe("");
    expect(publicBundle.data.materials![0].note).toBe("");
    expect(publicBundle.data.parties![0].note).toBe("");
    expect(publicBundle.data).not.toHaveProperty("works");
    expect(publicBundle.data).not.toHaveProperty("folders");
  });
  it("重复导入创建新ID，所有引用重映射，原数据保留", () => {
    const { s, d } = fixture();
    s.workPresets.push({
      id: "wp",
      name: "组合",
      domainId: d.domainId,
      nodePresetId: d.nodePresetId,
      bindings: d.bindings,
      templateId: d.templateId,
      publicTexts: [],
    });
    const merged = mergeBundle(s, share(s, "work", "wp", true));
    expect(merged.materials).toHaveLength(2);
    expect(
      merged.workPresets[1].bindings.find((b) => b.materialIds.length)!
        .materialIds,
    ).toEqual([merged.materials[1].id]);
    expect(merged.materials[1].groups[0].partyIds).toEqual([
      merged.parties[1].id,
    ]);
    expect(merged.domains[0]).toEqual(s.domains[0]);
    expect(() => parseState(merged)).not.toThrow();
  });
  it("备份支持BOM，拒绝未知版本、重复ID、失效引用、错误模板", () => {
    const { s } = fixture();
    expect(readImport("\uFEFF" + JSON.stringify(s))).toEqual(s);
    const bad = clone(s);
    bad.materials.push(clone(bad.materials[0]));
    expect(() => readImport(JSON.stringify(bad))).toThrow("重复");
    expect(() => readImport('{"schemaVersion":9}')).toThrow();
    s.templates[0].source = "{{bad}}";
    expect(() => readImport(JSON.stringify(s))).toThrow("模板");
  });
});
