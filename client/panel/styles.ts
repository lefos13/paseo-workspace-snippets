import type { PluginTheme } from "@getpaseo/plugin";

export function makeStyles(theme: PluginTheme, compact: boolean) {
  const p = compact ? 16 : 24;
  return {
    screen: {
      flex: 1,
      backgroundColor: theme.colors.surface0,
    },
    container: {
      padding: p,
      gap: 16,
    },
    header: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
  };
}
