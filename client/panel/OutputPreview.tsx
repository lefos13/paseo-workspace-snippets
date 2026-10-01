import type { PluginTheme } from "@getpaseo/plugin";
import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { entryOutputRpc } from "../../shared/rpc";
import { makeStyles } from "./styles";

export interface OutputPreviewProps {
  workspaceId: string;
  entryKey: string;
  entryName: string;
  isOpen: boolean;
  theme: PluginTheme;
  compact: boolean;
}

export function OutputPreview({
  workspaceId,
  entryKey,
  entryName,
  isOpen,
  theme,
  compact,
}: OutputPreviewProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);
  const getOutput = useRpc(entryOutputRpc);

  const { data, isLoading } = useQuery({
    queryKey: ["output", workspaceId, entryKey],
    queryFn: () => getOutput({ workspaceId, entryKey, lines: 40 }),
    refetchInterval: 1500,
  });

  const content = useMemo(() => {
    if (isLoading && !data) {
      return "Loading output...";
    }
    if (!isOpen || !data?.open) {
      return "Terminal is not open.";
    }
    if (!data.lines || data.lines.length === 0) {
      return "No output yet.";
    }
    return data.lines.join("\n");
  }, [isLoading, data, isOpen]);

  return (
    <View style={styles.outputContainer}>
      <Text
        selectable={true}
        style={styles.outputText}
        accessibilityLabel={`Terminal output for ${entryName}`}
      >
        {content}
      </Text>
    </View>
  );
}
