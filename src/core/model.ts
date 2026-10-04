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
    handle: text.optional(),
  })
  .strict();
export const sourcePresetSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    categories: z.array(categorySchema).min(1).max(40),
    target: text,
    showHonorific: z.boolean().optional(),
  })
  .strict();
export const materialSchema = z
  .object({
    id,
    name: text,
    sources: list,
    path: text,
    pathKind: z.enum(["file", "directory"]).optional(),
    createdAt: z.string().datetime({ offset: true }).optional(),
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
    mergedNodeIds: z.array(id).max(100).optional(),
    text,
  })
  .strict();
export const sectionSchema = z
  .object({
    id,
    kind: z.enum([
      "credits",
      "creators",
      "fixedText",
      "currentText",
      "references",
    ]),
    title: text,
    text,
    creators: z
      .array(
        z
          .object({ id, role: text, name: text, handle: text, source: text })
          .strict(),
      )
      .max(1000),
    references: z
      .array(
        z.object({ id, title: text, source: text, authors: list }).strict(),
      )
      .max(1000),
  })
  .strict();
export const sectionPresetSchema = z
  .object({
    id,
    name: z.string().min(1).max(100),
    sections: z.array(sectionSchema).min(1).max(40),
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
    nodeJoiner: text.optional(),
    labelNewline: z.boolean().optional(),
    nodeGap: z.number().int().min(0).max(10).optional(),
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
    layoutSource: text.optional(),
    creatorSource: text.optional(),
    referenceSource: text.optional(),
    fixedTextSource: text.optional(),
    currentTextSource: text.optional(),
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
    materialSnapshots: z.array(materialSchema).max(1000).optional(),
    partySnapshots: z.array(partySchema).max(40_000).optional(),
    sectionPresetId: text.optional(),
    sections: z.array(sectionSchema).max(40).optional(),
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
    materialSnapshots: z.array(materialSchema).max(1000).optional(),
    partySnapshots: z.array(partySchema).max(40_000).optional(),
    sectionPresetId: text.optional(),
    sections: z.array(sectionSchema).max(40).optional(),
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
    excludedExtensions: list.optional(),
    categories: list.optional(),
    hiddenPaths: list.optional(),
    sourcePresetId: text,
  })
  .strict();
