import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { Snippet } from "../../shared/settings";
import { makeStyles } from "./styles";

export interface EntryRowProps {
  snippet: Snippet;
  theme: PluginTheme;
  compact: boolean;
  onEdit: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}

export function EntryRow({
  snippet,
  theme,
  compact,
  onEdit,
  onDelete,
}: EntryRowProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);

  if (compact) {
    return (
      <View style={styles.compactRow}>
        <View style={styles.compactRowHeader}>
          <Text style={styles.entryName} numberOfLines={1}>
            {snippet.name}
          </Text>
          <View style={styles.scopeBadge}>
            <Text style={styles.scopeBadgeText}>{snippet.scope}</Text>
          </View>
        </View>

        <Text
          style={styles.entryCommand}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {snippet.command}
        </Text>

        <View style={styles.compactRowActions}>
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
        </View>
      </View>
    );
  }

  return (
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
      </View>

      <View style={styles.rowTrailing}>
        <View style={styles.scopeBadge}>
          <Text style={styles.scopeBadgeText}>{snippet.scope}</Text>
        </View>

        <View style={styles.rowActions}>
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
        </View>
      </View>
    </View>
  );
}
