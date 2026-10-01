import type { PluginServerContext } from "@getpaseo/plugin/server";
import { resolveEntry, resolveEntryByName } from "./server/entries";
import { detectScripts } from "./server/package-json";
import {
  closeTerminalEntry,
  getTerminalOutput,
  listTerminalStates,
  runTerminalEntry,
  stopTerminalEntry,
} from "./server/terminals";
import { resolveWorkspace } from "./server/workspace";
import { snippetsFor } from "./shared/entries";
import {
  closeEntryRpc,
  detectScriptsRpc,
  entryOutputRpc,
  listEntriesRpc,
  runByNameRpc,
  runEntryRpc,
  stopEntryRpc,
  terminalStatesRpc,
} from "./shared/rpc";
import { snippetsSettings } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(snippetsSettings);

  server.handle(runByNameRpc, async ({ workspaceId, name }, { paseo }) => {
    try {
      const ws = await resolveWorkspace(paseo, workspaceId);
      const entry = await resolveEntryByName(settings, name, ws);
      const result = await runTerminalEntry(
        paseo,
        workspaceId,
        ws.directory,
        entry.terminalName,
        entry.command,
      );
      return {
        entryKey: entry.key,
        terminalId: result.terminalId,
      };
    } catch (err) {
      console.error("[snippets] runByNameRpc error:", err);
      throw err;
    }
  });

  server.handle(listEntriesRpc, async ({ workspaceId }, { paseo }) => {
    try {
      const ws = await resolveWorkspace(paseo, workspaceId);
      const state = await settings.read();
      const snippets = snippetsFor(
        state.status === "ready" ? state.values : null,
        ws,
      );
      let scriptNames: string[] = [];
      try {
        const detection = await detectScripts(ws.directory);
        if (detection.status === "ok") {
          scriptNames = detection.scripts.map((s) => s.name);
        }
      } catch {
        // non-fatal for listing
      }
      return {
        names: [...snippets.map((s) => s.name), ...scriptNames],
      };
    } catch (err) {
      console.error("[snippets] listEntriesRpc error:", err);
      throw err;
    }
  });

  server.handle(detectScriptsRpc, async ({ workspaceId }, { paseo }) => {
    try {
      const ws = await resolveWorkspace(paseo, workspaceId);
      return await detectScripts(ws.directory);
    } catch (err) {
      console.error("[snippets] detectScriptsRpc error:", err);
      throw err;
    }
  });

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

  server.handle(
    entryOutputRpc,
    async ({ workspaceId, entryKey, lines }, { paseo }) => {
      try {
        const ws = await resolveWorkspace(paseo, workspaceId);
        const entry = await resolveEntry(settings, entryKey, ws);
        return await getTerminalOutput(
          paseo,
          workspaceId,
          entry.terminalName,
          lines,
        );
      } catch (err) {
        console.error("[snippets] entryOutputRpc error:", err);
        throw err;
      }
    },
  );

  return () => {};
}
