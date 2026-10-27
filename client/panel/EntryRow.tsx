import type { PluginTheme } from "@getpaseo/plugin";
import { Icon, Modal } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { OutputPreview } from "./OutputPreview";
import { makeStyles } from "./styles";

interface ActionButtonOptions {
  id: string;
  accessibilityLabel: string;
  tooltip: string;
  icon: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
}

export interface EntryRowProps {
  workspaceId?: string | null;
  name: string;
  command: string;
  scope?: "project" | "workspace";
  entryKey: string;
  theme: PluginTheme;
  compact: boolean;
  isOpen: boolean;
  isActionPending: boolean;
  actionsDisabled?: boolean;
  canPreview?: boolean;
  showDivider?: boolean;
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
  theme,
  compact,
  isOpen,
  isActionPending,
  actionsDisabled = false,
  canPreview,
  showDivider = false,
  onRun,
  onRestart,
  onStop,
  onClose,
  onEdit,
  onDelete,
}: EntryRowProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const disabled = isActionPending || actionsDisabled;
  const showPreview =
    canPreview !== undefined ? canPreview : Boolean(workspaceId);

  const actionButton = ({
    id,
    accessibilityLabel,
    tooltip,
    icon,
    color,
    disabled: actionDisabled,
    onPress,
  }: ActionButtonOptions) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={actionDisabled}
      hitSlop={4}
      onPress={onPress}
      onHoverIn={() => setHoveredAction(id)}
      onHoverOut={() =>
        setHoveredAction((current) => (current === id ? null : current))
      }
      style={[
        styles.iconAction,
        hoveredAction === id && !actionDisabled && styles.iconActionHovered,
        actionDisabled && styles.actionButtonDisabled,
      ]}
    >
      <Icon name={icon} size={14} color={color} />
      {hoveredAction === id && !actionDisabled ? (
        <View pointerEvents="none" style={styles.tooltip}>
          <Text style={styles.tooltipText} numberOfLines={1}>
            {tooltip}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  const scopeBadge = scope ? (
    <View style={styles.scopeBadge}>
      <Text style={styles.scopeBadgeText}>{scope}</Text>
    </View>
  ) : null;

  const outputPreview =
    expanded && workspaceId && showPreview ? (
      <OutputPreview
        workspaceId={workspaceId}
        entryKey={entryKey}
        entryName={name}
        isOpen={isOpen}
        theme={theme}
        compact={compact}
      />
    ) : null;

  const menu =
    onEdit || onDelete ? (
      <Modal
        title="Snippet actions"
        open={menuOpen}
        onOpenChange={setMenuOpen}
      >
        <Modal.Content contentContainerStyle={styles.menuContainer}>
          {onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit snippet ${name}`}
              disabled={disabled}
              style={[styles.menuItem, disabled && styles.actionButtonDisabled]}
              onPress={() => {
                setMenuOpen(false);
                onEdit();
              }}
            >
              <Icon name="Pencil" size={16} color={theme.colors.foreground} />
              <Text style={styles.menuItemText}>Edit snippet</Text>
            </Pressable>
          ) : null}

          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete snippet ${name}`}
              disabled={disabled}
              style={[styles.menuItem, disabled && styles.actionButtonDisabled]}
              onPress={() => {
                setMenuOpen(false);
                onDelete();
              }}
            >
              <Icon name="Trash2" size={16} color={theme.colors.statusDanger} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Delete snippet
              </Text>
            </Pressable>
          ) : null}
        </Modal.Content>
      </Modal>
    ) : null;

  return (
    <View style={showDivider ? styles.entryItemDivider : null}>
      <View style={styles.entryRow}>
        <View
          accessibilityRole="text"
          accessibilityLabel={
            isOpen ? `${name} is open` : `${name} is not running`
          }
          style={isOpen ? styles.statusDotOpen : styles.statusDotClosed}
        />

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

        <View style={styles.rowTrailing}>
          {scopeBadge}
          <View style={styles.entryActions}>
            {isOpen ? (
              <>
                {actionButton({
                  id: "restart",
                  accessibilityLabel: `Restart ${name}`,
                  tooltip: "Restart",
                  icon: "RotateCw",
                  color: theme.colors.foreground,
                  disabled,
                  onPress: onRestart,
                })}
                {actionButton({
                  id: "stop",
                  accessibilityLabel: `Stop ${name}`,
                  tooltip: "Stop",
                  icon: "Square",
                  color: theme.colors.foreground,
                  disabled,
                  onPress: onStop,
                })}
                {actionButton({
                  id: "close",
                  accessibilityLabel: `Close ${name}`,
                  tooltip: "Close",
                  icon: "X",
                  color: theme.colors.foreground,
                  disabled,
                  onPress: onClose,
                })}
              </>
            ) : (
              actionButton({
                id: "run",
                accessibilityLabel: `Run ${name}`,
                tooltip: "Run",
                icon: "Play",
                color: theme.colors.foreground,
                disabled,
                onPress: onRun,
              })
            )}

            {onEdit || onDelete
              ? actionButton({
                  id: "more",
                  accessibilityLabel: `More actions for ${name}`,
                  tooltip: "More actions",
                  icon: "MoreHorizontal",
                  color: theme.colors.foreground,
                  disabled,
                  onPress: () => setMenuOpen(true),
                })
              : null}

            {showPreview
              ? actionButton({
                  id: "preview",
                  accessibilityLabel: `Toggle output preview for ${name}`,
                  tooltip: expanded ? "Hide output" : "Show output",
                  icon: expanded ? "ChevronDown" : "ChevronRight",
                  color: theme.colors.foregroundMuted,
                  disabled: false,
                  onPress: () => setExpanded((prev) => !prev),
                })
              : null}
          </View>
        </View>
      </View>

      {outputPreview}
      {menu}
    </View>
  );
}
