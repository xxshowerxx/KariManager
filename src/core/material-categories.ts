import type { State } from "./model";

export const defaultMaterialCategories = [
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
];
export function materialCategories(s: State) {
  return [
    ...new Set(
      [
        ...(s.materialCategories ?? defaultMaterialCategories),
        ...s.materials.map((m) => m.category),
        ...s.folders.flatMap((f) => f.categories ?? [f.category]),
      ]
        .map((c) => c.trim())
        .filter(Boolean),
    ),
  ];
}
export function removeMaterialCategory(s: State, category: string) {
  s.materialCategories = materialCategories(s).filter((c) => c !== category);
  for (const m of s.materials)
    if (m.category.trim() === category) m.category = "";
  for (const f of s.folders) {
    f.categories = (f.categories ?? (f.category ? [f.category] : [])).filter(
      (c) => c.trim() !== category,
    );
    f.category = f.categories[0] ?? "";
  }
}
