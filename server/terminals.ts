import type { PaseoApi } from "@getpaseo/client";

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

export async function listTerminalStates(
  paseo: PaseoApi,
  workspaceId: string,
): Promise<Record<string, string>> {
  const ws = paseo.workspaces.ref(workspaceId);
  const { entries } = await ws.terminals.list();
  const open: Record<string, string> = {};
  for (const term of entries) {
    if (term.name && !open[term.name]) {
      open[term.name] = term.id;
    }
  }
  return open;
}

export async function runTerminalEntry(
  paseo: PaseoApi,
  workspaceId: string,
  directory: string,
  terminalName: string,
  command: string,
): Promise<{ terminalId: string; created: boolean }> {
  const lockKey = `${workspaceId}:${terminalName}`;
  return withTerminalLock(lockKey, async () => {
    const ws = paseo.workspaces.ref(workspaceId);
    const { entries } = await ws.terminals.list();
    const existing = entries.find((t) => t.name === terminalName);

    if (existing) {
      // Terminal open: Restart
      const handle = paseo.terminals.ref(existing.id);
      handle.sendKeys(["C-c"]);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 300);
      });
      handle.write(command);
      handle.sendKeys(["Enter"]);
      return { terminalId: existing.id, created: false };
    }

    // Terminal missing: Create and Run
    const handle = await ws.terminals.create({
      name: terminalName,
      cwd: directory,
    });
    handle.write(command);
    handle.sendKeys(["Enter"]);
    return { terminalId: handle.id, created: true };
  });
}

export async function stopTerminalEntry(
  paseo: PaseoApi,
  workspaceId: string,
  terminalName: string,
): Promise<{ stopped: boolean }> {
  const lockKey = `${workspaceId}:${terminalName}`;
  return withTerminalLock(lockKey, async () => {
    const ws = paseo.workspaces.ref(workspaceId);
    const { entries } = await ws.terminals.list();
    const existing = entries.find((t) => t.name === terminalName);

    if (!existing) {
      return { stopped: false };
    }

    const handle = paseo.terminals.ref(existing.id);
    handle.sendKeys(["C-c"]);
    return { stopped: true };
  });
}

export async function closeTerminalEntry(
  paseo: PaseoApi,
  workspaceId: string,
  terminalName: string,
): Promise<{ closed: boolean }> {
  const lockKey = `${workspaceId}:${terminalName}`;
  return withTerminalLock(lockKey, async () => {
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
  });
}
