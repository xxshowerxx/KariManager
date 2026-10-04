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
      <PageHeader title="数据与设置" description="KariManager · 0.1.0" />
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
          <p className="muted fine-print">
            完整备份包含本地路径、私人备注和历史记录。公开分享请在“预设”页导出
          </p>
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
          <p className="muted">
            归档保留使用次数；删除记录扣除次数，恢复后加回。历史借物表保留当时快照
          </p>
        </article>
        <article className="card">
          <span className="eyebrow">便携版</span>
          <h3>解压，打开，开始记录</h3>
          <p>
            正式版默认把数据库保存到程序旁的 data
            文件夹。整个文件夹一起移动，就能带走资料
          </p>
          <p className="muted">
            目录需要可写。Windows 需要 Microsoft Edge WebView2
            运行时；程序使用系统已有运行时
          </p>
        </article>
      </div>
    </>
  );
}
