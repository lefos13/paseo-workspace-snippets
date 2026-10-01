import type { Paseo } from "./workspace";

const locks = new Map<string, Promise<unknown>>();

function withTerminalLock<T>(
  key: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(operation);
  locks.set(key, next);
  next.finally(() => {
    if (locks.get(key) === next) {
      locks.delete(key);
    }
  });
  return next;
}

function translateTerminalError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (
    lower.includes("update") ||
    lower.includes("unsupported") ||
    lower.includes("not supported")
  ) {
    throw new Error(`TERMINALS_UNSUPPORTED: ${message}`);
  }
  if (
    lower.includes("not found") ||
    lower.includes("unavailable") ||
    lower.includes("archived")
  ) {
    throw new Error(`WORKSPACE_UNAVAILABLE: ${message}`);
  }
  throw error;
}

export async function listTerminalStates(
  paseo: Paseo,
  workspaceId: string,
): Promise<Record<string, string>> {
  try {
    const ws = paseo.workspaces.ref(workspaceId);
    const { entries } = await ws.terminals.list();
    const open: Record<string, string> = {};
    for (const term of entries) {
      if (term.name && !open[term.name]) {
        open[term.name] = term.id;
      }
    }
    return open;
  } catch (err) {
    translateTerminalError(err);
  }
}

export async function runTerminalEntry(
  paseo: Paseo,
  workspaceId: string,
  directory: string,
  terminalName: string,
  command: string,
): Promise<{ terminalId: string; created: boolean }> {
  const lockKey = `${workspaceId}:${terminalName}`;
  return withTerminalLock(lockKey, async () => {
    try {
      const ws = paseo.workspaces.ref(workspaceId);
      const { entries } = await ws.terminals.list();
      const existing = entries.find((t) => t.name === terminalName);

      if (existing) {
        try {
          // Terminal open: Restart
          const handle = paseo.terminals.ref(existing.id);
          handle.sendKeys(["C-c"]);
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 300);
          });
          handle.write(command);
          handle.sendKeys(["Enter"]);
          return { terminalId: existing.id, created: false };
        } catch {
          // Disappeared during restart, fall through to recreate
        }
      }

      // Terminal missing: Create and Run
      const handle = await ws.terminals.create({
        name: terminalName,
        cwd: directory,
      });
      handle.write(command);
      handle.sendKeys(["Enter"]);
      return { terminalId: handle.id, created: true };
    } catch (err) {
      translateTerminalError(err);
    }
  });
}

export async function stopTerminalEntry(
  paseo: Paseo,
  workspaceId: string,
  terminalName: string,
): Promise<{ stopped: boolean }> {
  const lockKey = `${workspaceId}:${terminalName}`;
  return withTerminalLock(lockKey, async () => {
    try {
      const ws = paseo.workspaces.ref(workspaceId);
      const { entries } = await ws.terminals.list();
      const existing = entries.find((t) => t.name === terminalName);

      if (!existing) {
        return { stopped: false };
      }

      try {
        const handle = paseo.terminals.ref(existing.id);
        handle.sendKeys(["C-c"]);
        return { stopped: true };
      } catch {
        return { stopped: false };
      }
    } catch (err) {
      translateTerminalError(err);
    }
  });
}

export async function closeTerminalEntry(
  paseo: Paseo,
  workspaceId: string,
  terminalName: string,
): Promise<{ closed: boolean }> {
  const lockKey = `${workspaceId}:${terminalName}`;
  return withTerminalLock(lockKey, async () => {
    try {
      const ws = paseo.workspaces.ref(workspaceId);
      const { entries } = await ws.terminals.list();
      const existing = entries.find((t) => t.name === terminalName);

      if (!existing) {
        return { closed: false };
      }

      try {
        await paseo.terminals.ref(existing.id).kill();
        return { closed: true };
      } catch {
        return { closed: false };
      }
    } catch (err) {
      translateTerminalError(err);
    }
  });
}

export async function getTerminalOutput(
  paseo: Paseo,
  workspaceId: string,
  terminalName: string,
  lines: number,
): Promise<{ open: boolean; lines: string[]; totalLines: number }> {
  try {
    const ws = paseo.workspaces.ref(workspaceId);
    const { entries } = await ws.terminals.list();
    const existing = entries.find((t) => t.name === terminalName);

    if (!existing) {
      return { open: false, lines: [], totalLines: 0 };
    }

    try {
      const handle = paseo.terminals.ref(existing.id);
      const result = await handle.capture({ start: -lines, stripAnsi: true });
      const outputLines = result.lines ?? [];
      let endIdx = outputLines.length;
      while (endIdx > 0 && outputLines[endIdx - 1].trim() === "") {
        endIdx--;
      }
      const trimmedLines = outputLines.slice(0, endIdx);
      return {
        open: true,
        lines: trimmedLines,
        totalLines: result.totalLines ?? trimmedLines.length,
      };
    } catch {
      return { open: false, lines: [], totalLines: 0 };
    }
  } catch (err) {
    translateTerminalError(err);
  }
}
