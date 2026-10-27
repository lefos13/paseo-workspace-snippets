import { useCallback, useMemo, useState } from "react";

export interface EntryActionsOptions {
  /** Starts an entry; Restart uses the same call because Run restarts too. */
  run: (entryKey: string) => Promise<unknown>;
  stop: (entryKey: string) => Promise<unknown>;
  close: (entryKey: string) => Promise<unknown>;
  /** Refreshes open-terminal state after an action succeeds. */
  refresh: () => Promise<unknown>;
  onError: (error: unknown) => void;
}

export interface EntryActions {
  pendingActionEntries: Record<string, boolean>;
  run: (entryKey: string) => Promise<void>;
  restart: (entryKey: string) => Promise<void>;
  stop: (entryKey: string) => Promise<void>;
  close: (entryKey: string) => Promise<void>;
}

/**
 * Run, Restart, Stop and Close for every entry type. Pending state is keyed by
 * entry key, which is what the section components look up for their rows.
 */
export function useEntryActions({
  run,
  stop,
  close,
  refresh,
  onError,
}: EntryActionsOptions): EntryActions {
  const [pendingActionEntries, setPendingActionEntries] = useState<
    Record<string, boolean>
  >({});

  const perform = useCallback(
    async (entryKey: string, action: (entryKey: string) => Promise<unknown>) => {
      setPendingActionEntries((prev) => ({ ...prev, [entryKey]: true }));
      try {
        await action(entryKey);
        await refresh();
      } catch (error) {
        onError(error);
      } finally {
        setPendingActionEntries((prev) => ({ ...prev, [entryKey]: false }));
      }
    },
    [refresh, onError],
  );

  return useMemo(
    () => ({
      pendingActionEntries,
      run: (entryKey: string) => perform(entryKey, run),
      restart: (entryKey: string) => perform(entryKey, run),
      stop: (entryKey: string) => perform(entryKey, stop),
      close: (entryKey: string) => perform(entryKey, close),
    }),
    [close, perform, pendingActionEntries, run, stop],
  );
}
