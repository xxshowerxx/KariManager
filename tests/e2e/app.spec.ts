import { test, expect } from "@playwright/test";
test("分栏组合、多人账号、BV参考、本次说明与模板格式可保存恢复", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  await expect(page.locator(".output-sections .node-card")).toHaveCount(1);
  await page.getByLabel("添加分栏", { exact: true }).selectOption("creators");
  const creators = page.getByRole("region", {
    name: "制作人员分栏",
    exact: true,
  });
  for (const [role, name, account] of [
    ["主讲人", "讲者甲", "host"],
    ["助教", "助教乙", "helper"],
  ]) {
    await creators
      .getByRole("button", { name: "＋ 添加人员", exact: true })
      .click();
    const entry = creators.locator(".section-entry").last();
    await entry.getByLabel("分工", { exact: true }).fill(role);
    await entry.getByLabel("姓名", { exact: true }).fill(name);
    await entry.getByLabel("账号", { exact: true }).fill(account);
  }
  await creators
    .locator(".section-line")
    .first()
    .getByRole("button", { name: "上移", exact: true })
    .click();
  await page.getByLabel("添加分栏", { exact: true }).selectOption("fixedText");
  await page
    .getByRole("region", { name: "固定说明分栏", exact: true })
    .getByLabel("固定说明", { exact: true })
    .fill("固定文字");
  await page
    .getByLabel("添加分栏", { exact: true })
    .selectOption("currentText");
  await page
    .getByRole("region", { name: "本次说明分栏", exact: true })
    .getByLabel("本次说明", { exact: true })
    .fill("仅本次文字");
  await page.getByLabel("添加分栏", { exact: true }).selectOption("references");
  const references = page.getByRole("region", {
    name: "参考来源分栏",
    exact: true,
  });
  await references
    .getByRole("button", { name: "＋ 添加参考", exact: true })
    .click();
  await references.getByLabel("参考标题", { exact: true }).fill("参考视频");
  await references.getByLabel("参考来源", { exact: true }).fill("BV1KG411o7Cs");
  await references
    .getByLabel("参考作者", { exact: true })
    .fill("参考作者@account");
  await expect(page.locator(".paper-preview")).toContainText(
    "主讲人：讲者甲@host",
  );
  await page.getByLabel("作品标题", { exact: true }).fill("分栏作品");
  await page.getByRole("button", { name: "输出并复制", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("借物表已输出");
  await page.getByRole("button", { name: "保存分栏预设", exact: true }).click();
  const preset = page.getByRole("dialog", { name: "分栏预设", exact: true });
  await preset.getByLabel("预设名称", { exact: true }).fill("教程分栏");
  await preset.getByRole("button", { name: "保存预设", exact: true }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kari-manager-v1")!).payload,
  );
  expect(saved.works[0].sections.map((s: { kind: string }) => s.kind)).toEqual([
    "creators",
    "credits",
    "fixedText",
    "currentText",
    "references",
  ]);
  expect(
    saved.sectionPresets[1].sections.find(
      (s: { kind: string }) => s.kind === "currentText",
    ).text,
  ).toBe("");
  await page.reload();
  await page.getByRole("button", { name: "作品记录", exact: true }).click();
  await page.getByRole("button", { name: "分栏作品", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "继续制作", exact: true })
    .click();
  await expect(page.locator(".paper-preview")).toContainText("仅本次文字");
  await expect(references.getByLabel("参考来源", { exact: true })).toHaveValue(
    "BV1KG411o7Cs",
  );
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "输出模板", exact: true }).click();
  await page
    .getByRole("button", { name: "编辑格式", exact: true })
    .first()
    .click();
  const template = page.getByRole("dialog", { name: "输出模板", exact: true });
  await template.getByRole("button", { name: "分栏格式", exact: true }).click();
  await template
    .getByLabel("格式部分", { exact: true })
    .selectOption("creatorSource");
  await template
    .getByLabel("制作人员格式", { exact: true })
    .fill("{{#rows}}{{name}}@{{handle}} / {{role}}\n{{/rows}}");
  await template.getByRole("button", { name: "保存模板", exact: true }).click();
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  await expect(page.locator(".paper-preview")).toContainText(
    "讲者甲@host / 主讲人",
  );
  await page
    .getByLabel("分栏预设", { exact: true })
    .selectOption(saved.sectionPresets[1].id);
  await expect(
    page
      .getByRole("region", { name: "本次说明分栏", exact: true })
      .getByLabel("本次说明", { exact: true }),
  ).toHaveValue("");
  await expect(page.locator(".paper-preview")).not.toContainText("仅本次文字");
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "分栏预设", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .locator(".card")
    .filter({
      has: page.getByRole("heading", { name: "教程分栏", exact: true }),
    })
    .getByRole("button", { name: "导出", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("教程分栏-预设.json");
});
test("选择素材时创建临时与永久来源，记录和最终预设在重启后保留临时信息", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page
      .locator("nav button")
      .evaluateAll((buttons) =>
        buttons.map((b) => b.getAttribute("aria-label")),
      ),
  ).toEqual([
    "制作借物表",
    "预设",
    "资料库",
    "素材目录",
    "作品记录",
    "数据与设置",
  ]);
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  for (const [node, name, author, mode] of [
    ["音乐", "临时歌曲", "临时作者", "temporary"],
    ["模型", "永久模型", "永久作者", "permanent"],
  ]) {
    await page
      .getByRole("region", { name: `${node}节点`, exact: true })
      .getByRole("button", { name: "＋ 选择素材", exact: true })
      .click();
    const picker = page.getByRole("dialog", { name: "选择素材", exact: true });
    await picker
      .getByRole("button", { name: "＋ 创建来源", exact: true })
      .click();
    const editor = page.getByRole("dialog", { name: "添加素材", exact: true });
    await editor.getByLabel("保存方式", { exact: true }).selectOption(mode);
    await editor.getByLabel("素材名称", { exact: true }).fill(name);
    await editor
      .getByLabel("来源链接", { exact: true })
      .fill(`https://example.com/${mode}`);
    await editor.getByLabel("作者", { exact: true }).fill(author);
    await editor.getByLabel("作者", { exact: true }).press("Enter");
    await editor.getByLabel("备注", { exact: true }).fill(`${name}备注`);
    await editor.getByRole("button", { name: "保存素材", exact: true }).click();
    await expect(
      picker
        .locator(".picker-row")
        .filter({ hasText: name })
        .getByRole("checkbox"),
    ).toBeChecked();
    await picker.getByRole("button", { name: "选好了", exact: true }).click();
  }
  await page.getByLabel("作品标题", { exact: true }).fill("会话验证");
  await page.getByRole("button", { name: "输出并复制", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("借物表已输出");
  await page
    .getByRole("button", { name: "保存为最终预设", exact: true })
    .click();
  await page.getByLabel("预设名称", { exact: true }).fill("会话预设");
  await page.getByRole("button", { name: "保存预设", exact: true }).click();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kari-manager-v1")!).payload,
  );
  expect(saved.materials.map((m: { name: string }) => m.name)).toEqual([
    "永久模型",
  ]);
  expect(saved.parties.map((p: { name: string }) => p.name)).toEqual([
    "永久作者",
  ]);
  expect(saved.works[0].materialSnapshots).toHaveLength(2);
  expect(saved.workPresets[0].materialSnapshots).toHaveLength(2);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "临时歌曲", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  const music = page.getByRole("region", { name: "音乐节点", exact: true });
  await music.getByRole("button", { name: "＋ 选择素材", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "选择素材", exact: true });
  await expect(picker.getByText("临时歌曲", { exact: true })).toHaveCount(0);
  await picker.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "作品记录", exact: true }).click();
  await page.getByRole("button", { name: "会话验证", exact: true }).click();
  const record = page.getByRole("dialog", { name: "会话验证", exact: true });
  await record.getByText("引用素材", { exact: true }).click();
  await expect(record).toContainText("临时歌曲备注");
  await expect(record).toContainText("https://example.com/temporary");
  await record.getByRole("button", { name: "继续制作", exact: true }).click();
  await expect(page.locator(".paper-preview")).toContainText(
    "临时歌曲 — 临时作者",
  );
  await music
    .getByRole("button", { name: "编辑临时歌曲", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "编辑素材", exact: true });
  await editor.getByLabel("素材名称", { exact: true }).fill("临时歌曲修订");
  await editor.getByRole("button", { name: "保存素材", exact: true }).click();
  await page.getByRole("button", { name: "输出并复制", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("作品记录已更新");
  const updated = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kari-manager-v1")!).payload,
  );
  expect(updated.works).toHaveLength(1);
  expect(
    updated.works[0].materialSnapshots.map((m: { name: string }) => m.name),
  ).toContain("临时歌曲修订");
  expect(updated.materials).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  await page
    .getByLabel("最终预设", { exact: true })
    .selectOption(updated.workPresets[0].id);
  await expect(page.locator(".paper-preview")).toContainText(
    "临时歌曲 — 临时作者",
  );
});

