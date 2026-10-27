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
    showShellScripts: true,
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

test("prefers an exact Nested short name over a longer prefix match", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { develop: "vite" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
    },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "dev", {
        directory,
        projectRootPath: directory,
      });

      assert.equal(entry.key, "script:apps/web/dev");
      assert.equal(entry.command, "(cd apps/web && npm run dev)");
    },
  );
});

test("reports ambiguity when several Nested Scripts exactly share the short name", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { develop: "vite" } }),
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
        command: "(cd apps/web && pnpm run dev)",
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
        command: "(cd apps/web && npm run dev)",
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
      assert.equal(byKey.command, "(cd apps/web && npm run dev)");
    },
  );
});

test("resolves an executable Shell script by key to a ./ command", async () => {
  await withWorkspace(
    {
      "scripts/deploy.sh": {
        content: "#!/bin/sh\necho deploy",
        executable: true,
      },
    },
    async (directory) => {
      const entry = await resolveEntry(
        fakeSettings(),
        "shell:scripts/deploy.sh",
        { directory, projectRootPath: directory },
      );

      assert.deepEqual(entry, {
        key: "shell:scripts/deploy.sh",
        label: "scripts/deploy.sh",
        command: "./scripts/deploy.sh",
        terminalName: "shell:scripts/deploy.sh",
      });
    },
  );
});

test("runs a non-executable Shell script with bash", async () => {
  await withWorkspace(
    { "tools/setup.sh": "#!/bin/sh\necho setup" },
    async (directory) => {
      const entry = await resolveEntry(
        fakeSettings(),
        "shell:tools/setup.sh",
        { directory, projectRootPath: directory },
      );

      assert.equal(entry.command, "bash tools/setup.sh");
      assert.equal(entry.terminalName, "shell:tools/setup.sh");
    },
  );
});

test("quotes a Shell script path containing spaces", async () => {
  await withWorkspace(
    {
      "my scripts/deploy.sh": {
        content: "#!/bin/sh\necho deploy",
        executable: true,
      },
      "my scripts/setup.sh": "#!/bin/sh\necho setup",
    },
    async (directory) => {
      const executable = await resolveEntry(
        fakeSettings(),
        "shell:my scripts/deploy.sh",
        { directory, projectRootPath: directory },
      );
      assert.equal(executable.command, "'./my scripts/deploy.sh'");

      const plain = await resolveEntry(
        fakeSettings(),
        "shell:my scripts/setup.sh",
        { directory, projectRootPath: directory },
      );
      assert.equal(plain.command, "bash 'my scripts/setup.sh'");
    },
  );
});

test("fails by key when the Shell script is gone", async () => {
  await withWorkspace({}, async (directory) => {
    await assert.rejects(
      resolveEntry(fakeSettings(), "shell:scripts/deploy.sh", {
        directory,
        projectRootPath: directory,
      }),
      /ENTRY_NOT_FOUND: Shell script "scripts\/deploy.sh" not found/,
    );
  });
});

test("does not resolve a Shell script symlinked outside the workspace", async () => {
  await withTempDir(async (base) => {
    const outside = path.join(base, "outside.sh");
    await fs.writeFile(outside, "#!/bin/sh\necho outside");
    await fs.chmod(outside, 0o755);

    const directory = path.join(base, "workspace");
    await fs.mkdir(directory, { recursive: true });
    await fs.symlink(outside, path.join(directory, "outside.sh"));

    await assert.rejects(
      resolveEntry(fakeSettings(), "shell:outside.sh", {
        directory,
        projectRootPath: directory,
      }),
      /ENTRY_NOT_FOUND: Shell script "outside.sh" not found/,
    );
  });
});

test("does not resolve a Shell script whose path discovery skips", async () => {
  await withWorkspace(
    {
      "README.md": "# readme",
      "node_modules/.bin/tool.sh": "#!/bin/sh\n",
      ".cache/hidden.sh": "#!/bin/sh\n",
      "dist/build.sh": "#!/bin/sh\n",
      "a/b/c/d/e/deep.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      for (const key of [
        "shell:README.md",
        "shell:node_modules/.bin/tool.sh",
        "shell:.cache/hidden.sh",
        "shell:dist/build.sh",
        "shell:a/b/c/d/e/deep.sh",
      ]) {
        await assert.rejects(
          resolveEntry(fakeSettings(), key, {
            directory,
            projectRootPath: directory,
          }),
          /ENTRY_NOT_FOUND: Shell script .* not found/,
          key,
        );
      }
    },
  );
});

