import { materialPath, type Material, type State, type Folder } from "./model";
import type { Entry } from "../platform";

export const pathKey = (path: string) =>
  path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
export const within = (child: string, parent: string) =>
  pathKey(child) === pathKey(parent) ||
  pathKey(child).startsWith(pathKey(parent) + "/");
export const extensionList = (text: string) => [
  ...new Set(
    text
      .split(/[,，]/)
      .map((x) => x.trim().replace(/^\.+/, "").toLowerCase())
      .filter(Boolean),
  ),
];
export function importConflict(
  path: string,
  directory: boolean,
  s: State,
  skipId = "",
): Material | undefined {
  return s.materials.find((m) => {
    if (m.id === skipId) return false;
    const saved = materialPath(m, s);
    return (
      saved &&
      (pathKey(saved) === pathKey(path) ||
        (m.pathKind === "directory" && within(path, saved)) ||
        (directory && within(saved, path)))
    );
  });
}
export function sourceCandidates(
  s: State,
  category: { id: string; label: string },
) {
  const ids = new Set(
    s.materials.flatMap((m) =>
      m.groups
        .filter(
          (g) =>
            g.category.id === category.id ||
            g.category.label === category.label,
        )
        .flatMap((g) => g.partyIds),
    ),
  );
  return s.parties.filter((p) => ids.has(p.id));
}
export function folderCategories(f: Folder) {
  return f.categories ?? (f.category ? [f.category] : []);
}
export function filteredEntries(
  entries: Entry[],
  folder: Folder,
  all: boolean,
  showHidden: boolean,
  query: string,
) {
  const hidden = folder.hiddenPaths ?? [];
  const allowed = extensionList(folder.extensions.join(","));
  const excluded = extensionList(
    (folder.excludedExtensions ?? ["txt", "md"]).join(","),
  );
  const matches = entries.filter((e) => {
    if (!showHidden && hidden.some((p) => within(e.relativePath, p)))
      return false;
    if (e.directory) return false;
    const ext = e.name.includes(".")
      ? e.name.split(".").at(-1)!.toLowerCase()
      : "";
    return (
      (all ||
        ((!allowed.length || allowed.includes(ext)) &&
          !excluded.includes(ext))) &&
      e.relativePath.toLowerCase().includes(query.toLowerCase())
    );
  });
  const paths = new Set(matches.map((e) => pathKey(e.relativePath)));
  const ancestors = new Set<string>();
  for (const match of matches) {
    const pieces = pathKey(match.relativePath).split("/");
    while (pieces.length > 1) {
      pieces.pop();
      ancestors.add(pieces.join("/"));
    }
  }
  return entries
    .filter((e) => {
      if (!showHidden && hidden.some((p) => within(e.relativePath, p)))
        return false;
      if (!e.directory) return paths.has(pathKey(e.relativePath));
      return (
        (all &&
          (!query ||
            e.relativePath.toLowerCase().includes(query.toLowerCase()))) ||
        ancestors.has(pathKey(e.relativePath))
      );
    })
    .sort(
      (a, b) =>
        Number(b.directory) - Number(a.directory) ||
        a.name.localeCompare(b.name, "zh-CN"),
    );
}
