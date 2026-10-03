import { useState, type Dispatch, type SetStateAction } from "react";
import {
  clone,
  draftFor,
  materialName,
  saveWork,
  uid,
  type Draft,
  type Material,
} from "../core/model";
import { contextFor, render } from "../core/template";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import {
  Field,
  Modal,
  OrderButtons,
  PageHeader,
  move,
  useTask,
} from "./common";
import { creditNames, MaterialEditor } from "./Library";
export function MaterialPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: string[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
}) {
  const s = useStateData(),
    [ids, set] = useState(selected),
    [q, setQ] = useState(""),
    [category, setCategory] = useState("");
  const visible = s.materials.filter(
    (m) =>
      `${materialName(m)} ${creditNames(m, s)} ${m.note}`
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (!category || m.category === category),
  );
  return (
    <Modal title="选择素材" onClose={onClose} wide>
      <div className="toolbar">
        <input
          className="search"
          aria-label="搜索素材选择"
          placeholder="搜索名称、作者、备注…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="选择素材分类"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">所有分类</option>
          {[...new Set(s.materials.map((m) => m.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="picker-list">
        {visible.map((m) => (
          <label className="picker-row" key={m.id}>
            <input
              type="checkbox"
              checked={ids.includes(m.id)}
              onChange={(e) =>
                set(
                  e.target.checked
                    ? [...ids, m.id]
                    : ids.filter((id) => id !== m.id),
                )
              }
            />
            <span>
              <strong>{materialName(m)}</strong>
              <small>
                {m.category} · {creditNames(m, s)}
              </small>
            </span>
          </label>
        ))}
        {!visible.length && (
          <p className="muted">没有可选素材，请先到资料库添加。</p>
        )}
      </div>
      <footer className="modal-footer">
        <span className="muted">已选择 {ids.length} 份 · 顺序按选择先后</span>
        <button onClick={onClose}>取消</button>
        <button
          className="primary"
          onClick={() => {
            onSelect(ids);
            onClose();
          }}
        >
          选好了
        </button>
      </footer>
    </Modal>
  );
}
export function Composer({
  draft,
  setDraft,
  onTemplates,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  onTemplates: () => void;
}) {
  const s = useStateData(),
    [picker, setPicker] = useState<number | null>(null),
    [saving, setSaving] = useState(false),
    [presetName, setPresetName] = useState<string | null>(null),
    [editing, setEditing] = useState<Material | null>(null);
  const task = useTask();
  const domain = s.domains.find((d) => d.id === draft.domainId)!,
    template =
      s.templates.find((t) => t.id === draft.templateId) || s.templates[0];
  let output = "",
    error = "";
  try {
    output = render(template.source, contextFor(s, draft, template.language));
  } catch (e) {
    error = String(e);
  }
  const patch = (value: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...value }));
  const bind = (index: number, value: Partial<Draft["bindings"][number]>) =>
    setDraft((d) => ({
      ...d,
      bindings: d.bindings.map((b, i) =>
        i === index ? { ...b, ...value } : b,
      ),
    }));
  const chosen = [...new Set(draft.bindings.flatMap((b) => b.materialIds))]
    .map((id) => s.materials.find((m) => m.id === id))
    .filter((m) => !!m);
  async function generate(kind: "clipboard" | "file") {
    if (saving) return;
    setSaving(true);
    await task(
      async () => {
        const value = clone(draft);
        value.templateId = template.id;
        value.title =
          value.title.trim() ||
          `${domain.name} ${new Date().toLocaleString("zh-CN", { hour12: false })}`;
        const text = render(
          template.source,
          contextFor(s, value, template.language),
        );
        let id = "";
        await store.update((d) => {
          id = saveWork(d, value, text).id;
        });
        patch({ workId: id, title: value.title });
        if (kind === "clipboard") await platform.clipboard(text);
        else
          await platform.exportText(
            `${value.title.replace(/[\\/:*?"<>|]/g, "_")}-借物表.txt`,
            text,
            "txt",
          );
      },
      draft.workId
        ? "借物表已输出，作品记录已更新"
        : "借物表已输出，并建立作品记录",
    );
    setSaving(false);
  }
  return (
    <>
      <PageHeader
        title="制作借物表"
        description="选择素材与输出格式。输出后自动保存作品记录。"
        actions={
          <>
            <button
              onClick={() =>
                setPresetName(
                  s.workPresets.find((p) => p.id === draft.editingPresetId)
                    ?.name || "",
                )
              }
            >
              保存为作品预设
            </button>
            <button onClick={() => setDraft(draftFor(s))}>＋ 新作品</button>
          </>
        }
      />
      <div className="composer-layout">
        <div className="compose-controls">
          <div className="card form-grid">
            <Field label="领域">
              <select
                value={draft.domainId}
                onChange={(e) => setDraft(draftFor(s, e.target.value))}
              >
                {s.domains.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="节点预设">
              <select
                value={draft.nodePresetId}
                onChange={(e) => {
                  const next = draftFor(s, draft.domainId, e.target.value);
                  if (!e.target.value) {
                    next.nodePresetId = "";
                    next.bindings = [];
                  }
                  setDraft({
                    ...next,
                    title: draft.title,
                    templateId: draft.templateId,
                  });
                }}
              >
                <option value="">自行选择节点</option>
                {s.nodePresets
                  .filter((p) => p.domainId === draft.domainId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="作品预设">
              <select
                value=""
                onChange={(e) => {
                  const p = s.workPresets.find((p) => p.id === e.target.value);
                  if (p)
                    setDraft({
                      workId: "",
                      editingPresetId: p.id,
                      title: "",
                      domainId: p.domainId,
                      nodePresetId: p.nodePresetId,
                      templateId: p.templateId,
                      bindings: clone(p.bindings),
                      publicTexts: clone(p.publicTexts),
                    });
                }}
              >
                <option value="">选择常用组合…</option>
                {s.workPresets
                  .filter((p) => p.domainId === draft.domainId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="输出模板">
              <select
                value={template.id}
                onChange={(e) => patch({ templateId: e.target.value })}
              >
                {s.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="作品标题">
              <input
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="可选，留空使用领域与日期"
              />
            </Field>
            <Field label="从素材名称选标题">
              <select
                value=""
                onChange={(e) => {
                  const m = chosen.find((m) => m.id === e.target.value);
                  if (m) patch({ title: m.name });
                }}
              >
                <option value="">选择引用的素材名称…</option>
                {chosen
                  .filter((m) => m.name)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <div className="section-line">
            <h3>本次使用</h3>
            <select
              aria-label="添加作品节点"
              value=""
              onChange={(e) => {
                const n = domain.nodes.find((n) => n.id === e.target.value);
                if (n)
                  patch({
                    bindings: [
                      ...draft.bindings,
                      {
                        nodeId: n.id,
                        materialIds: [],
                        titleMode: n.mode === "title",
                        titleOverrides: {},
                        text: n.text,
                      },
                    ],
                  });
              }}
            >
              <option value="">＋ 添加节点</option>
              {domain.nodes
                .filter((n) => !draft.bindings.some((b) => b.nodeId === n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
            </select>
          </div>
          {draft.bindings.map((b, i) => {
            const node = domain.nodes.find((n) => n.id === b.nodeId);
            if (!node)
              return (
                <p key={b.nodeId} className="error">
                  节点已失效，请重新选择预设
                </p>
              );
            return (
              <section
                className="node-card"
                aria-label={`${node.label}节点`}
                key={b.nodeId}
              >
                <div className="section-line">
                  <h3>
                    {node.label}
                    <small>{node.en}</small>
                  </h3>
                  <div className="small-actions">
                    <OrderButtons
                      index={i}
                      length={draft.bindings.length}
                      onMove={(delta) =>
                        patch({
                          bindings: move(draft.bindings, i, delta),
                          nodePresetId: "",
                        })
                      }
                    />
                    <button
                      className="icon-button"
                      aria-label={`移除${node.label}节点`}
                      onClick={() =>
                        patch({
                          bindings: draft.bindings.filter(
                            (_, index) => i !== index,
                          ),
                          nodePresetId: "",
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>
                {node.mode === "text" ? (
                  <textarea
                    aria-label={`${node.label}文字`}
                    value={b.text}
                    onChange={(e) => bind(i, { text: e.target.value })}
                    placeholder="填写本人制作署名或固定说明"
                  />
                ) : (
                  <>
                    <div className="selected-materials">
                      {b.materialIds.map((id, mi) => {
                        const m = s.materials.find((m) => m.id === id);
                        return (
                          <div
                            className="selected-material"
                            key={`${id}-${mi}`}
                          >
                            <div>
                              <strong>
                                {m ? materialName(m) : "素材已失效"}
                              </strong>
                              <small>
                                {m ? creditNames(m, s) : "请重新选择"}
                              </small>
                              {b.titleMode && m && (
                                <input
                                  aria-label={`${materialName(m)}输出标题`}
                                  value={b.titleOverrides[id] ?? m.name}
                                  onChange={(e) =>
                                    bind(i, {
                                      titleOverrides: {
                                        ...b.titleOverrides,
                                        [id]: e.target.value,
                                      },
                                    })
                                  }
                                  placeholder="本次输出的素材标题"
                                />
                              )}
                            </div>
                            <OrderButtons
                              index={mi}
                              length={b.materialIds.length}
                              onMove={(delta) =>
                                bind(i, {
                                  materialIds: move(b.materialIds, mi, delta),
                                })
                              }
                            />
                            {m && (
                              <button
                                className="icon-button"
                                aria-label={`编辑${materialName(m)}`}
                                onClick={() => setEditing(m)}
                              >
                                ✎
                              </button>
                            )}
                            <button
                              className="icon-button"
                              aria-label={`移除素材${m ? materialName(m) : id}`}
                              onClick={() =>
                                bind(i, {
                                  materialIds: b.materialIds.filter(
                                    (_, index) => index !== mi,
                                  ),
                                })
                              }
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="section-line">
                      <button
                        className="text-link"
                        onClick={() => setPicker(i)}
                      >
                        ＋ 选择素材
                      </button>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={b.titleMode}
                          onChange={(e) =>
                            bind(i, { titleMode: e.target.checked })
                          }
                        />
                        显示素材标题
                      </label>
                    </div>
                  </>
                )}
              </section>
            );
          })}
          <Field label="固定说明" hint="公开输出文字，不计素材使用次数">
            <textarea
              value={draft.publicTexts.join("\n")}
              onChange={(e) =>
                patch({ publicTexts: e.target.value ? [e.target.value] : [] })
              }
              placeholder="致谢或制作说明（可选）"
            />
          </Field>
        </div>
        <aside className="preview-panel">
          <div className="section-line">
            <h3>输出预览</h3>
            <button className="text-link" onClick={onTemplates}>
              调整格式 →
            </button>
          </div>
          <div className="paper-preview">
            {error ? (
              <p className="error">{error}</p>
            ) : (
              <pre>{output || "选择素材后，将在这里显示借物表。"}</pre>
            )}
          </div>
          <div className="preview-meta">
            <span className="status-dot" />
            {draft.workId ? "正在更新已有作品" : "输出后建立新作品"}
            <span>{chosen.length} 份素材</span>
          </div>
          <button
            className="primary full"
            disabled={!!error || saving}
            onClick={() => void generate("clipboard")}
          >
            {saving ? "正在保存…" : "输出并复制"}
          </button>
          <button
            className="full"
            disabled={!!error || saving}
            onClick={() => void generate("file")}
          >
            输出为 TXT
          </button>
          <p className="muted fine-print">
            同一作品反复输出只更新记录。新创作请点击“新作品”。
          </p>
        </aside>
      </div>
      {picker !== null && (
        <MaterialPicker
          selected={draft.bindings[picker].materialIds}
          onSelect={(ids) => bind(picker, { materialIds: ids })}
          onClose={() => setPicker(null)}
        />
      )}{" "}
      {editing && (
        <MaterialEditor initial={editing} onClose={() => setEditing(null)} />
      )}
      {presetName !== null && (
        <Modal title="保存作品预设" onClose={() => setPresetName(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void task(async () => {
                if (!presetName.trim()) throw new Error("请填写预设名称");
                await store.update((d) => {
                  const existing = d.workPresets.findIndex(
                    (p) => p.id === draft.editingPresetId,
                  );
                  const value = {
                    id: existing < 0 ? uid() : d.workPresets[existing].id,
                    name: presetName.trim(),
                    domainId: draft.domainId,
                    nodePresetId: draft.nodePresetId,
                    bindings: clone(draft.bindings),
                    templateId: draft.templateId,
                    publicTexts: clone(draft.publicTexts),
                  };
                  if (existing < 0) d.workPresets.push(value);
                  else d.workPresets[existing] = value;
                });
                setPresetName(null);
              }, "作品预设已保存");
            }}
          >
            <Field label="预设名称">
              <input
                required
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="例如：常用舞台与效果组合"
              />
            </Field>
            <p className="muted">
              保存当前节点、素材选择、固定说明和输出模板，不保存日期与使用次数。
            </p>
            <footer className="modal-footer">
              <button type="button" onClick={() => setPresetName(null)}>
                取消
              </button>
              <button className="primary">保存预设</button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
