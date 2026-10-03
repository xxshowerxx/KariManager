import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { store } from "./store";
import "./ui/style.css";
const root = createRoot(document.getElementById("root")!);
root.render(<div className="boot">KariManager · 正在打开资料库…</div>);
store
  .initialize()
  .then(() =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  )
  .catch((error) =>
    root.render(
      <div className="boot error">
        <h1>资料库未能打开</h1>
        <p>{String(error)}</p>
        <p>现有数据未被覆盖。请检查数据目录，或恢复最近的备份。</p>
        <button onClick={() => location.reload()}>重试</button>
      </div>,
    ),
  );
