import { test, expect } from "@playwright/test";

test("新素材优先显示，选择窗口能查看详情并编辑，保持选择顺序", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["旧模型", "新模型"]) {
    await page
      .getByRole("button", { name: "＋ 添加素材", exact: true })
      .click();
    const editor = page.getByRole("dialog", { name: "添加素材", exact: true });
    await editor.getByLabel("素材名称", { exact: true }).fill(name);
    await editor.getByLabel("备注", { exact: true }).fill(`${name}的说明`);
    await editor.getByLabel("作者", { exact: true }).fill("作者甲");
    await editor.getByLabel("作者", { exact: true }).press("Enter");
    await editor.getByRole("button", { name: "保存素材", exact: true }).click();
  }
  await page.reload();
  await expect(page.locator("tbody tr").first()).toContainText("新模型");
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  await page
    .getByRole("region", { name: "模型节点", exact: true })
    .getByRole("button", { name: "＋ 选择素材", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "选择素材", exact: true });
  await expect(picker.locator(".picker-row").first()).toContainText("新模型");
  await picker.getByRole("checkbox", { name: "旧模型", exact: true }).check();
  await picker.getByRole("button", { name: "新模型", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "新模型", exact: true });
  await expect(detail).toContainText("新模型的说明");
  await detail.getByRole("button", { name: "编辑素材", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "编辑素材", exact: true });
  await editor.getByLabel("素材名称", { exact: true }).fill("新模型改名");
  await editor.getByRole("button", { name: "保存素材", exact: true }).click();
  await expect(
    picker.getByRole("checkbox", { name: "旧模型", exact: true }),
  ).toBeChecked();
  await expect(
    picker.getByRole("checkbox", { name: "新模型改名", exact: true }),
  ).not.toBeChecked();
  await picker
    .getByRole("checkbox", { name: "新模型改名", exact: true })
    .check();
  await picker.getByRole("button", { name: "选好了", exact: true }).click();
  const selected = page
    .getByRole("region", { name: "模型节点", exact: true })
    .locator(".selected-material");
  await expect(selected.nth(0)).toContainText("旧模型");
  await expect(selected.nth(1)).toContainText("新模型改名");
  await page
    .getByRole("region", { name: "模型节点", exact: true })
    .getByRole("button", { name: "＋ 选择素材", exact: true })
    .click();
  await picker
    .getByRole("button", { name: "＋ 创建来源", exact: true })
    .click();
  const temporary = page.getByRole("dialog", { name: "添加素材", exact: true });
  await temporary.getByLabel("素材名称", { exact: true }).fill("临时来源");
  await temporary.getByLabel("作者", { exact: true }).fill("临时作者");
  await temporary.getByLabel("作者", { exact: true }).press("Enter");
  await temporary
    .getByRole("button", { name: "保存素材", exact: true })
    .click();
  await expect(picker.locator(".picker-row").first()).toContainText("临时来源");
  await picker
    .getByRole("button", { name: "查看临时来源详情", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "临时来源", exact: true })
    .getByRole("button", { name: "编辑素材", exact: true })
    .click();
  await editor.getByLabel("素材名称", { exact: true }).fill("临时来源改名");
  await editor.getByRole("button", { name: "保存素材", exact: true }).click();
  await expect(
    picker.getByRole("checkbox", { name: "临时来源改名", exact: true }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kari-manager-v1")!).payload.materials
          .length,
    ),
  ).toBe(2);
  await picker
    .getByRole("button", { name: "查看新模型改名详情", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "新模型改名", exact: true })
    .getByRole("button", { name: "编辑素材", exact: true })
    .click();
  page.once("dialog", (confirmation) => confirmation.accept());
  await editor.getByRole("button", { name: "移除", exact: true }).click();
  await expect(picker).toContainText("已选择 2 份");
  await picker.getByRole("button", { name: "选好了", exact: true }).click();
  await expect(selected).toHaveCount(2);
  await expect(selected.nth(0)).toContainText("旧模型");
  await expect(selected.nth(1)).toContainText("临时来源改名");
});

test("素材编辑中新增和编辑来源预设，保留未保存内容和已有署名", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "添加素材", exact: true });
  await editor.getByLabel("素材名称", { exact: true }).fill("未保存模型");
  await editor.getByLabel("作者", { exact: true }).fill("作者甲");
  await editor.getByLabel("作者", { exact: true }).press("Enter");
  await editor
    .getByRole("button", { name: "编辑来源预设", exact: true })
    .click();
  const source = page.getByRole("dialog", { name: "来源预设", exact: true });
  await source.getByLabel("预设名称", { exact: true }).fill("调整后的来源");
  await source.getByLabel("分类名称", { exact: true }).last().fill("模型作者");
  await source.getByRole("button", { name: "保存预设", exact: true }).click();
  await expect(editor.getByLabel("素材名称", { exact: true })).toHaveValue(
    "未保存模型",
  );
  await expect(editor).toContainText("作者甲");
  await editor
    .getByRole("button", { name: "添加来源预设", exact: true })
    .click();
  await source.getByLabel("预设名称", { exact: true }).fill("新增的来源");
  await source.getByRole("button", { name: "保存预设", exact: true }).click();
  await expect(
    editor.getByLabel("来源预设").locator("option:checked"),
  ).toHaveText("新增的来源");
  await expect(editor).toContainText("作者甲");
  await editor.getByRole("button", { name: "保存素材", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  const saved = page.getByRole("dialog", { name: "编辑素材", exact: true });
  await expect(
    saved.getByLabel("来源预设").locator("option:checked"),
  ).toHaveText("新增的来源");
  await expect(saved).toContainText("模型作者");
  await expect(saved).toContainText("作者甲");
});
