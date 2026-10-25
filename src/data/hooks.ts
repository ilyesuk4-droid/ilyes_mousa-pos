import { useLiveQuery } from "dexie-react-hooks";
import type { DependencyList } from "react";

/**
 * Reactive data hook. UI uses this instead of touching the DB directly.
 * When swapping to a server API, reimplement this with react-query.
 */
export function useData<T>(fn: () => Promise<T>, deps: DependencyList = []): T | undefined {
  return useLiveQuery(fn, deps as unknown[]);
}
