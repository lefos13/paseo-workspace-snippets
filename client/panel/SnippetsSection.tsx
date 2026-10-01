import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { entryKey, terminalName } from "../../shared/entries";
import type { Snippet } from "../../shared/settings";
import { EntryRow } from "./EntryRow";
import { makeStyles } from "./styles";

export interface SnippetsSectionProps {
  title?: string;
  workspaceId?: string | null;
  snippets: Snippet[];
  openTerminals: Record<string, string>;
  pendingActionEntries: Record<string, boolean>;
  lastRunSnippetId: string | null;
  actionsDisabled?: boolean;
  entryCanPreview?: (isOpen: boolean) => boolean;
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
  title = "Snippets",
  workspaceId,
  snippets,
  openTerminals,
  pendingActionEntries,
  lastRunSnippetId,
  actionsDisabled = false,
  entryCanPreview,
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
        <Text style={styles.sectionTitle}>{title}</Text>
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
                workspaceId={workspaceId}
                name={snippet.name}
                command={snippet.command}
                scope={snippet.scope}
                entryKey={entryKey("snippet", snippet.id)}
                terminalName={termName}
                theme={theme}
                compact={compact}
                isOpen={isOpen}
                isActionPending={isActionPending}
                actionsDisabled={actionsDisabled}
                showTabHint={showTabHint}
                canPreview={
                  entryCanPreview ? entryCanPreview(isOpen) : undefined
                }
                onRun={() => onRun(snippet)}
                onRestart={() => onRestart(snippet)}
                onStop={() => onStop(snippet)}
                onClose={() => onClose(snippet)}
                onEdit={() => onEdit(snippet)}
                onDelete={() => onDelete(snippet)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