test("模板标签换行和节点间空行实时预览并保存", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "输出模板", exact: true }).click();
  await page
    .getByRole("button", { name: "编辑格式", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "输出模板", exact: true });
  await dialog.getByLabel("标签后换行", { exact: true }).check();
  await dialog.getByLabel("节点间空行", { exact: true }).fill("1");
  await dialog.getByLabel("显示来源链接", { exact: true }).check();
  await expect(dialog.locator(".template-sample pre")).toHaveText(
    "【借物表】\n【模型】\n作者甲 / 作者乙\nhttps://example.com/model\n\n【动作】\n作者甲\n\n【音乐】\n歌曲标题 — 作者丙\n",
    { useInnerText: false },
  );
  await dialog.getByRole("button", { name: "保存模板", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "输出模板", exact: true }).click();
  await page
    .getByRole("button", { name: "编辑格式", exact: true })
    .first()
    .click();
  await expect(dialog.getByLabel("标签后换行", { exact: true })).toBeChecked();
  await expect(dialog.getByLabel("节点间空行", { exact: true })).toHaveValue(
    "1",
  );
});
test("候选只保存最终引用并按分类隔离，日语敬称列可开关", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("素材名称", { exact: true }).fill("候选测试");
  await dialog.getByLabel("来源预设").selectOption("source-general");
  await dialog.getByLabel("制作软件", { exact: true }).fill("测试软件");
  await dialog.getByLabel("制作软件", { exact: true }).press("Enter");
  await dialog.getByLabel("作者", { exact: true }).fill("错填作者");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog
    .getByRole("button", { name: "移除错填作者", exact: true })
    .click();
  await dialog.getByLabel("作者", { exact: true }).fill("正确作者");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  const names = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kari-manager-v1")!).payload.parties.map(
      (p: { name: string }) => p.name,
    ),
  );
  expect(names.sort()).toEqual(["正确作者", "测试软件"]);
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  await dialog.getByLabel("来源预设").selectOption("source-general");
  const authorList = await dialog
    .getByLabel("作者", { exact: true })
    .getAttribute("list");
  const softwareList = await dialog
    .getByLabel("制作软件", { exact: true })
    .getAttribute("list");
  await expect(
    dialog.locator(`datalist[id="${authorList}"] option`),
  ).toHaveAttribute("value", "正确作者");
  await expect(
    dialog.locator(`datalist[id="${softwareList}"] option`),
  ).toHaveAttribute("value", "测试软件");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).first().click();
  await expect(dialog.getByLabel("日语敬称", { exact: true })).toHaveCount(0);
  await dialog.getByLabel("显示日语敬称", { exact: true }).check();
  await expect(dialog.getByLabel("日语敬称", { exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: "保存预设", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "编辑", exact: true }).first().click();
  await expect(
    dialog.getByLabel("显示日语敬称", { exact: true }),
  ).toBeChecked();
});

