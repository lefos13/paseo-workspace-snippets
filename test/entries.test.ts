import assert from "node:assert/strict";
import test from "node:test";
import { resolveEntry, resolveEntryByName } from "../server/entries";
import type { SnippetsSettingsValues } from "../shared/settings";
import { packageJson, withWorkspace } from "./helpers";

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
