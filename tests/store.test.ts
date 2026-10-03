import { expect, it, vi } from "vitest";
const backend = vi.hoisted(() => ({ revision: 0, fail: false }));
vi.mock("../src/platform", () => ({
  load: async () => ({ payload: null, revision: 0 }),
  persist: async (_: unknown, expected: number) => {
    if (backend.fail) throw new Error("磁盘写入失败");
    if (expected !== backend.revision) throw new Error("冲突");
    return ++backend.revision;
  },
}));
import { store } from "../src/store";
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
