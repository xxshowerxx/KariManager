import { useState } from "react";
import { extensionList } from "../core/files";
import { Field } from "./common";

export function ExtensionField({
  label,
  values,
  onChange,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
}) {
  const [input, setInput] = useState("");
  function add() {
    onChange(extensionList([...values, input].join(",")));
    setInput("");
  }
  return (
    <Field label={label} hint={hint}>
      <div className="chips">
        {values.map((value) => (
          <span className="chip" key={value}>
            {value}
            <button
              type="button"
              aria-label={`移除${label}${value}`}
              onClick={() => onChange(values.filter((x) => x !== value))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="input-actions">
        <input
          aria-label={label}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" aria-label={`添加${label}`} onClick={add}>
          添加
        </button>
      </div>
    </Field>
  );
}
