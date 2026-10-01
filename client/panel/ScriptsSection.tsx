import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { entryKey, terminalName } from "../../shared/entries";
import { EntryRow } from "./EntryRow";
import { makeStyles } from "./styles";

export interface ScriptsSectionProps {
  workspaceId?: string | null;
  directory?: string | null;
  status: "ok" | "missing" | "invalid";
  error: string | null;
  packageManager: "npm" | "pnpm" | "yarn" | "bun";
  scripts: Array<{ name: string; body: string; command: string }>;
  showScripts: boolean;
  onToggleShowScripts: () => void;
  openTerminals: Record<string, string>;
  pendingActionEntries: Record<string, boolean>;
  actionsDisabled?: boolean;
  lastRunKey: string | null;
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
  status,
  error,
  packageManager,
  scripts,
  showScripts,
  onToggleShowScripts,
  openTerminals,
  pendingActionEntries,
  actionsDisabled = false,
  lastRunKey,
  entryCanPreview,
  theme,
  compact,
  onRun,
  onRestart,
  onStop,
  onClose,
}: ScriptsSectionProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);

  const sectionTitle =
    status === "ok"
      ? `Scripts (${packageManager} · package.json)`
      : "Scripts (package.json)";

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
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
          {error && status !== "invalid" ? (
            <View style={styles.stateBannerError}>
              <Text style={styles.stateBannerTitle}>Scripts error</Text>
              <Text style={styles.stateBannerTextDanger}>{error}</Text>
            </View>
          ) : null}

          {status === "missing" && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No package.json in {directory ?? "workspace"}
              </Text>
            </View>
          ) : null}

          {status === "invalid" ? (
            <View style={styles.stateBannerError}>
              <Text style={styles.stateBannerTitle}>Invalid package.json</Text>
              <Text style={styles.stateBannerTextDanger}>
                {error ?? "Failed to parse package.json"}
              </Text>
            </View>
          ) : null}

          {status === "ok" && scripts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                package.json has no scripts
              </Text>
            </View>
          ) : null}

          {status === "ok" && scripts.length > 0 ? (
            <View style={styles.list}>
              {scripts.map((script) => {
                const termName = terminalName("script", script.name);
                const eKey = entryKey("script", script.name);
                const isOpen = Boolean(openTerminals[termName]);
                const isActionPending = Boolean(pendingActionEntries[eKey]);
                const showTabHint = lastRunKey === eKey;

                return (
                  <EntryRow
                    key={script.name}
                    workspaceId={workspaceId}
                    name={script.name}
                    command={script.body}
                    entryKey={eKey}
                    terminalName={termName}
                    theme={theme}
                    compact={compact}
                    isOpen={isOpen}
                    isActionPending={isActionPending}
                    actionsDisabled={actionsDisabled}
                    showTabHint={showTabHint}
                    canPreview={
                      entryCanPreview ? entryCanPreview(isOpen) : undefined
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
        </>
      ) : null}
    </View>
  );
}
