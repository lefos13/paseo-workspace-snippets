import type { PluginSettings } from "@getpaseo/plugin/server";
import { snippetsFor, terminalName } from "../shared/entries";
import type { snippetsSettings } from "../shared/settings";
import { detectScripts } from "./package-json";
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
    const scriptName = entryKey.slice("script:".length);
    const detection = await detectScripts(paths.directory);
    if (detection.status !== "ok") {
      throw new Error(
        `ENTRY_NOT_FOUND: Cannot resolve script "${scriptName}": package.json is ${detection.status}`,
      );
    }

    const found = detection.scripts.find((s) => s.name === scriptName);
    if (!found) {
      throw new Error(
        `ENTRY_NOT_FOUND: Script "${scriptName}" not found in package.json`,
      );
    }

    return {
      key: entryKey,
      label: found.name,
      command: found.command,
      terminalName: terminalName("script", found.name),
    };
  }

  throw new Error(`ENTRY_NOT_FOUND: Invalid entry key ${entryKey}`);
}
