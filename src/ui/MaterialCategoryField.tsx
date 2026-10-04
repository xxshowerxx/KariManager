import { useId } from "react";
import { useStateData } from "../store";
import { Field } from "./common";

export function MaterialCategoryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const s = useStateData();
  const listId = useId();
  const categories = [
    ...new Set(
      [
        "模型",
        "动作",
        "镜头",
        "音乐",
        "场景",
        "特效",
        "配件",
        "表情",
        "口型",
        "编舞",
        "工具",
        "插件",
        ...s.materials.map((m) => m.category),
        ...s.folders.map((f) => f.category),
      ]
        .map((category) => category.trim())
        .filter(Boolean),
    ),
  ];
  const query = value.trim().toLowerCase();
  const matches = categories.filter((category) =>
    category.toLowerCase().includes(query),
  );

  return (
    <Field label="素材类别" hint="未创建的类别自动创建">
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {matches.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </Field>
  );
}
