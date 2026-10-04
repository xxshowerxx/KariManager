import { useEffect, useState } from "react";
import * as platform from "../platform";
import { Modal, useTask } from "./common";

export function LocalFileActions({
  path,
  compact = false,
}: {
  path: string;
  compact?: boolean;
}) {
  const [notes, setNotes] = useState<platform.Entry[] | null>(null);
  const [available, setAvailable] = useState<platform.Entry[] | null>(null);
  const task = useTask();
  useEffect(() => {
    let active = true;
    setAvailable(null);
    setNotes(null);
    if (platform.desktop && !compact)
      void platform
        .noteFiles(path)
        .then((files) => {
          if (active) setAvailable(files);
        })
        .catch(() => {
          if (active) setAvailable([]);
        });
    return () => {
      active = false;
    };
  }, [path, compact]);
  return (
    <>
      <div className="small-actions local-file-actions">
        {!compact && (
          <button
            type="button"
            onClick={() => void task(() => platform.openTarget(path))}
          >
            打开
          </button>
        )}
        {!compact && (
          <button
            type="button"
            onClick={() => void task(() => platform.openDirectory(path))}
          >
            打开目录
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            void task(async () => {
              const files = available ?? (await platform.noteFiles(path));
              if (!files.length) throw new Error("没有说明文件");
              if (files.length === 1) await platform.openTarget(files[0].path);
              else setNotes(files);
            })
          }
        >
          说明文件
        </button>
      </div>
      {notes && (
        <Modal title="说明文件" onClose={() => setNotes(null)}>
          <div className="note-file-list">
            {notes.map((e) => (
              <div key={e.path} className="section-line">
                <span>{e.relativePath}</span>
                <button
                  type="button"
                  onClick={() => void task(() => platform.openTarget(e.path))}
                >
                  打开
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
