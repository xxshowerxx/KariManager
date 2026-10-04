import { useId, useState } from "react";
import { useStateData } from "../store";
import { Field } from "./common";
import { materialCategories } from "../core/material-categories";

export function MaterialCategoryField({
  value,
  onChange,
  values,
  onValuesChange,
}: {
  value: string;
  onChange: (value: string) => void;
  values?: string[];
  onValuesChange?: (values: string[]) => void;
}) {
  const s = useStateData();
  const listId = useId();
  const categories = materialCategories(s);
  const query = value.trim().toLowerCase();
  const matches = categories.filter((category) =>
    category.toLowerCase().includes(query),
  );
  const [input, setInput] = useState("");
  const add = () => {
    const category = input.trim();
    if (category && onValuesChange)
      onValuesChange([...new Set([...(values ?? []), category])]);
    setInput("");
  };

  return (
    <Field label="素材类别" hint="未创建的类别自动创建">
      {values ? (
        <>
          <div className="chips">
            {values.map((category) => (
              <span className="chip" key={category}>
                {category}
                <button
                  type="button"
                  aria-label={`移除类别${category}`}
                  onClick={() =>
                    onValuesChange?.(values.filter((x) => x !== category))
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="input-actions">
            <input
              aria-label="素材类别"
              list={listId}
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
            <button type="button" onClick={add}>
              添加
            </button>
          </div>
        </>
      ) : (
        <input
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <datalist id={listId}>
        {(values
          ? categories.filter((c) =>
              c.toLowerCase().includes(input.trim().toLowerCase()),
            )
          : matches
        ).map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </Field>
  );
}
