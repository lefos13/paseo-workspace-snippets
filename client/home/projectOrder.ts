export interface ProjectLike {
  projectId: string;
  projectDisplayName: string;
}

export function orderProjects<T extends ProjectLike>(
  projects: readonly T[],
  order?: readonly string[] | null,
): T[] {
  const safeProjects = projects ?? [];
  const safeOrder = order ?? [];

  const byId = new Map<string, T>();
  for (const project of safeProjects) {
    byId.set(project.projectId, project);
  }

  const ordered: T[] = [];
  const seen = new Set<string>();

  for (const id of safeOrder) {
    const project = byId.get(id);
    if (project && !seen.has(id)) {
      ordered.push(project);
      seen.add(id);
    }
  }

  const remaining: T[] = [];
  for (const project of safeProjects) {
    if (!seen.has(project.projectId)) {
      remaining.push(project);
    }
  }

  remaining.sort((a, b) =>
    a.projectDisplayName.localeCompare(b.projectDisplayName, undefined, {
      sensitivity: "base",
    }),
  );

  return [...ordered, ...remaining];
}
