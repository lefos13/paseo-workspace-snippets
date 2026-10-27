import assert from "node:assert/strict";
import test from "node:test";
import { discoverEntries } from "../server/discovery";
import { discoveryOutputSchema } from "../shared/discovery";
import { packageJson, withWorkspace } from "./helpers";

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
