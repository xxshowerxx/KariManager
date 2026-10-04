import {
  clone,
  validateMaterial,
  withSnapshots,
  type Material,
  type MaterialSnapshots,
  type Party,
  type State,
} from "./model";

// Session entries stay outside persisted State; works and presets keep their own snapshots.
export class SessionMaterials {
  private data: MaterialSnapshots = {
    materialSnapshots: [],
    partySnapshots: [],
  };
  private listeners = new Set<() => void>();
  get = () => this.data;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  save(s: State, material: Material, parties: Party[]) {
    const next = clone(this.data);
    for (const p of parties) {
      const index = next.partySnapshots!.findIndex((x) => x.id === p.id);
      if (index < 0) next.partySnapshots!.push(clone(p));
      else next.partySnapshots![index] = clone(p);
    }
    const index = next.materialSnapshots!.findIndex(
      (x) => x.id === material.id,
    );
    if (index < 0) next.materialSnapshots!.push(clone(material));
    else next.materialSnapshots![index] = clone(material);
    validateMaterial(material, withSnapshots(s, next));
    this.data = next;
    this.listeners.forEach((listener) => listener());
  }
  clear() {
    this.data = { materialSnapshots: [], partySnapshots: [] };
    this.listeners.forEach((listener) => listener());
  }
}
