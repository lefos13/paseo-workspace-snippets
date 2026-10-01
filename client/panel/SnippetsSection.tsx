import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { terminalName } from "../../shared/entries";
import type { Snippet } from "../../shared/settings";
import { EntryRow } from "./EntryRow";
import { makeStyles } from "./styles";

export interface SnippetsSectionProps {
  snippets: Snippet[];
  openTerminals: Record<string, string>;
  pendingActionEntries: Record<string, boolean>;
  lastRunSnippetId: string | null;
  theme: PluginTheme;
  compact: boolean;
  onRun: (snippet: Snippet) => void;
  onRestart: (snippet: Snippet) => void;
  onStop: (snippet: Snippet) => void;
  onClose: (snippet: Snippet) => void;
  onAdd: () => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

export function SnippetsSection({
  snippets,
  openTerminals,
  pendingActionEntries,
  lastRunSnippetId,
  theme,
  compact,
  onRun,
  onRestart,
  onStop,
  onClose,
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
          {snippets.map((snippet) => {
            const termName = terminalName("snippet", snippet.name);
            const isOpen = Boolean(openTerminals[termName]);
            const isActionPending = Boolean(pendingActionEntries[snippet.id]);
            const showTabHint = lastRunSnippetId === snippet.id;

            return (
              <EntryRow
                key={snippet.id}
                snippet={snippet}
                theme={theme}
                compact={compact}
                isOpen={isOpen}
                isActionPending={isActionPending}
                showTabHint={showTabHint}
                onRun={onRun}
                onRestart={onRestart}
                onStop={onStop}
                onClose={onClose}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
