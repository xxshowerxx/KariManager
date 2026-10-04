import { useRef, useState } from "react";
import {
  clone,
  materialName,
  materialPath,
  newMaterial,
  uid,
  type Folder,
  type Material,
} from "../core/model";
import {
  extensionList,
  filteredEntries,
  folderCategories,
  importConflict,
  pathKey,
  within,
  authorFromPath,
} from "../core/files";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import { MaterialEditor } from "./Library";
import { LocalFileActions } from "./LocalFileActions";
import { MaterialCategoryField } from "./MaterialCategoryField";
import { ExtensionField } from "./ExtensionField";
import { Empty, Field, Modal, PageHeader, useNotice, useTask } from "./common";

export function Folders() {
  const s = useStateData(),
    task = useTask(),
    notice = useNotice();
  const [edit, setEdit] = useState<Folder | null>(null),
    [selected, setSelected] = useState(""),
    [entries, setEntries] = useState<platform.Entry[]>([]),
    [q, setQ] = useState(""),
    [loading, setLoading] = useState(false),
    [material, setMaterial] = useState<Material | null>(null),
    [expanded, setExpanded] = useState<string[]>([]),
    [all, setAll] = useState(false),
    [showHidden, setShowHidden] = useState(false),
    [deleteEntry, setDeleteEntry] = useState<platform.Entry | null>(null);
  const request = useRef(0);
  const folder = s.folders.find((f) => f.id === selected);
  async function browse(f: Folder, reset = false) {
    const token = ++request.current;
    setSelected(f.id);
    setEntries([]);
    setLoading(true);
    if (reset) {
      setExpanded([]);
      setQ("");
      setAll(false);
      setShowHidden(false);
    }
    await task(async () => {
      const result = await platform.listDirectory(f.path, f.recursive, []);
      if (token !== request.current) return;
      setEntries(result.entries);
      if (result.truncated) notice("目录超过两万条，已截断");
    });
    if (token === request.current) setLoading(false);
  }
  const visible = folder
    ? filteredEntries(entries, folder, all, showHidden, q)
    : [];
  const parentKey = (path: string) =>
    pathKey(path).split("/").slice(0, -1).join("/");
  const children = new Map<string, platform.Entry[]>();
  for (const entry of visible) {
    const parent = parentKey(entry.relativePath);
    const list = children.get(parent) ?? [];
    list.push(entry);
    children.set(parent, list);
  }
  function tree(parent = "", depth = 0) {
    return (children.get(parent) ?? []).map((e) => {
      const key = pathKey(e.relativePath),
        open = expanded.includes(key) || !!q;
      const hidden = folder?.hiddenPaths?.some((p) =>
        within(e.relativePath, p),
      );
      const conflict = importConflict(e.path, e.directory, s);
      return (
        <div key={e.path}>
          <div
            className={`directory-entry ${hidden ? "muted" : ""}`}
            style={{ paddingLeft: depth * 18 }}
          >
            <div className="directory-entry-name">
              <strong>
                <span
                  className={`entry-status ${e.directory ? "folder-status" : "file-status"} ${conflict ? "imported" : "unimported"}`}
                  role="img"
                  aria-label={conflict ? "已录入" : "未录入"}
                  title={conflict ? "已录入" : "未录入"}
                />{" "}
                {e.name}
              </strong>
              <small>{e.relativePath}</small>
              {conflict && <small>已录入：{materialName(conflict)}</small>}
            </div>
            <div className="small-actions directory-actions">
              {e.directory && (
                <button
                  onClick={() =>
                    setExpanded(
                      open
                        ? expanded.filter((x) => x !== key)
                        : [...expanded, key],
                    )
                  }
                >
                  {open ? "收起" : "展开"}
                </button>
              )}
              <button
                onClick={() => void task(() => platform.openTarget(e.path))}
              >
                打开
              </button>
              <LocalFileActions path={e.path} compact />
              <button
                onClick={() => {
                  if (conflict) {
                    setMaterial(clone(conflict));
                    return;
                  }
                  if (!folder) return;
                  const preset =
                    s.sourcePresets.find(
                      (p) => p.id === folder.sourcePresetId,
                    ) || s.sourcePresets[0];
                  const categories = folderCategories(folder);
                  setMaterial({
                    ...newMaterial(preset),
                    name: e.name,
                    path: e.path,
                    pathKind: e.directory ? "directory" : "file",
                    folderId: folder.id,
                    relativePath: e.relativePath,
                    category: categories.length === 1 ? categories[0] : "",
                  });
                }}
              >
                {conflict ? "编辑" : "录入"}
              </button>
              <button
                onClick={() =>
                  void task(() =>
                    store.update((d) => {
                      const f = d.folders.find((f) => f.id === selected)!;
                      f.hiddenPaths = hidden
                        ? (f.hiddenPaths ?? []).filter(
                            (p) => !within(e.relativePath, p),
                          )
                        : [...(f.hiddenPaths ?? []), e.relativePath];
                    }),
                  )
                }
              >
                {hidden ? "取消隐藏" : "隐藏"}
              </button>
              <button className="text danger" onClick={() => setDeleteEntry(e)}>
                删除
              </button>
            </div>
          </div>
          {e.directory && open && tree(key, depth + 1)}
        </div>
      );
    });
  }
  return (
    <>
      <PageHeader
        title="素材目录"
        actions={
          <button
            className="primary"
            onClick={() =>
              setEdit({
                id: uid(),
                name: "",
                path: "",
                category: "",
                categories: [],
                recursive: true,
                extensions: [],
                excludedExtensions: ["txt", "md"],
                sourcePresetId: s.sourcePresets[0].id,
              })
            }
          >
            ＋ 添加目录
          </button>
        }
      />
      <div className="folder-layout">
        <div className="folder-list">
          {s.folders.map((f) => (
            <article
              className={`card ${selected === f.id ? "selected" : ""}`}
              key={f.id}
            >
              <div className="chips">
                {(folderCategories(f).length
                  ? folderCategories(f)
                  : ["未分类"]
                ).map((c) => (
                  <span className="badge" key={c}>
                    {c}
                  </span>
                ))}
              </div>
              <h3>{f.name}</h3>
              <p className="path-text">{f.path}</p>
              <div className="small-actions">
                <button onClick={() => void browse(f, true)}>浏览文件</button>
                <button onClick={() => setEdit(clone(f))}>编辑 / 重定位</button>
                <button
                  className="text danger"
                  onClick={() =>
                    void task(
                      () =>
                        store.update((d) => {
                          for (const m of d.materials.filter(
                            (m) => m.folderId === f.id,
                          )) {
                            m.path = materialPath(m, d);
                            m.folderId = "";
                            m.relativePath = "";
                          }
                          d.folders = d.folders.filter((x) => x.id !== f.id);
                          if (selected === f.id) {
                            ++request.current;
                            setSelected("");
                            setEntries([]);
                          }
                        }),
                      "已移除目录映射",
                    )
                  }
                >
                  移除
                </button>
              </div>
            </article>
          ))}
          {!s.folders.length && (
            <Empty
              title="添加一个素材目录"
              description="例如：模型、动作、场景各放一个文件夹"
            />
          )}
        </div>
        <div className="card directory-browser">
          <div className="section-line">
            <h3>{folder?.name || "本地文件"}</h3>
            {folder && (
              <div className="small-actions">
                <button
                  onClick={() =>
                    void task(() => platform.openTarget(folder.path))
                  }
                >
                  打开目录
                </button>
                <button onClick={() => void browse(folder)}>刷新</button>
              </div>
            )}
          </div>
          <input
            className="search"
            aria-label="搜索目录文件"
            placeholder="按名称或相对路径搜索…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {folder && (
            <div className="small-actions directory-toolbar">
              <label className="check">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={(e) => setAll(e.target.checked)}
                />
                显示全部
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                />
                显示隐藏
              </label>
              {showHidden && !!folder.hiddenPaths?.length && (
                <button
                  onClick={() =>
                    void task(() =>
                      store.update((d) => {
                        d.folders.find((f) => f.id === selected)!.hiddenPaths =
                          [];
                      }),
                    )
                  }
                >
                  取消全部隐藏
                </button>
              )}
            </div>
          )}
          {loading ? (
            <p>正在读取目录…</p>
          ) : folder ? (
            <div className="directory-entries">
              {tree()}
              {!visible.length && <Empty title="暂无文件" />}
            </div>
          ) : (
            <Empty title="选择目录浏览" />
          )}
        </div>
      </div>
      {edit && (
        <Modal title="素材目录映射" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void task(async () => {
                const value = {
                  ...edit,
                  categories: folderCategories(edit)
                    .map((x) => x.trim())
                    .filter(Boolean),
                  extensions: extensionList(edit.extensions.join(",")),
                  excludedExtensions: extensionList(
                    (edit.excludedExtensions ?? ["txt", "md"]).join(","),
                  ),
                };
                value.category = value.categories[0] ?? "";
                await store.update((d) => {
                  const i = d.folders.findIndex((f) => f.id === edit.id);
                  if (i < 0) d.folders.push(value);
                  else d.folders[i] = value;
                });
                setEdit(null);
                if (selected === value.id) await browse(value, true);
              }, "目录映射已保存");
            }}
          >
            <Field label="目录名称">
              <input
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field
              label="本地目录"
              hint="重定位根目录后，关联素材按相对路径查找"
            >
              <div className="input-action">
                <input
                  aria-label="本地目录"
                  required
                  value={edit.path}
                  onChange={(e) => setEdit({ ...edit, path: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() =>
                    void task(async () => {
                      const path = await platform.pickPath(true);
                      if (path) setEdit({ ...edit, path });
                    })
                  }
                >
                  选择
                </button>
              </div>
            </Field>
            <MaterialCategoryField
              value=""
              onChange={() => {}}
              values={folderCategories(edit)}
              onValuesChange={(categories) =>
                setEdit({ ...edit, categories, category: categories[0] ?? "" })
              }
            />
            <Field label="默认来源预设">
              <select
                value={edit.sourcePresetId}
                onChange={(e) =>
                  setEdit({ ...edit, sourcePresetId: e.target.value })
                }
              >
                {s.sourcePresets.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <ExtensionField
              label="扩展名筛选"
              hint="输入后点添加或按 Enter；可用逗号批量添加，例如 pmx, pmd；未添加时显示全部"
              values={extensionList(edit.extensions.join(","))}
              onChange={(extensions) =>
                setEdit((current) => current && { ...current, extensions })
              }
            />
            <ExtensionField
              label="排除扩展名"
              values={extensionList(
                (edit.excludedExtensions ?? ["txt", "md"]).join(","),
              )}
              onChange={(excludedExtensions) =>
                setEdit(
                  (current) => current && { ...current, excludedExtensions },
                )
              }
            />
            <label className="check">
              <input
                type="checkbox"
                checked={edit.recursive}
                onChange={(e) =>
                  setEdit({ ...edit, recursive: e.target.checked })
                }
              />
              浏览子文件夹
            </label>
            <footer className="modal-footer">
              <button type="button" onClick={() => setEdit(null)}>
                取消
              </button>
              <button className="primary">保存目录</button>
            </footer>
          </form>
        </Modal>
      )}
      {material && (
        <MaterialEditor
          initial={material}
          suggestedAuthor={authorFromPath(
            material.path || material.relativePath,
            material.pathKind === "directory",
          )}
          onClose={() => setMaterial(null)}
        />
      )}
      {deleteEntry && folder && (
        <Modal title="移入回收站" onClose={() => setDeleteEntry(null)}>
          <p className="path-text">{deleteEntry.path}</p>
          <footer className="modal-footer">
            <button onClick={() => setDeleteEntry(null)}>取消</button>
            <button
              className="danger"
              onClick={() =>
                void task(async () => {
                  await platform.recycleEntry(folder.path, deleteEntry.path);
                  setDeleteEntry(null);
                  await browse(folder);
                }, "已移入回收站")
              }
            >
              移入回收站
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
