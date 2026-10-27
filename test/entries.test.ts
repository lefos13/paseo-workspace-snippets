import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { resolveEntry, resolveEntryByName } from "../server/entries";
import type { SnippetsSettingsValues } from "../shared/settings";
import { packageJson, withTempDir, withWorkspace } from "./helpers";

type Settings = Parameters<typeof resolveEntry>[0];

function fakeSettings(
  overrides: Partial<SnippetsSettingsValues> = {},
): Settings {
  const values: SnippetsSettingsValues = {
    projects: {},
    workspaces: {},
    showScripts: true,
    projectOrder: [],
    ...overrides,
  };
  return {
    read: async () => ({ status: "ready", revision: "1", values }),
    subscribe: () => () => {},
  };
}

test("resolves a Root package Script by key to its command and terminal name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "pnpm-lock.yaml": "",
    },
    async (directory) => {
      const entry = await resolveEntry(fakeSettings(), "script:dev", {
        directory,
        projectRootPath: directory,
      });

      assert.deepEqual(entry, {
        key: "script:dev",
        label: "dev",
        command: "pnpm run dev",
        terminalName: "script:dev",
      });
    },
  );
});

test("resolves a Root package Script by name", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { dev: "vite" } }) },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "dev", {
        directory,
        projectRootPath: directory,
      });

      assert.deepEqual(entry, {
        key: "script:dev",
        label: "dev",
        command: "npm run dev",
        terminalName: "script:dev",
      });
    },
  );
});

test("keeps Script names containing a colon intact", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { "test:api": "vitest run" } }) },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "test:api", {
        directory,
        projectRootPath: directory,
      });

      assert.equal(entry.key, "script:test:api");
      assert.equal(entry.command, "npm run test:api");
      assert.equal(entry.terminalName, "script:test:api");
    },
  );
});

test("fails by key when the Script is gone", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { dev: "vite" } }) },
    async (directory) => {
      await assert.rejects(
        resolveEntry(fakeSettings(), "script:build", {
          directory,
          projectRootPath: directory,
        }),
        /ENTRY_NOT_FOUND: Script "build" not found/,
      );
    },
  );
});

test("fails by key when the Root package has no package.json", async () => {
  await withWorkspace({}, async (directory) => {
    await assert.rejects(
      resolveEntry(fakeSettings(), "script:dev", {
        directory,
        projectRootPath: directory,
      }),
      /ENTRY_NOT_FOUND: Cannot resolve script "dev": package\.json is missing/,
    );
  });
});

test("fails by key for an unknown entry type", async () => {
  await withWorkspace({}, async (directory) => {
    await assert.rejects(
      resolveEntry(fakeSettings(), "nope:dev", {
        directory,
        projectRootPath: directory,
      }),
      /ENTRY_NOT_FOUND: Invalid entry key nope:dev/,
    );
  });
});

test("prefers an exact Snippet name over a Root package Script", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { dev: "vite" } }) },
    async (directory) => {
      const entry = await resolveEntryByName(
        fakeSettings({
          projects: {
            [directory]: [
              {
                id: "s1",
                name: "dev",
                command: "echo custom",
                scope: "project",
              },
            ],
          },
        }),
        "dev",
        { directory, projectRootPath: directory },
      );

      assert.deepEqual(entry, {
        key: "snippet:s1",
        label: "dev",
        command: "echo custom",
        terminalName: "snippet:dev",
      });
    },
  );
});

test("matches a unique case-insensitive prefix", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { "test:api": "vitest run" } }) },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "TEST:", {
        directory,
        projectRootPath: directory,
      });

      assert.equal(entry.key, "script:test:api");
    },
  );
});

test("reports ambiguity when a prefix matches several entries", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({
        scripts: { deploy: "node deploy.js", dev: "vite" },
      }),
    },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "de", {
          directory,
          projectRootPath: directory,
        }),
        /AMBIGUOUS_NAME: "de" matches deploy, dev/,
      );
    },
  );
});

test("lists available names when nothing matches", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { dev: "vite" } }) },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "nope", {
          directory,
          projectRootPath: directory,
        }),
        /ENTRY_NOT_FOUND: no snippet or script named "nope". Available: dev/,
      );
    },
  );
});

test("resolves a Nested Script by key to a cd command and Qualified terminal name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { build: "tsc" } }),
      "pnpm-lock.yaml": "",
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      const entry = await resolveEntry(fakeSettings(), "script:apps/web/dev", {
        directory,
        projectRootPath: directory,
      });

      assert.deepEqual(entry, {
        key: "script:apps/web/dev",
        label: "dev",
        command: "cd apps/web && pnpm run dev",
        terminalName: "script:apps/web/dev",
      });
    },
  );
});

