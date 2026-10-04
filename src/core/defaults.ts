import type { Category, Format, State, Template } from "./model";
import { sourceFromFormat } from "./template";
import { newSection } from "./sections";
const category = (id: string, label: string, author = false): Category => ({
  id,
  label,
  author,
  honorific: author,
});
const categories: Record<string, Category> = {
  author: category("author", "作者", true),
  software: category("software", "制作软件"),
  website: category("website", "配布网站"),
  tools: category("tools", "工具"),
  copyright: category("copyright", "版权方／所属游戏"),
  choreo: category("choreo", "编舞参考", false),
  cover: { ...category("cover", "翻唱署名"), honorific: true },
  project: category("project", "项目来源"),
};
export function defaultFormat(
  language: Template["language"],
  style = "plain",
): Format {
  return {
    header:
      language === "zh"
        ? "借物表"
        : language === "ja"
          ? "お借りしたもの"
          : "Credits",
    left: language === "zh" ? "【" : "",
    right: language === "zh" ? "】" : "",
    labelLeft: language === "zh" ? "【" : "",
    labelRight: language === "zh" ? "】" : "",
    delimiter: language === "zh" ? "" : "：",
    joiner: " / ",
    titleSeparator: " — ",
    headerGap: 0,
    rowGap: 0,
    nodeGap: 0,
    labelNewline: false,
    style: language === "en" ? style : "plain",
    suffix: language === "ja" ? "様" : "",
    showSources: false,
    nodeJoiner: "・",
  };
}
export function defaults(): State {
  const defs = [
    ["music", "音乐", "Music", "楽曲", "title"],
    ["model", "模型", "Model", "モデル", "credits"],
    ["motion", "动作", "Motion", "モーション", "credits"],
    ["stage", "场景", "Stage", "ステージ", "credits"],
    ["camera", "镜头", "Camera", "カメラ", "credits"],
    ["effect", "特效", "Effect", "エフェクト", "credits"],
    ["tools", "工具", "Tools", "ツール", "credits"],
    ["accessory", "配件", "Accessory", "アクセサリ", "credits"],
    ["facial", "表情", "Facial", "表情", "credits"],
    ["lip", "口型", "Lip", "リップ", "credits"],
    ["choreography", "编舞", "Choreography", "振付", "credits"],
    ["plugins", "插件", "Plugins", "プラグイン", "credits"],
    ["created", "制作", "Created by", "制作", "text"],
  ];
  const sourceDefs: [string, string, string[], string][] = [
    ["simple", "简洁来源", ["author"], "通用"],
    [
      "general",
      "通用多来源",
      ["software", "website", "tools", "author"],
      "通用",
    ],
    [
      "model",
      "模型与配件来源",
      ["copyright", "software", "website", "tools", "author"],
      "模型、配件、道具",
    ],
    [
      "motion",
      "动作相关来源",
      ["software", "website", "tools", "choreo", "author"],
      "动作、表情、口型",
    ],
    ["camera", "镜头来源", ["software", "website", "tools", "author"], "镜头"],
    [
      "stage",
      "场景来源",
      ["copyright", "software", "website", "tools", "author"],
      "场景",
    ],
    [
      "effect",
      "特效来源",
      ["software", "website", "tools", "author"],
      "特效、MME",
    ],
    ["music", "音乐来源", ["author", "cover"], "音乐"],
    [
      "tools",
      "工具与插件来源",
      ["copyright", "project", "website", "author"],
      "工具、插件",
    ],
  ];
  const templateDefs: [string, string, Template["language"], string][] = [
    ["zh", "中文", "zh", "plain"],
    ["en", "普通英文", "en", "plain"],
    ["fancy", "花体英文", "en", "bold-italic"],
    ["ja", "日文", "ja", "plain"],
  ];
  return {
    schemaVersion: 1,
    parties: [],
    materials: [],
    works: [],
    folders: [],
    workPresets: [],
    sectionPresets: [
      {
        id: "sections-credits",
        name: "借物表",
        sections: [{ ...newSection("credits"), id: "section-credits" }],
      },
    ],
    domains: [
      {
        id: "mmd",
        name: "MMD",
        nodes: defs.map(([id, label, en, ja, mode]) => ({
          id,
          label,
          en,
          ja,
          mode: mode as "title" | "credits" | "text",
          text: "",
        })),
      },
    ],
    sourcePresets: sourceDefs.map(([id, name, ids, target]) => ({
      id: `source-${id}`,
      name,
      target,
      categories: ids.map((id) => ({ ...categories[id] })),
    })),
    nodePresets: [
      {
        id: "mmd-basic",
        name: "基础署名",
        domainId: "mmd",
        nodeIds: defs.slice(0, 7).map((d) => d[0]),
      },
      {
        id: "mmd-full",
        name: "详细署名",
        domainId: "mmd",
        nodeIds: defs.map((d) => d[0]),
      },
    ],
    templates: templateDefs.map(([id, name, language, style]) => {
      const format = defaultFormat(language, style);
      return {
        id: `template-${id}`,
        name,
        language,
        mode: "visual",
        format,
        source: sourceFromFormat(format),
      };
    }),
  };
}
