import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface FixtureFile {
  content: string;
  executable?: boolean;
}

/**
 * Builds a throwaway workspace in a temp directory, runs the callback against
 * it, then removes the directory.
 */
export async function withWorkspace<T>(
  files: Record<string, string | FixtureFile>,
  run: (directory: string) => Promise<T>,
): Promise<T> {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "snippets-test-"),
  );
  try {
    for (const [relativePath, file] of Object.entries(files)) {
      const target = path.join(directory, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      const { content, executable } =
        typeof file === "string"
          ? { content: file, executable: false }
          : file;
      await fs.writeFile(target, content);
      if (executable) {
        await fs.chmod(target, 0o755);
      }
    }
    return await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

export function packageJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
