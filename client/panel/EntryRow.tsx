import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { entryKey } from "../../shared/entries";
import type { Snippet } from "../../shared/settings";
import { OutputPreview } from "./OutputPreview";
import { makeStyles } from "./styles";

export interface EntryRowProps {
  workspaceId: string;
  snippet: Snippet;
  theme: PluginTheme;
  compact: boolean;
  isOpen: boolean;
  isActionPending: boolean;
  showTabHint: boolean;
  onRun: (snippet: Snippet) => void;
  onRestart: (snippet: Snippet) => void;
  onStop: (snippet: Snippet) => void;
  onClose: (snippet: Snippet) => void;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

export function EntryRow({
  workspaceId,
  snippet,
  theme,
  compact,
  isOpen,
  isActionPending,
  showTabHint,
  onRun,
  onRestart,
  onStop,
  onClose,
  onEdit,
  onDelete,
}: EntryRowProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);
  const [expanded, setExpanded] = useState(false);

  const statusIndicator = (
    <View style={styles.statusContainer}>
      <View style={isOpen ? styles.statusDotOpen : styles.statusDotClosed} />
      <Text style={styles.statusLabel}>{isOpen ? "open" : "not running"}</Text>
    </View>
  );

  const chevronButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Toggle output preview for ${snippet.name}`}
      style={styles.chevronButton}
      onPress={() => setExpanded((prev) => !prev)}
    >
      <Icon
        name={expanded ? "ChevronDown" : "ChevronRight"}
        size={14}
        color={theme.colors.foregroundMuted}
      />
    </Pressable>
  );

  const actionButtons = (
    <View style={styles.rowActions}>
      {isOpen ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Restart snippet ${snippet.name}`}
            style={[
              styles.actionButton,
              isActionPending && styles.actionButtonDisabled,
            ]}
            disabled={isActionPending}
            onPress={() => onRestart(snippet)}
          >
            <Icon name="RotateCw" size={14} color={theme.colors.foreground} />
            <Text style={styles.actionButtonText}>Restart</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Stop snippet ${snippet.name}`}
            style={[
              styles.actionButton,
              isActionPending && styles.actionButtonDisabled,
            ]}
            disabled={isActionPending}
            onPress={() => onStop(snippet)}
          >
            <Icon name="Square" size={14} color={theme.colors.foreground} />
            <Text style={styles.actionButtonText}>Stop</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close snippet ${snippet.name}`}
            style={[
              styles.actionButton,
              isActionPending && styles.actionButtonDisabled,
            ]}
            disabled={isActionPending}
            onPress={() => onClose(snippet)}
          >
            <Icon name="X" size={14} color={theme.colors.foreground} />
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Run snippet ${snippet.name}`}
          style={[
            styles.actionButton,
            isActionPending && styles.actionButtonDisabled,
          ]}
          disabled={isActionPending}
          onPress={() => onRun(snippet)}
        >
          <Icon name="Play" size={14} color={theme.colors.foreground} />
          <Text style={styles.actionButtonText}>Run</Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit snippet ${snippet.name}`}
        style={styles.actionButton}
        onPress={() => onEdit(snippet)}
      >
        <Icon name="Pencil" size={14} color={theme.colors.foreground} />
        <Text style={styles.actionButtonText}>Edit</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete snippet ${snippet.name}`}
        style={styles.actionDangerButton}
        onPress={() => onDelete(snippet)}
      >
        <Icon name="Trash2" size={14} color={theme.colors.statusDanger} />
        <Text style={styles.actionDangerButtonText}>Delete</Text>
      </Pressable>

      {chevronButton}
    </View>
  );

  const tabHint = showTabHint ? (
    <Text style={styles.tabHintText}>
      Opened in terminal tab snippet:{snippet.name}
    </Text>
  ) : null;

  const outputPreview = expanded ? (
    <OutputPreview
      workspaceId={workspaceId}
      entryKey={entryKey("snippet", snippet.id)}
      entryName={snippet.name}
      isOpen={isOpen}
      theme={theme}
      compact={compact}
    />
  ) : null;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <View style={styles.compactRowHeader}>
          <Text style={styles.entryName} numberOfLines={1}>
            {snippet.name}
          </Text>
          <View style={styles.rowTrailing}>
            <View style={styles.scopeBadge}>
              <Text style={styles.scopeBadgeText}>{snippet.scope}</Text>
            </View>
            {statusIndicator}
          </View>
        </View>

        <Text
          style={styles.entryCommand}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {snippet.command}
        </Text>

        {tabHint}

        <View style={styles.compactRowActions}>{actionButtons}</View>

        {outputPreview}
      </View>
    );
  }

  return (
    <View style={styles.compactRow}>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text style={styles.entryName} numberOfLines={1}>
            {snippet.name}
          </Text>
          <Text
            style={styles.entryCommand}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {snippet.command}
          </Text>
          {tabHint}
        </View>

        <View style={styles.rowTrailing}>
          <View style={styles.scopeBadge}>
            <Text style={styles.scopeBadgeText}>{snippet.scope}</Text>
          </View>
          {statusIndicator}
          {actionButtons}
        </View>
      </View>

      {outputPreview}
    </View>
  );
}
