import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { ShellScript } from "../../shared/discovery";
import { compareRelDirs } from "../../shared/discovery";
import {
  entryKey,
  shellScriptCommand,
  terminalName,
} from "../../shared/entries";
import { EntryGroup } from "./EntryGroup";
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
  onRun: (entryKey: string) => void;
  onRestart: (entryKey: string) => void;
  onStop: (entryKey: string) => void;
  onClose: (entryKey: string) => void;
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
    return [...byFolder.entries()].sort(([a], [b]) => compareRelDirs(a, b));
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
            ? groups.map(([folder, scripts]) => (
                <EntryGroup
                  key={folder || "."}
                  label={folder || "root"}
                  kind="shell scripts"
                  collapsed={isCollapsed(folder)}
                  onToggle={() => toggle(folder)}
                  theme={theme}
                  compact={compact}
                >
                  {scripts.map((script, index) => {
                    const termName = terminalName("shell", script.path);
                    const eKey = entryKey("shell", script.path);
                    const isOpen = Boolean(openTerminals[termName]);
                    const isActionPending = Boolean(pendingActionEntries[eKey]);

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
                        onRun={() => onRun(eKey)}
                        onRestart={() => onRestart(eKey)}
                        onStop={() => onStop(eKey)}
                        onClose={() => onClose(eKey)}
                      />
                    );
                  })}
                </EntryGroup>
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}
