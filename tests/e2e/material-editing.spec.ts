import { test, expect } from "@playwright/test";

test("目录文件录入后可编辑关联资料，移除后恢复录入", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, {
      isTauri: true,
      __TAURI_INTERNALS__: {
        invoke: async (
          command: string,
          args: { payload: unknown; expectedRevision: number },
        ) => {
          const snapshot = JSON.parse(
            localStorage.getItem("kari-manager-v1") ??
              '{"payload":null,"revision":0}',
          );
          if (command === "load_state") return snapshot;
          if (command === "save_state") {
            if (args.expectedRevision !== snapshot.revision)
              throw new Error("修订号冲突");
            const revision = snapshot.revision + 1;
            localStorage.setItem(
              "kari-manager-v1",
              JSON.stringify({ payload: args.payload, revision }),
            );
            return revision;
          }
          if (command === "list_directory")
            return {
              entries: [
                {
                  path: "D:/models/test.blend",
                  relativePath: "test.blend",
                  name: "test.blend",
                  directory: false,
                  size: 1,
                },
              ],
              truncated: false,
            };
          if (command === "path_kind") return "file";
          throw new Error(`未模拟的命令：${command}`);
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "素材目录", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加目录", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("目录名称").fill("模型目录");
  await dialog.getByLabel("本地目录", { exact: true }).fill("D:/models");
  await dialog.getByRole("button", { name: "保存目录", exact: true }).click();
  await page.getByRole("button", { name: "浏览文件", exact: true }).click();
  const entry = page.locator(".directory-entry");
  await entry.getByRole("button", { name: "录入", exact: true }).click();
  await dialog.getByLabel("作者", { exact: true }).fill("作者甲");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await entry.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(dialog.getByLabel("素材名称", { exact: true })).toHaveValue(
    "test.blend",
  );
  await dialog.getByLabel("素材名称", { exact: true }).fill("更新模型");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await expect(entry).toContainText("已录入：更新模型");
  await entry.getByRole("button", { name: "编辑", exact: true }).click();
  page.once("dialog", (confirmation) => confirmation.accept());
  await dialog.getByRole("button", { name: "移除", exact: true }).click();
  await expect(
    entry.getByRole("button", { name: "录入", exact: true }),
  ).toBeEnabled();
  await expect(entry).not.toContainText("已录入");
});

test("扩展名输入可以删除逗号，添加和移除标签后保存", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "素材目录", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加目录", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("目录名称").fill("动作");
  await dialog.getByLabel("本地目录", { exact: true }).fill("D:/motions");
  const input = dialog.getByLabel("扩展名筛选", { exact: true });
  await input.fill("v,");
  await input.press("Backspace");
  await expect(input).toHaveValue("v");
  await input.fill(".VMD, vmd，.FBX");
  await dialog
    .getByRole("button", { name: "添加扩展名筛选", exact: true })
    .click();
  await expect(input).toHaveValue("");
  await dialog
    .getByRole("button", { name: "移除扩展名筛选fbx", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "移除排除扩展名txt", exact: true })
    .click();
  await dialog.getByLabel("排除扩展名", { exact: true }).fill(".BAK");
  await dialog.getByRole("button", { name: "保存目录", exact: true }).click();
  const folder = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kari-manager-v1")!).payload.folders[0],
  );
  expect(folder.extensions).toEqual(["vmd"]);
  expect(folder.excludedExtensions).toEqual(["md", "bak"]);
});

test("已保存素材可编辑，取消移除保留资料，确认后移除记录", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: "移除", exact: true }),
  ).toHaveCount(0);
  await dialog.getByLabel("素材名称", { exact: true }).fill("测试模型");
  await dialog.getByLabel("作者", { exact: true }).fill("作者甲");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await dialog.getByLabel("素材名称", { exact: true }).fill("更新模型");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "更新模型", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await dialog.getByRole("button", { name: "移除", exact: true }).click();
  await expect(dialog).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await dialog.getByRole("button", { name: "移除", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "更新模型", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kari-manager-v1")!).payload.materials,
    ),
  ).toEqual([]);
});
