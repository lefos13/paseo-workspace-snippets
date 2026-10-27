import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  DetectedPackage,
  DiscoveryResult,
  PackageManager,
  ShellScript,
} from "../shared/discovery";
import { detectPackage } from "./package-json";

/** Folders that never hold the user's own Packages. */
const SKIPPED_DIRECTORY_NAMES: Record<string, true> = {
  node_modules: true,
  ".git": true,
  dist: true,
  build: true,
  ".next": true,
};

/** Directory levels below the workspace root that are walked. */
const MAX_DEPTH = 4;
/** Packages the walk collects before it stops and reports truncation. */
const MAX_PACKAGES = 50;

/**
 * Reads one directory, sorted by name so the walk order is deterministic.
 * An unreadable folder contributes nothing rather than failing the scan.
 */
async function readDirectory(directory: string) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.sort((a, b) => (a.name < b.name ? -1 : 1));
  } catch {
    return [];
  }
}

/**
 * Adds the `*.sh` files of one directory to the scan. A symlinked file is
 * only included when its real path stays inside the workspace, so a link
 * cannot make the plugin run code from elsewhere. The executable flag comes
 * from the real file's mode; files without it are still listed.
 */
async function collectShellScripts(
  root: string,
  dir: string,
  relDir: string,
  entries: Dirent[],
  shellScripts: ShellScript[],
): Promise<void> {
  for (const entry of entries) {
    if (!entry.name.endsWith(".sh")) continue;
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    try {
      const realPath = await fs.realpath(path.join(dir, entry.name));
      if (
        realPath !== root &&
        !realPath.startsWith(`${root}${path.sep}`)
      ) {
        continue;
      }
      const stats = await fs.stat(realPath);
      if (!stats.isFile()) continue;
      shellScripts.push({
        path: relDir ? `${relDir}/${entry.name}` : entry.name,
        executable: (stats.mode & 0o111) !== 0,
      });
    } catch {
      // Broken symlink or unreadable file: skip it rather than fail the scan.
    }
  }
}

/**
 * Whether a folder kept out by the depth limit directly holds a Package or
 * Shell script. Plain source folders at the limit are not worth a warning.
 */
async function hasRunnableContent(directory: string): Promise<boolean> {
  const entries = await readDirectory(directory);
  return entries.some(
    (entry) =>
      (entry.name === "package.json" || entry.name.endsWith(".sh")) &&
      (entry.isFile() || entry.isSymbolicLink()),
  );
}

/**
 * Reads everything runnable from a workspace directory.
 *
 * Discovers the Root package and every Nested package up to four levels deep,
 * skipping dependency, VCS, build-output and dot-folders. Symlinked
 * directories are not followed. A Nested package that cannot be read becomes
 * an `invalid` Package with its error instead of failing the whole scan.
 */
export async function discoverEntries(
  directory: string,
): Promise<DiscoveryResult> {
  const root = await fs.realpath(directory);
  const packages: DetectedPackage[] = [];
  const shellScripts: ShellScript[] = [];
  let packageCount = 0;
  let truncated = false;
  let stopped = false;

  const walk = async (
    dir: string,
    relDir: string,
    depth: number,
    inheritedPackageManager: PackageManager,
  ): Promise<void> => {
    if (stopped) return;

    let detected: DetectedPackage;
    try {
      detected = await detectPackage(dir, relDir, inheritedPackageManager);
    } catch (err) {
      // A single broken Package must not hide the others; the Root package's
      // failures are real workspace failures, so they propagate.
      if (relDir === "") throw err;
      detected = {
        relDir,
        status: "invalid",
        error: err instanceof Error ? err.message : String(err),
        packageManager: inheritedPackageManager,
        scripts: [],
      };
    }

    if (detected.status !== "missing") {
      if (packageCount >= MAX_PACKAGES) {
        truncated = true;
        stopped = true;
        return;
      }
      packageCount += 1;
      packages.push(detected);
    } else if (relDir === "") {
      packages.push(detected);
    }

    const entries = await readDirectory(dir);
    await collectShellScripts(root, dir, relDir, entries, shellScripts);
    const childDirectories = entries.filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !SKIPPED_DIRECTORY_NAMES[entry.name],
    );

    if (depth === MAX_DEPTH) {
      const deeper = await Promise.all(
        childDirectories.map((child) =>
          hasRunnableContent(path.join(dir, child.name)),
        ),
      );
      if (deeper.some(Boolean)) truncated = true;
      return;
    }

    for (const child of childDirectories) {
      if (stopped) return;
      await walk(
        path.join(dir, child.name),
        relDir ? `${relDir}/${child.name}` : child.name,
        depth + 1,
        detected.packageManager,
      );
    }
  };

  await walk(root, "", 0, "npm");
  packages.sort((a, b) => {
    if (a.relDir === b.relDir) return 0;
    if (a.relDir === "") return -1;
    if (b.relDir === "") return 1;
    return a.relDir < b.relDir ? -1 : 1;
  });
  shellScripts.sort((a, b) => (a.path < b.path ? -1 : 1));

  return {
    packages,
    shellScripts,
    truncated,
  };
}
