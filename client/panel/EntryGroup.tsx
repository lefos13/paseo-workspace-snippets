import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { makeStyles } from "./styles";

export interface EntryGroupProps {
  /** Header text, e.g. `apps/web · pnpm` or `scripts`. */
  label: string;
  /** Plural noun for the toggle's accessibility label, e.g. `scripts`. */
  kind: string;
  collapsed: boolean;
  onToggle: () => void;
  /** Shown under the header even when collapsed, e.g. a parse error. */
  notice?: ReactNode;
  theme: PluginTheme;
  compact: boolean;
  children: ReactNode;
}

/**
 * One collapsible group of entries: Scripts per Package and Shell scripts per
 * folder. Rows are wrapped in the shared bordered list.
 */
export function EntryGroup({
  label,
  kind,
  collapsed,
  onToggle,
  notice,
  theme,
  compact,
  children,
}: EntryGroupProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);

  return (
    <View style={styles.packageGroup}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={`${collapsed ? "Expand" : "Collapse"} ${label} ${kind}`}
        style={styles.packageGroupHeaderRow}
        onPress={onToggle}
      >
        <Icon
          name={collapsed ? "ChevronRight" : "ChevronDown"}
          size={14}
          color={theme.colors.foregroundMuted}
        />
        <Text style={styles.packageGroupHeader}>{label}</Text>
      </Pressable>

      {notice}

      {!collapsed && children ? (
        <View style={styles.entryList}>{children}</View>
      ) : null}
    </View>
  );
}
