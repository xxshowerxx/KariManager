import { expect, it } from "vitest";
import { defaults } from "../src/core/defaults";
import {
  materialCategories,
  removeMaterialCategory,
} from "../src/core/material-categories";
import { newMaterial, parseState } from "../src/core/model";
import { authorFromPath } from "../src/core/files";
import { share, mergeBundle } from "../src/core/sharing";

it("从文件名及最近的父目录识别 by 作者，排除摘要且保留中英文作者名", () => {
  for (const [path, directory, author] of [
    [
      "动作_by_桂花糕配西米露_a6ecc74e161edf9a2eca1438c9c2e917",
      true,
      "桂花糕配西米露",
    ],
    [
      "动作_by_若梦Romy_b781f98a7f3f14be8680e420663d5c41/motion.vmd",
      false,
      "若梦Romy",
    ],
    [
      "IRIS OUT_by_pronxy-追奈霖_300e43d1f56a24c3bc1c4a6e39a1a4b",
      true,
      "pronxy-追奈霖",
    ],
    [
      "IRIS OUT 镜头 by李莲听_by_莲下听月_396681716aa7439d3d46bca4aa3951c3",
      true,
      "莲下听月",
    ],
    ["D:\\by_父作者\\by_子作者\\by_文件作者.vmd", false, "文件作者"],
    ["by_jane.doe", true, "jane.doe"],
    ["BY_Author.pmx", false, "Author"],
    ["hobby_model.pmx", false, ""],
    ["by_396681716aa7439d3d46bca4aa3951c3.vmd", false, ""],
  ] as const)
    expect(authorFromPath(path, directory)).toBe(author);
});

it("旧数据收集已有分类，删除分类清除当前素材与目录引用，保留记录", () => {
  const s = defaults();
  const m = newMaterial(s.sourcePresets[0]);
  m.category = " 自定义 ";
  s.materials.push(m);
  s.folders.push({
    id: "folder",
    name: "目录",
    path: "D:/models",
    category: "自定义",
    categories: ["自定义", "模型"],
    recursive: true,
    extensions: [],
    sourcePresetId: s.sourcePresets[0].id,
  });
  expect(materialCategories(s)).toContain("自定义");
  removeMaterialCategory(s, "自定义");
  expect(s.materials[0].category).toBe("");
  expect(s.folders[0].categories).toEqual(["模型"]);
  expect(materialCategories(s)).not.toContain("自定义");
  removeMaterialCategory(s, "模型");
  expect(materialCategories(s)).not.toContain("模型");
  expect(s.materials).toHaveLength(1);
});

it("未使用的分类随完整备份与全部预设导出导入保留", () => {
  const s = defaults();
  s.materialCategories = ["未使用分类"];
  expect(parseState(JSON.parse(JSON.stringify(s))).materialCategories).toEqual([
    "未使用分类",
  ]);
  const imported = mergeBundle(defaults(), share(s, "all"));
  expect(materialCategories(imported)).toContain("未使用分类");
});
