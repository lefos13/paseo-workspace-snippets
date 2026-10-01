import type { PluginSettings } from "@getpaseo/plugin/server";
import { entryKey, snippetsFor, terminalName } from "../shared/entries";
import type { snippetsSettings } from "../shared/settings";
import type { DetectedScript } from "./package-json";
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
  entryKeyString: string,
  paths: ResolvedWorkspace,
): Promise<ResolvedEntry> {
  if (entryKeyString.startsWith("snippet:")) {
    const snippetId = entryKeyString.slice("snippet:".length);
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
      key: entryKeyString,
      label: snippet.name,
      command: snippet.command,
      terminalName: terminalName("snippet", snippet.name),
    };
  }

  if (entryKeyString.startsWith("script:")) {
    const scriptName = entryKeyString.slice("script:".length);
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
      key: entryKeyString,
      label: found.name,
      command: found.command,
      terminalName: terminalName("script", found.name),
    };
  }

  throw new Error(`ENTRY_NOT_FOUND: Invalid entry key ${entryKeyString}`);
}

export async function resolveEntryByName(
  settings: PluginSettings<typeof snippetsSettings.schema>,
  name: string,
  paths: ResolvedWorkspace,
): Promise<ResolvedEntry> {
  const state = await settings.read();
  const snippets = snippetsFor(
    state.status === "ready" ? state.values : null,
    paths,
  );

  let scripts: DetectedScript[] = [];
  try {
    const detection = await detectScripts(paths.directory);
    if (detection.status === "ok") {
      scripts = detection.scripts;
    }
  } catch {
    // If detectScripts threw, scripts list is empty
  }

  const availableNames = [
    ...snippets.map((s) => s.name),
    ...scripts.map((sc) => sc.name),
  ];
  const availableDisplay =
    availableNames.length > 0 ? availableNames.join(", ") : "none";

  // 1. Exact snippet name
  const exactSnippet = snippets.find((s) => s.name === name);
  if (exactSnippet) {
    return {
      key: entryKey("snippet", exactSnippet.id),
      label: exactSnippet.name,
      command: exactSnippet.command,
      terminalName: terminalName("snippet", exactSnippet.name),
    };
  }

  // 2. Exact script name
  const exactScript = scripts.find((sc) => sc.name === name);
  if (exactScript) {
    return {
      key: entryKey("script", exactScript.name),
      label: exactScript.name,
      command: exactScript.command,
      terminalName: terminalName("script", exactScript.name),
    };
  }

  // 3. Case-insensitive unique prefix across both
  const lower = name.toLowerCase();
  interface Candidate {
    name: string;
    entry: ResolvedEntry;
  }
  const prefixCandidates: Candidate[] = [];

  for (const s of snippets) {
    if (s.name.toLowerCase().startsWith(lower)) {
      prefixCandidates.push({
        name: s.name,
        entry: {
          key: entryKey("snippet", s.id),
          label: s.name,
          command: s.command,
          terminalName: terminalName("snippet", s.name),
        },
      });
    }
  }

  for (const sc of scripts) {
    if (sc.name.toLowerCase().startsWith(lower)) {
      prefixCandidates.push({
        name: sc.name,
        entry: {
          key: entryKey("script", sc.name),
          label: sc.name,
          command: sc.command,
          terminalName: terminalName("script", sc.name),
        },
      });
    }
  }

  if (prefixCandidates.length === 1) {
    return prefixCandidates[0].entry;
  }

  if (prefixCandidates.length === 0) {
    throw new Error(
      `ENTRY_NOT_FOUND: no snippet or script named "${name}". Available: ${availableDisplay}`,
    );
  }

  const matchNames = prefixCandidates.map((c) => c.name).join(", ");
  throw new Error(`AMBIGUOUS_NAME: "${name}" matches ${matchNames}`);
}
