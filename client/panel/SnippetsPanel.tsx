import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useWorkspace } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { makeStyles } from "./styles";

export function SnippetsPanel({ theme, layout, workspaceId }: PluginWorkspacePanelProps) {
  const workspace = useWorkspace(workspaceId, (w) => ({
    directory: w.directory,
    projectRootPath: w.projectRootPath,
    name: w.name,
  }));

  const styles = useMemo(
    () => makeStyles(theme, layout.compact),
    [theme, layout.compact],
  );

  const headerTitle = workspace?.name
    ? `Snippets · ${workspace.name}`
    : "Snippets";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>
    </ScrollView>
  );
}
