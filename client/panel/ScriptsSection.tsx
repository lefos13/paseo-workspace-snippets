import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { DetectedPackage } from "../../shared/discovery";
import {
  entryKey,
  qualifiedScriptName,
  terminalName,
} from "../../shared/entries";
import { EntryRow } from "./EntryRow";
import { usePackageGroupCollapse } from "./packageCollapse";
import { makeStyles } from "./styles";

export interface ScriptsSectionProps {
  workspaceId?: string | null;
  directory?: string | null;
  // Package group collapse state is remembered per project on this device.
  projectRootPath?: string | null;
  packages: DetectedPackage[];
  truncated?: boolean;
  loadError: string | null;
  showScripts: boolean;
  onToggleShowScripts: () => void;
  openTerminals: Record<string, string>;
  pendingActionEntries: Record<string, boolean>;
  actionsDisabled?: boolean;
  entryCanPreview?: (isOpen: boolean) => boolean;
  theme: PluginTheme;
  compact: boolean;
  onRun: (qualifiedName: string) => void;
  onRestart: (qualifiedName: string) => void;
  onStop: (qualifiedName: string) => void;
  onClose: (qualifiedName: string) => void;
}

export function ScriptsSection({
  workspaceId,
  directory,
  projectRootPath,
  packages,
  truncated = false,
  loadError,
  showScripts,
  onToggleShowScripts,
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
}: ScriptsSectionProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);
  const { isCollapsed, toggle } = usePackageGroupCollapse(projectRootPath);

  const visiblePackages = packages.filter(
    (pkg) => pkg.scripts.length > 0 || pkg.status === "invalid",
  );
  const hasPackageJson = packages.some((pkg) => pkg.status !== "missing");

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Scripts</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showScripts
              ? "Hide package.json scripts"
              : "Show package.json scripts"
          }
          style={styles.buttonSecondary}
          onPress={onToggleShowScripts}
        >
          <Icon
            name={showScripts ? "EyeOff" : "Eye"}
            size={14}
            color={theme.colors.foreground}
          />
          <Text style={styles.buttonSecondaryText}>
            {showScripts ? "Hide" : "Show"}
          </Text>
        </Pressable>
      </View>

      {showScripts ? (
        <>
          {loadError ? (
            <View style={styles.stateBannerError}>
              <Text style={styles.stateBannerTitle}>Scripts error</Text>
              <Text style={styles.stateBannerTextDanger}>{loadError}</Text>
            </View>
          ) : null}

          {!loadError && visiblePackages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {hasPackageJson
                  ? "package.json has no scripts"
                  : `No package.json in ${directory ?? "workspace"}`}
              </Text>
            </View>
          ) : null}

          {!loadError
            ? visiblePackages.map((pkg) => {
                const groupLabel = pkg.relDir || "root";
                const collapsed = isCollapsed(pkg.relDir);

                return (
                  <View key={pkg.relDir || "."} style={styles.packageGroup}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: !collapsed }}
                      accessibilityLabel={`${
                        collapsed ? "Expand" : "Collapse"
                      } ${groupLabel} scripts`}
                      style={styles.packageGroupHeaderRow}
                      onPress={() => toggle(pkg.relDir)}
                    >
                      <Icon
                        name={collapsed ? "ChevronRight" : "ChevronDown"}
                        size={14}
                        color={theme.colors.foregroundMuted}
                      />
                      <Text style={styles.packageGroupHeader}>
                        {groupLabel} · {pkg.packageManager}
                      </Text>
                    </Pressable>

                    {pkg.status === "invalid" ? (
                      <View style={styles.stateBannerError}>
                        <Text style={styles.stateBannerTitle}>
                          Invalid package.json
                        </Text>
                        <Text style={styles.stateBannerTextDanger}>
                          {pkg.error ?? "Failed to parse package.json"}
                        </Text>
                      </View>
                    ) : null}

                    {!collapsed && pkg.scripts.length > 0 ? (
                      <View style={styles.entryList}>
                        {pkg.scripts.map((script, index) => {
                          const qualified = qualifiedScriptName(
                            pkg.relDir,
                            script.name,
                          );
                          const termName = terminalName("script", qualified);
                          const eKey = entryKey("script", qualified);
                          const isOpen = Boolean(openTerminals[termName]);
                          const isActionPending = Boolean(
                            pendingActionEntries[eKey],
                          );

                          return (
                            <EntryRow
                              key={script.name}
                              workspaceId={workspaceId}
                              name={script.name}
                              command={script.body}
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
                              onRun={() => onRun(qualified)}
                              onRestart={() => onRestart(qualified)}
                              onStop={() => onStop(qualified)}
                              onClose={() => onClose(qualified)}
                            />
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })
            : null}

          {!loadError && truncated ? (
            <Text style={styles.sectionNote}>
              Scan hit its limit; some Packages may be missing.
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
