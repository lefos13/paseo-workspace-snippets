import { useState } from "react";

/**
 * Collapse state for Package groups. It is a per-device UI preference, not
 * host settings, so it lives in module memory and survives screen switches for
 * the app session.
 */
const collapsedByProject = new Map<string, Map<string, boolean>>();

/**
 * Remembers which Package groups the user collapsed, keyed by project. The
 * Root package starts expanded and Nested packages start collapsed.
 */
export function usePackageGroupCollapse(projectKey: string | null | undefined) {
  const key = projectKey ?? "";
  const [, setRevision] = useState(0);
  const groups = collapsedByProject.get(key);

  const isCollapsed = (relDir: string): boolean =>
    groups?.get(relDir) ?? relDir !== "";

  const toggle = (relDir: string) => {
    const current = collapsedByProject.get(key) ?? new Map<string, boolean>();
    current.set(relDir, !(current.get(relDir) ?? relDir !== ""));
    collapsedByProject.set(key, current);
    setRevision((revision) => revision + 1);
  };

  return { isCollapsed, toggle };
}
