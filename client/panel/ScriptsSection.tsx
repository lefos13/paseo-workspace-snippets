import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { DetectedPackage } from "../../shared/discovery";
import { entryKey, terminalName } from "../../shared/entries";
import { EntryRow } from "./EntryRow";
import { makeStyles } from "./styles";

export interface ScriptsSectionProps {
  workspaceId?: string | null;
  directory?: string | null;
  packages: DetectedPackage[];
  loadError: string | null;
  showScripts: boolean;
  onToggleShowScripts: () => void;
  openTerminals: Record<string, string>;
  pendingActionEntries: Record<string, boolean>;
  actionsDisabled?: boolean;
  entryCanPreview?: (isOpen: boolean) => boolean;
  theme: PluginTheme;
  compact: boolean;
  onRun: (scriptName: string) => void;
  onRestart: (scriptName: string) => void;
  onStop: (scriptName: string) => void;
  onClose: (scriptName: string) => void;
}

export function ScriptsSection({
  workspaceId,
  directory,
  packages,
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
            ? visiblePackages.map((pkg) => (
                <View key={pkg.relDir || "."} style={styles.packageGroup}>
                  <Text style={styles.packageGroupHeader}>
                    {pkg.relDir || "root"} · {pkg.packageManager}
                  </Text>

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

                  {pkg.scripts.length > 0 ? (
                    <View style={styles.entryList}>
                      {pkg.scripts.map((script, index) => {
                        const termName = terminalName("script", script.name);
                        const eKey = entryKey("script", script.name);
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
                            onRun={() => onRun(script.name)}
                            onRestart={() => onRestart(script.name)}
                            onStop={() => onStop(script.name)}
                            onClose={() => onClose(script.name)}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}
