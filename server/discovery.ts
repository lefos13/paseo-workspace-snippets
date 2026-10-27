import fs from "node:fs/promises";
import path from "node:path";
import type {
  DetectedPackage,
  DiscoveryResult,
  PackageManager,
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
    const childDirectories = entries.filter(
      (entry) =>
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        !SKIPPED_DIRECTORY_NAMES[entry.name],
    );

    if (depth === MAX_DEPTH) {
      if (childDirectories.length > 0) truncated = true;
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

  return {
    packages,
    shellScripts: [],
    truncated,
  };
}
