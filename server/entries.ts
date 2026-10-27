import type { PluginSettings } from "@getpaseo/plugin/server";
import fs from "node:fs/promises";
import path from "node:path";
import type { DetectedPackage, DetectedScript } from "../shared/discovery";
import {
  entryKey,
  qualifiedScriptName,
  snippetsFor,
  terminalName,
} from "../shared/entries";
import type { snippetsSettings } from "../shared/settings";
import { discoverEntries } from "./discovery";
import { detectPackage, inheritedPackageManager } from "./package-json";
import type { ResolvedWorkspace } from "./workspace";

export interface ResolvedEntry {
  key: string;
  label: string;
  command: string;
  terminalName: string;
}

interface FoundScript {
  package: DetectedPackage;
  script: DetectedScript;
}

interface NameCandidate {
  /** Every name the entry answers to, lowest precedence last. */
  names: string[];
  displayName: string;
  /** Package folder, "" for the Root package. */
  relDir: string;
  entry: ResolvedEntry;
}

function entryForScript(
  key: string,
  pkg: DetectedPackage,
  script: DetectedScript,
): ResolvedEntry {
  return {
    key,
    label: script.name,
    command: script.command,
    terminalName: terminalName(
      "script",
      qualifiedScriptName(pkg.relDir, script.name),
    ),
  };
}

/**
 * Resolves a `script:<identifier>` key without walking the workspace: the key
 * names the Package folder, so only that `package.json` (and its ancestors'
 * Package managers) is read.
 */
async function findScriptByIdentifier(
  workspaceRoot: string,
  identifier: string,
): Promise<{ root: DetectedPackage; match: FoundScript | null }> {
  const root = await detectPackage(workspaceRoot, "", "npm");
  const rootScript = root.scripts.find((script) => script.name === identifier);
  if (root.status === "ok" && rootScript) {
    return { root, match: { package: root, script: rootScript } };
  }

  // Qualified names use `/` between the Package folder and the Script name, so
  // try the longest folder first: `apps/web/dev` beats Script `web/dev` of an
  // `apps` Package.
  const slashes: number[] = [];
  for (let index = 0; index < identifier.length; index += 1) {
    if (identifier[index] === "/") slashes.push(index);
  }

  for (let index = slashes.length - 1; index >= 0; index -= 1) {
    const relDir = identifier.slice(0, slashes[index]);
    const scriptName = identifier.slice(slashes[index] + 1);
    const segments = relDir.split("/");
    if (
      segments.some(
        (segment) => segment === "" || segment === "." || segment === "..",
      )
    ) {
      continue;
    }

    let realDir: string;
    try {
      realDir = await fs.realpath(path.join(workspaceRoot, relDir));
    } catch {
      continue;
    }
    // Re-apply the inside-workspace guard: a symlinked Package folder must not
    // resolve to a Script outside the workspace.
    if (
      realDir !== workspaceRoot &&
      !realDir.startsWith(`${workspaceRoot}${path.sep}`)
    ) {
      continue;
    }

    const detected = await detectPackage(
      realDir,
      relDir,
      await inheritedPackageManager(workspaceRoot, relDir),
    );
    if (detected.status !== "ok") continue;

    const script = detected.scripts.find((s) => s.name === scriptName);
    if (script) {
      return { root, match: { package: detected, script } };
    }
  }

  return { root, match: null };
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
    const identifier = entryKeyString.slice("script:".length);
    const { root, match } = await findScriptByIdentifier(
      await fs.realpath(paths.directory),
      identifier,
    );

    if (!match) {
      if (root.status !== "ok") {
        throw new Error(
          `ENTRY_NOT_FOUND: Cannot resolve script "${identifier}": package.json is ${root.status}`,
        );
      }
      throw new Error(
        `ENTRY_NOT_FOUND: Script "${identifier}" not found`,
      );
    }

    return entryForScript(entryKeyString, match.package, match.script);
  }

  throw new Error(`ENTRY_NOT_FOUND: Invalid entry key ${entryKeyString}`);
}

