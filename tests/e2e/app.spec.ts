import { test, expect } from "@playwright/test";
test("素材录入、输出、使用历史、预设与持久化", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "资料库" })).toBeVisible();
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("素材名称", { exact: true }).fill("星空模型");
  await dialog.getByLabel("作者", { exact: true }).fill("作者甲");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await expect(page.getByRole("cell", { name: "未使用" })).toBeVisible();
  await page.getByRole("button", { name: "制作借物表" }).click();
  const model = page.getByRole("region", { name: "模型节点" });
  await model.getByRole("button", { name: "＋ 选择素材" }).click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "选好了" })
    .click();
  await page.getByLabel("作品标题", { exact: true }).fill("第一部作品");
  await expect(page.locator(".paper-preview")).toContainText("【模型】作者甲");
  await expect(page.locator(".paper-preview")).not.toContainText("星空模型");
  await page.screenshot({ path: "test-results/composer.png", fullPage: true });
  await page.getByRole("button", { name: "输出并复制", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("作品记录");
  await page.getByRole("button", { name: "输出并复制", exact: true }).click();
  await page.getByRole("button", { name: /^资料库$/ }).click();
  await expect(
    page.getByRole("cell", { name: "1 次", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "星空模型", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("使用记录 · 1 次");
  await expect(page.getByRole("dialog")).toContainText("第一部作品");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "关闭", exact: true })
    .click();
  await page.getByRole("button", { name: "制作借物表" }).click();
  await page.getByRole("button", { name: "保存为作品预设" }).click();
  await page.getByRole("dialog").getByLabel("预设名称").fill("固定模型组合");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存预设", exact: true })
    .click();
  await page.getByLabel("输出模板").selectOption("template-ja");
  await expect(page.locator(".paper-preview")).toContainText("作者甲様");
  await page.getByRole("button", { name: "＋ 新作品" }).click();
  await page
    .getByLabel("作品预设", { exact: true })
    .selectOption({ label: "固定模型组合" });
  await page.getByLabel("作品标题", { exact: true }).fill("第二部作品");
  await page.getByRole("button", { name: "输出并复制", exact: true }).click();
  await page.getByRole("button", { name: /^资料库$/ }).click();
  await expect(
    page.getByRole("cell", { name: "2 次", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "2 次", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/library.png", fullPage: true });
  await page.getByRole("button", { name: "作品记录" }).click();
  await expect(
    page.getByRole("button", { name: "第一部作品", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "第二部作品", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/history.png", fullPage: true });
});

test("预设导出导入、来源链、多个链接和作品回收", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("素材名称", { exact: true }).fill("资料");
  await modal.getByLabel("来源分类预设").selectOption("source-model");
  await modal.getByLabel("制作软件", { exact: true }).fill("软件甲");
  await modal.getByLabel("制作软件", { exact: true }).press("Enter");
  for (const name of ["作者甲", "作者乙"]) {
    await modal.getByLabel("作者", { exact: true }).fill(name);
    await modal.getByLabel("作者", { exact: true }).press("Enter");
  }
  await modal
    .getByLabel("标签", { exact: true })
    .pressSequentially("角色,收藏");
  await modal
    .getByLabel("来源链接", { exact: true })
    .fill("https://example.com/1\nhttps://example.com/2");
  await modal.getByRole("button", { name: "保存素材" }).click();
  await expect(
    page.getByRole("cell", { name: "软件甲 / 作者甲 / 作者乙", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "常用来源", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加来源", exact: true }).click();
  await page.getByLabel("显示名", { exact: true }).fill("配布站");
  await page
    .getByLabel("链接", { exact: true })
    .pressSequentially("https://example.com");
  await page.getByLabel("链接", { exact: true }).press("Enter");
  await page
    .getByLabel("链接", { exact: true })
    .pressSequentially("https://example.org");
  await page.getByRole("button", { name: "保存来源" }).click();
  await page.getByRole("button", { name: "预设" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出" }).first().click();
  const downloaded = await downloadPromise;
  const file = await downloaded.path();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "导入 JSON" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(file!);
  await expect(page.getByRole("dialog")).toContainText("导入预设");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认导入" })
    .click();
  await expect(
    page.getByRole("heading", { name: "简洁来源（导入）" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "制作借物表" }).click();
  await page
    .getByRole("region", { name: "模型节点" })
    .getByRole("button", { name: "＋ 选择素材" })
    .click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "选好了" })
    .click();
  await page.getByLabel("作品标题", { exact: true }).fill("待回收");
  await page.getByRole("button", { name: "输出并复制" }).click();
  await page.getByRole("button", { name: "作品记录" }).click();
  await page.getByRole("button", { name: "待回收", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "删除记录" })
    .click();
  await page.getByRole("button", { name: /^资料库$/ }).click();
  await page.getByRole("button", { name: "素材", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "未使用", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "作品记录" }).click();
  await page.getByLabel("作品状态").selectOption("trash");
  await page.getByRole("button", { name: "待回收", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "恢复作品" })
    .click();
  await page.getByRole("button", { name: /^资料库$/ }).click();
  await expect(
    page.getByRole("cell", { name: "1 次", exact: true }),
  ).toBeVisible();
});
test("自定义领域和模板语法校验", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "预设" }).click();
  await page.getByRole("button", { name: "领域", exact: true }).click();
  await page.getByRole("button", { name: "＋ 新建", exact: true }).click();
  await page.getByRole("dialog").getByLabel("领域名称").fill("个人视频");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存领域" })
    .click();
  await expect(page.getByRole("heading", { name: "个人视频" })).toBeVisible();
  await page.getByRole("button", { name: "输出模板", exact: true }).click();
  await page.getByRole("button", { name: "编辑格式" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "模板语法", exact: true })
    .click();
  await page.getByLabel("模板语法", { exact: true }).fill("{{bad}}");
  await expect(
    page.getByRole("button", { name: "保存模板", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".template-sample")).toContainText("模板错误");
  await page
    .getByLabel("模板语法", { exact: true })
    .fill(
      '{{header "来源" left="──" right="──"}}\n{{#rows}}{{label}}：{{credits | join:" / "}}\n{{/rows}}',
    );
  await page.getByRole("button", { name: "保存模板", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
