import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { ShellScript } from "../../shared/discovery";
import {
  entryKey,
  shellScriptCommand,
  terminalName,
} from "../../shared/entries";
import { EntryRow } from "./EntryRow";
import { usePackageGroupCollapse } from "./packageCollapse";
import { makeStyles } from "./styles";

export interface ShellScriptsSectionProps {
  workspaceId?: string | null;
  directory?: string | null;
  // Folder group collapse state is remembered per project on this device.
  projectRootPath?: string | null;
  shellScripts: ShellScript[];
  loadError: string | null;
  showShellScripts: boolean;
  onToggleShowShellScripts: () => void;
  openTerminals: Record<string, string>;
  pendingActionEntries: Record<string, boolean>;
  actionsDisabled?: boolean;
  entryCanPreview?: (isOpen: boolean) => boolean;
  theme: PluginTheme;
  compact: boolean;
  onRun: (relPath: string) => void;
  onRestart: (relPath: string) => void;
  onStop: (relPath: string) => void;
  onClose: (relPath: string) => void;
}

export function ShellScriptsSection({
  workspaceId,
  directory,
  projectRootPath,
  shellScripts,
  loadError,
  showShellScripts,
  onToggleShowShellScripts,
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
}: ShellScriptsSectionProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);
  // Shell folders are small, so every group starts expanded.
  const { isCollapsed, toggle } = usePackageGroupCollapse(
    projectRootPath,
    "shell",
    () => false,
  );

  const groups = useMemo(() => {
    const byFolder = new Map<string, ShellScript[]>();
    for (const script of shellScripts) {
      const slash = script.path.lastIndexOf("/");
      const folder = slash === -1 ? "" : script.path.slice(0, slash);
      const list = byFolder.get(folder) ?? [];
      list.push(script);
      byFolder.set(folder, list);
    }
    return [...byFolder.entries()].sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === "") return -1;
      if (b === "") return 1;
      return a < b ? -1 : 1;
    });
  }, [shellScripts]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shell scripts</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showShellScripts ? "Hide shell scripts" : "Show shell scripts"
          }
          style={styles.buttonSecondary}
          onPress={onToggleShowShellScripts}
        >
          <Icon
            name={showShellScripts ? "EyeOff" : "Eye"}
            size={14}
            color={theme.colors.foreground}
          />
          <Text style={styles.buttonSecondaryText}>
            {showShellScripts ? "Hide" : "Show"}
          </Text>
        </Pressable>
      </View>

      {showShellScripts ? (
        <>
          {loadError ? (
            <View style={styles.stateBannerError}>
              <Text style={styles.stateBannerTitle}>Shell scripts error</Text>
              <Text style={styles.stateBannerTextDanger}>{loadError}</Text>
            </View>
          ) : null}

          {!loadError && shellScripts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {`No Shell scripts in ${directory ?? "workspace"}`}
              </Text>
            </View>
          ) : null}

          {!loadError
            ? groups.map(([folder, scripts]) => {
                const groupLabel = folder || "root";
                const collapsed = isCollapsed(folder);

                return (
                  <View key={folder || "."} style={styles.packageGroup}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: !collapsed }}
                      accessibilityLabel={`${
                        collapsed ? "Expand" : "Collapse"
                      } ${groupLabel} shell scripts`}
                      style={styles.packageGroupHeaderRow}
                      onPress={() => toggle(folder)}
                    >
                      <Icon
                        name={collapsed ? "ChevronRight" : "ChevronDown"}
                        size={14}
                        color={theme.colors.foregroundMuted}
                      />
                      <Text style={styles.packageGroupHeader}>{groupLabel}</Text>
                    </Pressable>

                    {!collapsed ? (
                      <View style={styles.entryList}>
                        {scripts.map((script, index) => {
                          const termName = terminalName("shell", script.path);
                          const eKey = entryKey("shell", script.path);
                          const isOpen = Boolean(openTerminals[termName]);
                          const isActionPending = Boolean(
                            pendingActionEntries[eKey],
                          );

                          return (
                            <EntryRow
                              key={script.path}
                              workspaceId={workspaceId}
                              name={script.path.slice(
                                script.path.lastIndexOf("/") + 1,
                              )}
                              command={shellScriptCommand(
                                script.path,
                                script.executable,
                              )}
                              entryKey={eKey}
                              theme={theme}
                              compact={compact}
                              isOpen={isOpen}
                              isActionPending={isActionPending}
                              actionsDisabled={actionsDisabled}
                              showDivider={index > 0}
                              canPreview={
                                entryCanPreview
                                  ? entryCanPreview(isOpen)
                                  : undefined
                              }
                              onRun={() => onRun(script.path)}
                              onRestart={() => onRestart(script.path)}
                              onStop={() => onStop(script.path)}
                              onClose={() => onClose(script.path)}
                            />
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })
            : null}
        </>
      ) : null}
    </View>
  );
}
