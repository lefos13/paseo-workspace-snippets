import fs from "node:fs/promises";
import path from "node:path";
import { scriptCommand } from "../shared/entries";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface DetectedScript {
  name: string;
  body: string;
  command: string;
}

export interface DetectScriptsResult {
  status: "ok" | "missing" | "invalid";
  error: string | null;
  packageManager: PackageManager;
  scripts: DetectedScript[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectScripts(
  directory: string,
): Promise<DetectScriptsResult> {
  let realDir: string;
  try {
    realDir = await fs.realpath(directory);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error?.code === "ENOENT") {
      return {
        status: "missing",
        error: null,
        packageManager: "npm",
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
        status: "missing",
        error: null,
        packageManager: "npm",
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
        status: "missing",
        error: null,
        packageManager: "npm",
        scripts: [],
      };
    }
    throw err;
  }

  if (stats.size > 1024 * 1024) {
    return {
      status: "invalid",
      error: `package.json exceeds 1 MiB limit (${stats.size} bytes)`,
      packageManager: "npm",
      scripts: [],
    };
  }

  let content: string;
  try {
    content = await fs.readFile(realFile, "utf-8");
  } catch (err: unknown) {
    return {
      status: "invalid",
      error: err instanceof Error ? err.message : String(err),
      packageManager: "npm",
      scripts: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err: unknown) {
    return {
      status: "invalid",
      error: `Failed to parse package.json: ${err instanceof Error ? err.message : String(err)}`,
      packageManager: "npm",
      scripts: [],
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      status: "invalid",
      error: "package.json root is not an object",
      packageManager: "npm",
      scripts: [],
    };
  }

  const pkgRecord = parsed as Record<string, unknown>;

  let pm: PackageManager = "npm";
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
        command: scriptCommand(pm, name),
      });
    }
  }

  return {
    status: "ok",
    error: null,
    packageManager: pm,
    scripts,
  };
}
