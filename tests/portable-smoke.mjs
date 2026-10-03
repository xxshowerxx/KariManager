import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9225");
try {
  const page = browser.contexts()[0].pages()[0];
  await page.waitForSelector(".app-shell");
  assert.equal(new URL(page.url()).hostname, "tauri.localhost");
  const location = await page.evaluate(() =>
    window.__TAURI_INTERNALS__.invoke("data_location"),
  );
  assert.match(location, /\.tooling[\\/]portable-smoke[\\/]data$/);
  if (process.argv[2] === "create") {
    await page
      .getByRole("button", { name: "＋ 添加素材", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("素材名称", { exact: true }).fill("便携包测试模型");
    await dialog.getByLabel("作者", { exact: true }).fill("测试作者");
    await dialog.getByLabel("作者", { exact: true }).press("Enter");
    await dialog.getByRole("button", { name: "保存素材" }).click();
    await page.getByRole("button", { name: "制作借物表", exact: true }).click();
    await page
      .getByRole("region", { name: "模型节点" })
      .getByRole("button", { name: "＋ 选择素材" })
      .click();
    await page.getByRole("dialog").getByRole("checkbox").check();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "选好了" })
      .click();
    await page.getByLabel("作品标题", { exact: true }).fill("便携版验证");
    await page.getByRole("button", { name: "输出并复制" }).click();
    await expect(page.getByRole("status")).toContainText("作品记录");
  } else {
    await expect(
      page.getByRole("cell", { name: "1 次", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "便携包测试模型", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText("便携版验证");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "关闭", exact: true })
      .click();
    await page.screenshot({ path: "test-results/portable.png" });
  }
  console.log(
    `Portable ${process.argv[2]} passed: embedded frontend, local SQLite and real clipboard output.`,
  );
} finally {
  await browser.close();
}