export const stateSchema = z
  .object({
    schemaVersion: z.literal(1),
    parties: z.array(partySchema).max(100_000),
    materials: z.array(materialSchema).max(100_000),
    materialCategories: z
      .array(z.string().trim().min(1).max(100))
      .max(1000)
      .optional(),
    domains: z.array(domainSchema).min(1).max(1000),
    sourcePresets: z.array(sourcePresetSchema).min(1).max(1000),
    nodePresets: z.array(nodePresetSchema).max(1000),
    workPresets: z.array(workPresetSchema).max(1000),
    templates: z.array(templateSchema).min(1).max(1000),
    works: z.array(workSchema).max(100_000),
    folders: z.array(folderSchema).max(1000),
    sectionPresets: z.array(sectionPresetSchema).max(1000).default([]),
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
export type OutputSection = z.infer<typeof sectionSchema>;
export type SectionPreset = z.infer<typeof sectionPresetSchema>;
export interface Draft {
  workId: string;
  editingPresetId?: string;
  title: string;
  domainId: string;
  nodePresetId: string;
  templateId: string;
  bindings: Binding[];
  publicTexts: string[];
  materialSnapshots?: Material[];
  partySnapshots?: Party[];
  sectionPresetId?: string;
  sections?: OutputSection[];
}
export interface MaterialSnapshots {
  materialSnapshots?: Material[];
  partySnapshots?: Party[];
}
export function withSnapshots(s: State, snapshots: MaterialSnapshots): State {
  return {
    ...s,
    materials: [
      ...s.materials,
      ...(snapshots.materialSnapshots ?? []).filter(
        (m) => !s.materials.some((x) => x.id === m.id),
      ),
    ],
    parties: [
      ...s.parties,
      ...(snapshots.partySnapshots ?? []).filter(
        (p) => !s.parties.some((x) => x.id === p.id),
      ),
    ],
  };
}
export function snapshotsFor(s: State, bindings: Binding[]): MaterialSnapshots {
  const ids = new Set(bindings.flatMap((b) => b.materialIds));
  const materials = s.materials
    .filter((m) => ids.has(m.id))
    .map((m) => ({
      ...clone(m),
      path: materialPath(m, s),
      folderId: "",
      relativePath: "",
    }));
  const partyIds = new Set(
    materials.flatMap((m) => m.groups.flatMap((g) => g.partyIds)),
  );
  return {
    materialSnapshots: materials,
    partySnapshots: clone(s.parties.filter((p) => partyIds.has(p.id))),
  };
}
function validateSnapshots(s: State, record: MaterialSnapshots) {
  for (const list of [
    record.materialSnapshots ?? [],
    record.partySnapshots ?? [],
  ])
    if (new Set(list.map((x) => x.id)).size !== list.length)
      throw new Error("素材快照ID重复");
  const view = withSnapshots(s, record);
  for (const m of record.materialSnapshots ?? []) validateMaterial(m, view);
  return view;
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
    s.sectionPresets,
  ]) {
    if (new Set(group.map((x) => x.id)).size !== group.length)
      throw new Error("数据包含重复ID");
  }
  for (const p of s.sourcePresets) {
    if (!p.categories.some((c) => c.author))
      throw new Error("来源预设必须包含作者分类");
    if (new Set(p.categories.map((c) => c.id)).size !== p.categories.length)
      throw new Error("来源分类ID重复");
  }
  for (const record of [...s.sectionPresets, ...s.workPresets, ...s.works]) {
    const sections = record.sections ?? [];
    if (new Set(sections.map((x) => x.id)).size !== sections.length)
      throw new Error("分栏ID重复");
    if (sections.filter((x) => x.kind === "credits").length > 1)
      throw new Error("借物表栏只能添加一次");
    for (const section of sections)
      for (const items of [section.creators, section.references])
        if (new Set(items.map((x) => x.id)).size !== items.length)
          throw new Error("分栏条目ID重复");
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
    const view = validateSnapshots(s, p);
    const d = s.domains.find((d) => d.id === p.domainId);
    if (!d || !s.templates.some((t) => t.id === p.templateId))
      throw new Error("最终预设的领域或输出模板不存在");
    validateMerges(p.bindings, d);
    if (
      p.nodePresetId &&
      !s.nodePresets.some(
        (n) => n.id === p.nodePresetId && n.domainId === p.domainId,
      )
    )
      throw new Error("最终预设的节点预设不存在");
    if (new Set(p.bindings.map((b) => b.nodeId)).size !== p.bindings.length)
      throw new Error("最终预设节点重复");
    for (const b of p.bindings)
      if (
        !d.nodes.some((n) => n.id === b.nodeId) ||
        b.materialIds.some((id) => !view.materials.some((m) => m.id === id))
      )
        throw new Error("最终预设引用了不存在的节点或素材");
  }
  for (const w of s.works) {
    const view = validateSnapshots(s, w);
    const d = s.domains.find((d) => d.id === w.domainId);
    if (
      !d ||
      w.bindings.some(
        (b) =>
          !d.nodes.some((n) => n.id === b.nodeId) ||
          b.materialIds.some((id) => !view.materials.some((m) => m.id === id)),
      )
    )
      throw new Error("作品引用了不存在的领域、节点或素材");
    validateMerges(w.bindings, d!);
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
export function validateMerges(bindings: Binding[], domain: Domain) {
  const used = new Set<string>();
  for (const b of bindings)
    for (const id of b.mergedNodeIds ?? []) {
      const target = bindings.find((x) => x.nodeId === id);
      if (
        id === b.nodeId ||
        !target ||
        used.has(id) ||
        target.mergedNodeIds?.length ||
        domain.nodes.find((n) => n.id === id)?.mode === "text" ||
        domain.nodes.find((n) => n.id === b.nodeId)?.mode === "text"
      )
        throw new Error("合并节点无效或重复");
      used.add(id);
    }
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
    createdAt: new Date().toISOString(),
    name: "",
    sources: [],
    path: "",
    folderId: "",
    relativePath: "",
    note: "",
    tags: [],
    category: "",
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
    sectionPresetId: s.sectionPresets[0]?.id ?? "",
    sections: clone(s.sectionPresets[0]?.sections),
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
  const view = withSnapshots(s, draft);
  if (!output.trim()) throw new Error("借物表没有可输出的内容");
  const domain = s.domains.find((d) => d.id === draft.domainId);
  if (!domain) throw new Error("请选择有效领域");
  validateMerges(draft.bindings, domain);
  if (
    !draft.bindings.some((b) => b.materialIds.length || b.text.trim()) &&
    !draft.publicTexts.some((t) => t.trim()) &&
    !draft.sections?.some((section) =>
      section.kind === "creators"
        ? section.creators.some((p) => p.name.trim())
        : section.kind === "references"
          ? section.references.some((r) => r.title.trim() || r.source.trim())
          : (section.kind === "fixedText" || section.kind === "currentText") &&
            section.text.trim(),
    )
  )
    throw new Error("至少选择一份素材或填写制作署名");
  for (const b of draft.bindings) {
    if (!domain.nodes.some((n) => n.id === b.nodeId))
      throw new Error("作品包含失效节点，请重新选择预设");
    for (const id of b.materialIds) {
      const m = view.materials.find((x) => x.id === id);
      if (!m) throw new Error("作品引用的素材已删除");
      validateMaterial(m, view);
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
    ...snapshotsFor(view, draft.bindings),
    sectionPresetId: draft.sectionPresetId,
    sections: clone(draft.sections),
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
