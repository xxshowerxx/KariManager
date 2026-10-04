import {
  createContext,
  Children,
  cloneElement,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type ReactElement,
} from "react";
export const NoticeContext = createContext<
  (message: string, error?: boolean) => void
>(() => {});
export const useNotice = () => useContext(NoticeContext);
export function message(error: unknown) {
  if (error && typeof error === "object" && "issues" in error)
    return (
      error as { issues: { message: string; path: (string | number)[] }[] }
    ).issues
      .map((i) => `${i.path.join(".")}：${i.message}`)
      .slice(0, 3)
      .join("；");
  return error instanceof Error ? error.message : String(error);
}
export function useTask() {
  const notice = useNotice();
  return async (job: () => Promise<unknown>, success = "") => {
    try {
      await job();
      if (success) notice(success);
    } catch (e) {
      notice(message(e), true);
    }
  };
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        typeof child.type === "string" &&
        ["input", "select", "textarea"].includes(child.type)
          ? cloneElement(child as ReactElement<{ "aria-label"?: string }>, {
              "aria-label": label,
            })
          : child,
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
    >
      <header>
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="关闭"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">⌁</div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function move<T>(items: T[], index: number, delta: number) {
  const next = [...items],
    to = index + delta;
  if (to < 0 || to >= items.length) return next;
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
export function OrderButtons({
  index,
  length,
  onMove,
}: {
  index: number;
  length: number;
  onMove: (delta: number) => void;
}) {
  return (
    <span className="order-buttons">
      <button
        type="button"
        aria-label="上移"
        disabled={!index}
        onClick={() => onMove(-1)}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="下移"
        disabled={index === length - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </span>
  );
}
export const prettyDate = (iso: string) =>
  new Date(iso).toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="header-actions">{actions}</div>
    </div>
  );
}
