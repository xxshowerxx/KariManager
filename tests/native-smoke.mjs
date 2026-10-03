import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const browser = await chromium.connectOverCDP(
  process.env.KARI_CDP_URL || "http://127.0.0.1:9224",
);
const preference = path.join(
  process.env.APPDATA,
  "io.karimanager.desktop",
  "data-location.txt",
);
const previous = await fs.readFile(preference).catch((e) => {
  if (e.code === "ENOENT") return null;
  throw e;
});
try {
  const page = browser.contexts()[0].pages()[0];
  await page.waitForSelector(".app-shell");
  const invoke = (command, args) =>
    page.evaluate(
      ({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args),
      { command, args },
    );
  const original = await invoke("load_state");
  assert.equal(original.payload.schemaVersion, 1);
  const location = await invoke("data_location");
  assert.ok(location.includes(".tooling")); // Smoke test only touches its isolated database.
  const fixture = path.join(location, "fixture");
  await fs.mkdir(path.join(fixture, "sub"), { recursive: true });
  await fs.writeFile(path.join(fixture, "model.pmx"), "test");
  await fs.writeFile(path.join(fixture, "sub", "motion.vmd"), "test");
  await fs.writeFile(path.join(fixture, "readme.txt"), "test");
  const list = await invoke("list_directory", {
    root: fixture,
    recursive: true,
    extensions: ["pmx", "vmd"],
  });
  assert.equal(list.entries.filter((e) => !e.directory).length, 2);
  assert.equal(list.truncated, false);
  assert.equal(
    await invoke("path_exists", { path: path.join(fixture, "model.pmx") }),
    true,
  );
  assert.equal(
    await invoke("path_exists", { path: path.join(fixture, "missing.pmx") }),
    false,
  );
  const textFile = path.join(location, "roundtrip.json");
  await invoke("write_text", {
    path: textFile,
    content: '{"name":"中文数据"}',
  });
  assert.equal(
    await invoke("read_text", { path: textFile }),
    '{"name":"中文数据"}',
  );
  const revision = await invoke("save_state", {
    payload: original.payload,
    expectedRevision: original.revision,
  });
  assert.equal(revision, original.revision + 1);
  await assert.rejects(
    invoke("save_state", {
      payload: original.payload,
      expectedRevision: original.revision,
    }),
  );
  const backup = await invoke("backup_database");
  assert.ok((await fs.stat(backup)).size > 0);
  const next = path.join(location, "migrated");
  assert.equal(await invoke("move_database", { directory: next }), next);
  assert.deepEqual((await invoke("load_state")).payload, original.payload);
  // Return to a fresh sibling location; the original directory is preserved.
  const restore = path.join(location, "restored");
  await invoke("move_database", { directory: restore });
  await page.reload();
  await page.waitForSelector(".app-shell");
  await page.screenshot({ path: "test-results/desktop.png" });
  console.log(
    "Native smoke passed: SQLite persistence/CAS, backup, migration, directory filter, text IO and reload.",
  );
} finally {
  if (previous === null)
    await fs.unlink(preference).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
  else await fs.writeFile(preference, previous);
  await browser.close();
}
