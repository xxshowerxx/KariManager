import { useState } from "react";
import {
  clone,
  cleanLines,
  materialName,
  materialPath,
  newMaterial,
  uid,
  usage,
  validateMaterial,
  type Material,
  type Party,
  type State,
  type Work,
} from "../core/model";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import { MaterialCategoryField } from "./MaterialCategoryField";
import {
  Empty,
  Field,
  Modal,
  OrderButtons,
  PageHeader,
  move,
  prettyDate,
  useNotice,
  useTask,
} from "./common";

export function creditNames(m: Material, s: State) {
  return m.groups
    .flatMap((g) =>
      g.partyIds.map((id) => s.parties.find((p) => p.id === id)?.name || ""),
    )
    .filter(Boolean)
    .join(" / ");
}
export function MaterialEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Material;
  onClose: () => void;
  onSaved?: (m: Material) => void;
}) {
  const s = useStateData(),
    [m, set] = useState(() => clone(initial)),
    [pending, setPending] = useState<Party[]>([]),
    [inputs, setInputs] = useState<Record<string, string>>({});
  const task = useTask(),
    notice = useNotice();
  const pool = [...s.parties, ...pending];
  const patch = (value: Partial<Material>) => set((x) => ({ ...x, ...value }));
  function addParty(groupIndex: number) {
    const g = m.groups[groupIndex],
      name = (inputs[g.category.id] || "").trim();
    if (!name) return;
    let p = pool.find((x) => x.name === name);
    if (!p) {
      p = {
        id: uid(),
        name,
        links: [],
        note: "",
        suffixMode: "default",
        suffix: "",
      };
      setPending((x) => [...x, p!]);
    }
    const groups = clone(m.groups);
    groups[groupIndex].partyIds.push(p.id);
    patch({ groups });
    setInputs((x) => ({ ...x, [g.category.id]: "" }));
  }
  async function submit() {
    await task(async () => {
      await store.update((d) => {
        const value = clone(m);
        value.category = value.category.trim();
        value.sources = cleanLines(value.sources.join("\n"));
        value.tags = value.tags.map((t) => t.trim()).filter(Boolean);
        for (const p of pending) {
          const duplicate = d.parties.find((x) => x.name === p.name);
          if (duplicate) {
            for (const g of value.groups)
              g.partyIds = g.partyIds.map((id) =>
                id === p.id ? duplicate.id : id,
              );
          } else d.parties.push(p);
        }
        validateMaterial(value, d);
        const i = d.materials.findIndex((x) => x.id === value.id);
        if (i < 0) d.materials.push(value);
        else d.materials[i] = value;
      });
      onSaved?.(m);
      onClose();
    }, "素材已保存");
  }
  return (
    <Modal
      title={s.materials.some((x) => x.id === m.id) ? "编辑素材" : "添加素材"}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="form-grid">
          <Field label="素材名称">
            <input
              value={m.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="可选，便于查找"
            />
          </Field>
          <MaterialCategoryField
            value={m.category}
            onChange={(category) => patch({ category })}
          />
          <Field
            label="来源链接"
            hint="可选，每行一个；名称、链接、本地路径至少填一项"
          >
            <textarea
              value={m.sources.join("\n")}
              onChange={(e) => patch({ sources: e.target.value.split("\n") })}
              placeholder="作者配布页、项目仓库或原视频链接"
            />
          </Field>
          <Field label="本地路径">
            <div className="input-actions">
              <input
                value={materialPath(m, s)}
                onChange={(e) =>
                  patch({
                    path: e.target.value,
                    folderId: "",
                    relativePath: "",
                  })
                }
                placeholder="文件或文件夹"
              />
              <button
                type="button"
                onClick={() =>
                  void task(async () => {
                    const path = await platform.pickPath();
                    if (path) patch({ path, folderId: "", relativePath: "" });
                  })
                }
              >
                文件
              </button>
              <button
                type="button"
                onClick={() =>
                  void task(async () => {
                    const path = await platform.pickPath(true);
                    if (path) patch({ path, folderId: "", relativePath: "" });
                  })
                }
              >
                目录
              </button>
            </div>
          </Field>
        </div>
        <div className="section-line">
          <h3>署名来源</h3>
          <select
            aria-label="来源分类预设"
            value={m.sourcePresetId}
            onChange={(e) => {
              const p = s.sourcePresets.find((x) => x.id === e.target.value)!;
              patch({
                sourcePresetId: p.id,
                groups: p.categories.map((category) => ({
                  category: clone(category),
                  partyIds:
                    m.groups.find((g) => g.category.id === category.id)
                      ?.partyIds || [],
                })),
              });
            }}
          >
            {s.sourcePresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <p className="muted compact">作者必填，其余可选；输出按以下顺序连接</p>
        <datalist id="party-names">
          {pool.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        <div className="source-groups">
          {m.groups.map((g, gi) => (
            <div className="source-group" key={g.category.id}>
              <div className="section-line">
                <strong>
                  {g.category.label}
                  {g.category.author && <span className="required"> *</span>}
                </strong>
                <OrderButtons
                  index={gi}
                  length={m.groups.length}
                  onMove={(delta) =>
                    patch({ groups: move(m.groups, gi, delta) })
                  }
                />
              </div>
              <div className="chips">
                {g.partyIds.map((id, pi) => (
                  <span className="chip" key={`${id}-${pi}`}>
                    {pool.find((p) => p.id === id)?.name || "条目已失效"}
                    <OrderButtons
                      index={pi}
                      length={g.partyIds.length}
                      onMove={(delta) => {
                        const groups = clone(m.groups);
                        groups[gi].partyIds = move(
                          groups[gi].partyIds,
                          pi,
                          delta,
                        );
                        patch({ groups });
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`移除${pool.find((p) => p.id === id)?.name}`}
                      onClick={() => {
                        const groups = clone(m.groups);
                        groups[gi].partyIds.splice(pi, 1);
                        patch({ groups });
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="input-actions">
                <input
                  aria-label={g.category.label}
                  list="party-names"
                  value={inputs[g.category.id] || ""}
                  onChange={(e) =>
                    setInputs((x) => ({
                      ...x,
                      [g.category.id]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addParty(gi);
                    }
                  }}
                  placeholder="输入新条目或选择已保存来源"
                />
                <button type="button" onClick={() => addParty(gi)}>
                  添加
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="form-grid">
          <Field label="备注">
            <textarea
              value={m.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="修改说明、配布说明、查找关键词…"
            />
          </Field>
          <Field label="标签" hint="用逗号分隔">
            <input
              value={m.tags.join(", ")}
              onChange={(e) =>
                patch({
                  tags: e.target.value.split(/[,，]/).map((x) => x.trim()),
                })
              }
            />
          </Field>
        </div>
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" type="submit">
            保存素材
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function PartyEditor({
  initial,
  onClose,
}: {
  initial?: Party;
  onClose: () => void;
}) {
  const [p, set] = useState<Party>(() =>
    initial
      ? clone(initial)
      : {
          id: uid(),
          name: "",
          links: [],
          note: "",
          suffixMode: "default",
          suffix: "",
        },
  );
  const task = useTask();
  return (
    <Modal title={initial ? "编辑常用来源" : "添加常用来源"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            await store.update((s) => {
              if (!p.name.trim()) throw new Error("请填写来源显示名");
              const i = s.parties.findIndex((x) => x.id === p.id);
              const value = { ...p, links: cleanLines(p.links.join("\n")) };
              if (i < 0) s.parties.push(value);
              else s.parties[i] = value;
            });
            onClose();
          }, "常用来源已保存");
        }}
      >
        <Field label="显示名">
          <input
            required
            value={p.name}
            onChange={(e) => set({ ...p, name: e.target.value })}
            placeholder="作者、游戏、软件、网站或版权方"
          />
        </Field>
        <Field label="链接">
          <textarea
            value={p.links.join("\n")}
            onChange={(e) => set({ ...p, links: e.target.value.split("\n") })}
          />
        </Field>
        <Field label="备注">
          <textarea
            value={p.note}
            onChange={(e) => set({ ...p, note: e.target.value })}
          />
        </Field>
        <Field label="日语敬称">
          <select
            value={p.suffixMode}
            onChange={(e) =>
              set({ ...p, suffixMode: e.target.value as Party["suffixMode"] })
            }
          >
            <option value="default">跟随分类与模板</option>
            <option value="none">不追加</option>
            <option value="custom">自定义后缀</option>
          </select>
        </Field>
        {p.suffixMode === "custom" && (
          <Field label="自定义后缀">
            <input
              value={p.suffix}
              onChange={(e) => set({ ...p, suffix: e.target.value })}
            />
          </Field>
        )}
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary">保存来源</button>
        </footer>
      </form>
    </Modal>
  );
}
export function Library({ onOpenWork }: { onOpenWork: (w: Work) => void }) {
  const s = useStateData(),
    [tab, setTab] = useState<"materials" | "parties">("materials"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [folder, setFolder] = useState(""),
    [editor, setEditor] = useState<Material | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [partyEditor, setPartyEditor] = useState<Party | true | null>(null);
  const task = useTask();
  const visible = s.materials.filter(
    (m) =>
      `${materialName(m)} ${creditNames(m, s)} ${m.note} ${m.tags.join(" ")} ${m.path} ${m.sources.join(" ")}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (!category || m.category === category) &&
      (!folder || m.folderId === folder) &&
      (!status ||
        (status === "unused"
          ? usage(s, m.id).length === 0
          : usage(s, m.id).length > 0)),
  );
  const material = s.materials.find((m) => m.id === detail);
  const parties = s.parties.filter((p) =>
    `${p.name} ${p.note} ${p.links.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="资料库"
        description="管理素材、署名、来源和使用记录"
        actions={
          <button
            className="primary"
            onClick={() =>
              tab === "materials"
                ? setEditor(newMaterial(s.sourcePresets[0]))
                : setPartyEditor(true)
            }
          >
            ＋ {tab === "materials" ? "添加素材" : "添加来源"}
          </button>
        }
      />
      <div className="stat-strip">
        <div>
          <b>{s.materials.length}</b>
          <span>份素材</span>
        </div>
        <div>
          <b>{s.materials.filter((m) => usage(s, m.id).length === 0).length}</b>
          <span>尚未使用</span>
        </div>
        <div>
          <b>{s.works.filter((w) => !w.deletedAt).length}</b>
          <span>部作品</span>
        </div>
        <div>
          <b>{s.parties.length}</b>
          <span>常用来源</span>
        </div>
      </div>
      <div className="toolbar">
        <div className="tabs">
          <button
            className={tab === "materials" ? "active" : ""}
            onClick={() => setTab("materials")}
          >
            素材
          </button>
          <button
            className={tab === "parties" ? "active" : ""}
            onClick={() => setTab("parties")}
          >
            常用来源
          </button>
        </div>
        <input
          className="search"
          aria-label="搜索资料库"
          placeholder="搜索名称、作者、备注、路径…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {tab === "materials" ? (
        <>
          <div className="filter-bar">
            <select
              aria-label="分类筛选"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">所有分类</option>
              {[
                ...new Set(s.materials.map((m) => m.category).filter(Boolean)),
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="使用状态"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">所有使用状态</option>
              <option value="unused">未使用</option>
              <option value="used">已使用</option>
            </select>
            <select
              aria-label="目录筛选"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              <option value="">所有素材目录</option>
              {s.folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <span className="muted">{visible.length} 份素材</span>
          </div>
          {visible.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>素材</th>
                    <th>署名来源</th>
                    <th>使用</th>
                    <th>最近使用</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((m) => {
                    const uses = usage(s, m.id);
                    return (
                      <tr key={m.id}>
                        <td>
                          <button
                            className="text-link"
                            onClick={() => setDetail(m.id)}
                          >
                            {materialName(m)}
                          </button>
                          <small>
                            {m.category}
                            {m.tags.length ? " · " + m.tags.join(" / ") : ""}
                          </small>
                        </td>
                        <td className="credit-cell">{creditNames(m, s)}</td>
                        <td>
                          <span
                            className={uses.length ? "badge sage" : "badge"}
                          >
                            {uses.length ? `${uses.length} 次` : "未使用"}
                          </span>
                        </td>
                        <td className="muted">
                          {uses[0] ? prettyDate(uses[0].date) : "—"}
                        </td>
                        <td>
                          <button onClick={() => setEditor(m)}>编辑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={
                s.materials.length ? "没有符合条件的素材" : "从第一份素材开始"
              }
            >
              <button
                className="primary"
                onClick={() => setEditor(newMaterial(s.sourcePresets[0]))}
              >
                添加素材
              </button>
            </Empty>
          )}
        </>
      ) : (
        <div className="card-grid">
          {parties.map((p) => (
            <div className="card" key={p.id}>
              <div className="section-line">
                <h3>{p.name}</h3>
                <button onClick={() => setPartyEditor(p)}>编辑</button>
              </div>
              <p>{p.note || "可在多份素材中复用"}</p>
              <div className="small-actions">
                {p.links.slice(0, 2).map((link, i) => (
                  <button
                    key={i}
                    onClick={() => void task(() => platform.openTarget(link))}
                  >
                    打开来源 ↗
                  </button>
                ))}
                <button
                  className="danger text"
                  onClick={() => {
                    if (!confirm(`删除常用来源“${p.name}”？`)) return;
                    void task(
                      () =>
                        store.update((d) => {
                          if (
                            d.materials.some((m) =>
                              m.groups.some((g) => g.partyIds.includes(p.id)),
                            )
                          )
                            throw new Error(
                              "该来源被素材引用，请先从相关素材中移除",
                            );
                          d.parties = d.parties.filter((x) => x.id !== p.id);
                        }),
                      "已删除来源",
                    );
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
          {!parties.length && (
            <Empty
              title="暂无常用来源"
              description="作者、游戏、软件、网站都可以存下来，在素材中直接选择"
            />
          )}
        </div>
      )}
      {editor && (
        <MaterialEditor initial={editor} onClose={() => setEditor(null)} />
      )}{" "}
      {partyEditor && (
        <PartyEditor
          initial={partyEditor === true ? undefined : partyEditor}
          onClose={() => setPartyEditor(null)}
        />
      )}
      {material && (
        <Modal
          title={materialName(material)}
          onClose={() => setDetail(null)}
          wide
        >
          <div className="detail-summary">
            <span className="badge">{material.category}</span>
            <span>{creditNames(material, s)}</span>
          </div>
          <div className="small-actions">
            {material.sources.filter(Boolean).map((link, i) => (
              <button
                key={i}
                onClick={() => void task(() => platform.openTarget(link))}
              >
                来源 {i + 1} ↗
              </button>
            ))}
            {materialPath(material, s) && (
              <>
                <button
                  onClick={() =>
                    void task(() =>
                      platform.openTarget(materialPath(material, s)),
                    )
                  }
                >
                  打开素材
                </button>
                <button
                  onClick={() =>
                    void task(() =>
                      platform.openTarget(materialPath(material, s), true),
                    )
                  }
                >
                  所在目录
                </button>
                <button
                  onClick={() =>
                    void task(async () => {
                      if (!(await platform.exists(materialPath(material, s))))
                        throw new Error("本地路径已失效，请重新定位");
                    }, "本地路径有效")
                  }
                >
                  检查路径
                </button>
              </>
            )}
          </div>
          <p className="path-text">{materialPath(material, s)}</p>
          <p className="note-text">{material.note || "暂无备注"}</p>
          <h3>使用记录 · {usage(s, material.id).length} 次</h3>
          {usage(s, material.id).map((w) => (
            <button
              className="history-link"
              key={w.id}
              onClick={() => {
                setDetail(null);
                onOpenWork(w);
              }}
            >
              <span>
                {w.title}
                <small>
                  {w.domainName} · {prettyDate(w.date)}
                </small>
              </span>
              <span>查看 →</span>
            </button>
          ))}
          {!usage(s, material.id).length && (
            <p className="muted">尚未用于作品，收藏和预览不会增加次数</p>
          )}
          <footer className="modal-footer">
            <button
              className="danger text"
              onClick={() => {
                if (!confirm("删除该素材的资料记录？磁盘文件会保留")) return;
                void task(
                  () =>
                    store.update((d) => {
                      if (
                        d.works.some((w) =>
                          w.bindings.some((b) =>
                            b.materialIds.includes(material.id),
                          ),
                        )
                      )
                        throw new Error(
                          "素材存在作品历史，为保留追溯记录暂不能删除",
                        );
                      d.materials = d.materials.filter(
                        (m) => m.id !== material.id,
                      );
                      d.workPresets.forEach((p) =>
                        p.bindings.forEach(
                          (b) =>
                            (b.materialIds = b.materialIds.filter(
                              (id) => id !== material.id,
                            )),
                        ),
                      );
                      setDetail(null);
                    }),
                  "已删除素材记录",
                );
              }}
            >
              删除记录
            </button>
            <button
              onClick={() => {
                setEditor(material);
                setDetail(null);
              }}
            >
              编辑素材
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
