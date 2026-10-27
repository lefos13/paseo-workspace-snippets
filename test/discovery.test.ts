import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { discoverEntries } from "../server/discovery";
import { discoveryOutputSchema } from "../shared/discovery";
import {
  packageJson,
  withNestedWorkspace,
  withTempDir,
  withWorkspace,
} from "./helpers";

test("skips well-known heavy folders", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "coverage/package.json": packageJson({ scripts: { dev: "x" } }),
      "vendor/package.json": packageJson({ scripts: { dev: "x" } }),
      "target/package.json": packageJson({ scripts: { dev: "x" } }),
      "out/package.json": packageJson({ scripts: { dev: "x" } }),
      "venv/package.json": packageJson({ scripts: { dev: "x" } }),
      "__pycache__/package.json": packageJson({ scripts: { dev: "x" } }),
      "coverage/cover.sh": "#!/bin/sh\n",
      "vendor/build.sh": "#!/bin/sh\n",
      "target/build.sh": "#!/bin/sh\n",
      "out/build.sh": "#!/bin/sh\n",
      "venv/bin/activate.sh": "#!/bin/sh\n",
      "__pycache__/cache.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(
        result.packages.map((pkg) => pkg.relDir),
        [""],
      );
      assert.deepEqual(result.shellScripts, []);
    },
  );
});

test("finds the Root package Scripts in declaration order", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({
        scripts: { dev: "vite", "test:api": "vitest run" },
      }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(result, {
        packages: [
          {
            relDir: "",
            status: "ok",
            error: null,
            packageManager: "npm",
            scripts: [
              { name: "dev", body: "vite", command: "npm run dev" },
              { name: "test:api", body: "vitest run", command: "npm run test:api" },
            ],
          },
        ],
        shellScripts: [],
        truncated: false,
      });
      assert.doesNotThrow(() => discoveryOutputSchema.parse(result));
    },
  );
});

test("takes the Package manager from the packageManager field", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({
        packageManager: "pnpm@9.12.0",
        scripts: { dev: "vite" },
      }),
    },
    async (directory) => {
      const [root] = (await discoverEntries(directory)).packages;

      assert.equal(root.packageManager, "pnpm");
      assert.equal(root.scripts[0].command, "pnpm run dev");
    },
  );
});

for (const [lockfile, packageManager] of [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
] as const) {
  test(`takes the Package manager from ${lockfile}`, async () => {
    await withWorkspace(
      {
        "package.json": packageJson({ scripts: { build: "tsc" } }),
        [lockfile]: "",
      },
      async (directory) => {
        const [root] = (await discoverEntries(directory)).packages;

        assert.equal(root.packageManager, packageManager);
        assert.equal(root.scripts[0].command, `${packageManager} run build`);
      },
    );
  });
}

test("prefers the packageManager field over a lockfile", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({
        packageManager: "yarn@4.5.0",
        scripts: { dev: "vite" },
      }),
      "pnpm-lock.yaml": "",
    },
    async (directory) => {
      const [root] = (await discoverEntries(directory)).packages;

      assert.equal(root.packageManager, "yarn");
    },
  );
});

test("reports the Root package as missing when there is no package.json", async () => {
  await withWorkspace({}, async (directory) => {
    const result = await discoverEntries(directory);

    assert.deepEqual(result.packages, [
      {
        relDir: "",
        status: "missing",
        error: null,
        packageManager: "npm",
        scripts: [],
      },
    ]);
  });
});

test("reports an oversized package.json as invalid", async () => {
  await withWorkspace(
    { "package.json": " ".repeat(1024 * 1024 + 1) },
    async (directory) => {
      const [root] = (await discoverEntries(directory)).packages;

      assert.equal(root.status, "invalid");
      assert.match(root.error ?? "", /exceeds 1 MiB limit/);
      assert.deepEqual(root.scripts, []);
    },
  );
});

test("reports unparsable package.json as invalid", async () => {
  await withWorkspace({ "package.json": "{ not json" }, async (directory) => {
    const [root] = (await discoverEntries(directory)).packages;

    assert.equal(root.status, "invalid");
    assert.match(root.error ?? "", /^Failed to parse package\.json:/);
  });
});

test("reports a non-object scripts field as invalid", async () => {
  await withWorkspace(
    { "package.json": packageJson({ scripts: ["dev"] }) },
    async (directory) => {
      const [root] = (await discoverEntries(directory)).packages;

      assert.equal(root.status, "invalid");
      assert.equal(root.error, "package.json scripts field must be an object");
    },
  );
});

