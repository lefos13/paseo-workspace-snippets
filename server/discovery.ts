import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  DetectedPackage,
  DiscoveryResult,
  PackageManager,
  ShellScript,
} from "../shared/discovery";
import {
  isSkippedDirectoryName,
  MAX_DEPTH,
  MAX_PACKAGES,
} from "./discoverable";
import { detectPackage, invalidPackage } from "./package-json";

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
 * Returns the `*.sh` files of one directory. A symlinked file is only included
 * when its real path stays inside the workspace, so a link cannot make the
 * plugin run code from elsewhere. The executable flag comes from the real
 * file's mode; files without it are still listed.
 */
async function collectShellScripts(
  root: string,
  dir: string,
  relDir: string,
  entries: Dirent[],
): Promise<ShellScript[]> {
  const candidates = entries.filter(
    (entry) =>
      entry.name.endsWith(".sh") &&
      (entry.isFile() || entry.isSymbolicLink()),
  );

  const scripts = await Promise.all(
    candidates.map(async (entry): Promise<ShellScript | null> => {
      try {
        const realPath = await fs.realpath(path.join(dir, entry.name));
        if (
          realPath !== root &&
          !realPath.startsWith(`${root}${path.sep}`)
        ) {
          return null;
        }
        const stats = await fs.stat(realPath);
        if (!stats.isFile()) return null;
        return {
          path: relDir ? `${relDir}/${entry.name}` : entry.name,
          executable: (stats.mode & 0o111) !== 0,
        };
      } catch {
        // Broken symlink or unreadable file: skip it rather than fail the scan.
        return null;
      }
    }),
  );

  return scripts.filter((script): script is ShellScript => script !== null);
}

interface DirectoryScan {
  dir: string;
  relDir: string;
  entries: Dirent[];
  shellScripts: ShellScript[];
}

/** Reads one directory and the Shell scripts directly inside it. */
async function scanDirectory(
  root: string,
  dir: string,
  relDir: string,
): Promise<DirectoryScan> {
  const entries = await readDirectory(dir);
  const shellScripts = await collectShellScripts(root, dir, relDir, entries);
  return { dir, relDir, entries, shellScripts };
}

/** Whether a folder directly holds a package.json, without reading it. */
function hasPackageJson(entries: Dirent[]): boolean {
  return entries.some(
    (entry) =>
      entry.name === "package.json" &&
      (entry.isFile() || entry.isSymbolicLink()),
  );
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
 * directories are not followed. A Package that cannot be read, Root included,
 * becomes an `invalid` Package with its error instead of failing the scan.
 */
export async function discoverEntries(
  directory: string,
): Promise<DiscoveryResult> {
  const root = await fs.realpath(directory);
  const packages: DetectedPackage[] = [];
  const shellScripts: ShellScript[] = [];
  let packageCount = 0;
  let truncated = false;

  const walk = async (
    scan: DirectoryScan,
    depth: number,
    inheritedPackageManager: PackageManager,
  ): Promise<void> => {
    const { dir, relDir, entries } = scan;

    if (packageCount >= MAX_PACKAGES) {
      // Stop reading package.json once the cap is hit, but keep walking so
      // Shell scripts after the cap are still listed.
      if (relDir !== "" && hasPackageJson(entries)) truncated = true;
    } else {
      let detected: DetectedPackage;
      try {
        detected = await detectPackage(dir, relDir, inheritedPackageManager);
      } catch (err) {
        // A single unreadable Package must not hide the others, including the
        // Root package: report it as invalid and keep walking.
        detected = invalidPackage(relDir, inheritedPackageManager, err);
      }

      if (detected.status !== "missing") {
        packageCount += 1;
        packages.push(detected);
      } else if (relDir === "") {
        packages.push(detected);
      }
      inheritedPackageManager = detected.packageManager;
    }

    shellScripts.push(...scan.shellScripts);

    const childDirectories = entries.filter(
      (entry) =>
        entry.isDirectory() && !isSkippedDirectoryName(entry.name),
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

    // Read sibling folders in parallel, then walk them in sorted order so the
    // Package cap and output stay deterministic.
    const childScans = await Promise.all(
      childDirectories.map((child) =>
        scanDirectory(
          root,
          path.join(dir, child.name),
          relDir ? `${relDir}/${child.name}` : child.name,
        ),
      ),
    );

    for (const childScan of childScans) {
      await walk(childScan, depth + 1, inheritedPackageManager);
    }
  };

  await walk(await scanDirectory(root, root, ""), 0, "npm");
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