test("目录保存多个类别，合并节点只在本作品生效并保存最终预设", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "素材目录", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加目录", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("目录名称", { exact: true }).fill("动作镜头");
  await dialog.getByLabel("本地目录", { exact: true }).fill("D:/素材");
  for (const name of ["动作", "镜头"]) {
    await dialog.getByLabel("素材类别", { exact: true }).fill(name);
    await dialog.getByLabel("素材类别", { exact: true }).press("Enter");
  }
  await dialog.getByLabel("扩展名筛选", { exact: true }).fill(".vmd");
  await dialog.getByRole("button", { name: "保存目录", exact: true }).click();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kari-manager-v1")!).payload.folders[0],
  );
  expect(saved.categories).toEqual(["动作", "镜头"]);
  expect(saved.extensions).toEqual(["vmd"]);
  await page.getByRole("button", { name: "制作借物表", exact: true }).click();
  const motion = page.getByRole("region", { name: "动作节点", exact: true });
  await motion.locator("summary").click();
  await motion.getByLabel("镜头", { exact: true }).check();
  await page
    .getByRole("button", { name: "保存为最终预设", exact: true })
    .click();
  await dialog.getByLabel("预设名称", { exact: true }).fill("合并动作镜头");
  await dialog.getByRole("button", { name: "保存预设", exact: true }).click();
  const bindings = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("kari-manager-v1")!).payload
        .workPresets[0].bindings,
  );
  expect(
    bindings.find((b: { nodeId: string }) => b.nodeId === "motion")
      .mergedNodeIds,
  ).toEqual(["camera"]);
  await page.getByRole("button", { name: "＋ 新作品", exact: true }).click();
  await motion.locator("summary").click();
  await expect(motion.getByLabel("镜头", { exact: true })).not.toBeChecked();
});
test("素材和目录共用类别建议，空白默认、输入过滤和新类别保存", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const category = dialog.getByLabel("素材类别", { exact: true });
  await expect(category).toHaveValue("");
  await expect(
    dialog.getByText("未创建的类别自动创建", { exact: true }),
  ).toBeVisible();
  await expect(dialog.locator("datalist option[value='动作']")).toHaveCount(1);
  await expect(dialog.locator("datalist option[value='模型']")).toHaveCount(1);
  await category.fill("动");
  await expect(dialog.locator("datalist option[value='动作']")).toHaveCount(1);
  await expect(dialog.locator("datalist option[value='模型']")).toHaveCount(0);
  await category.fill(" 自制素材 ");
  await dialog.getByLabel("素材名称", { exact: true }).fill("类别测试素材");
  await dialog.getByLabel("作者", { exact: true }).fill("测试作者");
  await dialog.getByLabel("作者", { exact: true }).press("Enter");
  await dialog.getByRole("button", { name: "保存素材", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "类别测试素材 自制素材", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "素材目录", exact: true }).click();
  await page.getByRole("button", { name: "＋ 添加目录", exact: true }).click();
  await expect(category).toHaveValue("");
  await expect(dialog.locator("datalist option[value='自制素材']")).toHaveCount(
    1,
  );
  await dialog.getByLabel("目录名称", { exact: true }).fill("练习目录");
  await dialog.getByLabel("本地目录").fill("D:/素材/练习");
  await category.fill(" 练习动作 ");
  await dialog.getByRole("button", { name: "保存目录", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^资料库$/ }).click();
  await page.getByRole("button", { name: "＋ 添加素材", exact: true }).click();
  await expect(category).toHaveValue("");
  await expect(dialog.locator("datalist option[value='自制素材']")).toHaveCount(
    1,
  );
  await expect(dialog.locator("datalist option[value='练习动作']")).toHaveCount(
    1,
  );
});