test("skips Scripts whose body is not a string", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({
        scripts: { dev: "vite", broken: 42 },
      }),
    },
    async (directory) => {
      const [root] = (await discoverEntries(directory)).packages;

      assert.deepEqual(
        root.scripts.map((script) => script.name),
        ["dev"],
      );
    },
  );
});

test("finds Nested packages at several depths and in submodule-style folders", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
      "packages/lib/package.json": packageJson({ scripts: { build: "tsc" } }),
      "modules/sub/.git": "gitdir: ../../.git/modules/modules/sub",
      "modules/sub/package.json": packageJson({ scripts: { bootstrap: "make" } }),
      "a/b/c/d/package.json": packageJson({ scripts: { deep: "echo deep" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(
        result.packages.map((pkg) => pkg.relDir),
        ["", "a/b/c/d", "apps/web", "modules/sub", "packages/lib"],
      );
      assert.deepEqual(result.shellScripts, []);
      assert.equal(result.truncated, false);

      const web = result.packages.find((pkg) => pkg.relDir === "apps/web");
      assert.deepEqual(web?.scripts, [
        {
          name: "dev",
          body: "next dev",
          command: "(cd apps/web && npm run dev)",
        },
      ]);
      assert.doesNotThrow(() => discoveryOutputSchema.parse(result));
    },
  );
});

test("skips node_modules, build output and dot-folders", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "node_modules/dep/package.json": packageJson({ scripts: { dev: "x" } }),
      ".git/hooks/package.json": packageJson({ scripts: { dev: "x" } }),
      "dist/package.json": packageJson({ scripts: { dev: "x" } }),
      "build/package.json": packageJson({ scripts: { dev: "x" } }),
      ".next/package.json": packageJson({ scripts: { dev: "x" } }),
      ".cache/nested/package.json": packageJson({ scripts: { dev: "x" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(
        result.packages.map((pkg) => pkg.relDir),
        [""],
      );
      assert.equal(result.truncated, false);
    },
  );
});

test("stops at depth 4 and reports the scan as truncated", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "a/b/c/d/package.json": packageJson({ scripts: { deep: "echo deep" } }),
      "a/b/c/d/e/package.json": packageJson({ scripts: { deeper: "echo deeper" } }),
      "a/b/c/d/e/f/package.json": packageJson({ scripts: { deepest: "echo x" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(
        result.packages.map((pkg) => pkg.relDir),
        ["", "a/b/c/d"],
      );
      assert.equal(result.truncated, true);
    },
  );
});

test("does not report truncation for plain folders at the depth limit", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "src/components/ui/buttons/button.tsx": "export {}",
      "src/components/ui/buttons/icons/icon.tsx": "export {}",
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.equal(result.truncated, false);
    },
  );
});

test("does not report truncation when the walk covers every folder", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "a/b/c/package.json": packageJson({ scripts: { deep: "echo deep" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.equal(result.packages.length, 2);
      assert.equal(result.truncated, false);
    },
  );
});

test("caps discovery at 50 Packages and reports truncation", async () => {
  const files: Record<string, string> = {
    "package.json": packageJson({ scripts: { dev: "vite" } }),
  };
  for (let index = 0; index < 60; index += 1) {
    files[`pkg-${String(index).padStart(2, "0")}/package.json`] = packageJson({
      scripts: { dev: "x" },
    });
  }

  await withWorkspace(files, async (directory) => {
    const result = await discoverEntries(directory);

    assert.equal(result.packages.length, 50);
    assert.equal(result.packages[0].relDir, "");
    assert.equal(result.packages[49].relDir, "pkg-48");
    assert.equal(result.truncated, true);
  });
});

test("does not follow symlinked directories", async () => {
  await withTempDir(async (base) => {
    const outside = path.join(base, "outside");
    await fs.mkdir(outside, { recursive: true });
    await fs.writeFile(
      path.join(outside, "package.json"),
      packageJson({ scripts: { dev: "outside" } }),
    );

    const directory = path.join(base, "workspace");
    await fs.mkdir(path.join(directory, "real"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "package.json"),
      packageJson({ scripts: { dev: "vite" } }),
    );
    await fs.writeFile(
      path.join(directory, "real", "package.json"),
      packageJson({ scripts: { dev: "real" } }),
    );
    await fs.symlink("real", path.join(directory, "real-link"));
    await fs.symlink(outside, path.join(directory, "outside-link"));

    const result = await discoverEntries(directory);

    assert.deepEqual(
      result.packages.map((pkg) => pkg.relDir),
      ["", "real"],
    );
  });
});

