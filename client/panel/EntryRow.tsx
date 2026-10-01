import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { OutputPreview } from "./OutputPreview";
import { makeStyles } from "./styles";

export interface EntryRowProps {
  workspaceId: string;
  name: string;
  command: string;
  scope?: "project" | "workspace";
  entryKey: string;
  terminalName: string;
  theme: PluginTheme;
  compact: boolean;
  isOpen: boolean;
  isActionPending: boolean;
  actionsDisabled?: boolean;
  showTabHint: boolean;
  onRun: () => void;
  onRestart: () => void;
  onStop: () => void;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntryRow({
  workspaceId,
  name,
  command,
  scope,
  entryKey,
  terminalName,
  theme,
  compact,
  isOpen,
  isActionPending,
  actionsDisabled = false,
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
  const disabled = isActionPending || actionsDisabled;

  const statusIndicator = (
    <View style={styles.statusContainer}>
      <View style={isOpen ? styles.statusDotOpen : styles.statusDotClosed} />
      <Text style={styles.statusLabel}>{isOpen ? "open" : "not running"}</Text>
    </View>
  );

  const chevronButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Toggle output preview for ${name}`}
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
            accessibilityLabel={`Restart ${name}`}
            style={[
              styles.actionButton,
              disabled && styles.actionButtonDisabled,
            ]}
            disabled={disabled}
            onPress={onRestart}
          >
            <Icon name="RotateCw" size={14} color={theme.colors.foreground} />
            <Text style={styles.actionButtonText}>Restart</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Stop ${name}`}
            style={[
              styles.actionButton,
              disabled && styles.actionButtonDisabled,
            ]}
            disabled={disabled}
            onPress={onStop}
          >
            <Icon name="Square" size={14} color={theme.colors.foreground} />
            <Text style={styles.actionButtonText}>Stop</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Close ${name}`}
            style={[
              styles.actionButton,
              disabled && styles.actionButtonDisabled,
            ]}
            disabled={disabled}
            onPress={onClose}
          >
            <Icon name="X" size={14} color={theme.colors.foreground} />
            <Text style={styles.actionButtonText}>Close</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Run ${name}`}
          style={[
            styles.actionButton,
            disabled && styles.actionButtonDisabled,
          ]}
          disabled={disabled}
          onPress={onRun}
        >
          <Icon name="Play" size={14} color={theme.colors.foreground} />
          <Text style={styles.actionButtonText}>Run</Text>
        </Pressable>
      )}

      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit snippet ${name}`}
          style={[
            styles.actionButton,
            disabled && styles.actionButtonDisabled,
          ]}
          disabled={disabled}
          onPress={onEdit}
        >
          <Icon name="Pencil" size={14} color={theme.colors.foreground} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </Pressable>
      ) : null}

      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete snippet ${name}`}
          style={[
            styles.actionDangerButton,
            disabled && styles.actionButtonDisabled,
          ]}
          disabled={disabled}
          onPress={onDelete}
        >
          <Icon name="Trash2" size={14} color={theme.colors.statusDanger} />
          <Text style={styles.actionDangerButtonText}>Delete</Text>
        </Pressable>
      ) : null}

      {chevronButton}
    </View>
  );

  const tabHint = showTabHint ? (
    <Text style={styles.tabHintText}>
      Opened in terminal tab {terminalName}
    </Text>
  ) : null;

  const outputPreview = expanded ? (
    <OutputPreview
      workspaceId={workspaceId}
      entryKey={entryKey}
      entryName={name}
      isOpen={isOpen}
      theme={theme}
      compact={compact}
    />
  ) : null;

  const scopeBadge = scope ? (
    <View style={styles.scopeBadge}>
      <Text style={styles.scopeBadgeText}>{scope}</Text>
    </View>
  ) : null;

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <View style={styles.compactRowHeader}>
          <Text style={styles.entryName} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.rowTrailing}>
            {scopeBadge}
            {statusIndicator}
          </View>
        </View>

        <Text
          style={styles.entryCommand}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {command}
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
            {name}
          </Text>
          <Text
            style={styles.entryCommand}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {command}
          </Text>
          {tabHint}
        </View>

        <View style={styles.rowTrailing}>
          {scopeBadge}
          {statusIndicator}
          {actionButtons}
        </View>
      </View>

      {outputPreview}
    </View>
  );
}
