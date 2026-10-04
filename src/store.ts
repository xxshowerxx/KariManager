import { useSyncExternalStore } from "react";
import { defaults } from "./core/defaults";
import { clone, parseState, type State } from "./core/model";
import * as platform from "./platform";
import { sourceFromFormat } from "./core/template";
import { SessionMaterials } from "./core/session";
import { materialCategories } from "./core/material-categories";
class Store {
  private state: State = defaults();
  private revision = 0;
  private listeners = new Set<() => void>();
  private queue: Promise<unknown> = Promise.resolve();
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  get = () => this.state;
  async initialize() {
    const { payload, revision } = await platform.load();
    this.state = payload ? parseState(payload) : defaults();
    sessionMaterials.clear();
    this.revision = revision;
    const chinese = this.state.templates.find((t) => t.id === "template-zh");
    const renameChinese = chinese?.name === "中文清晰";
    if (chinese && renameChinese) chinese.name = "中文";
    let changed = false;
    if (!this.state.materialCategories) {
      this.state.materialCategories = materialCategories(this.state);
      changed = true;
    }
    if (!this.state.sectionPresets.length) {
      this.state.sectionPresets = defaults().sectionPresets;
      changed = true;
    }
    for (const t of this.state.templates)
      if (t.mode === "visual") {
        const source = sourceFromFormat(t.format);
        if (t.source !== source) {
          t.source = source;
          changed = true;
        }
      }
    if (!payload || renameChinese || changed)
      this.revision = await platform.persist(this.state, revision);
    this.emit();
  }
  update(action: (draft: State) => void): Promise<void> {
    const job = this.queue.then(async () => {
      const draft = clone(this.state);
      action(draft);
      draft.materialCategories = materialCategories(draft);
      parseState(draft);
      const revision = await platform.persist(draft, this.revision);
      this.state = draft;
      this.revision = revision;
      this.emit();
    });
    this.queue = job.catch(() => {});
    return job;
  }
  replace(s: State) {
    const next = parseState(s);
    next.materialCategories = materialCategories(next);
    return this.update((draft) => Object.assign(draft, next));
  }
  private emit() {
    this.listeners.forEach((cb) => cb());
  }
}
export const store = new Store();
export const sessionMaterials = new SessionMaterials();
export const useSessionMaterials = () =>
  useSyncExternalStore(sessionMaterials.subscribe, sessionMaterials.get);
export const useStateData = () =>
  useSyncExternalStore(store.subscribe, store.get);