test("inherits the Package manager from the nearest ancestor Package", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "pnpm-lock.yaml": "",
      "apps/web/package.json": packageJson({ scripts: { dev: "next dev" } }),
      "apps/api/package.json": packageJson({ scripts: { start: "node ." } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      const web = result.packages.find((pkg) => pkg.relDir === "apps/web");
      assert.equal(web?.packageManager, "pnpm");
      assert.equal(web?.scripts[0].command, "(cd apps/web && pnpm run dev)");

      const root = result.packages.find((pkg) => pkg.relDir === "");
      assert.equal(root?.packageManager, "pnpm");
      assert.equal(root?.scripts[0].command, "pnpm run dev");
    },
  );
});

test("prefers a Nested package's own lockfile or packageManager field", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "pnpm-lock.yaml": "",
      "apps/yarn/package.json": packageJson({ scripts: { dev: "x" } }),
      "apps/yarn/yarn.lock": "",
      "apps/bun/package.json": packageJson({
        packageManager: "bun@1.1.30",
        scripts: { dev: "x" },
      }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      const yarn = result.packages.find((pkg) => pkg.relDir === "apps/yarn");
      assert.equal(yarn?.packageManager, "yarn");
      assert.equal(yarn?.scripts[0].command, "(cd apps/yarn && yarn run dev)");

      const bun = result.packages.find((pkg) => pkg.relDir === "apps/bun");
      assert.equal(bun?.packageManager, "bun");
      assert.equal(bun?.scripts[0].command, "(cd apps/bun && bun run dev)");
    },
  );
});

