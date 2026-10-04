import { expect, it } from "vitest";
import { defaults, defaultFormat } from "../src/core/defaults";
import {
  newMaterial,
  draftFor,
  parseState,
  type Folder,
} from "../src/core/model";
import {
  filteredEntries,
  importConflict,
  sourceCandidates,
  extensionList,
  folderCategories,
} from "../src/core/files";
import { contextFor, render, sourceFromFormat } from "../src/core/template";
import { share, mergeBundle } from "../src/core/sharing";
import type { Entry } from "../src/platform";
const folder: Folder = {
  id: "f",
  name: "动作",
  path: "D:/motion",
  category: "动作",
  recursive: true,
  extensions: [".VMD"],
  sourcePresetId: "source-motion",
};
function entries(): Entry[] {
  return [
    ["包", true],
    ["包/nested", true],
    ["包/nested/test.vmd", false],
    ["包/readme.txt", false],
    ["无素材", true],
    ["无素材/readme.md", false],
    ["root.vmd", false],
  ].map(([relative, directory]) => ({
    path: `D:/motion/${relative}`,
    relativePath: String(relative),
    name: String(relative).split("/").at(-1)!,
    directory: Boolean(directory),
    size: 0,
  }));
}
it("扩展名兼容点号和大小写，树保留匹配祖先、排除说明文件和空分支", () => {
  expect(extensionList(" .VMD, vmd, .pmx，PMD")).toEqual(["vmd", "pmx", "pmd"]);
  expect(
    filteredEntries(entries(), folder, false, false, "").map(
      (e) => e.relativePath,
    ),
  ).toEqual(["包", "包/nested", "root.vmd", "包/nested/test.vmd"]);
  expect(filteredEntries(entries(), folder, true, false, "")).toHaveLength(7);
  expect(
    filteredEntries(
      entries(),
      { ...folder, hiddenPaths: ["包"] },
      false,
      false,
      "",
    ),
  ).toHaveLength(1);
  expect(
    filteredEntries(
      entries(),
      { ...folder, hiddenPaths: ["包"] },
      false,
      true,
      "",
    ),
  ).toHaveLength(4);
  expect(folderCategories(folder)).toEqual(["动作"]);
  expect(folderCategories({ ...folder, categories: ["动作", "镜头"] })).toEqual(
    ["动作", "镜头"],
  );
});
it("文件夹录入阻止内部重复，兄弟文件与同名目录不受影响，重定位仍识别", () => {
  const s = defaults();
  s.folders.push(folder);
  const m = newMaterial(s.sourcePresets[0]);
  Object.assign(m, {
    name: "包",
    pathKind: "directory",
    folderId: "f",
    relativePath: "包",
  });
  s.materials.push(m);
  expect(importConflict("d:\\motion\\包\\nested\\test.vmd", false, s)).toBe(m);
  expect(importConflict("D:/motion/包二/test.vmd", false, s)).toBeUndefined();
  expect(importConflict("D:/motion/包", true, s, m.id)).toBeUndefined();
  expect(importConflict("D:/motion", true, s)).toBe(m);
  s.folders[0].path = "E:/new";
  expect(importConflict("E:/new/包/test.vmd", false, s)).toBe(m);
});
it("来源候选按最终保存的分类引用，未引用条目和其他分类不混入", () => {
  const s = defaults();
  s.parties.push(
    ...["软件", "作者", "已移除"].map((name, i) => ({
      id: String(i),
      name,
      links: [],
      note: "",
      suffixMode: "default" as const,
      suffix: "",
    })),
  );
  const m = newMaterial(
    s.sourcePresets.find((p) => p.id === "source-general")!,
  );
  m.groups.find((g) => g.category.id === "software")!.partyIds = ["0"];
  m.groups.find((g) => g.category.author)!.partyIds = ["1"];
  s.materials.push(m);
  expect(
    sourceCandidates(s, { id: "software", label: "制作软件" }).map(
      (p) => p.name,
    ),
  ).toEqual(["软件"]);
  expect(
    sourceCandidates(s, { id: "author", label: "作者" }).map((p) => p.name),
  ).toEqual(["作者"]);
});
it("链接为空不增加空行，指定空行数仍有效", () => {
  const s = defaults();
  const f = { ...defaultFormat("en"), showSources: true };
  const context = {
    rows: ["Model", "Motion", "Music"].map((label, i) => ({
      label,
      title: "",
      credits: [
        { name: "作者", allowSuffix: true, suffixMode: "default", suffix: "" },
      ],
      sources: i === 0 ? ["https://example.com"] : [],
      note: "",
    })),
    texts: [],
    work: { title: "", date: "" },
    domain: { name: "MMD" },
  };
  const output = render(sourceFromFormat(f), context);
  expect(output).toBe(
    "Credits\nModel：作者\nhttps://example.com\nMotion：作者\nMusic：作者\n",
  );
  expect(render(sourceFromFormat({ ...f, rowGap: 1 }), context)).toContain(
    "Motion：作者\n\nMusic：作者",
  );
  expect(s.schemaVersion).toBe(1);
});
it("仅合并节点去重署名，分隔符可设，最终预设导入保留合并关系", () => {
  const s = defaults(),
    d = draftFor(s);
  s.parties.push({
    id: "p",
    name: "作者甲",
    links: [],
    note: "",
    suffixMode: "default",
    suffix: "",
  });
  const m = newMaterial(s.sourcePresets[0]);
  m.name = "动作素材";
  m.groups[0].partyIds = ["p"];
  s.materials.push(m);
  d.bindings.find((b) => b.nodeId === "motion")!.materialIds = [m.id];
  d.bindings.find((b) => b.nodeId === "camera")!.materialIds = [m.id];
  expect(contextFor(s, d, "zh").rows).toHaveLength(2);
  d.bindings.find((b) => b.nodeId === "motion")!.mergedNodeIds = ["camera"];
  const rows = contextFor(s, d, "zh").rows;
  expect(rows[0].label).toBe("动作・镜头");
  expect(rows[0].credits).toHaveLength(1);
  expect(
    render(
      sourceFromFormat({ ...defaultFormat("zh"), nodeJoiner: " + " }),
      contextFor(s, d, "zh"),
    ),
  ).toContain("【动作 + 镜头】作者甲");
  s.workPresets.push({
    id: "preset",
    name: "组合",
    domainId: d.domainId,
    nodePresetId: d.nodePresetId,
    bindings: d.bindings,
    templateId: d.templateId,
    publicTexts: [],
  });
  const merged = mergeBundle(s, share(s, "work", "preset", true));
  expect(
    parseState(merged)
      .workPresets.at(-1)!
      .bindings.find((b) => b.mergedNodeIds?.length)!.mergedNodeIds,
  ).toHaveLength(1);
  d.bindings.find((b) => b.nodeId === "camera")!.mergedNodeIds = ["motion"];
  expect(() => parseState(s)).toThrow("合并节点");
});