/**
 * Resolves a `/snippet` name: exact Snippet, exact Root package Script, exact
 * Qualified name, then a unique case-insensitive prefix across Snippets and
 * Scripts. Nested Scripts answer to both their Qualified name and their short
 * name.
 */
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

  let packages: DetectedPackage[] = [];
  try {
    packages = (await discoverEntries(paths.directory)).packages;
  } catch {
    // A failed scan still leaves Snippets available
  }

  const root = packages.find((pkg) => pkg.relDir === "");
  const rootScripts = root?.status === "ok" ? root.scripts : [];

  const rootCandidates: NameCandidate[] = [];
  if (root) {
    for (const script of rootScripts) {
      rootCandidates.push({
        names: [script.name],
        displayName: script.name,
        relDir: "",
        entry: entryForScript(entryKey("script", script.name), root, script),
      });
    }
  }

  const nestedCandidates: NameCandidate[] = [];
  for (const pkg of packages) {
    if (pkg.relDir === "" || pkg.status !== "ok") continue;
    for (const script of pkg.scripts) {
      const qualified = qualifiedScriptName(pkg.relDir, script.name);
      nestedCandidates.push({
        names: [script.name, qualified],
        displayName: qualified,
        relDir: pkg.relDir,
        entry: entryForScript(entryKey("script", qualified), pkg, script),
      });
    }
  }

  // 1. Exact Snippet name
  const exactSnippet = snippets.find((s) => s.name === name);
  if (exactSnippet) {
    return {
      key: entryKey("snippet", exactSnippet.id),
      label: exactSnippet.name,
      command: exactSnippet.command,
      terminalName: terminalName("snippet", exactSnippet.name),
    };
  }

  // 2. Exact Root package Script
  const exactRootScript = rootCandidates.find((c) => c.displayName === name);
  if (exactRootScript) return exactRootScript.entry;

  // 3. Exact Qualified name. When a Script name itself contains a slash two
  // Packages can produce the same string, so prefer the one a `script:` key
  // resolves to: the longest Package folder wins.
  const exactQualified = nestedCandidates
    .filter((c) => c.displayName === name)
    .sort((a, b) => b.relDir.length - a.relDir.length)[0];
  if (exactQualified) return exactQualified.entry;

  // 4. Case-insensitive unique prefix across Snippets and Scripts
  const lower = name.toLowerCase();
  const matched: NameCandidate[] = [];
  const matchedKeys = new Set<string>();
  const addCandidate = (candidate: NameCandidate) => {
    if (matchedKeys.has(candidate.entry.key)) return;
    matchedKeys.add(candidate.entry.key);
    matched.push(candidate);
  };

  for (const snippet of snippets) {
    if (!snippet.name.toLowerCase().startsWith(lower)) continue;
    addCandidate({
      names: [snippet.name],
      displayName: snippet.name,
      relDir: "",
      entry: {
        key: entryKey("snippet", snippet.id),
        label: snippet.name,
        command: snippet.command,
        terminalName: terminalName("snippet", snippet.name),
      },
    });
  }

  for (const candidate of [...rootCandidates, ...nestedCandidates]) {
    if (
      candidate.names.some((candidateName) =>
        candidateName.toLowerCase().startsWith(lower),
      )
    ) {
      addCandidate(candidate);
    }
  }

  if (matched.length === 1) return matched[0].entry;

  if (matched.length === 0) {
    const availableNames = [
      ...snippets.map((s) => s.name),
      ...rootCandidates.map((c) => c.displayName),
      ...nestedCandidates.map((c) => c.displayName),
    ];
    const availableDisplay =
      availableNames.length > 0 ? availableNames.join(", ") : "none";
    throw new Error(
      `ENTRY_NOT_FOUND: no snippet or script named "${name}". Available: ${availableDisplay}`,
    );
  }

  const matchNames = matched.map((c) => c.displayName).join(", ");
  throw new Error(`AMBIGUOUS_NAME: "${name}" matches ${matchNames}`);
}
