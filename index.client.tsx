import type { PluginClientContext } from "@getpaseo/plugin/client";
import { SnippetsPanel } from "./client/panel/SnippetsPanel";
import { runByNameRpc } from "./shared/rpc";

export default function contribute(client: PluginClientContext) {
  client.addWorkspacePanel({
    id: "snippets",
    title: "Snippets",
    icon: "SquareTerminal",
    context: "workspace",
    locations: ["workspace", "explorer"],
    Component: SnippetsPanel,
  });

  client.addCommandCenterItem({
    id: "open-snippets",
    title: "Open snippets",
    icon: "SquareTerminal",
    context: "workspace",
    keywords: ["run", "script", "npm", "terminal"],
    onSelect({ openPanel }) {
      openPanel("snippets");
    },
  });

  client.addSlashCommand({
    name: "snippet",
    description: "Run a saved snippet or package.json script in a terminal",
    argumentHint: "<name>",
    context: "workspace",
    async onSubmit({ args, workspace, rpc, openPanel }) {
      if (!args || !args.trim()) {
        openPanel("snippets");
        return;
      }
      await rpc(runByNameRpc, {
        workspaceId: workspace.id,
        name: args.trim(),
      });
    },
  });

  return () => {};
}
