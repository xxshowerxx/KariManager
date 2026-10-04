import { useState } from "react";
import {
  clone,
  materialPath,
  newMaterial,
  uid,
  type Folder,
  type Material,
} from "../core/model";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import { MaterialEditor } from "./Library";
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
    [material, setMaterial] = useState<Material | null>(null);
  const folder = s.folders.find((f) => f.id === selected);
  async function browse(f: Folder) {
    setSelected(f.id);
    setEntries([]);
    setLoading(true);
    await task(async () => {
      const result = await platform.listDirectory(
        f.path,
        f.recursive,
        f.extensions,
      );
      setEntries(result.entries);
      if (result.truncated) notice("目录超过两万条，已截断。建议缩小目录范围");
    });
    setLoading(false);
  }
  return (
    <>
      <PageHeader
        title="素材目录"
        description="指定类别与目录，需要时浏览文件，再补充作者录入资料库"
        actions={
          <button
            className="primary"
            onClick={() =>
              setEdit({
                id: uid(),
                name: "",
                path: "",
                category: "模型",
                recursive: true,
                extensions: [],
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
              <span className="badge">{f.category || "未分类"}</span>
              <h3>{f.name}</h3>
              <p className="path-text">{f.path}</p>
              <div className="small-actions">
                <button onClick={() => void browse(f)}>浏览文件</button>
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
                            setSelected("");
                            setEntries([]);
                          }
                        }),
                      "已移除目录映射，本地文件保留",
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
              <button onClick={() => void browse(folder)}>刷新</button>
            )}
          </div>
          <input
            className="search"
            aria-label="搜索目录文件"
            placeholder="按名称或相对路径搜索…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading ? (
            <p>正在读取目录…</p>
          ) : folder ? (
            <>
              <p className="muted">
                {entries.length} 条 ·{" "}
                {folder.recursive ? "含子文件夹" : "当前文件夹"}
              </p>
              <div className="directory-entries">
                {entries
                  .filter((e) =>
                    e.relativePath.toLowerCase().includes(q.toLowerCase()),
                  )
                  .map((e) => (
                    <div className="directory-entry" key={e.path}>
                      <div>
                        <strong>
                          {e.directory ? "▱" : "◇"} {e.name}
                        </strong>
                        <small>{e.relativePath}</small>
                      </div>
                      <button
                        onClick={() =>
                          void task(() => platform.openTarget(e.path))
                        }
                      >
                        打开
                      </button>
                      {!e.directory && (
                        <button
                          onClick={() => {
                            const p =
                              s.sourcePresets.find(
                                (p) => p.id === folder.sourcePresetId,
                              ) || s.sourcePresets[0];
                            setMaterial({
                              ...newMaterial(p),
                              name: e.name,
                              path: e.path,
                              folderId: folder.id,
                              relativePath: e.relativePath,
                              category: folder.category,
                            });
                          }}
                        >
                          录入
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <Empty
              title="选择目录浏览"
              description="只在点击浏览时读取目录，不会自动解析作者"
            />
          )}
        </div>
      </div>
      {edit && (
        <Modal title="素材目录映射" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void task(async () => {
                await store.update((d) => {
                  const i = d.folders.findIndex((f) => f.id === edit.id);
                  const value = {
                    ...edit,
                    extensions: edit.extensions
                      .map((x) => x.trim())
                      .filter(Boolean),
                  };
                  if (i < 0) d.folders.push(value);
                  else d.folders[i] = value;
                });
                setEdit(null);
                setEntries([]);
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
            <Field label="素材类别">
              <input
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </Field>
            <Field label="默认来源分类">
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
            <Field
              label="扩展名筛选"
              hint="用逗号分隔，例如 pmx, pmd；留空显示全部"
            >
              <input
                value={edit.extensions.join(", ")}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    extensions: e.target.value
                      .split(/[,，]/)
                      .map((x) => x.trim().replace(/^\./, "")),
                  })
                }
              />
            </Field>
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
        <MaterialEditor initial={material} onClose={() => setMaterial(null)} />
      )}
    </>
  );
}