test("模板语言切换、默认敬称与保存后重载", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "输出模板", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "中文", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑格式" }).first().click();
  const dialog = page.getByRole("dialog");
  const language = dialog.getByLabel("标签语言", { exact: true });
  const suffix = dialog.getByLabel("日语敬称后缀", { exact: true });
  const style = dialog.getByLabel("字符样式", { exact: true });
  await expect(suffix).toHaveCount(0);
  await expect(style).toHaveCount(0);
  await dialog.getByRole("button", { name: "模板语法", exact: true }).click();
  const source = dialog.getByLabel("模板语法", { exact: true });
  const handwritten = await source.inputValue();
  await language.selectOption("ja");
  await expect(source).toHaveValue(handwritten);
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "可视化设置", exact: true }).click();
  await expect(suffix).toHaveValue("様");
  await language.selectOption("en");
  await expect(suffix).toHaveCount(0);
  await style.selectOption("bold");
  await expect(dialog.locator(".template-sample")).toContainText("𝐌𝐨𝐝𝐞𝐥");
  await language.selectOption("ja");
  await expect(style).toHaveCount(0);
  await expect(suffix).toHaveValue("様");
  await expect(dialog.locator(".template-sample")).toContainText("作者甲様");
  await dialog.getByRole("button", { name: "保存模板", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "预设", exact: true }).click();
  await page.getByRole("button", { name: "输出模板", exact: true }).click();
  await page.getByRole("button", { name: "编辑格式" }).first().click();
  await expect(language).toHaveValue("ja");
  await expect(suffix).toHaveValue("様");
  await language.selectOption("zh");
  await expect(suffix).toHaveCount(0);
  await expect(style).toHaveCount(0);
  await expect(dialog.locator(".template-sample")).not.toContainText("様");
  await dialog.getByRole("button", { name: "保存模板", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kari-manager-v1")!).payload.templates.find(
      (t: { id: string }) => t.id === "template-zh",
    ),
  );
  expect(saved.format.style).toBe("plain");
  expect(saved.format.suffix).toBe("");
});

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
  await page.getByRole("button", { name: "保存为最终预设" }).click();
  await page.getByRole("dialog").getByLabel("预设名称").fill("固定模型组合");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存预设", exact: true })
    .click();
  await page.getByLabel("输出模板").selectOption("template-ja");
  await expect(page.locator(".paper-preview")).toContainText("作者甲様");
  await page.getByRole("button", { name: "＋ 新作品" }).click();
  await page
    .getByLabel("最终预设", { exact: true })
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
  await modal.getByLabel("来源预设").selectOption("source-model");
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
  await page.getByRole("button", { name: "领域预设", exact: true }).click();
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
