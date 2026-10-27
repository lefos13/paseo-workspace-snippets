import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface FixtureFile {
  content: string;
  executable?: boolean;
}

export interface FixtureSymlink {
  symlink: string;
}

export type Fixture = string | FixtureFile | FixtureSymlink;

/**
 * Builds a throwaway directory in a temp location, runs the callback against
 * it, then removes it.
 */
export async function withTempDir<T>(
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "snippets-test-"));
  try {
    return await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function writeFixtures(
  directory: string,
  files: Record<string, Fixture>,
): Promise<void> {
  for (const [relativePath, file] of Object.entries(files)) {
    const target = path.join(directory, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (typeof file === "string") {
      await fs.writeFile(target, file);
    } else if ("symlink" in file) {
      await fs.symlink(file.symlink, target);
    } else {
      await fs.writeFile(target, file.content);
      if (file.executable) {
        await fs.chmod(target, 0o755);
      }
    }
  }
}

/**
 * Builds a throwaway workspace in a temp directory, runs the callback against
 * it, then removes the directory.
 */
export async function withWorkspace<T>(
  files: Record<string, Fixture>,
  run: (directory: string) => Promise<T>,
): Promise<T> {
  return withTempDir(async (directory) => {
    await writeFixtures(directory, files);
    return run(directory);
  });
}

/**
 * Builds a throwaway workspace nested inside a temp parent directory, so tests
 * can prove that Package manager inheritance stops at the workspace root.
 */
export async function withNestedWorkspace<T>(
  parentFiles: Record<string, Fixture>,
  workspaceFiles: Record<string, Fixture>,
  run: (directory: string, parent: string) => Promise<T>,
): Promise<T> {
  return withTempDir(async (parent) => {
    await writeFixtures(parent, parentFiles);
    const directory = path.join(parent, "workspace");
    await fs.mkdir(directory, { recursive: true });
    await writeFixtures(directory, workspaceFiles);
    return run(directory, parent);
  });
}

export function packageJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
