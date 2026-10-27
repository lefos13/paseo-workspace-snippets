// Node's type stripping does not rewrite specifiers, while the plugin sources
// use extensionless relative imports (bundler resolution). Resolve those to the
// matching TypeScript file so tests can import the real modules.
import { registerHooks } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".") || !context.parentURL) throw error;
      const base = path.resolve(
        path.dirname(fileURLToPath(context.parentURL)),
        specifier,
      );
      for (const candidate of [
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, "index.ts"),
      ]) {
        if (fs.existsSync(candidate)) {
          return { url: `file://${candidate}`, shortCircuit: true };
        }
      }
      throw error;
    }
  },
});
