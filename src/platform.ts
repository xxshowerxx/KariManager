import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { State } from "./core/model";
import { sourceTarget } from "./core/sections";
export const desktop = isTauri();
const key = "kari-manager-v1";
export interface Snapshot {
  payload: unknown | null;
  revision: number;
}
export interface Entry {
  path: string;
  relativePath: string;
  name: string;
  directory: boolean;
  size: number;
}
export async function load(): Promise<Snapshot> {
  if (desktop) return invoke("load_state");
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : { payload: null, revision: 0 };
}
export async function persist(
  payload: State,
  expectedRevision: number,
): Promise<number> {
  if (desktop) return invoke("save_state", { payload, expectedRevision });
  const current = await load();
  if (current.revision !== expectedRevision)
    throw new Error("资料已被另一页修改，请刷新后继续");
  const revision = expectedRevision + 1;
  localStorage.setItem(key, JSON.stringify({ payload, revision }));
  return revision;
}
export async function pickPath(directory = false): Promise<string | null> {
  if (!desktop) throw new Error("浏览器开发模式无法选择本地位置，请使用桌面版");
  return open({ directory, multiple: false }) as Promise<string | null>;
}
export async function openTarget(target: string, reveal = false) {
  target = sourceTarget(target);
  if (desktop) return invoke("open_target", { target, reveal });
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    return;
  }
  throw new Error("打开本地素材请使用桌面版");
}
export async function exists(path: string): Promise<boolean> {
  if (!desktop) return false;
  return invoke("path_exists", { path });
}
export async function pathKind(
  path: string,
): Promise<"file" | "directory" | null> {
  return desktop ? invoke("path_kind", { path }) : null;
}
export async function noteFiles(target: string): Promise<Entry[]> {
  if (!desktop) throw new Error("请使用桌面版查看本地说明文件");
  return invoke("note_files", { target });
}
export async function openDirectory(target: string) {
  return invoke("open_directory", { target });
}
export async function recycleEntry(root: string, target: string) {
  return invoke("recycle_entry", { root, target });
}
export async function listDirectory(
  root: string,
  recursive: boolean,
  extensions: string[],
): Promise<{ entries: Entry[]; truncated: boolean }> {
  if (!desktop) throw new Error("目录浏览请使用桌面版");
  return invoke("list_directory", { root, recursive, extensions });
}
export async function clipboard(text: string) {
  if (desktop) await writeText(text);
  else await navigator.clipboard.writeText(text);
}
export async function exportText(
  name: string,
  content: string,
  extension = "json",
): Promise<boolean> {
  if (desktop) {
    const path = await save({
      defaultPath: name,
      filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
    });
    if (!path) return false;
    await invoke("write_text", { path, content });
    return true;
  }
  const blob = new Blob([content], {
    type:
      extension === "json" ? "application/json" : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export async function importText(): Promise<string | null> {
  if (desktop) {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON 数据", extensions: ["json"] }],
    });
    if (!path || typeof path !== "string") return null;
    return invoke("read_text", { path });
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        resolve("");
        return;
      }
      resolve(await file.text());
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
export async function dataLocation(): Promise<string> {
  return desktop ? invoke("data_location") : "当前浏览器本地存储（开发预览）";
}
export async function backupDatabase(): Promise<string> {
  if (!desktop) throw new Error("SQLite备份请使用桌面版，浏览器可导出JSON备份");
  return invoke("backup_database");
}
export async function moveDatabase(directory: string): Promise<string> {
  return invoke("move_database", { directory });
}
