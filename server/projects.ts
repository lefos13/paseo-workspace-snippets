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

function timestamp(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? -Infinity : parsed;
}

export async function findLocalWorkspace(
  paseo: Paseo,
  projectRootPath: string,
): Promise<string | null> {
  const normalizedRoot = projectRootPath.replace(/[/\\]+$/, "");
  // Several workspaces can share a directory; prefer the most recent one.
  // activityAt is often null, so statusEnteredAt (last agent status change,
  // which drives the sidebar order) also counts.
  let best: { id: string; recency: number } | null = null;
  let cursor: string | undefined;
  do {
    // The daemon pages workspace lists, so walk every page.
    const { entries, pageInfo } = await paseo.workspaces.list({
      page: { limit: 200, ...(cursor ? { cursor } : {}) },
    });
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
      const recency = Math.max(
        timestamp(ws.activityAt),
        timestamp(ws.statusEnteredAt),
      );
      if (!best || recency > best.recency) {
        best = { id: ws.id, recency };
      }
    }
    cursor = pageInfo?.hasMore ? (pageInfo.nextCursor ?? undefined) : undefined;
  } while (cursor);
  return best?.id ?? null;
}