test("keeps a Root Script whose name contains a slash on the Root package", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { "web/dev": "echo root" } }),
      "web/package.json": packageJson({ scripts: { dev: "echo nested" } }),
    },
    async (directory) => {
      const entry = await resolveEntry(fakeSettings(), "script:web/dev", {
        directory,
        projectRootPath: directory,
      });

      assert.deepEqual(entry, {
        key: "script:web/dev",
        label: "web/dev",
        command: "npm run web/dev",
        terminalName: "script:web/dev",
      });
    },
  );
});

test("fails by key when a Nested Package does not exist", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: { dev: "vite" } }) },
    async (directory) => {
      await assert.rejects(
        resolveEntry(fakeSettings(), "script:apps/web/dev", {
          directory,
          projectRootPath: directory,
        }),
        /ENTRY_NOT_FOUND: Script "apps\/web\/dev" not found/,
      );
    },
  );
});

test("does not resolve a Nested Script through a symlinked directory outside the workspace", async () => {
  await withTempDir(async (base) => {
    const outside = path.join(base, "outside");
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(
      path.join(outside, "package.json"),
      packageJson({ scripts: { dev: "outside" } }),
    );

    const directory = path.join(base, "workspace");
    await fs.mkdir(path.join(directory, "apps"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "package.json"),
      packageJson({ scripts: { dev: "vite" } }),
    );
    await fs.symlink(outside, path.join(directory, "apps", "link"));

    await assert.rejects(
      resolveEntry(fakeSettings(), "script:apps/link/dev", {
        directory,
        projectRootPath: directory,
      }),
      /ENTRY_NOT_FOUND/,
    );
    await assert.rejects(
      resolveEntry(fakeSettings(), "script:../outside/dev", {
        directory,
        projectRootPath: directory,
      }),
      /ENTRY_NOT_FOUND/,
    );
  });
});

test("resolves a Nested Script by Qualified name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "root dev" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "apps/web/dev", {
        directory,
        projectRootPath: directory,
      });

      assert.deepEqual(entry, {
        key: "script:apps/web/dev",
        label: "dev",
        command: "cd apps/web && npm run dev",
        terminalName: "script:apps/web/dev",
      });
    },
  );
});

test("resolves a unique short Nested Script name regardless of case", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: {} }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "DEV", {
        directory,
        projectRootPath: directory,
      });

      assert.equal(entry.key, "script:apps/web/dev");
      assert.equal(entry.terminalName, "script:apps/web/dev");
    },
  );
});

test("prefers an exact Root Script over a Nested Script name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "root dev" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "dev", {
        directory,
        projectRootPath: directory,
      });

      assert.equal(entry.key, "script:dev");
    },
  );
});

test("prefers an exact Snippet name over a Qualified name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: {} }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      const entry = await resolveEntryByName(
        fakeSettings({
          projects: {
            [directory]: [
              {
                id: "s1",
                name: "apps/web/dev",
                command: "echo custom",
                scope: "project",
              },
            ],
          },
        }),
        "apps/web/dev",
        { directory, projectRootPath: directory },
      );

      assert.equal(entry.key, "snippet:s1");
    },
  );
});

test("reports ambiguity when two Packages share a Script name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: {} }),
      "apps/api/package.json": packageJson({ scripts: { dev: "a" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "b" } }),
    },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "dev", {
          directory,
          projectRootPath: directory,
        }),
        /AMBIGUOUS_NAME: "dev" matches apps\/api\/dev, apps\/web\/dev/,
      );
    },
  );
});

test("lists Qualified names when nothing matches", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { build: "tsc" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "nope", {
          directory,
          projectRootPath: directory,
        }),
        /ENTRY_NOT_FOUND: no snippet or script named "nope"\. Available: build, apps\/web\/dev/,
      );
    },
  );
});

test("agrees with key resolution when a slash Script name collides with a Qualified name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: {} }),
      "apps/package.json": packageJson({ scripts: { "web/dev": "echo apps" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "echo web" } }),
    },
    async (directory) => {
      const paths = { directory, projectRootPath: directory };
      const byName = await resolveEntryByName(
        fakeSettings(),
        "apps/web/dev",
        paths,
      );
      const byKey = await resolveEntry(
        fakeSettings(),
        "script:apps/web/dev",
        paths,
      );

      assert.deepEqual(byName, byKey);
      assert.equal(byKey.command, "cd apps/web && npm run dev");
    },
  );
});
