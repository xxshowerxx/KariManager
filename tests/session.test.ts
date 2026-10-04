import { describe, expect, it } from "vitest";
import { defaultFormat, defaults } from "../src/core/defaults";
import {
  clone,
  draftFor,
  newMaterial,
  parseState,
  saveWork,
  snapshotsFor,
  withSnapshots,
  type Party,
} from "../src/core/model";
import { SessionMaterials } from "../src/core/session";
import { contextFor, render, sourceFromFormat } from "../src/core/template";
import { mergeBundle, share } from "../src/core/sharing";

function setup() {
  const state = defaults(),
    session = new SessionMaterials();
  const material = newMaterial(state.sourcePresets[0]);
  material.name = "临时歌曲";
  material.path = "D:/素材/歌曲.wav";
  material.sources = ["https://example.com/song"];
  material.note = "素材备注";
  const party: Party = {
    id: "temporary-author",
    name: "临时作者",
    links: ["https://example.com/author"],
    note: "作者备注",
    suffixMode: "default",
    suffix: "",
  };
  material.groups[0].partyIds = [party.id];
  session.save(state, material, [party]);
  const draft = draftFor(state);
  draft.bindings.find((b) => b.nodeId === "music")!.materialIds = [material.id];
  Object.assign(
    draft,
    snapshotsFor(withSnapshots(state, session.get()), draft.bindings),
  );
  return { state, session, material, party, draft };
}

describe("临时来源与作品素材快照", () => {
  it("临时条目复用和编辑不写入资料库，重启仅保留作品引用的信息", () => {
    const { state, session, material, party, draft } = setup();
    const second = clone(material);
    second.id = "another";
    second.name = "未引用歌曲";
    session.save(state, second, [party]);
    expect(state.materials).toEqual([]);
    expect(state.parties).toEqual([]);
    expect(session.get().materialSnapshots).toHaveLength(2);
    const work = saveWork(state, draft, "歌曲借物表");
    expect(work.materialSnapshots).toHaveLength(1);
    const loaded = parseState(JSON.parse(JSON.stringify(state)));
    session.clear();
    expect(session.get().materialSnapshots).toEqual([]);
    expect(loaded.materials).toEqual([]);
    expect(loaded.parties).toEqual([]);
    expect(loaded.works[0].materialSnapshots![0]).toMatchObject({
      name: material.name,
      sources: material.sources,
      path: material.path,
      note: material.note,
    });
    expect(loaded.works[0].partySnapshots![0]).toEqual(party);
    const resumed = { ...draft, ...loaded.works[0], workId: work.id };
    const output = render(
      sourceFromFormat(defaultFormat("zh")),
      contextFor(withSnapshots(loaded, resumed), resumed, "zh"),
    );
    expect(output).toContain("临时歌曲 — 临时作者");
    saveWork(loaded, resumed, output);
    expect(loaded.works).toHaveLength(1);
    expect(() => parseState(loaded)).not.toThrow();
  });
  it("永久素材变更后仍保留输出时的名称、路径和作者资料", () => {
    const { state, material, party, draft } = setup();
    state.materials.push(clone(material));
    state.parties.push(clone(party));
    saveWork(state, draft, "原文");
    state.materials[0].name = "修改名称";
    state.parties[0].name = "修改作者";
    expect(state.works[0].materialSnapshots![0].name).toBe("临时歌曲");
    expect(state.works[0].partySnapshots![0].name).toBe("临时作者");
  });
  it("最终预设保留临时素材；公开导出清除路径和私人备注，导入可正确引用", () => {
    const { state, draft } = setup();
    state.workPresets.push({
      id: "temporary-preset",
      name: "歌曲预设",
      domainId: draft.domainId,
      nodePresetId: draft.nodePresetId,
      templateId: draft.templateId,
      bindings: draft.bindings,
      publicTexts: [],
      ...snapshotsFor(withSnapshots(state, draft), draft.bindings),
    });
    expect(() => parseState(state)).not.toThrow();
    const empty = share(state, "work", "temporary-preset");
    expect(JSON.stringify(empty)).not.toContain("素材备注");
    expect(empty.data.workPresets![0].materialSnapshots).toBeUndefined();
    const bundle = share(state, "work", "temporary-preset", true);
    expect(bundle.data.materials![0]).toMatchObject({
      path: "",
      note: "",
      folderId: "",
      relativePath: "",
    });
    expect(bundle.data.parties![0].note).toBe("");
    const imported = mergeBundle(defaults(), bundle);
    expect(
      imported.workPresets[0].bindings.find(
        (b) =>
          b.nodeId ===
          imported.domains.at(-1)!.nodes.find((n) => n.label === "音乐")!.id,
      )!.materialIds,
    ).toEqual([imported.materials[0].id]);
    expect(() => parseState(imported)).not.toThrow();
  });
  it("拒绝缺失作者的快照，保存失败不改变临时条目", () => {
    const { state, session, material } = setup();
    const original = session.get();
    material.groups[0].partyIds = ["missing"];
    expect(() => session.save(state, material, [])).toThrow("作者");
    expect(session.get()).toBe(original);
  });
});

it("标签后换行与行间、节点间空行分别生效，链接不会多加空行", () => {
  const { state, draft } = setup();
  const view = withSnapshots(state, draft),
    music = draft.bindings.find((b) => b.nodeId === "music")!;
  const second = clone(view.materials[0]);
  second.id = "second";
  second.name = "第二首歌";
  second.sources = [];
  view.materials.push(second);
  music.materialIds.push(second.id);
  draft.bindings.find((b) => b.nodeId === "model")!.materialIds = [second.id];
  // Put both music rows before the model row to distinguish the two gap controls.
  draft.bindings = [music, draft.bindings.find((b) => b.nodeId === "model")!];
  const format = {
    ...defaultFormat("zh"),
    labelNewline: true,
    rowGap: 0,
    nodeGap: 2,
    showSources: true,
  };
  const source = sourceFromFormat(format),
    ctx = contextFor(view, draft, "zh");
  expect(render(source, ctx)).toBe(
    "【借物表】\n【音乐】\n临时歌曲 — 临时作者\nhttps://example.com/song\n【音乐】\n第二首歌 — 临时作者\n\n\n【模型】\n临时作者\n",
  );
  expect(() => render("{{#rows nodeGap=11}}{{label}}{{/rows}}", ctx)).toThrow(
    "空行",
  );
  expect(render("{{#rows gap=1}}{{label}}\n{{/rows}}", ctx)).toContain(
    "音乐\n\n音乐",
  );
});
