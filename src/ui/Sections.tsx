import { useState } from "react";
import {
  clone,
  uid,
  type OutputSection,
  type SectionPreset,
  type Template,
} from "../core/model";
import {
  newSection,
  presetSections,
  sectionNames,
  sectionSources,
} from "../core/sections";
import { compile, render, type Context } from "../core/template";
import { store } from "../store";
import * as platform from "../platform";
import { Field, Modal, OrderButtons, move, useTask } from "./common";

export function SectionsEditor({
  sections,
  onChange,
  preset = false,
}: {
  sections: OutputSection[];
  onChange: (sections: OutputSection[]) => void;
  preset?: boolean;
}) {
  const task = useTask();
  const patch = (index: number, value: Partial<OutputSection>) =>
    onChange(sections.map((s, i) => (i === index ? { ...s, ...value } : s)));
  return (
    <div className="output-sections">
      <div className="section-line">
        <h3>分栏</h3>
        <select
          aria-label="添加分栏"
          value=""
          onChange={(e) =>
            onChange([
              ...sections,
              newSection(e.target.value as OutputSection["kind"]),
            ])
          }
        >
          <option value="">＋ 添加分栏</option>
          {Object.entries(sectionNames)
            .filter(
              ([kind]) =>
                kind !== "credits" ||
                !sections.some((s) => s.kind === "credits"),
            )
            .map(([kind, name]) => (
              <option key={kind} value={kind}>
                {name}
              </option>
            ))}
        </select>
      </div>
      {sections.map((section, index) => (
        <section
          className="node-card"
          aria-label={`${sectionNames[section.kind]}分栏`}
          key={section.id}
        >
          <div className="section-line">
            <strong>{sectionNames[section.kind]}</strong>
            <div className="small-actions">
              <OrderButtons
                index={index}
                length={sections.length}
                onMove={(delta) => onChange(move(sections, index, delta))}
              />
              <button
                type="button"
                aria-label={`移除${sectionNames[section.kind]}分栏`}
                onClick={() =>
                  onChange(sections.filter((s) => s.id !== section.id))
                }
              >
                ×
              </button>
            </div>
          </div>
          {section.kind !== "credits" && (
            <Field label="栏标题">
              <input
                value={section.title}
                onChange={(e) => patch(index, { title: e.target.value })}
              />
            </Field>
          )}
          {(section.kind === "fixedText" ||
            (section.kind === "currentText" && !preset)) && (
            <Field label={sectionNames[section.kind]}>
              <textarea
                value={section.text}
                onChange={(e) => patch(index, { text: e.target.value })}
              />
            </Field>
          )}
          {section.kind === "creators" && (
            <>
              {section.creators.map((p, i) => (
                <div className="section-entry" key={p.id}>
                  <div className="form-grid">
                    {(
                      [
                        ["role", "分工"],
                        ["name", "姓名"],
                        ["handle", "账号"],
                        ["source", "来源"],
                      ] as const
                    ).map(([key, label]) => (
                      <Field key={key} label={label}>
                        <input
                          value={p[key]}
                          onChange={(e) =>
                            patch(index, {
                              creators: section.creators.map((item) =>
                                item.id === p.id
                                  ? {
                                      ...item,
                                      [key]:
                                        key === "handle"
                                          ? e.target.value.replace(/^@/, "")
                                          : e.target.value,
                                    }
                                  : item,
                              ),
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <div className="small-actions">
                    <OrderButtons
                      index={i}
                      length={section.creators.length}
                      onMove={(delta) =>
                        patch(index, {
                          creators: move(section.creators, i, delta),
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch(index, {
                          creators: section.creators.filter(
                            (x) => x.id !== p.id,
                          ),
                        })
                      }
                    >
                      移除人员
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch(index, {
                    creators: [
                      ...section.creators,
                      { id: uid(), role: "", name: "", handle: "", source: "" },
                    ],
                  })
                }
              >
                ＋ 添加人员
              </button>
            </>
          )}
          {section.kind === "references" && (
            <>
              {section.references.map((r, i) => (
                <div className="section-entry" key={r.id}>
                  <div className="form-grid">
                    <Field label="参考标题">
                      <input
                        value={r.title}
                        onChange={(e) =>
                          patch(index, {
                            references: section.references.map((x) =>
                              x.id === r.id
                                ? { ...x, title: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="参考来源">
                      <input
                        value={r.source}
                        placeholder="链接或 BV 号"
                        onChange={(e) =>
                          patch(index, {
                            references: section.references.map((x) =>
                              x.id === r.id
                                ? { ...x, source: e.target.value }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field label="参考作者">
                      <textarea
                        value={r.authors.join("\n")}
                        onChange={(e) =>
                          patch(index, {
                            references: section.references.map((x) =>
                              x.id === r.id
                                ? { ...x, authors: e.target.value.split("\n") }
                                : x,
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="small-actions">
                    <OrderButtons
                      index={i}
                      length={section.references.length}
                      onMove={(delta) =>
                        patch(index, {
                          references: move(section.references, i, delta),
                        })
                      }
                    />
                    {r.source && (
                      <button
                        type="button"
                        onClick={() =>
                          void task(() => platform.openTarget(r.source))
                        }
                      >
                        打开来源
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        patch(index, {
                          references: section.references.filter(
                            (x) => x.id !== r.id,
                          ),
                        })
                      }
                    >
                      移除参考
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch(index, {
                    references: [
                      ...section.references,
                      { id: uid(), title: "", source: "", authors: [] },
                    ],
                  })
                }
              >
                ＋ 添加参考
              </button>
            </>
          )}
        </section>
      ))}
    </div>
  );
}

export function SectionPresetEditor({
  value,
  onClose,
}: {
  value: SectionPreset;
  onClose: () => void;
}) {
  const [p, set] = useState(() => clone(value));
  const task = useTask();
  return (
    <Modal title="分栏预设" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task(async () => {
            await store.update((s) => {
              const item = { ...p, sections: presetSections(p.sections) };
              const i = s.sectionPresets.findIndex((x) => x.id === p.id);
              if (i < 0) s.sectionPresets.push(item);
              else s.sectionPresets[i] = item;
            });
            onClose();
          }, "分栏预设已保存");
        }}
      >
        <Field label="预设名称">
          <input
            required
            value={p.name}
            onChange={(e) => set({ ...p, name: e.target.value })}
          />
        </Field>
        <SectionsEditor
          sections={p.sections}
          preset
          onChange={(sections) => set({ ...p, sections })}
        />
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

const emptyRow = { label: "", title: "", credits: [], sources: [], note: "" };
const sampleContext: Context = {
  rows: [],
  texts: [],
  work: { title: "", date: "" },
  domain: { name: "" },
};
export function SectionTemplateFields({
  template,
  onChange,
}: {
  template: Template;
  onChange: (value: Template) => void;
}) {
  const [part, setPart] = useState<keyof typeof sectionSources>("layoutSource");
  const names = {
    layoutSource: "整体分栏",
    creatorSource: "制作人员",
    referenceSource: "参考来源",
    fixedTextSource: "固定说明",
    currentTextSource: "本次说明",
  };
  const source = template[part] ?? sectionSources[part];
  const rows =
    part === "layoutSource"
      ? [
          { ...emptyRow, title: "制作人员", content: "主讲：作者甲@account" },
          { ...emptyRow, content: "【借物表】\n【模型】作者乙" },
          { ...emptyRow, title: "参考", content: "参考视频 BV1KG411o7Cs" },
        ]
      : part === "creatorSource"
        ? [
            {
              ...emptyRow,
              role: "主讲",
              name: "作者甲",
              handle: "account",
              source: "",
            },
            {
              ...emptyRow,
              role: "助教",
              name: "作者乙",
              handle: "",
              source: "",
            },
          ]
        : part === "referenceSource"
          ? [{ ...emptyRow, title: "参考视频", source: "BV1KG411o7Cs" }]
          : [{ ...emptyRow, content: names[part] + "文字" }];
  let output = "";
  try {
    output = render(source, { ...sampleContext, rows });
  } catch (e) {
    output = String(e);
  }
  return (
    <div className="template-editor-layout">
      <div>
        <Field label="格式部分">
          <select
            value={part}
            onChange={(e) =>
              setPart(e.target.value as keyof typeof sectionSources)
            }
          >
            {Object.entries(names).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${names[part]}格式`}>
          <textarea
            className="code-editor"
            spellCheck={false}
            value={source}
            onChange={(e) => onChange({ ...template, [part]: e.target.value })}
          />
        </Field>
      </div>
      <div className="template-sample">
        <span className="eyebrow">实时预览</span>
        <pre>{output}</pre>
      </div>
    </div>
  );
}
export function validateSectionTemplates(t: Template) {
  for (const key of Object.keys(
    sectionSources,
  ) as (keyof typeof sectionSources)[])
    compile(t[key] ?? sectionSources[key]);
}
