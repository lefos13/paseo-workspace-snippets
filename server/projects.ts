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
  for (const ws of entries) {
    if (ws.archivingAt) continue;
    const rawDir =
      ws.workspaceDirectory ??
      (ws as { directory?: string }).directory ??
      ws.projectRootPath;
    const normalizedDir = rawDir ? rawDir.replace(/[/\\]+$/, "") : "";
    if (normalizedDir === normalizedRoot) {
      return ws.id;
    }
  }
  return null;
}