test("stops Package manager inheritance at the workspace root", async () => {
  await withNestedWorkspace(
    { "pnpm-lock.yaml": "" },
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "apps/web/package.json": packageJson({ scripts: { dev: "x" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      const web = result.packages.find((pkg) => pkg.relDir === "apps/web");
      assert.equal(web?.packageManager, "npm");
      assert.equal(web?.scripts[0].command, "(cd apps/web && npm run dev)");
    },
  );
});

test("quotes a Nested directory path containing spaces", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "my app/package.json": packageJson({ scripts: { dev: "x" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      const app = result.packages.find((pkg) => pkg.relDir === "my app");
      assert.equal(app?.scripts[0].command, "(cd 'my app' && npm run dev)");
    },
  );
});

test("isolates a broken Nested package.json with its error", async () => {
  await withWorkspace(
    {
      "package.json": packageJson({ scripts: { dev: "vite" } }),
      "apps/bad/package.json": "{ not json",
      "apps/good/package.json": packageJson({ scripts: { build: "tsc" } }),
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      const bad = result.packages.find((pkg) => pkg.relDir === "apps/bad");
      assert.equal(bad?.status, "invalid");
      assert.match(bad?.error ?? "", /^Failed to parse package\.json:/);
      assert.deepEqual(bad?.scripts, []);

      const root = result.packages.find((pkg) => pkg.relDir === "");
      assert.equal(root?.status, "ok");

      const good = result.packages.find((pkg) => pkg.relDir === "apps/good");
      assert.equal(good?.status, "ok");
      assert.deepEqual(
        good?.scripts.map((script) => script.name),
        ["build"],
      );
    },
  );
});

test("does not follow a package.json symlink outside the workspace", async () => {
  await withTempDir(async (base) => {
    const outside = path.join(base, "outside-package.json");
    await fs.writeFile(outside, packageJson({ scripts: { dev: "outside" } }));

    const directory = path.join(base, "workspace");
    await fs.mkdir(path.join(directory, "apps", "evil"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "package.json"),
      packageJson({ scripts: { dev: "vite" } }),
    );
    await fs.symlink(
      outside,
      path.join(directory, "apps", "evil", "package.json"),
    );

    const result = await discoverEntries(directory);

    const evil = result.packages.find((pkg) => pkg.relDir === "apps/evil");
    assert.equal(evil?.status, "invalid");
    assert.match(evil?.error ?? "", /PATH_OUTSIDE_WORKSPACE/);
    assert.equal(result.packages[0].status, "ok");
  });
});

test("isolates a Root package.json error and still lists the rest", async () => {
  await withTempDir(async (base) => {
    const outside = path.join(base, "outside-package.json");
    await fs.writeFile(outside, packageJson({ scripts: { dev: "outside" } }));

    const directory = path.join(base, "workspace");
    await fs.mkdir(path.join(directory, "apps", "web"), { recursive: true });
    await fs.symlink(outside, path.join(directory, "package.json"));
    await fs.writeFile(
      path.join(directory, "apps", "web", "package.json"),
      packageJson({ scripts: { dev: "next dev" } }),
    );
    await fs.writeFile(path.join(directory, "keep.sh"), "#!/bin/sh\n");

    const result = await discoverEntries(directory);

    const root = result.packages.find((pkg) => pkg.relDir === "");
    assert.equal(root?.status, "invalid");
    assert.match(root?.error ?? "", /PATH_OUTSIDE_WORKSPACE/);

    const web = result.packages.find((pkg) => pkg.relDir === "apps/web");
    assert.equal(web?.status, "ok");
    assert.deepEqual(
      web?.scripts.map((script) => script.name),
      ["dev"],
    );
    assert.deepEqual(
      result.shellScripts.map((script) => script.path),
      ["keep.sh"],
    );
  });
});

test("surfaces Nested packages when the Root has no package.json", async () => {
  await withWorkspace(
    { "apps/web/package.json": packageJson({ scripts: { dev: "x" } }) },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(
        result.packages.map((pkg) => [pkg.relDir, pkg.status]),
        [
          ["", "missing"],
          ["apps/web", "ok"],
        ],
      );
    },
  );
});

test("finds Shell scripts at several depths with their executable flag", async () => {
  await withWorkspace(
    {
      "run.sh": { content: "#!/bin/sh\necho run", executable: false },
      "scripts/deploy.sh": { content: "#!/bin/sh\necho deploy", executable: true },
      "tools/setup.sh": { content: "#!/bin/sh\necho setup", executable: false },
      "a/b/c/d/deep.sh": { content: "#!/bin/sh\necho deep", executable: true },
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(result.shellScripts, [
        { path: "a/b/c/d/deep.sh", executable: true },
        { path: "run.sh", executable: false },
        { path: "scripts/deploy.sh", executable: true },
        { path: "tools/setup.sh", executable: false },
      ]);
      assert.doesNotThrow(() => discoveryOutputSchema.parse(result));
    },
  );
});

test("skips Shell scripts in ignored, dot and too-deep folders", async () => {
  await withWorkspace(
    {
      "keep.sh": "#!/bin/sh\n",
      "node_modules/dep/dep.sh": "#!/bin/sh\n",
      ".git/hooks/hook.sh": "#!/bin/sh\n",
      "dist/build.sh": "#!/bin/sh\n",
      "build/build.sh": "#!/bin/sh\n",
      ".next/next.sh": "#!/bin/sh\n",
      ".cache/cache.sh": "#!/bin/sh\n",
      "a/b/c/d/e/too-deep.sh": "#!/bin/sh\n",
    },
    async (directory) => {
      const result = await discoverEntries(directory);

      assert.deepEqual(
        result.shellScripts.map((script) => script.path),
        ["keep.sh"],
      );
      assert.equal(result.truncated, true);
    },
  );
});

test("follows a Shell script symlink only when its real path is inside the workspace", async () => {
  await withTempDir(async (base) => {
    const outside = path.join(base, "outside.sh");
    await fs.writeFile(outside, "#!/bin/sh\necho outside\n");
    await fs.chmod(outside, 0o755);

    const directory = path.join(base, "workspace");
    await fs.mkdir(path.join(directory, "scripts"), { recursive: true });
    await fs.writeFile(
      path.join(directory, "scripts", "deploy.sh"),
      "#!/bin/sh\necho deploy\n",
    );
    await fs.chmod(path.join(directory, "scripts", "deploy.sh"), 0o755);
    await fs.symlink(
      path.join("scripts", "deploy.sh"),
      path.join(directory, "linked.sh"),
    );
    await fs.symlink(outside, path.join(directory, "outside.sh"));
    await fs.symlink("missing.sh", path.join(directory, "broken.sh"));

    const result = await discoverEntries(directory);

    assert.deepEqual(result.shellScripts, [
      { path: "linked.sh", executable: true },
      { path: "scripts/deploy.sh", executable: true },
    ]);
  });
});
