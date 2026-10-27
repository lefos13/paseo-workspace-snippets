import { useState } from "react";

/**
 * Collapse state for grouped entries. It is a per-device UI preference, not
 * host settings, so it lives in module memory and survives screen switches for
 * the app session.
 */
const collapsedByProject = new Map<string, Map<string, boolean>>();

/**
 * Remembers which groups the user collapsed, keyed by project and namespace.
 * Package groups start with the Root package expanded and Nested packages
 * collapsed; Shell script folder groups pass their own default.
 */
export function usePackageGroupCollapse(
  projectKey: string | null | undefined,
  namespace = "package",
  defaultCollapsed: (group: string) => boolean = (group) => group !== "",
) {
  const key = projectKey ?? "";
  const [, setRevision] = useState(0);
  const groups = collapsedByProject.get(key);
  const storageKey = (group: string) => `${namespace}:${group}`;

  const isCollapsed = (group: string): boolean =>
    groups?.get(storageKey(group)) ?? defaultCollapsed(group);

  const toggle = (group: string) => {
    const current = collapsedByProject.get(key) ?? new Map<string, boolean>();
    current.set(
      storageKey(group),
      !(current.get(storageKey(group)) ?? defaultCollapsed(group)),
    );
    collapsedByProject.set(key, current);
    setRevision((revision) => revision + 1);
  };

  return { isCollapsed, toggle };
}
