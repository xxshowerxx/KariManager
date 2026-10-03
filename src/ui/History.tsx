import { useState } from "react";
import { clone, type Work } from "../core/model";
import { store, useStateData } from "../store";
import * as platform from "../platform";
import { Empty, Field, Modal, PageHeader, prettyDate, useTask } from "./common";
export function History({
  onOpen,
  initialWorkId = null,
}: {
  onOpen: (w: Work) => void;
  initialWorkId?: string | null;
}) {
  const s = useStateData(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("active"),
    [detail, setDetail] = useState<string | null>(initialWorkId),
    [edit, setEdit] = useState<Work | null>(null);
  const task = useTask();
  const works = s.works.filter(
    (w) =>
      w.title.toLowerCase().includes(q.toLowerCase()) &&
      (filter === "trash"
        ? !!w.deletedAt
        : !w.deletedAt && (filter === "archived" ? w.archived : !w.archived)),
  );
  const selected = s.works.find((w) => w.id === detail);
  return (
    <>
      <PageHeader
        title="作品记录"
        description="作品记录随输出自动建立，保留当时的完整署名。"
      />
      <div className="toolbar">
        <input
          className="search"
          aria-label="搜索作品"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索作品标题…"
        />
        <select
          aria-label="作品状态"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">近期作品</option>
          <option value="archived">已归档</option>
          <option value="trash">回收记录</option>
        </select>
      </div>
      {works.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>作品标题</th>
                <th>领域</th>
                <th>日期</th>
                <th>素材</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {works.map((w) => (
                <tr key={w.id}>
                  <td>
                    <button
                      className="work-title"
                      onClick={() => setDetail(w.id)}
                    >
                      {w.title}
                    </button>
                  </td>
                  <td>{w.domainName}</td>
                  <td>{prettyDate(w.date)}</td>
                  <td>
                    {new Set(w.bindings.flatMap((b) => b.materialIds)).size}{" "}
                    份素材
                  </td>
                  <td>
                    <button onClick={() => setDetail(w.id)}>查看记录 →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={filter === "active" ? "暂无作品记录" : "暂无记录"}
          description="选入素材并输出借物表，就会保存日期、领域与使用记录。"
        />
      )}
      {selected && (
        <Modal title={selected.title} onClose={() => setDetail(null)} wide>
          <div className="detail-summary">
            <span className="badge">{selected.domainName}</span>
            <span>{prettyDate(selected.date)}</span>
          </div>
          <p className="muted">{selected.note}</p>
          {selected.publishUrl && (
            <button
              onClick={() =>
                void task(() => platform.openTarget(selected.publishUrl))
              }
            >
              打开作品链接 ↗
            </button>
          )}
          <pre className="history-output">{selected.output}</pre>
          <div className="small-actions">
            <button
              onClick={() =>
                void task(
                  () => platform.clipboard(selected.output),
                  "已复制历史借物表",
                )
              }
            >
              复制原文
            </button>
            <button
              onClick={() =>
                void task(
                  () =>
                    platform.exportText("借物表.txt", selected.output, "txt"),
                  "已导出原文",
                )
              }
            >
              导出 TXT
            </button>
            <button
              onClick={() => {
                setEdit(clone(selected));
                setDetail(null);
              }}
            >
              编辑记录
            </button>
            {!selected.deletedAt && (
              <button
                onClick={() => {
                  setDetail(null);
                  onOpen(selected);
                }}
              >
                继续制作
              </button>
            )}
          </div>
          <footer className="modal-footer">
            {selected.deletedAt ? (
              <button
                onClick={() =>
                  void task(
                    () =>
                      store
                        .update((d) => {
                          d.works.find((w) => w.id === selected.id)!.deletedAt =
                            null;
                        })
                        .then(() => setDetail(null)),
                    "作品已恢复",
                  )
                }
              >
                恢复作品
              </button>
            ) : (
              <>
                <button
                  onClick={() =>
                    void task(
                      () =>
                        store
                          .update((d) => {
                            d.works.find(
                              (w) => w.id === selected.id,
                            )!.archived = !selected.archived;
                          })
                          .then(() => setDetail(null)),
                      selected.archived ? "已取消归档" : "已归档，使用次数保留",
                    )
                  }
                >
                  {selected.archived ? "取消归档" : "归档"}
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      !confirm(
                        "删除作品记录？使用次数会扣除，可以在回收记录中恢复。",
                      )
                    )
                      return;
                    void task(
                      () =>
                        store
                          .update((d) => {
                            d.works.find(
                              (w) => w.id === selected.id,
                            )!.deletedAt = new Date().toISOString();
                          })
                          .then(() => setDetail(null)),
                      "已移入回收记录",
                    );
                  }}
                >
                  删除记录
                </button>
              </>
            )}
          </footer>
        </Modal>
      )}
      {edit && (
        <Modal title="编辑作品信息" onClose={() => setEdit(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void task(
                () =>
                  store
                    .update((d) => {
                      const i = d.works.findIndex((w) => w.id === edit.id);
                      d.works[i] = edit;
                    })
                    .then(() => setEdit(null)),
                "作品信息已更新",
              );
            }}
          >
            <Field label="作品标题">
              <input
                required
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </Field>
            <Field label="日期">
              <input
                type="datetime-local"
                value={new Date(
                  new Date(edit.date).getTime() -
                    new Date(edit.date).getTimezoneOffset() * 60000,
                )
                  .toISOString()
                  .slice(0, 16)}
                onChange={(e) => {
                  if (e.target.value)
                    setEdit({
                      ...edit,
                      date: new Date(e.target.value).toISOString(),
                    });
                }}
              />
            </Field>
            <Field label="作品链接">
              <input
                value={edit.publishUrl}
                onChange={(e) =>
                  setEdit({ ...edit, publishUrl: e.target.value })
                }
              />
            </Field>
            <Field label="补充备注">
              <textarea
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </Field>
            <p className="muted">
              领域：{edit.domainName} · 原借物表保持当时快照
            </p>
            <footer className="modal-footer">
              <button type="button" onClick={() => setEdit(null)}>
                取消
              </button>
              <button className="primary">保存信息</button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
