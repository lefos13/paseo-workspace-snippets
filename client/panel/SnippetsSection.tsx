import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { Snippet } from "../../shared/settings";
import { EntryRow } from "./EntryRow";
import { makeStyles } from "./styles";

export interface SnippetsSectionProps {
  snippets: Snippet[];
  theme: PluginTheme;
  compact: boolean;
  onAdd: () => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

export function SnippetsSection({
  snippets,
  theme,
  compact,
  onAdd,
  onEdit,
  onDelete,
}: SnippetsSectionProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Snippets</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add snippet"
          style={styles.buttonPrimarySmall}
          onPress={onAdd}
        >
          <Icon name="Plus" size={14} color={theme.colors.accentForeground} />
          <Text style={styles.buttonPrimarySmallText}>Add</Text>
        </Pressable>
      </View>

      {snippets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No snippets yet. Add commands you run often (e.g. npm run dev).
            Use paseo.json services for team-shared dev servers.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {snippets.map((snippet) => (
            <EntryRow
              key={snippet.id}
              snippet={snippet}
              theme={theme}
              compact={compact}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </View>
      )}
    </View>
  );
}
