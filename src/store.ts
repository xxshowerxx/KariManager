import { useSyncExternalStore } from "react";
import { defaults } from "./core/defaults";
import { clone, parseState, type State } from "./core/model";
import * as platform from "./platform";
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
    this.revision = revision;
    if (!payload) this.revision = await platform.persist(this.state, revision);
    this.emit();
  }
  update(action: (draft: State) => void): Promise<void> {
    const job = this.queue.then(async () => {
      const draft = clone(this.state);
      action(draft);
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
    return this.update((draft) => Object.assign(draft, parseState(s)));
  }
  private emit() {
    this.listeners.forEach((cb) => cb());
  }
}
export const store = new Store();
export const useStateData = () =>
  useSyncExternalStore(store.subscribe, store.get);
