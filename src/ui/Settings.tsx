import { useEffect, useState } from "react";
import { useStateData } from "../store";
import * as platform from "../platform";
import { PageHeader, useNotice, useTask } from "./common";
export function Settings({ onImport }: { onImport: () => void }) {
  const s = useStateData(),
    [location, setLocation] = useState("读取中…"),
    task = useTask(),
    notice = useNotice();
  useEffect(() => {
    void task(async () => setLocation(await platform.dataLocation()));
  }, []);
  return (
    <>
      <PageHeader title="数据与设置" />
      <div className="settings-grid">
        <article className="card">
          <span className="eyebrow">存储与备份</span>
          <h3>{platform.desktop ? "本地 SQLite 数据库" : "浏览器开发预览"}</h3>
          <p className="path-text">{location}</p>
          <p className="muted">
            {s.materials.length} 份素材 · {s.parties.length} 个常用来源 ·{" "}
            {s.works.filter((w) => !w.deletedAt).length} 个作品
          </p>
          <div className="small-actions">
            <button
              onClick={() =>
                void task(
                  () =>
                    platform.exportText(
                      "KariManager-完整备份.json",
                      JSON.stringify(s, null, 2),
                    ),
                  "完整备份已导出",
                )
              }
            >
              导出完整 JSON 备份
            </button>
            <button onClick={onImport}>导入 / 恢复</button>
            {platform.desktop && (
              <>
                <button
                  onClick={() =>
                    void task(async () => {
                      const path = await platform.backupDatabase();
                      notice(`数据库备份：${path}`);
                    })
                  }
                >
                  备份 SQLite
                </button>
                <button
                  onClick={() =>
                    void task(async () => {
                      const path = await platform.pickPath(true);
                      if (!path) return;
                      setLocation(await platform.moveDatabase(path));
                      notice("数据目录已切换，原数据库保留作为备份");
                    })
                  }
                >
                  迁移数据目录
                </button>
              </>
            )}
          </div>
        </article>
        <article className="card">
          <span className="eyebrow">使用方式</span>
          <h3>从素材到借物表</h3>
          <ol className="guide-list">
            <li>资料库添加素材：至少一个作者，名称、链接、路径任选一项</li>
            <li>制作借物表：选择领域、节点与素材，预览后输出</li>
            <li>输出时保存作品；修改同一作品只更新记录</li>
            <li>新创作点“新作品”。素材详情可以回看每次使用</li>
          </ol>
        </article>
      </div>
    </>
  );
}
