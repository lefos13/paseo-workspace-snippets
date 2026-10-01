import type { PluginClientContext } from "@getpaseo/plugin/client";
import { SnippetsPanel } from "./client/panel/SnippetsPanel";

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

  return () => {};
}
