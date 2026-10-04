import { beforeEach, expect, it, vi } from "vitest";
import { defaults } from "../src/core/defaults";
const backend = vi.hoisted(() => ({
  revision: 0,
  fail: false,
  payload: null as unknown,
}));
vi.mock("../src/platform", () => ({
  load: async () => ({ payload: backend.payload, revision: backend.revision }),
  persist: async (_: unknown, expected: number) => {
    if (backend.fail) throw new Error("磁盘写入失败");
    if (expected !== backend.revision) throw new Error("冲突");
    return ++backend.revision;
  },
}));
import { store } from "../src/store";
import { sourceFromFormat } from "../src/core/template";
import { materialCategories } from "../src/core/material-categories";
beforeEach(() => {
  backend.revision = 0;
  backend.fail = false;
  backend.payload = null;
});
it("旧资料首次加载迁移分类，空分类表重启不恢复默认，恢复旧备份重新收集分类", async () => {
  const saved = defaults();
  delete saved.materialCategories;
  backend.payload = saved;
  backend.revision = 4;
  await store.initialize();
  expect(store.get().materialCategories).toEqual(materialCategories(saved));
  expect(backend.revision).toBe(5);
  backend.payload = { ...saved, materialCategories: [] };
  await store.initialize();
  expect(store.get().materialCategories).toEqual([]);
  expect(backend.revision).toBe(5);
  await store.replace(saved);
  expect(store.get().materialCategories).toEqual(materialCategories(saved));
});
it("旧可视化模板更新条件链接语法，手写模板保持不变", async () => {
  const saved = defaults();
  saved.templates[0].format.showSources = true;
  saved.templates[0].source = "旧可视化来源语法";
  saved.templates[1].mode = "code";
  saved.templates[1].source = "个人手写模板";
  backend.payload = saved;
  await store.initialize();
  expect(store.get().templates[0].source).toBe(
    sourceFromFormat(saved.templates[0].format),
  );
  expect(store.get().templates[1].source).toBe("个人手写模板");
  expect(backend.revision).toBe(1);
});

it.each(["中文清晰", "个人中文模板"])(
  "读取旧资料时仅更新未改名的内置模板：%s",
  async (name) => {
    const saved = defaults();
    saved.templates[0].name = name;
    saved.templates.push({
      ...structuredClone(saved.templates[0]),
      id: "custom-chinese",
      name: "中文清晰",
    });
    backend.payload = saved;
    backend.revision = 7;
    await store.initialize();
    const expected = structuredClone(saved);
    if (name === "中文清晰") expected.templates[0].name = "中文";
    expect(store.get()).toEqual(expected);
    expect(saved.templates[0].name).toBe(name);
    expect(backend.revision).toBe(name === "中文清晰" ? 8 : 7);
  },
);

it("串行保存且失败不发布状态，失败后可继续保存", async () => {
  await store.initialize();
  await Promise.all([
    store.update((s) =>
      s.parties.push({
        id: "one",
        name: "甲",
        links: [],
        note: "",
        suffixMode: "default",
        suffix: "",
      }),
    ),
    store.update((s) =>
      s.parties.push({
        id: "two",
        name: "乙",
        links: [],
        note: "",
        suffixMode: "default",
        suffix: "",
      }),
    ),
  ]);
  expect(store.get().parties).toHaveLength(2);
  backend.fail = true;
  await expect(
    store.update((s) => (s.parties[0].name = "未保存")),
  ).rejects.toThrow("磁盘");
  expect(store.get().parties[0].name).toBe("甲");
  backend.fail = false;
  await store.update((s) => (s.parties[0].name = "已保存"));
  expect(store.get().parties[0].name).toBe("已保存");
});
