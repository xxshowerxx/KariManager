import { test, expect } from "@playwright/test";

test("合并节点隐藏被合并栏，取消合并或移除主节点后恢复", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  const motion = page.getByRole("region", { name: "动作节点", exact: true });
  const camera = page.getByRole("region", { name: "镜头节点", exact: true });
  await motion.locator("summary").click();
  await motion.getByLabel("镜头", { exact: true }).check();
  await expect(camera).toHaveCount(0);
  await motion.getByLabel("镜头", { exact: true }).uncheck();
  await expect(camera).toBeVisible();
  await motion.getByLabel("镜头", { exact: true }).check();
  await page.getByRole("button", { name: "移除动作节点", exact: true }).click();
  await expect(camera).toBeVisible();
});

test("预设管理可新增未使用分类，删除后清除当前引用且重启不恢复", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "素材分类", exact: true }).click();
  await page.getByRole("button", { name: "＋ 新建", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("分类名称", { exact: true }).fill("配音");
  await dialog.getByRole("button", { name: "保存分类", exact: true }).click();
  await page.getByRole("button", { name: "资料库", exact: true }).click();
  await expect(
    page
      .getByLabel("分类筛选")
      .getByRole("option", { name: "配音", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  await dialog.getByLabel("素材名称", { exact: true }).fill("语音素材");
  await dialog.getByLabel("素材类别", { exact: true }).fill("配音");
  await dialog.getByLabel("作者", { exact: true }).fill("声优甲");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "素材分类", exact: true }).click();
  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "删除分类配音", exact: true }).click();
  page.once("dialog", (confirmation) => confirmation.accept());
  await page.getByRole("button", { name: "删除分类模型", exact: true }).click();
  await page.reload();
  await expect(
    page
      .getByLabel("分类筛选")
      .getByRole("option", { name: "配音", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByLabel("分类筛选")
      .getByRole("option", { name: "模型", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "语音素材", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(dialog.getByLabel("素材类别", { exact: true })).toHaveValue("");
  await expect(
    dialog
      .locator("datalist")
      .first()
      .getByRole("option", { name: "模型", exact: true }),
  ).toHaveCount(0);
  await expect(dialog).toContainText("声优甲");
});
