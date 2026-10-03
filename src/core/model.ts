import { z } from "zod";

const id = z.string().min(1).max(100);
const text = z.string().max(100_000);
const list = z.array(text).max(1000);
export const categorySchema = z
  .object({
    id,
    label: z.string().min(1).max(100),
    author: z.boolean(),
    honorific: z.boolean(),
  })
  .strict();
export const partySchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(500),
    links: list,
    note: text,
    suffixMode: z.enum(["default", "none", "custom"]),
    suffix: text,
  })
  .strict();
export const sourcePresetSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    categories: z.array(categorySchema).min(1).max(40),
    target: text,
  })
  .strict();
export const materialSchema = z
  .object({
    id,
    name: text,
    sources: list,
    path: text,
    folderId: text,
    relativePath: text,
    note: text,
    tags: list,
    category: text,
    sourcePresetId: text,
    groups: z
      .array(
        z
          .object({ category: categorySchema, partyIds: z.array(id).max(1000) })
          .strict(),
      )
      .max(40),
  })
  .strict();
export const nodeSchema = z
  .object({
    id,
    label: z.string().min(1).max(100),
    en: text,
    ja: text,
    mode: z.enum(["credits", "title", "text"]),
    text,
  })
  .strict();
export const domainSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    nodes: z.array(nodeSchema).max(100),
  })
  .strict();
export const nodePresetSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    domainId: id,
    nodeIds: z.array(id).max(100),
  })
  .strict();
export const bindingSchema = z
  .object({
    nodeId: id,
    materialIds: z.array(id).max(1000),
    titleMode: z.boolean(),
    titleOverrides: z.record(text),
    text,
  })
  .strict();
export const formatSchema = z
  .object({
    header: text,
    left: text,
    right: text,
    labelLeft: text,
    labelRight: text,
    delimiter: text,
    joiner: text,
    titleSeparator: text,
    headerGap: z.number().int().min(0).max(10),
    rowGap: z.number().int().min(0).max(10),
    style: text,
    suffix: text,
    showSources: z.boolean(),
  })
  .strict();
export const templateSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    language: z.enum(["zh", "en", "ja"]),
    source: text,
    mode: z.enum(["visual", "code"]),
    format: formatSchema,
  })
  .strict();
export const workPresetSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    domainId: id,
    nodePresetId: text,
    bindings: z.array(bindingSchema).max(100),
    templateId: id,
    publicTexts: list,
  })
  .strict();
export const workSchema = z
  .object({
    id,
    title: z.string().min(1).max(1000),
    date: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    domainId: id,
    domainName: text,
    nodePresetId: text,
    bindings: z.array(bindingSchema).max(100),
    templateId: id,
    publicTexts: list,
    output: text,
    note: text.default(""),
    publishUrl: text.default(""),
    archived: z.boolean(),
    deletedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();
export const folderSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    path: z.string().min(1),
    category: text,
    recursive: z.boolean(),
    extensions: list,
    sourcePresetId: text,
  })
  .strict();
export const stateSchema = z
  .object({
    schemaVersion: z.literal(1),
    parties: z.array(partySchema).max(100_000),
    materials: z.array(materialSchema).max(100_000),
    domains: z.array(domainSchema).min(1).max(1000),
    sourcePresets: z.array(sourcePresetSchema).min(1).max(1000),
    nodePresets: z.array(nodePresetSchema).max(1000),
    workPresets: z.array(workPresetSchema).max(1000),
    templates: z.array(templateSchema).min(1).max(1000),
    works: z.array(workSchema).max(100_000),
    folders: z.array(folderSchema).max(1000),
  })
  .strict();
