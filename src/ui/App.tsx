import { useEffect, useState } from "react";
import { version } from "../../package.json";
import {
  clone,
  draftFor,
  type Draft,
  type Work,
  type WorkPreset,
  type State,
} from "../core/model";
import { mergeBundle, readImport, type Bundle } from "../core/sharing";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import { Library } from "./Library";
import { Composer } from "./Composer";
import { History } from "./History";
import { Presets } from "./Presets";
import { Folders } from "./Folders";
import { Settings } from "./Settings";
import { Modal, NoticeContext, message } from "./common";
import "./style.css";
export function App() {
  const s = useStateData(),
    [page, setPage] = useState("library"),
    [historyId, setHistoryId] = useState<string | null>(null),
    [draft, setDraft] = useState<Draft>(() => draftFor(s)),
    [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
      null,
    ),
    [imported, setImported] = useState<State | Bundle | null>(null),
    [presetTab, setPresetTab] = useState("source"),
    [presetKey, setPresetKey] = useState(0),
    [busy, setBusy] = useState(false);
  const notify = (text: string, error = false) => setNotice({ text, error });
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () => setNotice(null),
      notice.error ? 12000 : 6000,
    );
    return () => clearTimeout(timer);
  }, [notice]);
  function openWork(w: Work) {
    setDraft({
      workId: w.id,
      title: w.title,
      domainId: w.domainId,
      nodePresetId: w.nodePresetId,
      templateId: s.templates.some((t) => t.id === w.templateId)
        ? w.templateId
        : s.templates[0].id,
      bindings: clone(w.bindings),
      publicTexts: clone(w.publicTexts),
      materialSnapshots: clone(w.materialSnapshots),
      partySnapshots: clone(w.partySnapshots),
      sectionPresetId: w.sectionPresetId,
      sections: clone(w.sections),
    });
    setPage("compose");
  }
  function apply(p: WorkPreset) {
    setDraft({
      workId: "",
      editingPresetId: p.id,
      title: "",
      domainId: p.domainId,
      nodePresetId: p.nodePresetId,
      templateId: p.templateId,
      bindings: clone(p.bindings),
      publicTexts: clone(p.publicTexts),
      materialSnapshots: clone(p.materialSnapshots),
      partySnapshots: clone(p.partySnapshots),
      sectionPresetId: p.sectionPresetId,
      sections: clone(p.sections),
    });
    setPage("compose");
  }
  async function importFile() {
    try {
      const raw = await platform.importText();
      if (raw === null) return;
      const value = readImport(raw);
      if ("kind" in value) mergeBundle(s, value);
      setImported(value);
    } catch (e) {
      notify(message(e), true);
    }
  }
  async function confirmImport() {
    if (!imported || busy) return;
    setBusy(true);
    try {
      if ("kind" in imported)
        await store.update((d) => Object.assign(d, mergeBundle(d, imported)));
      else {
        const saved = await platform.exportText(
          "KariManager-恢复前备份.json",
          JSON.stringify(store.get(), null, 2),
        );
        if (!saved) {
          notify("已取消恢复；当前资料保留");
          return;
        }
        await store.replace(imported);
        setDraft(draftFor(imported));
      }
      setImported(null);
      notify("导入完成");
    } catch (e) {
      notify(message(e), true);
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    ["compose", "▤", "制作借物表"],
    ["presets", "⌘", "预设"],
    ["library", "◇", "资料库"],
    ["folders", "▱", "素材目录"],
    ["history", "◷", "作品记录"],
    ["settings", "⚙", "数据与设置"],
  ];
  return (
    <NoticeContext.Provider value={notify}>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div>
              <strong>KariManager</strong>
            </div>
          </div>
          <nav>
            {nav.map(([id, , label]) => (
              <button
                className={page === id ? "active" : ""}
                key={id}
                aria-label={label}
                onClick={() => {
                  setHistoryId(null);
                  setPage(id);
                }}
              >
                {label}
                {id === "library" && <small>{s.materials.length}</small>}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <span className="status-dot" />
            本地保存<small>v{version}</small>
          </div>
        </aside>
        <main className="main-content">
          {page === "library" && (
            <Library
              onOpenWork={(w) => {
                setHistoryId(w.id);
                setPage("history");
              }}
            />
          )}{" "}
          {page === "compose" && (
            <Composer
              draft={draft}
              setDraft={setDraft}
              onTemplates={() => {
                setPresetTab("template");
                setPresetKey((x) => x + 1);
                setPage("presets");
              }}
            />
          )}
          {page === "history" && (
            <History onOpen={openWork} initialWorkId={historyId} />
          )}{" "}
          {page === "folders" && <Folders />}
          {page === "presets" && (
            <Presets
              key={presetKey}
              initialTab={presetTab}
              onApplyWork={apply}
              onImport={() => void importFile()}
            />
          )}{" "}
          {page === "settings" && (
            <Settings onImport={() => void importFile()} />
          )}
        </main>
      </div>
      {notice && (
        <div
          className={`toast ${notice.error ? "toast-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button aria-label="关闭提示" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      {imported && (
        <Modal
          title={"kind" in imported ? "导入预设" : "恢复完整备份"}
          onClose={() => setImported(null)}
        >
          <p>
            {"kind" in imported
              ? "将作为新预设加入；同名条目不会覆盖"
              : "将替换全部当前资料。继续后先导出一份当前数据备份，取消备份则取消恢复"}
          </p>
          <div className="import-summary">
            {Object.entries("kind" in imported ? imported.data : imported)
              .filter(([, v]) => Array.isArray(v))
              .map(([k, v]) => (
                <div key={k}>
                  <span>
                    {(
                      {
                        domains: "领域",
                        sourcePresets: "来源分类",
                        nodePresets: "节点预设",
                        workPresets: "最终预设",
                        templates: "输出模板",
                        materials: "素材",
                        parties: "常用来源",
                        works: "作品记录",
                        folders: "目录映射",
                        sectionPresets: "分栏预设",
                      } as Record<string, string>
                    )[k] || k}
                  </span>
                  <strong>{(v as unknown[]).length}</strong>
                </div>
              ))}
          </div>
          <footer className="modal-footer">
            <button disabled={busy} onClick={() => setImported(null)}>
              取消
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void confirmImport()}
            >
              {busy ? "正在保存…" : "确认导入"}
            </button>
          </footer>
        </Modal>
      )}
    </NoticeContext.Provider>
  );
}
