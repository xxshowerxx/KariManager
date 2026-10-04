import { useState } from "react";
import {
  clone,
  uid,
  type Domain,
  type NodePreset,
  type SourcePreset,
  type Template,
  type WorkPreset,
} from "../core/model";
import { defaultFormat } from "../core/defaults";
import { render, sourceFromFormat, type Context } from "../core/template";
import { stylize, styles } from "../core/unicode";
import { share, type ShareKind } from "../core/sharing";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import {
  Empty,
  Field,
  Modal,
  OrderButtons,
  PageHeader,
  move,
  useTask,
} from "./common";
function SourceEditor({
  value,
  onClose,
}: {
  value: SourcePreset;
  onClose: () => void;
}) {
  const [p, set] = useState(() => clone(value));
  const task = useTask();
  return (
    <Modal title="来源分类预设" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            await store.update((s) => {
              const i = s.sourcePresets.findIndex((x) => x.id === p.id);
              if (i < 0) s.sourcePresets.push(p);
              else s.sourcePresets[i] = p;
            });
            onClose();
          }, "来源分类预设已保存");
        }}
      >
        <div className="form-grid">
          <Field label="预设名称">
            <input
              required
              value={p.name}
              onChange={(e) => set({ ...p, name: e.target.value })}
            />
          </Field>
          <Field label="推荐素材类别">
            <input
              value={p.target}
              onChange={(e) => set({ ...p, target: e.target.value })}
            />
          </Field>
        </div>
        {p.categories.map((c, i) => (
          <div className="editable-row" key={c.id}>
            <input
              aria-label="分类名称"
              value={c.label}
              onChange={(e) =>
                set({
                  ...p,
                  categories: p.categories.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                })
              }
            />
            <label className="check">
              <input
                type="checkbox"
                checked={c.author}
                onChange={(e) =>
                  set({
                    ...p,
                    categories: p.categories.map((x, j) =>
                      j === i ? { ...x, author: e.target.checked } : x,
                    ),
                  })
                }
              />
              作者必填
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={c.honorific}
                onChange={(e) =>
                  set({
                    ...p,
                    categories: p.categories.map((x, j) =>
                      j === i ? { ...x, honorific: e.target.checked } : x,
                    ),
                  })
                }
              />
              日语敬称
            </label>
            <OrderButtons
              index={i}
              length={p.categories.length}
              onMove={(delta) =>
                set({ ...p, categories: move(p.categories, i, delta) })
              }
            />
            <button
              type="button"
              aria-label="删除分类"
              onClick={() =>
                set({
                  ...p,
                  categories: p.categories.filter((_, j) => j !== i),
                })
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set({
              ...p,
              categories: [
                ...p.categories,
                { id: uid(), label: "新分类", author: false, honorific: false },
              ],
            })
          }
        >
          ＋ 添加分类
        </button>
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary">保存预设</button>
        </footer>
      </form>
    </Modal>
  );
}
function DomainEditor({
  value,
  onClose,
}: {
  value: Domain;
  onClose: () => void;
}) {
  const [d, set] = useState(() => clone(value)),
    s = useStateData();
  const task = useTask();
  return (
    <Modal title="编辑领域与节点" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            await store.update((s) => {
              const old = s.domains.find((x) => x.id === d.id);
              for (const n of old?.nodes || [])
                if (
                  !d.nodes.some((x) => x.id === n.id) &&
                  (s.works.some(
                    (w) =>
                      w.domainId === d.id &&
                      w.bindings.some((b) => b.nodeId === n.id),
                  ) ||
                    s.workPresets.some(
                      (w) =>
                        w.domainId === d.id &&
                        w.bindings.some((b) => b.nodeId === n.id),
                    ))
                )
                  throw new Error(
                    `节点“${n.label}”存在作品引用，请保留以便追溯`,
                  );
              s.nodePresets
                .filter((p) => p.domainId === d.id)
                .forEach(
                  (p) =>
                    (p.nodeIds = p.nodeIds.filter((id) =>
                      d.nodes.some((n) => n.id === id),
                    )),
                );
              const i = s.domains.findIndex((x) => x.id === d.id);
              if (i < 0) {
                s.domains.push(d);
                s.nodePresets.push({
                  id: uid(),
                  name: "默认节点",
                  domainId: d.id,
                  nodeIds: d.nodes.map((n) => n.id),
                });
              } else s.domains[i] = d;
            });
            onClose();
          }, "领域已保存");
        }}
      >
        <Field label="领域名称">
          <input
            required
            value={d.name}
            onChange={(e) => set({ ...d, name: e.target.value })}
          />
        </Field>
        <div className="node-editor-head">
          <span>中文／基本标签</span>
          <span>英文</span>
          <span>日文</span>
          <span>默认内容</span>
        </div>
        {d.nodes.map((n, i) => (
          <div className="node-editor-row" key={n.id}>
            {(["label", "en", "ja"] as const).map((key) => (
              <input
                key={key}
                aria-label={`${n.label}${key}`}
                value={n[key]}
                onChange={(e) =>
                  set({
                    ...d,
                    nodes: d.nodes.map((x, j) =>
                      j === i ? { ...x, [key]: e.target.value } : x,
                    ),
                  })
                }
              />
            ))}
            <select
              aria-label="节点内容模式"
              value={n.mode}
              onChange={(e) =>
                set({
                  ...d,
                  nodes: d.nodes.map((x, j) =>
                    j === i
                      ? { ...x, mode: e.target.value as typeof n.mode }
                      : x,
                  ),
                })
              }
            >
              <option value="credits">署名</option>
              <option value="title">标题与署名</option>
              <option value="text">固定文字</option>
            </select>
            <OrderButtons
              index={i}
              length={d.nodes.length}
              onMove={(delta) => set({ ...d, nodes: move(d.nodes, i, delta) })}
            />
            <button
              type="button"
              aria-label="删除节点"
              onClick={() =>
                set({ ...d, nodes: d.nodes.filter((_, j) => j !== i) })
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            set({
              ...d,
              nodes: [
                ...d.nodes,
                {
                  id: uid(),
                  label: "新节点",
                  en: "",
                  ja: "",
                  mode: "credits",
                  text: "",
                },
              ],
            })
          }
        >
          ＋ 添加节点
        </button>
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary">保存领域</button>
        </footer>
      </form>
    </Modal>
  );
}
function NodePresetEditor({
  value,
  onClose,
}: {
  value: NodePreset;
  onClose: () => void;
}) {
  const s = useStateData(),
    [p, set] = useState(() => clone(value));
  const task = useTask();
  const d = s.domains.find((d) => d.id === p.domainId)!;
  return (
    <Modal title="节点预设" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            await store.update((s) => {
              const i = s.nodePresets.findIndex((x) => x.id === p.id);
              if (i < 0) s.nodePresets.push(p);
              else s.nodePresets[i] = p;
            });
            onClose();
          }, "节点预设已保存");
        }}
      >
        <Field label="预设名称">
          <input
            required
            value={p.name}
            onChange={(e) => set({ ...p, name: e.target.value })}
          />
        </Field>
        <Field label="所属领域">
          <select
            value={p.domainId}
            onChange={(e) =>
              set({ ...p, domainId: e.target.value, nodeIds: [] })
            }
          >
            {s.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <h3>本预设显示的节点</h3>
        {p.nodeIds.map((id, i) => (
          <div className="editable-row" key={id}>
            <strong>{d.nodes.find((n) => n.id === id)?.label}</strong>
            <OrderButtons
              index={i}
              length={p.nodeIds.length}
              onMove={(delta) =>
                set({ ...p, nodeIds: move(p.nodeIds, i, delta) })
              }
            />
            <button
              type="button"
              aria-label="移除预设节点"
              onClick={() =>
                set({ ...p, nodeIds: p.nodeIds.filter((x) => x !== id) })
              }
            >
              ×
            </button>
          </div>
        ))}
        <select
          aria-label="加入预设节点"
          value=""
          onChange={(e) =>
            set({ ...p, nodeIds: [...p.nodeIds, e.target.value] })
          }
        >
          <option value="">＋ 加入节点</option>
          {d.nodes
            .filter((n) => !p.nodeIds.includes(n.id))
            .map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
        </select>
        <footer className="modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary">保存预设</button>
        </footer>
      </form>
    </Modal>
  );
}
const sample: Context = {
  rows: [
    {
      label: "模型",
      title: "",
      credits: [
        {
          name: "作者甲",
          allowSuffix: true,
          suffixMode: "default",
          suffix: "",
        },
        {
          name: "作者乙",
          allowSuffix: true,
          suffixMode: "default",
          suffix: "",
        },
      ],
      sources: ["https://example.com/model"],
      note: "",
    },
    {
      label: "动作",
      title: "",
      credits: [
        {
          name: "作者甲",
          allowSuffix: true,
          suffixMode: "default",
          suffix: "",
        },
      ],
      sources: [],
      note: "",
    },
    {
      label: "音乐",
      title: "歌曲标题",
      credits: [
        {
          name: "作者丙",
          allowSuffix: true,
          suffixMode: "default",
          suffix: "",
        },
      ],
      sources: [],
      note: "",
    },
  ],
  texts: [],
  work: { title: "示例作品", date: "2026-10-04" },
  domain: { name: "MMD" },
};
export function TemplateEditor({
  value,
  onClose,
}: {
  value: Template;
  onClose: () => void;
}) {
  const [t, set] = useState(() => clone(value));
  const task = useTask();
  const names =
    t.language === "en"
      ? ["Model", "Motion", "Music"]
      : t.language === "ja"
        ? ["モデル", "モーション", "楽曲"]
        : ["模型", "动作", "音乐"];
  let output = "",
    error = "";
  try {
    output = render(t.source, {
      ...sample,
      rows: sample.rows.map((r, i) => ({ ...r, label: names[i] })),
    });
  } catch (e) {
    error = String(e);
  }
  const change = (
    key: keyof Template["format"],
    value: string | number | boolean,
  ) => {
    const format = { ...t.format, [key]: value };
    set({ ...t, format, source: sourceFromFormat(format) });
  };
  const fields: [keyof Template["format"], string][] = [
    ["header", "借物表标题"],
    ["left", "标题左装饰"],
    ["right", "标题右装饰"],
    ["labelLeft", "节点左装饰"],
    ["labelRight", "节点右装饰"],
    ["delimiter", "节点与内容分隔符"],
    ["joiner", "署名分隔符"],
    ["titleSeparator", "素材标题与署名分隔符"],
    ["suffix", "日语敬称后缀"],
  ];
  return (
    <Modal title="输出模板" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            render(t.source, sample);
            await store.update((s) => {
              const i = s.templates.findIndex((x) => x.id === t.id);
              if (i < 0) s.templates.push(t);
              else s.templates[i] = t;
            });
            onClose();
          }, "输出模板已保存");
        }}
      >
        <div className="form-grid">
          <Field label="模板名称">
            <input
              required
              value={t.name}
              onChange={(e) => set({ ...t, name: e.target.value })}
            />
          </Field>
          <Field label="标签语言">
            <select
              value={t.language}
              onChange={(e) => {
                const language = e.target.value as Template["language"];
                const format = defaultFormat(language, t.format.style);
                set({
                  ...t,
                  language,
                  format,
                  source:
                    t.mode === "visual" ? sourceFromFormat(format) : t.source,
                });
              }}
            >
              <option value="zh">中文</option>
              <option value="en">英文</option>
              <option value="ja">日文</option>
            </select>
          </Field>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={t.mode === "visual" ? "active" : ""}
            onClick={() => {
              if (
                t.mode === "code" &&
                !confirm("按可视化设置重新生成模板？当前手写语法将被替换")
              )
                return;
              set({ ...t, mode: "visual", source: sourceFromFormat(t.format) });
            }}
          >
            可视化设置
          </button>
          <button
            type="button"
            className={t.mode === "code" ? "active" : ""}
            onClick={() => set({ ...t, mode: "code" })}
          >
            模板语法
          </button>
        </div>
        <div className="template-editor-layout">
          <div>
            {t.mode === "visual" ? (
              <div className="form-grid">
                {fields
                  .filter(([key]) => key !== "suffix" || t.language === "ja")
                  .map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        value={String(t.format[key])}
                        onChange={(e) => change(key, e.target.value)}
                      />
                    </Field>
                  ))}
                {t.language === "en" && (
                  <Field label="字符样式">
                    <select
                      value={t.format.style}
                      onChange={(e) => change("style", e.target.value)}
                    >
                      {styles.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name} · {stylize("Model", id)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {(["headerGap", "rowGap"] as const).map((key) => (
                  <Field
                    key={key}
                    label={key === "headerGap" ? "标题后空行" : "行间空行"}
                  >
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={t.format[key]}
                      onChange={(e) =>
                        change(
                          key,
                          Math.max(0, Math.min(10, Number(e.target.value))),
                        )
                      }
                    />
                  </Field>
                ))}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={t.format.showSources}
                    onChange={(e) => change("showSources", e.target.checked)}
                  />
                  显示来源链接
                </label>
              </div>
            ) : (
              <>
                <textarea
                  className="code-editor"
                  aria-label="模板语法"
                  value={t.source}
                  onChange={(e) => set({ ...t, source: e.target.value })}
                  spellCheck={false}
                />
                <p className="muted fine-print">
                  {'{{header "借物表" left="【" right="】"}}'} · {"{{blank 1}}"}
                  <br />
                  {"{{#rows gap=0}}"} 循环，{"{{label}}"} 栏目，
                  {'{{credits | join:" / "}}'} 署名
                  <br />
                  {"{{#if title}}{{title}} — {{/if}}"} 可选标题
                  <br />
                  {"{{/rows}}"} 结束。可用 suffix、style、frame 过滤器
                </p>
              </>
            )}
          </div>
          <div className="template-sample">
            <span className="eyebrow">实时预览</span>
            <pre>{error || output}</pre>
          </div>
        </div>
        <footer className="modal-footer">
          {error && <span className="error">请先修正语法</span>}
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={!!error}>
            保存模板
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function Presets({
  initialTab = "source",
  onApplyWork,
  onImport,
}: {
  initialTab?: string;
  onApplyWork: (p: WorkPreset) => void;
  onImport: () => void;
}) {
  const s = useStateData(),
    [tab, setTab] = useState(initialTab),
    [source, setSource] = useState<SourcePreset | null>(null),
    [domain, setDomain] = useState<Domain | null>(null),
    [node, setNode] = useState<NodePreset | null>(null),
    [template, setTemplate] = useState<Template | null>(null),
    [include, setInclude] = useState(false);
  const task = useTask();
  const exportOne = (kind: ShareKind, id: string, name: string) =>
    void task(
      () =>
        platform.exportText(
          `${name}-预设.json`,
          JSON.stringify(share(s, kind, id, include), null, 2),
        ),
      "预设已导出",
    );
  const remove = (kind: ShareKind, id: string) => {
    if (!confirm("删除这个预设？已经保存的作品记录会保留")) return;
    void task(
      () =>
        store.update((d) => {
          if (kind === "source") {
            if (d.sourcePresets.length === 1)
              throw new Error("至少保留一个来源分类预设");
            d.sourcePresets = d.sourcePresets.filter((x) => x.id !== id);
          }
          if (kind === "template") {
            if (
              d.templates.length === 1 ||
              d.workPresets.some((p) => p.templateId === id)
            )
              throw new Error("模板被作品预设引用或是最后一个，请保留");
            d.templates = d.templates.filter((x) => x.id !== id);
          }
          if (kind === "node") {
            d.nodePresets = d.nodePresets.filter((x) => x.id !== id);
            d.workPresets.forEach((p) => {
              if (p.nodePresetId === id) p.nodePresetId = "";
            });
          }
          if (kind === "work")
            d.workPresets = d.workPresets.filter((x) => x.id !== id);
          if (kind === "domain") {
            if (
              d.domains.length === 1 ||
              d.works.some((w) => w.domainId === id) ||
              d.workPresets.some((p) => p.domainId === id)
            )
              throw new Error("领域是最后一个或存在作品引用，请保留");
            d.domains = d.domains.filter((x) => x.id !== id);
            d.nodePresets = d.nodePresets.filter((p) => p.domainId !== id);
          }
        }),
      "已删除预设",
    );
  };
  const add = () => {
    if (tab === "source")
      setSource({
        id: uid(),
        name: "新来源预设",
        target: "通用",
        categories: [
          { id: "author", label: "作者", author: true, honorific: true },
        ],
      });
    if (tab === "domain")
      setDomain({
        id: uid(),
        name: "新领域",
        nodes: [
          {
            id: uid(),
            label: "来源",
            en: "Source",
            ja: "出典",
            mode: "credits",
            text: "",
          },
        ],
      });
    if (tab === "node")
      setNode({
        id: uid(),
        name: "新节点预设",
        domainId: s.domains[0].id,
        nodeIds: [],
      });
    if (tab === "template") {
      const format = defaultFormat("zh");
      setTemplate({
        id: uid(),
        name: "新输出模板",
        language: "zh",
        mode: "visual",
        format,
        source: sourceFromFormat(format),
      });
    }
  };
  return (
    <>
      <PageHeader
        title="预设管理"
        description="管理来源分类、领域、节点、作品组合及输出模板"
        actions={
          <>
            <button onClick={onImport}>导入 JSON</button>
            <button onClick={() => exportOne("all", "", "全部")}>
              导出全部预设
            </button>
            {tab !== "work" && (
              <button className="primary" onClick={add}>
                ＋ 新建
              </button>
            )}
          </>
        }
      />
      <div className="tabs wide-tabs">
        {[
          ["source", "来源分类"],
          ["domain", "领域"],
          ["node", "节点预设"],
          ["work", "作品预设"],
          ["template", "输出模板"],
        ].map(([id, name]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "work" && (
        <label className="check">
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => setInclude(e.target.checked)}
          />
          导出作品预设时包含引用素材的公开信息（不含本地路径和私人备注）
        </label>
      )}
      <div className="card-grid">
        {tab === "source" &&
          s.sourcePresets.map((p) => (
            <div className="card" key={p.id}>
              <span className="eyebrow">{p.target || "通用"}</span>
              <h3>{p.name}</h3>
              <div className="chips">
                {p.categories.map((c) => (
                  <span className="chip" key={c.id}>
                    {c.label}
                    {c.author && <span className="required"> *</span>}
                  </span>
                ))}
              </div>
              <div className="small-actions">
                <button onClick={() => setSource(p)}>编辑</button>
                <button onClick={() => exportOne("source", p.id, p.name)}>
                  导出
                </button>
                <button
                  className="text danger"
                  onClick={() => remove("source", p.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        {tab === "domain" &&
          s.domains.map((d) => (
            <div className="card" key={d.id}>
              <span className="eyebrow">领域</span>
              <h3>{d.name}</h3>
              <p>{d.nodes.map((n) => n.label).join(" · ")}</p>
              <div className="small-actions">
                <button onClick={() => setDomain(d)}>编辑节点</button>
                <button onClick={() => exportOne("domain", d.id, d.name)}>
                  导出
                </button>
                <button
                  className="text danger"
                  onClick={() => remove("domain", d.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        {tab === "node" &&
          s.nodePresets.map((p) => (
            <div className="card" key={p.id}>
              <span className="eyebrow">
                {s.domains.find((d) => d.id === p.domainId)?.name}
              </span>
              <h3>{p.name}</h3>
              <p>
                {p.nodeIds
                  .map(
                    (id) =>
                      s.domains
                        .find((d) => d.id === p.domainId)
                        ?.nodes.find((n) => n.id === id)?.label,
                  )
                  .join(" · ") || "尚未选择节点"}
              </p>
              <div className="small-actions">
                <button onClick={() => setNode(p)}>编辑</button>
                <button onClick={() => exportOne("node", p.id, p.name)}>
                  导出
                </button>
                <button
                  className="text danger"
                  onClick={() => remove("node", p.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        {tab === "work" &&
          s.workPresets.map((p) => (
            <div className="card" key={p.id}>
              <span className="eyebrow">
                {s.domains.find((d) => d.id === p.domainId)?.name}
              </span>
              <h3>{p.name}</h3>
              <p>
                {p.bindings.length} 个节点 ·{" "}
                {new Set(p.bindings.flatMap((b) => b.materialIds)).size}{" "}
                份固定素材
              </p>
              <div className="small-actions">
                <button onClick={() => onApplyWork(p)}>套用与调整</button>
                <button onClick={() => exportOne("work", p.id, p.name)}>
                  导出
                </button>
                <button
                  className="text danger"
                  onClick={() => remove("work", p.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        {tab === "template" &&
          s.templates.map((t) => (
            <div className="card template-card" key={t.id}>
              <span className="eyebrow">
                {t.language === "zh"
                  ? "中文"
                  : t.language === "ja"
                    ? "日文"
                    : "英文"}{" "}
                · {t.mode === "visual" ? "可视化设置" : "自定义语法"}
              </span>
              <h3>{t.name}</h3>
              <pre>
                {t.format.left}
                {stylize(t.format.header, t.format.style)}
                {t.format.right}
              </pre>
              <div className="small-actions">
                <button onClick={() => setTemplate(t)}>编辑格式</button>
                <button onClick={() => exportOne("template", t.id, t.name)}>
                  导出
                </button>
                <button
                  className="text danger"
                  onClick={() => remove("template", t.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
      </div>
      {tab === "work" && !s.workPresets.length && (
        <Empty title="暂无作品预设" />
      )}
      {source && (
        <SourceEditor value={source} onClose={() => setSource(null)} />
      )}{" "}
      {domain && (
        <DomainEditor value={domain} onClose={() => setDomain(null)} />
      )}{" "}
      {node && <NodePresetEditor value={node} onClose={() => setNode(null)} />}{" "}
      {template && (
        <TemplateEditor value={template} onClose={() => setTemplate(null)} />
      )}
    </>
  );
}
