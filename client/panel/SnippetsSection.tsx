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
  actionsDisabled?: boolean;
  entryCanPreview?: (isOpen: boolean) => boolean;
  theme: PluginTheme;
  compact: boolean;
  onRun: (entryKey: string) => void;
  onRestart: (entryKey: string) => void;
  onStop: (entryKey: string) => void;
  onClose: (entryKey: string) => void;
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
        <View style={styles.entryList}>
          {snippets.map((snippet, index) => {
            const termName = terminalName("snippet", snippet.name);
            const isOpen = Boolean(openTerminals[termName]);
            const key = entryKey("snippet", snippet.id);
            const isActionPending = Boolean(pendingActionEntries[key]);

            return (
              <EntryRow
                key={snippet.id}
                workspaceId={workspaceId}
                name={snippet.name}
                command={snippet.command}
                scope={snippet.scope}
                entryKey={key}
                theme={theme}
                compact={compact}
                isOpen={isOpen}
                isActionPending={isActionPending}
                actionsDisabled={actionsDisabled}
                showDivider={index > 0}
                canPreview={
                  entryCanPreview ? entryCanPreview(isOpen) : undefined
                }
                onRun={() => onRun(key)}
                onRestart={() => onRestart(key)}
                onStop={() => onStop(key)}
                onClose={() => onClose(key)}
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
