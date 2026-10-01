import type { PluginSettings } from "@getpaseo/plugin/server";
import { snippetsFor, terminalName } from "../shared/entries";
import type { snippetsSettings } from "../shared/settings";
import type { ResolvedWorkspace } from "./workspace";

export interface ResolvedEntry {
  key: string;
  label: string;
  command: string;
  terminalName: string;
}

export async function resolveEntry(
  settings: PluginSettings<typeof snippetsSettings.schema>,
  entryKey: string,
  paths: ResolvedWorkspace,
): Promise<ResolvedEntry> {
  if (entryKey.startsWith("snippet:")) {
    const snippetId = entryKey.slice("snippet:".length);
    const state = await settings.read();
    if (state.status !== "ready") {
      throw new Error(
        `ENTRY_NOT_FOUND: Settings not ready to resolve snippet ${snippetId}`,
      );
    }

    const snippets = snippetsFor(state.values, paths);
    const snippet = snippets.find((s) => s.id === snippetId);
    if (!snippet) {
      throw new Error(`ENTRY_NOT_FOUND: Snippet ${snippetId} not found`);
    }

    return {
      key: entryKey,
      label: snippet.name,
      command: snippet.command,
      terminalName: terminalName("snippet", snippet.name),
    };
  }

  if (entryKey.startsWith("script:")) {
    // Task 6 will implement package.json script detection and resolution
    throw new Error(`ENTRY_NOT_FOUND: Script entries are not supported yet`);
  }

  throw new Error(`ENTRY_NOT_FOUND: Invalid entry key ${entryKey}`);
}
