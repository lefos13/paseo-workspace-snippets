import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const SnippetSchema = z.object({
  id: z.string().min(1), // random, stable; used in entry keys
  name: z.string().trim().min(1).max(60),
  command: z.string().trim().min(1).max(4000),
  scope: z.enum(["project", "workspace"]),
});
export type Snippet = z.infer<typeof SnippetSchema>;

export const snippetsSettings = defineSettings({
  id: "snippets",
  scope: "host",
  version: 1,
  schema: z.object({
    // key: projectRootPath (scope "project") — shared by every worktree of the project
    projects: z.record(z.string(), z.array(SnippetSchema)).default({}),
    // key: workspace directory (scope "workspace")
    workspaces: z.record(z.string(), z.array(SnippetSchema)).default({}),
    showScripts: z.boolean().default(true),
  }),
});

export type SnippetsSettingsValues = z.infer<typeof snippetsSettings.schema>;
export type SaveResult = Promise<boolean>;
