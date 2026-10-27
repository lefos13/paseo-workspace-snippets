import type { Snippet, SnippetsSettingsValues } from "./settings";

export interface WorkspacePaths {
  projectRootPath?: string | null;
  directory?: string | null;
}

export function snippetsFor(
  values: SnippetsSettingsValues | undefined | null,
  ctx: WorkspacePaths,
): Snippet[] {
  if (!values) return [];
  const projectSnippets =
    ctx.projectRootPath && values.projects ? values.projects[ctx.projectRootPath] ?? [] : [];
  const workspaceSnippets =
    ctx.directory && values.workspaces ? values.workspaces[ctx.directory] ?? [] : [];
  return [...projectSnippets, ...workspaceSnippets];
}

export function entryKey(type: "snippet" | "script", identifier: string): string {
  return `${type}:${identifier}`;
}

export function terminalName(type: "snippet" | "script", name: string): string {
  return `${type}:${name}`;
}

export function shellQuote(str: string): string {
  if (/^[A-Za-z0-9:._/-]+$/.test(str)) {
    return str;
  }
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Name of a Script that is unique across Packages: `<relDir>/<name>` for a
 * Nested package, bare `<name>` for the Root package.
 */
export function qualifiedScriptName(
  relDir: string,
  scriptName: string,
): string {
  return relDir ? `${relDir}/${scriptName}` : scriptName;
}

export function scriptCommand(
  pm: "npm" | "pnpm" | "yarn" | "bun",
  scriptName: string,
  relDir = "",
): string {
  const command = `${pm} run ${shellQuote(scriptName)}`;
  return relDir ? `cd ${shellQuote(relDir)} && ${command}` : command;
}
