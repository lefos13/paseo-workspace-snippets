import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const WorkspaceInput = z.object({
  workspaceId: z.string().min(1),
});

export const EntryInput = WorkspaceInput.extend({
  entryKey: z.string().regex(/^(script|snippet):.+$/),
});

export const detectScriptsRpc = defineRpc({
  name: "scripts.detect",
  input: WorkspaceInput,
  output: z.object({
    status: z.enum(["ok", "missing", "invalid"]),
    error: z.string().nullable(),
    packageManager: z.enum(["npm", "pnpm", "yarn", "bun"]),
    scripts: z.array(
      z.object({
        name: z.string(),
        body: z.string(),
        command: z.string(),
      }),
    ),
  }),
});

export const terminalStatesRpc = defineRpc({
  name: "terminals.states",
  input: WorkspaceInput,
  output: z.object({
    open: z.record(z.string(), z.string()), // terminal name -> terminal id
  }),
});

export const runEntryRpc = defineRpc({
  name: "entry.run", // creates if missing, otherwise restarts
  input: EntryInput,
  output: z.object({
    terminalId: z.string(),
    created: z.boolean(),
  }),
});

export const stopEntryRpc = defineRpc({
  name: "entry.stop",
  input: EntryInput,
  output: z.object({
    stopped: z.boolean(),
  }),
});

export const closeEntryRpc = defineRpc({
  name: "entry.close",
  input: EntryInput,
  output: z.object({
    closed: z.boolean(),
  }),
});

export const entryOutputRpc = defineRpc({
  name: "entry.output",
  input: EntryInput.extend({
    lines: z.number().int().min(1).max(200).default(40),
  }),
  output: z.object({
    open: z.boolean(),
    lines: z.array(z.string()),
    totalLines: z.number(),
  }),
});

export const runByNameRpc = defineRpc({
  name: "entry.run-by-name", // slash command
  input: WorkspaceInput.extend({ name: z.string().trim().min(1) }),
  output: z.object({ entryKey: z.string(), terminalId: z.string() }),
});

export const listEntriesRpc = defineRpc({
  name: "entry.list", // slash command with no args, error hints
  input: WorkspaceInput,
  output: z.object({ names: z.array(z.string()) }),
});
