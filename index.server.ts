import type { PluginServerContext } from "@getpaseo/plugin/server";
import { resolveEntry } from "./server/entries";
import {
  closeTerminalEntry,
  listTerminalStates,
  runTerminalEntry,
  stopTerminalEntry,
} from "./server/terminals";
import { resolveWorkspace } from "./server/workspace";
import {
  closeEntryRpc,
  runEntryRpc,
  stopEntryRpc,
  terminalStatesRpc,
} from "./shared/rpc";
import { snippetsSettings } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(snippetsSettings);

  server.handle(terminalStatesRpc, async ({ workspaceId }, { paseo }) => {
    try {
      const open = await listTerminalStates(paseo, workspaceId);
      return { open };
    } catch (err) {
      console.error("[snippets] terminalStatesRpc error:", err);
      throw err;
    }
  });

  server.handle(runEntryRpc, async ({ workspaceId, entryKey }, { paseo }) => {
    try {
      const ws = await resolveWorkspace(paseo, workspaceId);
      const entry = await resolveEntry(settings, entryKey, ws);
      return await runTerminalEntry(
        paseo,
        workspaceId,
        ws.directory,
        entry.terminalName,
        entry.command,
      );
    } catch (err) {
      console.error("[snippets] runEntryRpc error:", err);
      throw err;
    }
  });

  server.handle(stopEntryRpc, async ({ workspaceId, entryKey }, { paseo }) => {
    try {
      const ws = await resolveWorkspace(paseo, workspaceId);
      const entry = await resolveEntry(settings, entryKey, ws);
      return await stopTerminalEntry(paseo, workspaceId, entry.terminalName);
    } catch (err) {
      console.error("[snippets] stopEntryRpc error:", err);
      throw err;
    }
  });

  server.handle(closeEntryRpc, async ({ workspaceId, entryKey }, { paseo }) => {
    try {
      const ws = await resolveWorkspace(paseo, workspaceId);
      const entry = await resolveEntry(settings, entryKey, ws);
      return await closeTerminalEntry(paseo, workspaceId, entry.terminalName);
    } catch (err) {
      console.error("[snippets] closeEntryRpc error:", err);
      throw err;
    }
  });

  return () => {};
}
