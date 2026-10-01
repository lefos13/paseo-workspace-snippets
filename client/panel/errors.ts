export function mapErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("WORKSPACE_UNAVAILABLE")) {
    return "Workspace is not available on this host";
  }
  if (msg.includes("TERMINALS_UNSUPPORTED")) {
    return "Update the Paseo daemon to run snippets";
  }
  if (msg.includes("PATH_OUTSIDE_WORKSPACE")) {
    return "package.json is symlinked outside workspace";
  }
  if (msg.includes("AMBIGUOUS_NAME")) {
    return msg.replace(/^.*AMBIGUOUS_NAME:\s*/, "");
  }
  if (msg.includes("ENTRY_NOT_FOUND")) {
    const detail = msg.replace(/^.*ENTRY_NOT_FOUND:\s*/, "");
    if (detail.startsWith("no snippet or script named")) {
      return detail;
    }
    return "Entry was not found";
  }
  return msg;
}

export function isWorkspaceUnavailable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("WORKSPACE_UNAVAILABLE");
}

export function isTerminalsUnsupported(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("TERMINALS_UNSUPPORTED");
}

export function isPathOutsideWorkspace(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("PATH_OUTSIDE_WORKSPACE");
}
