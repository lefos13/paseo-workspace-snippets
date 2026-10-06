import type { Paseo } from "./workspace";

export interface ResolvedProject {
  projectId: string;
  projectRootPath: string;
  displayName: string;
}

export async function resolveProject(
  paseo: Paseo,
  projectId: string,
): Promise<ResolvedProject> {
  const { projects } = await paseo.projects.list();
  const match = projects.find((p) => p.projectId === projectId);
  if (!match) {
    throw new Error(
      `PROJECT_UNAVAILABLE: Project ${projectId} is not available on this host`,
    );
  }
  return {
    projectId: match.projectId,
    projectRootPath: match.projectRootPath,
    displayName: match.projectDisplayName,
  };
}

export async function findLocalWorkspace(
  paseo: Paseo,
  projectRootPath: string,
): Promise<string | null> {
  const { entries } = await paseo.workspaces.list();
  const normalizedRoot = projectRootPath.replace(/[/\\]+$/, "");
  // Several workspaces can share a directory; prefer the most recently active.
  // Workspaces without activity rank lowest, and ties go to the later entry
  // because the daemon lists older workspaces first.
  let best: { id: string; activityAt: number } | null = null;
  for (const ws of entries) {
    if (ws.archivingAt) continue;
    // Older daemons may omit workspaceDirectory; only a local checkout or plain
    // directory workspace can then be assumed to sit at the project root.
    const rawDir =
      ws.workspaceDirectory ??
      (ws.workspaceKind === "local_checkout" || ws.workspaceKind === "directory"
        ? ws.projectRootPath
        : undefined);
    const normalizedDir = rawDir ? rawDir.replace(/[/\\]+$/, "") : "";
    if (normalizedDir !== normalizedRoot) continue;
    const parsed = ws.activityAt ? Date.parse(ws.activityAt) : NaN;
    const activityAt = Number.isNaN(parsed) ? -Infinity : parsed;
    if (!best || activityAt >= best.activityAt) {
      best = { id: ws.id, activityAt };
    }
  }
  return best?.id ?? null;
}