test("does not resolve a Script in a folder discovery skips", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "echo root" } }),
      "node_modules/pkg/package.json": packageJson({
        scripts: { dev: "echo dep" },
      }),
      ".cache/pkg/package.json": packageJson({ scripts: { dev: "echo cache" } }),
      "dist/pkg/package.json": packageJson({ scripts: { dev: "echo dist" } }),
      "a/b/c/d/e/package.json": packageJson({ scripts: { dev: "echo deep" } }),
    },
    async (directory) => {
      for (const key of [
        "script:node_modules/pkg/dev",
        "script:.cache/pkg/dev",
        "script:dist/pkg/dev",
        "script:a/b/c/d/e/dev",
      ]) {
        await assert.rejects(
          resolveEntry(fakeSettings(), key, {
            directory,
            projectRootPath: directory,
          }),
          /ENTRY_NOT_FOUND: Script .* not found/,
          key,
        );
      }
    },
  );
});

test("does not resolve entries through a symlinked folder inside the workspace", async () => {
  await withTempDir(async (base) => {
    const directory = path.join(base, "workspace");
    await fs.mkdir(path.join(directory, "apps", "web"), { recursive: true });
    await fs.mkdir(path.join(directory, "scripts"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "package.json"),
      packageJson({ scripts: {} }),
    );
    await fs.writeFile(
      path.join(directory, "apps", "web", "package.json"),
      packageJson({ scripts: { dev: "echo web" } }),
    );
    await fs.writeFile(
      path.join(directory, "scripts", "deploy.sh"),
      "#!/bin/sh\n",
    );
    await fs.symlink("web", path.join(directory, "apps", "link"));
    await fs.symlink("scripts", path.join(directory, "scripts-link"));

    const paths = { directory, projectRootPath: directory };
    const entry = await resolveEntry(fakeSettings(), "script:apps/web/dev", paths);
    assert.equal(entry.command, "(cd apps/web && npm run dev)");

    await assert.rejects(
      resolveEntry(fakeSettings(), "script:apps/link/dev", paths),
      /ENTRY_NOT_FOUND/,
    );
    await assert.rejects(
      resolveEntry(fakeSettings(), "shell:scripts-link/deploy.sh", paths),
      /ENTRY_NOT_FOUND/,
    );
  });
});

test("resolves a Shell script by its relative path", async () => {
  await withWorkspace(
    {
      "scripts/deploy.sh": {
        content: "#!/bin/sh\necho deploy",
        executable: true,
      },
    },
    async (directory) => {
      const entry = await resolveEntryByName(
        fakeSettings(),
        "scripts/deploy.sh",
        { directory, projectRootPath: directory },
      );

      assert.deepEqual(entry, {
        key: "shell:scripts/deploy.sh",
        label: "scripts/deploy.sh",
        command: "./scripts/deploy.sh",
        terminalName: "shell:scripts/deploy.sh",
      });
    },
  );
});

test("resolves a Shell script by basename with or without .sh, regardless of case", async () => {
  await withWorkspace(
    {
      "scripts/deploy.sh": {
        content: "#!/bin/sh\necho deploy",
        executable: true,
      },
    },
    async (directory) => {
      for (const name of ["deploy", "deploy.sh", "DEPLOY"]) {
        const entry = await resolveEntryByName(fakeSettings(), name, {
          directory,
          projectRootPath: directory,
        });
        assert.equal(entry.key, "shell:scripts/deploy.sh");
        assert.equal(entry.command, "./scripts/deploy.sh");
      }
    },
  );
});

test("reports ambiguity when two Shell scripts share a basename", async () => {
  await withWorkspace(
    {
      "scripts/deploy.sh": "#!/bin/sh\n",
      "tools/deploy.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "deploy", {
          directory,
          projectRootPath: directory,
        }),
        /AMBIGUOUS_NAME: "deploy" matches scripts\/deploy.sh, tools\/deploy.sh/,
      );
    },
  );
});

test("reports ambiguity when a Shell script and a Nested Script tie", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: {} }),
      "apps/web/package.json": packageJson({ scripts: { deploy: "echo web" } }),
      "scripts/deploy.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "deploy", {
          directory,
          projectRootPath: directory,
        }),
        /AMBIGUOUS_NAME: "deploy" matches apps\/web\/deploy, scripts\/deploy.sh/,
      );
    },
  );
});

test("prefers an exact Root Script over a Shell script basename", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { deploy: "echo root" } }),
      "scripts/deploy.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      const entry = await resolveEntryByName(fakeSettings(), "deploy", {
        directory,
        projectRootPath: directory,
      });

      assert.equal(entry.key, "script:deploy");
    },
  );
});

test("lists Shell script paths when nothing matches", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { build: "tsc" } }),
      "scripts/deploy.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      await assert.rejects(
        resolveEntryByName(fakeSettings(), "nope", {
          directory,
          projectRootPath: directory,
        }),
        /ENTRY_NOT_FOUND: no snippet or script named "nope"\. Available: build, scripts\/deploy\.sh/,
      );
    },
  );
});
