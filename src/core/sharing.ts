import { z } from "zod";
import {
  clone,
  uid,
  parseState,
  materialName,
  stateSchema,
  type State,
} from "./model";
import { compile } from "./template";
const sharedKeys = [
  "domains",
  "sourcePresets",
  "nodePresets",
  "workPresets",
  "templates",
  "materials",
  "parties",
] as const;
const bundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("kari-presets"),
    name: z.string(),
    data: stateSchema
      .pick({
        domains: true,
        sourcePresets: true,
        nodePresets: true,
        workPresets: true,
        templates: true,
        materials: true,
        parties: true,
      })
      .partial()
      .strict(),
  })
  .strict();
export type Bundle = z.infer<typeof bundleSchema>;
export type ShareKind =
  "all" | "domain" | "source" | "node" | "work" | "template";
export function share(
  s: State,
  kind: ShareKind,
  id = "",
  includeMaterials = false,
): Bundle {
  const data: Bundle["data"] = {};
  const work =
    kind === "work"
      ? s.workPresets.filter((x) => x.id === id)
      : kind === "all"
        ? s.workPresets
        : [];
  const domainIds =
    kind === "domain"
      ? [id]
      : kind === "node"
        ? s.nodePresets.filter((x) => x.id === id).map((x) => x.domainId)
        : work.map((w) => w.domainId);
  data.domains = clone(
    kind === "all"
      ? s.domains
      : s.domains.filter((d) => domainIds.includes(d.id)),
  );
  // Empty lists are omitted because the persisted-state schema requires at least one domain/template.
  if (!data.domains.length) delete data.domains;
  data.nodePresets = clone(
    kind === "all"
      ? s.nodePresets
      : s.nodePresets.filter((p) =>
          kind === "node" ? p.id === id : domainIds.includes(p.domainId),
        ),
  );
  data.sourcePresets = clone(
    kind === "source"
      ? s.sourcePresets.filter((p) => p.id === id)
      : kind === "all" || kind === "domain"
        ? s.sourcePresets
        : [],
  );
  data.workPresets = clone(work);
  const templateIds = work.map((w) => w.templateId);
  data.templates = clone(
    kind === "all"
      ? s.templates
      : s.templates.filter((t) =>
          kind === "template" ? t.id === id : templateIds.includes(t.id),
        ),
  );
  if (!data.templates.length) delete data.templates;
  if (includeMaterials) {
    const ids = new Set(
      work.flatMap((w) => w.bindings.flatMap((b) => b.materialIds)),
    );
    data.materials = clone(s.materials.filter((m) => ids.has(m.id)));
    for (const m of data.materials) {
      m.name = materialName(m);
      m.path = "";
      m.folderId = "";
      m.relativePath = "";
      m.note = "";
    }
    data.sourcePresets ||= [];
    for (const id of new Set(data.materials.map((m) => m.sourcePresetId))) {
      const preset = s.sourcePresets.find((p) => p.id === id);
      if (preset && !data.sourcePresets.some((p) => p.id === id))
        data.sourcePresets.push(clone(preset));
    }
    const partyIds = new Set(
      data.materials.flatMap((m) => m.groups.flatMap((g) => g.partyIds)),
    );
    data.parties = clone(s.parties.filter((p) => partyIds.has(p.id)));
    for (const p of data.parties) p.note = "";
  } else
    for (const w of data.workPresets)
      for (const b of w.bindings) {
        b.materialIds = [];
        b.titleOverrides = {};
      }
  for (const key of sharedKeys) if (data[key]?.length === 0) delete data[key];
  return {
    schemaVersion: 1,
    kind: "kari-presets",
    name: kind === "all" ? "全部预设" : kind,
    data,
  };
}
export function readImport(text: string): State | Bundle {
  if (text.length > 20 * 1024 * 1024) throw new Error("导入文件超过20MB");
  const value: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (value && typeof value === "object" && "kind" in value) {
    const b = bundleSchema.parse(value);
    for (const t of b.data.templates || []) compile(t.source);
    return b;
  }
  const s = parseState(value);
  for (const t of s.templates) compile(t.source);
  return s;
}
export function mergeBundle(current: State, bundle: Bundle): State {
  const s = clone(current),
    data = clone(bundle.data);
  const maps: Record<string, Map<string, string>> = {};
  for (const key of sharedKeys)
    maps[key] = new Map((data[key] || []).map((x) => [x.id, uid()]));
  const nodes = new Map<string, string>();
  for (const d of data.domains || [])
    for (const n of d.nodes) nodes.set(`${d.id}:${n.id}`, uid());
  const remap = (key: string, id: string) => maps[key].get(id) || id;
  for (const d of data.domains || []) {
    const old = d.id;
    d.id = remap("domains", old);
    d.name += "（导入）";
    for (const n of d.nodes) n.id = nodes.get(`${old}:${n.id}`)!;
  }
  for (const p of data.nodePresets || []) {
    const oldDomain = p.domainId;
    p.id = remap("nodePresets", p.id);
    p.domainId = remap("domains", oldDomain);
    p.nodeIds = p.nodeIds.map((id) => nodes.get(`${oldDomain}:${id}`) || id);
    p.name += "（导入）";
  }
  for (const p of data.workPresets || []) {
    const oldDomain = p.domainId;
    p.id = remap("workPresets", p.id);
    p.domainId = remap("domains", oldDomain);
    p.nodePresetId = remap("nodePresets", p.nodePresetId);
    p.templateId = remap("templates", p.templateId);
    p.name += "（导入）";
    for (const b of p.bindings) {
      b.nodeId = nodes.get(`${oldDomain}:${b.nodeId}`) || b.nodeId;
      if (b.mergedNodeIds)
        b.mergedNodeIds = b.mergedNodeIds.map(
          (id) => nodes.get(`${oldDomain}:${id}`) || id,
        );
      b.materialIds = b.materialIds.map((id) => remap("materials", id));
      b.titleOverrides = Object.fromEntries(
        Object.entries(b.titleOverrides).map(([id, v]) => [
          remap("materials", id),
          v,
        ]),
      );
    }
  }
  for (const m of data.materials || []) {
    m.id = remap("materials", m.id);
    m.sourcePresetId = remap("sourcePresets", m.sourcePresetId);
    for (const g of m.groups)
      g.partyIds = g.partyIds.map((id) => remap("parties", id));
  }
  for (const key of ["sourcePresets", "templates", "parties"] as const)
    for (const item of data[key] || []) {
      item.id = remap(key, item.id);
      if ("name" in item && key !== "parties") item.name += "（导入）";
    }
  for (const key of sharedKeys) {
    const items = data[key];
    if (items) (s[key] as unknown[]).push(...items);
  }
  return parseState(s);
}
