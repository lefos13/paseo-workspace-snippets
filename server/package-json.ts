import fs from "node:fs/promises";
import path from "node:path";
import type {
  DetectedPackage,
  DetectedScript,
  PackageManager,
} from "../shared/discovery";
import { scriptCommand } from "../shared/entries";

/**
 * Shape for a Package that exists but could not be read: discovery and key
 * resolution report it instead of failing the whole scan.
 */
export function invalidPackage(
  relDir: string,
  packageManager: PackageManager,
  error: unknown,
): DetectedPackage {
  return {
    relDir,
    status: "invalid",
    error: error instanceof Error ? error.message : String(error),
    packageManager,
    scripts: [],
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects one Package: its `package.json` Scripts and Package manager.
 *
 * `relDir` is the Package directory relative to the workspace root ("" for the
 * Root package) and is copied onto the result. `inheritedPackageManager` is
 * the Package manager of the nearest ancestor Package; a Package's own
 * `packageManager` field or lockfile wins over it.
 */
export async function detectPackage(
  directory: string,
  relDir: string,
  inheritedPackageManager: PackageManager = "npm",
): Promise<DetectedPackage> {
  let realDir: string;
  try {
    realDir = await fs.realpath(directory);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === "ENOENT") {
      return {
        relDir,
        status: "missing",
        error: null,
        packageManager: inheritedPackageManager,
        scripts: [],
      };
    }
    throw err;
  }

  const packageJsonPath = path.join(realDir, "package.json");

  let realFile: string;
  try {
    realFile = await fs.realpath(packageJsonPath);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === "ENOENT") {
      return {
        relDir,
        status: "missing",
        error: null,
        packageManager: inheritedPackageManager,
        scripts: [],
      };
    }
    throw err;
  }

  const rel = path.relative(realDir, realFile);
  if (!rel || path.isAbsolute(rel) || rel.startsWith("..")) {
    throw new Error(
      `PATH_OUTSIDE_WORKSPACE: package.json points outside workspace (${realFile})`,
    );
  }

  let stats;
  try {
    stats = await fs.stat(realFile);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === "ENOENT") {
      return {
        relDir,
        status: "missing",
        error: null,
        packageManager: inheritedPackageManager,
        scripts: [],
      };
    }
    throw err;
  }

  if (stats.size > 1024 * 1024) {
    return {
      relDir,
      status: "invalid",
      error: `package.json exceeds 1 MiB limit (${stats.size} bytes)`,
      packageManager: inheritedPackageManager,
      scripts: [],
    };
  }

  let content: string;
  try {
    content = await fs.readFile(realFile, "utf-8");
  } catch (err: unknown) {
    return {
      relDir,
      status: "invalid",
      error: err instanceof Error ? err.message : String(err),
      packageManager: inheritedPackageManager,
      scripts: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err: unknown) {
    return {
      relDir,
      status: "invalid",
      error: `Failed to parse package.json: ${err instanceof Error ? err.message : String(err)}`,
      packageManager: inheritedPackageManager,
      scripts: [],
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      relDir,
      status: "invalid",
      error: "package.json root is not an object",
      packageManager: inheritedPackageManager,
      scripts: [],
    };
  }

  const pkgRecord = parsed as Record<string, unknown>;

  let pm: PackageManager = inheritedPackageManager;
  let pmFromField = false;
  if (typeof pkgRecord.packageManager === "string") {
    const rawPm = pkgRecord.packageManager.split("@")[0].trim().toLowerCase();
    if (
      rawPm === "pnpm" ||
      rawPm === "yarn" ||
      rawPm === "bun" ||
      rawPm === "npm"
    ) {
      pm = rawPm;
      pmFromField = true;
    }
  }

  if (!pmFromField) {
    const pnpmLock = path.join(realDir, "pnpm-lock.yaml");
    const yarnLock = path.join(realDir, "yarn.lock");
    const bunLockb = path.join(realDir, "bun.lockb");
    const bunLock = path.join(realDir, "bun.lock");

    if (await fileExists(pnpmLock)) {
      pm = "pnpm";
    } else if (await fileExists(yarnLock)) {
      pm = "yarn";
    } else if ((await fileExists(bunLockb)) || (await fileExists(bunLock))) {
      pm = "bun";
    }
  }

  if (pkgRecord.scripts !== undefined) {
    if (
      typeof pkgRecord.scripts !== "object" ||
      pkgRecord.scripts === null ||
      Array.isArray(pkgRecord.scripts)
    ) {
      return {
        relDir,
        status: "invalid",
        error: "package.json scripts field must be an object",
        packageManager: pm,
        scripts: [],
      };
    }
  }

  const scripts: DetectedScript[] = [];
  if (pkgRecord.scripts) {
    for (const [name, body] of Object.entries(
      pkgRecord.scripts as Record<string, unknown>,
    )) {
      if (typeof body !== "string") {
        continue;
      }
      scripts.push({
        name,
        body,
        command: scriptCommand(pm, name, relDir),
      });
    }
  }

  return {
    relDir,
    status: "ok",
    error: null,
    packageManager: pm,
    scripts,
  };
}

/**
 * Package manager a Nested package at `relDir` inherits from its ancestors,
 * stopping at the workspace root (inclusive) and defaulting to npm.
 */
export async function inheritedPackageManager(
  workspaceRoot: string,
  relDir: string,
): Promise<PackageManager> {
  const segments = relDir.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return "npm";

  let pm: PackageManager = (
    await detectPackage(workspaceRoot, "", "npm")
  ).packageManager;

  let directory = workspaceRoot;
  for (const segment of segments.slice(0, -1)) {
    directory = path.join(directory, segment);
    pm = (await detectPackage(directory, "", pm)).packageManager;
  }
  return pm;
}
