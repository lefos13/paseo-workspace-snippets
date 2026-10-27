import { z } from "zod";

export const packageManagerSchema = z.enum(["npm", "pnpm", "yarn", "bun"]);
export type PackageManager = z.infer<typeof packageManagerSchema>;

export const detectedScriptSchema = z.object({
  name: z.string(),
  body: z.string(),
  command: z.string(),
});
export type DetectedScript = z.infer<typeof detectedScriptSchema>;

export const detectedPackageSchema = z.object({
  // Relative to the workspace root; "" is the Root package.
  relDir: z.string(),
  status: z.enum(["ok", "missing", "invalid"]),
  error: z.string().nullable(),
  packageManager: packageManagerSchema,
  scripts: z.array(detectedScriptSchema),
});
export type DetectedPackage = z.infer<typeof detectedPackageSchema>;

export const shellScriptSchema = z.object({
  // Relative to the workspace root, e.g. "scripts/deploy.sh".
  path: z.string(),
  executable: z.boolean(),
});
export type ShellScript = z.infer<typeof shellScriptSchema>;

export const discoveryOutputSchema = z.object({
  packages: z.array(detectedPackageSchema),
  shellScripts: z.array(shellScriptSchema),
  truncated: z.boolean(),
});
export type DiscoveryResult = z.infer<typeof discoveryOutputSchema>;
