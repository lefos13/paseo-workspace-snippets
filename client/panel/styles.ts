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
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 4,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    emptyState: {
      padding: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.surface1,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyStateText: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.foregroundMuted,
    },
    list: {
      gap: 6,
    },
    // Entry list: one bordered container, thin dividers between rows.
    entryList: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface1,
    },
    entryItemDivider: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    entryRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      minHeight: 32,
      paddingVertical: 4,
      paddingHorizontal: 12,
    },
    rowTrailing: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    rowActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    entryActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
    },
    // Entry items
    entryName: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    entryCommand: {
      flex: 1,
      minWidth: 0,
      fontSize: 12,
      fontFamily: "monospace",
      color: theme.colors.foregroundMuted,
    },
    scopeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    scopeBadgeText: {
      fontSize: 11,
      color: theme.colors.foregroundMuted,
      textTransform: "lowercase" as const,
    },
    // Status indicators
    statusDotOpen: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
    },
    statusDotClosed: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.foregroundMuted,
    },
    outputContainer: {
      marginTop: 8,
      marginHorizontal: 10,
      marginBottom: 8,
      padding: 10,
      borderRadius: 6,
      backgroundColor: theme.colors.surface0,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    outputText: {
      fontSize: 11,
      lineHeight: 16,
      fontFamily: "monospace",
      color: theme.colors.foregroundMuted,
    },
    // Icon-only actions with hover tooltips
    iconAction: {
      width: 24,
      height: 24,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: 4,
    },
    iconActionHovered: {
      backgroundColor: theme.colors.surface2,
    },
    tooltip: {
      position: "absolute" as const,
      right: 0,
      bottom: 26,
      zIndex: 10,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tooltipText: {
      fontSize: 11,
      color: theme.colors.foreground,
    },
    // Snippet overflow menu
    menuContainer: {
      gap: 2,
      padding: 8,
    },
    menuItem: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 6,
    },
    menuItemText: {
      fontSize: 14,
      color: theme.colors.foreground,
    },
    menuItemTextDanger: {
      color: theme.colors.statusDanger,
    },
    // Action buttons
    actionButtonDisabled: {
      opacity: 0.5,
    },
    // General buttons
    buttonPrimary: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.accent,
    },
    buttonPrimaryText: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: theme.colors.accentForeground,
    },
    buttonPrimarySmall: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
    },
    buttonPrimarySmallText: {
      fontSize: 12,
      fontWeight: "500" as const,
      color: theme.colors.accentForeground,
    },
    buttonSecondary: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonSecondaryText: {
      fontSize: 13,
      color: theme.colors.foreground,
    },
    buttonDanger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.statusDanger,
    },
    buttonDangerText: {
      fontSize: 13,
      color: theme.colors.statusDanger,
    },
    buttonDangerSolid: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: theme.colors.statusDanger,
    },
    buttonDangerSolidText: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: theme.colors.accentForeground,
    },
    // Form / Modal
    formContainer: {
      gap: 16,
      padding: 16,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: theme.colors.foreground,
    },
    textInput: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface1,
      fontSize: 13,
      color: theme.colors.foreground,
    },
    textInputMultiline: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface1,
      fontSize: 13,
      fontFamily: "monospace",
      color: theme.colors.foreground,
      minHeight: 80,
      textAlignVertical: "top" as const,
    },
    segmentedControl: {
      flexDirection: "row" as const,
      borderRadius: 6,
      backgroundColor: theme.colors.surface1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden" as const,
    },
    segmentedButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.colors.surface1,
    },
    segmentedButtonActive: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: theme.colors.surface2,
    },
    segmentedButtonText: {
      fontSize: 13,
      color: theme.colors.foregroundMuted,
    },
    segmentedButtonActiveText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    fieldHint: {
      fontSize: 11,
      color: theme.colors.foregroundMuted,
    },
    fieldError: {
      fontSize: 12,
      color: theme.colors.statusDanger,
    },
    modalActions: {
      flexDirection: "row" as const,
      justifyContent: "flex-end" as const,
      alignItems: "center" as const,
      gap: 10,
      marginTop: 8,
    },
    modalActionsSplit: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      marginTop: 8,
    },
    // Banner / Error / Loading states
    stateBanner: {
      padding: 16,
      borderRadius: 6,
      backgroundColor: theme.colors.surface1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 8,
    },
    stateBannerError: {
      padding: 16,
      borderRadius: 6,
      backgroundColor: theme.colors.surface1,
      borderWidth: 1,
      borderColor: theme.colors.statusDanger,
      gap: 8,
    },
    stateBannerTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    stateBannerText: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.foregroundMuted,
    },
    stateBannerTextDanger: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.statusDanger,
    },
    stateBannerActions: {
      flexDirection: "row" as const,
      gap: 8,
      marginTop: 4,
    },
    // Layout styles
    wideRoot: {
      flex: 1,
      flexDirection: "row" as const,
      backgroundColor: theme.colors.surface0,
    },
    leftColumn: {
      width: 260,
      flexGrow: 0,
      flexShrink: 0,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      backgroundColor: theme.colors.surface0,
    },
    leftColumnContent: {
      padding: 12,
    },
    rightColumn: {
      flex: 1,
      backgroundColor: theme.colors.surface0,
    },
    rightColumnContent: {
      padding: 24,
      gap: 16,
    },
    compactRoot: {
      flex: 1,
      backgroundColor: theme.colors.surface0,
    },
    compactSelectorRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface1,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    compactSelectorRowPressed: {
      backgroundColor: theme.colors.surface2,
    },
    compactSelectorInfo: {
      flex: 1,
      gap: 2,
    },
    compactSelectorName: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    compactSelectorPath: {
      fontSize: 11,
      color: theme.colors.foregroundMuted,
    },
    compactScroll: {
      flex: 1,
    },
    compactScrollContent: {
      padding: 16,
      gap: 16,
    },
    projectHeaderRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    projectHeaderInfo: {
      flex: 1,
      gap: 2,
    },
    projectHeaderTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    projectHeaderPath: {
      fontSize: 12,
      color: theme.colors.foregroundMuted,
    },
  };
}
