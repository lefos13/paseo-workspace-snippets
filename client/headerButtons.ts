import type {
  PluginButtonRegistration,
  PluginClientContext,
} from "@getpaseo/plugin/client";

/** The part of the SDK's owned workspace subscription this module uses. */
interface ReleasableSubscription {
  release(): Promise<void>;
}

export function registerHeaderButtons(client: PluginClientContext): () => void {
  const buttons = new Map<string, PluginButtonRegistration>();
  let stopped = false;
  let subscription: ReleasableSubscription | null = null;

  const register = (workspaceId: string) => {
    if (stopped || buttons.has(workspaceId)) return;
    const registration = client.addHeaderButton({
      id: "open-snippets",
      workspaceId,
      button: {
        title: "Open snippets",
        icon: "SquareTerminal",
        label: "Snippets",
        behavior: {
          kind: "action",
          onPress() {
            client.openPanel("snippets", { workspaceId });
          },
        },
      },
    });
    buttons.set(workspaceId, registration);
  };

  const remove = (workspaceId: string) => {
    buttons.get(workspaceId)?.remove();
    buttons.delete(workspaceId);
  };

  void client.paseo.workspaces
    .list({ subscribe: {} })
    .then(({ subscription: sub }) => {
      if (stopped) {
        void sub.release();
        return;
      }
      subscription = sub;
      sub.subscribe({
        snapshot: ({ entries }) => {
          if (stopped) return;
          for (const button of buttons.values()) {
            button.remove();
          }
          buttons.clear();
          for (const workspace of entries) {
            if (workspace.archivingAt) continue;
            register(workspace.id);
          }
        },
        update: (message) => {
          if (stopped || message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "remove") {
            remove(update.id);
          } else if (update.kind === "upsert") {
            if (update.workspace.archivingAt) {
              remove(update.workspace.id);
            } else {
              register(update.workspace.id);
            }
          }
        },
        error: (error) => {
          if (!stopped) {
            console.error("Workspace observation failed", error);
          }
        },
      });
    })
    .catch((error) => {
      if (!stopped) {
        console.error("Workspace observation failed", error);
      }
    });

  return () => {
    stopped = true;
    if (subscription) {
      void subscription.release();
      subscription = null;
    }
    for (const button of buttons.values()) {
      button.remove();
    }
    buttons.clear();
  };
}