export type State = z.infer<typeof stateSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Party = z.infer<typeof partySchema>;
export type Material = z.infer<typeof materialSchema>;
export type SourcePreset = z.infer<typeof sourcePresetSchema>;
export type Domain = z.infer<typeof domainSchema>;
export type Node = z.infer<typeof nodeSchema>;
export type NodePreset = z.infer<typeof nodePresetSchema>;
export type Binding = z.infer<typeof bindingSchema>;
export type Format = z.infer<typeof formatSchema>;
export type Template = z.infer<typeof templateSchema>;
export type WorkPreset = z.infer<typeof workPresetSchema>;
export type Work = z.infer<typeof workSchema>;
export type Folder = z.infer<typeof folderSchema>;
export interface Draft {
  workId: string;
  editingPresetId?: string;
  title: string;
  domainId: string;
  nodePresetId: string;
  templateId: string;
  bindings: Binding[];
  publicTexts: string[];
}
export const uid = () => crypto.randomUUID();
export const clone = <T>(value: T): T => structuredClone(value);
export const cleanLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
export function materialName(m: Material) {
  return (
    m.name ||
    m.path.split(/[\\/]/).filter(Boolean).at(-1) ||
    m.sources[0] ||
    "未命名素材"
  );
}
export function materialPath(m: Material, s: State) {
  const root = s.folders.find((f) => f.id === m.folderId);
  return root && m.relativePath
    ? root.path.replace(/[\\/]$/, "") + "\\" + m.relativePath
    : m.path;
}
export function validateMaterial(m: Material, s: State) {
  materialSchema.parse(m);
  if (!(
    m.name.trim() ||
    m.sources.some((x) => x.trim()) ||
    m.path.trim() ||
    (m.folderId && m.relativePath)
  ))
    throw new Error("名称、来源链接、本地路径至少填写一项");
  if (
    !m.groups.some(
      (g) =>
        g.category.author &&
        g.partyIds.some((p) => s.parties.some((x) => x.id === p)),
    )
  )
    throw new Error("作者分类至少添加一位作者");
  for (const g of m.groups)
    for (const p of g.partyIds)
      if (!s.parties.some((x) => x.id === p))
        throw new Error("引用的署名条目不存在");
}
export function parseState(value: unknown): State {
  const s = stateSchema.parse(value);
  for (const group of [
    s.parties,
    s.materials,
    s.domains,
    s.sourcePresets,
    s.nodePresets,
    s.workPresets,
    s.templates,
    s.works,
    s.folders,
  ]) {
    if (new Set(group.map((x) => x.id)).size !== group.length)
      throw new Error("数据包含重复ID");
  }
  for (const p of s.sourcePresets) {
    if (!p.categories.some((c) => c.author))
      throw new Error("来源分类预设必须包含作者分类");
    if (new Set(p.categories.map((c) => c.id)).size !== p.categories.length)
      throw new Error("来源分类ID重复");
  }
  for (const d of s.domains)
    if (new Set(d.nodes.map((n) => n.id)).size !== d.nodes.length)
      throw new Error("节点ID重复");
  for (const m of s.materials) validateMaterial(m, s);
  for (const m of s.materials) {
    if (m.folderId && !s.folders.some((f) => f.id === m.folderId))
      throw new Error("素材引用的目录不存在");
    if (
      m.relativePath &&
      (/^[\\/]|^[a-z]:/i.test(m.relativePath) ||
        m.relativePath.split(/[\\/]/).includes(".."))
    )
      throw new Error("素材相对路径必须位于映射目录内");
    if (new Set(m.groups.map((g) => g.category.id)).size !== m.groups.length)
      throw new Error("素材来源分类ID重复");
  }
  for (const p of s.workPresets) {
    const d = s.domains.find((d) => d.id === p.domainId);
    if (!d || !s.templates.some((t) => t.id === p.templateId))
      throw new Error("作品预设的领域或输出模板不存在");
    if (
      p.nodePresetId &&
      !s.nodePresets.some(
        (n) => n.id === p.nodePresetId && n.domainId === p.domainId,
      )
    )
      throw new Error("作品预设的节点预设不存在");
    if (new Set(p.bindings.map((b) => b.nodeId)).size !== p.bindings.length)
      throw new Error("作品预设节点重复");
    for (const b of p.bindings)
      if (
        !d.nodes.some((n) => n.id === b.nodeId) ||
        b.materialIds.some((id) => !s.materials.some((m) => m.id === id))
      )
        throw new Error("作品预设引用了不存在的节点或素材");
  }
  for (const w of s.works) {
    const d = s.domains.find((d) => d.id === w.domainId);
    if (
      !d ||
      w.bindings.some(
        (b) =>
          !d.nodes.some((n) => n.id === b.nodeId) ||
          b.materialIds.some((id) => !s.materials.some((m) => m.id === id)),
      )
    )
      throw new Error("作品引用了不存在的领域、节点或素材");
  }
  for (const p of s.nodePresets) {
    const d = s.domains.find((x) => x.id === p.domainId);
    if (!d || p.nodeIds.some((n) => !d.nodes.some((x) => x.id === n)))
      throw new Error("节点预设引用了不存在的领域或节点");
    if (new Set(p.nodeIds).size !== p.nodeIds.length)
      throw new Error("节点预设包含重复节点");
  }
  return s;
}
export function usage(s: State, materialId: string) {
  return s.works
    .filter(
      (w) =>
        !w.deletedAt &&
        w.bindings.some((b) => b.materialIds.includes(materialId)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
export function newMaterial(p: SourcePreset): Material {
  return {
    id: uid(),
    name: "",
    sources: [],
    path: "",
    folderId: "",
    relativePath: "",
    note: "",
    tags: [],
    category: "模型",
    sourcePresetId: p.id,
    groups: p.categories.map((category) => ({
      category: clone(category),
      partyIds: [],
    })),
  };
}
export function draftFor(
  s: State,
  domainId = s.domains[0].id,
  presetId = "",
): Draft {
  const d = s.domains.find((x) => x.id === domainId)!;
  const p =
    s.nodePresets.find((x) => x.id === presetId) ||
    s.nodePresets.find((x) => x.domainId === domainId);
  const nodes = p
    ? p.nodeIds.map((id) => d.nodes.find((n) => n.id === id)!).filter(Boolean)
    : d.nodes;
  return {
    workId: "",
    title: "",
    domainId,
    nodePresetId: p?.id || "",
    templateId: s.templates[0].id,
    publicTexts: [],
    bindings: nodes.map((n) => ({
      nodeId: n.id,
      materialIds: [],
      titleMode: n.mode === "title",
      titleOverrides: {},
      text: n.text,
    })),
  };
}
export function saveWork(
  s: State,
  draft: Draft,
  output: string,
  now = new Date().toISOString(),
): Work {
  if (!output.trim()) throw new Error("借物表没有可输出的内容");
  const domain = s.domains.find((d) => d.id === draft.domainId);
  if (!domain) throw new Error("请选择有效领域");
  if (
    !draft.bindings.some((b) => b.materialIds.length || b.text.trim()) &&
    !draft.publicTexts.some((t) => t.trim())
  )
    throw new Error("至少选择一份素材或填写制作署名");
  for (const b of draft.bindings) {
    if (!domain.nodes.some((n) => n.id === b.nodeId))
      throw new Error("作品包含失效节点，请重新选择预设");
    for (const id of b.materialIds) {
      const m = s.materials.find((x) => x.id === id);
      if (!m) throw new Error("作品引用的素材已删除");
      validateMaterial(m, s);
    }
  }
  const previous = s.works.find((w) => w.id === draft.workId);
  const title =
    draft.title.trim() ||
    `${domain.name} ${new Date(now).toLocaleString("zh-CN", { hour12: false })}`;
  const w: Work = {
    id: previous?.id || uid(),
    title,
    date: previous?.date || now,
    updatedAt: now,
    domainId: domain.id,
    domainName: domain.name,
    nodePresetId: draft.nodePresetId,
    bindings: clone(draft.bindings),
    templateId: draft.templateId,
    publicTexts: clone(draft.publicTexts),
    output,
    note: previous?.note || "",
    publishUrl: previous?.publishUrl || "",
    archived: previous?.archived || false,
    deletedAt: null,
  };
  const i = s.works.findIndex((x) => x.id === w.id);
  if (i < 0) s.works.unshift(w);
  else s.works[i] = w;
  return w;
}
