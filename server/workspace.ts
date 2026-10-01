import type { PaseoApi } from "@getpaseo/client";

export interface ResolvedWorkspace {
  directory: string;
  projectRootPath: string;
}

export async function resolveWorkspace(
  paseo: PaseoApi,
  workspaceId: string,
): Promise<ResolvedWorkspace> {
  const handle = paseo.workspaces.ref(workspaceId);
  let ws;
  try {
    ws = await handle.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `WORKSPACE_UNAVAILABLE: Workspace ${workspaceId} could not be resolved: ${message}`,
    );
  }

  const directory = ws?.workspaceDirectory ?? handle.directory;
  if (!directory) {
    throw new Error(
      `WORKSPACE_UNAVAILABLE: Workspace ${workspaceId} is not available on this host`,
    );
  }

  return {
    directory,
    projectRootPath: ws?.projectRootPath ?? directory,
  };
}
