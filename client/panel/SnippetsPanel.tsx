import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useRpc, useSettings, useWorkspace } from "@getpaseo/plugin/client";
import {
  Icon,
  Modal,
  ScrollView,
  useToast,
} from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { entryKey, snippetsFor, terminalName } from "../../shared/entries";
import {
  closeEntryRpc,
  detectScriptsRpc,
  runEntryRpc,
  stopEntryRpc,
  terminalStatesRpc,
} from "../../shared/rpc";
import type { Snippet, SnippetsSettingsValues } from "../../shared/settings";
import { snippetsSettings } from "../../shared/settings";
import {
  isTerminalsUnsupported,
  isWorkspaceUnavailable,
  mapErrorMessage,
} from "./errors";
import { ScriptsSection } from "./ScriptsSection";
import { SnippetEditor } from "./SnippetEditor";
import { SnippetsSection } from "./SnippetsSection";
import { makeStyles } from "./styles";

export function SnippetsPanel({
  theme,
  layout,
  workspaceId,
}: PluginWorkspacePanelProps) {
  const workspace = useWorkspace(workspaceId, (w) => ({
    directory: w.directory,
    projectRootPath: w.projectRootPath,
    name: w.name,
  }));

  const settings = useSettings(snippetsSettings);
  const toast = useToast();
  const queryClient = useQueryClient();

  const getTerminalStates = useRpc(terminalStatesRpc);
  const runEntry = useRpc(runEntryRpc);
  const stopEntry = useRpc(stopEntryRpc);
  const closeEntry = useRpc(closeEntryRpc);
  const detectScripts = useRpc(detectScriptsRpc);

  const { data: statesData, error: statesError } = useQuery({
    queryKey: ["states", workspaceId],
    queryFn: () => getTerminalStates({ workspaceId }),
    refetchInterval: 3000,
  });

  const { data: scriptsData, error: scriptsQueryError } = useQuery({
    queryKey: ["detect", workspaceId],
    queryFn: () => detectScripts({ workspaceId }),
  });

  const openTerminals = useMemo(() => statesData?.open ?? {}, [statesData]);

  const styles = useMemo(
    () => makeStyles(theme, layout.compact),
    [theme, layout.compact],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [initialConfirmDelete, setInitialConfirmDelete] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [capturedRevision, setCapturedRevision] = useState(
    null as string | null,
  );
  const [capturedValues, setCapturedValues] = useState(
    null as SnippetsSettingsValues | null,
  );

  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>(
    {},
  );
  const [lastRunKey, setLastRunKey] = useState(null as string | null);

  const headerTitle = workspace?.name
    ? `Snippets · ${workspace.name}`
    : "Snippets";

  const allSnippets = useMemo(() => {
    if (settings.status !== "ready") return [];
    return snippetsFor(settings.values, {
      projectRootPath: workspace?.projectRootPath,
      directory: workspace?.directory,
    });
  }, [settings, workspace?.projectRootPath, workspace?.directory]);

  const showScripts =
    settings.status === "ready" ? settings.values.showScripts : true;

  const scriptsStatus = useMemo(() => {
    if (scriptsQueryError) return "invalid";
    return scriptsData?.status ?? "missing";
  }, [scriptsQueryError, scriptsData]);

  const scriptsError = useMemo(() => {
    if (scriptsQueryError) return mapErrorMessage(scriptsQueryError);
    return scriptsData?.error ?? null;
  }, [scriptsQueryError, scriptsData]);

  const scriptsPackageManager = scriptsData?.packageManager ?? "npm";
  const scriptsList = useMemo(
    () => scriptsData?.scripts ?? [],
    [scriptsData?.scripts],
  );

  const workspaceUnavailable =
    !workspace || isWorkspaceUnavailable(statesError);
  const terminalsUnsupported = isTerminalsUnsupported(statesError);
  const actionsDisabled = workspaceUnavailable || terminalsUnsupported;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["detect", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["states", workspaceId] }),
    ]);
  };

  const handleToggleShowScripts = async () => {
    if (settings.status !== "ready") return;
    const currentValues = settings.values;
    const nextValues: SnippetsSettingsValues = {
      ...currentValues,
      showScripts: !currentValues.showScripts,
    };
    await settings.save(nextValues, settings.revision);
  };

  const handleOpenAdd = () => {
    if (settings.status !== "ready") return;
    setEditingSnippet(null);
    setInitialConfirmDelete(false);
    setCapturedRevision(settings.revision);
    setCapturedValues(settings.values);
    setEditorOpen(true);
  };

  const handleOpenEdit = (snippet: Snippet) => {
    if (settings.status !== "ready") return;
    setEditingSnippet(snippet);
    setInitialConfirmDelete(false);
    setCapturedRevision(settings.revision);
    setCapturedValues(settings.values);
    setEditorOpen(true);
  };

  const handleOpenDelete = (snippet: Snippet) => {
    if (settings.status !== "ready") return;
    setEditingSnippet(snippet);
    setInitialConfirmDelete(true);
    setCapturedRevision(settings.revision);
    setCapturedValues(settings.values);
    setEditorOpen(true);
  };

  const handleRunSnippet = async (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    setPendingActions((prev) => ({ ...prev, [snippet.id]: true }));
    try {
      await runEntry({
        workspaceId,
        entryKey: key,
      });
      setLastRunKey(key);
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [snippet.id]: false }));
    }
  };

  const handleRestartSnippet = async (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    setPendingActions((prev) => ({ ...prev, [snippet.id]: true }));
    try {
      await runEntry({
        workspaceId,
        entryKey: key,
      });
      setLastRunKey(key);
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [snippet.id]: false }));
    }
  };

  const handleStopSnippet = async (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    setPendingActions((prev) => ({ ...prev, [snippet.id]: true }));
    try {
      await stopEntry({
        workspaceId,
        entryKey: key,
      });
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [snippet.id]: false }));
    }
  };

  const handleCloseSnippet = async (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    setPendingActions((prev) => ({ ...prev, [snippet.id]: true }));
    try {
      await closeEntry({
        workspaceId,
        entryKey: key,
      });
      if (lastRunKey === key) {
        setLastRunKey(null);
      }
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [snippet.id]: false }));
    }
  };

  const handleRunScript = async (scriptName: string) => {
    const key = entryKey("script", scriptName);
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      await runEntry({
        workspaceId,
        entryKey: key,
      });
      setLastRunKey(key);
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRestartScript = async (scriptName: string) => {
    const key = entryKey("script", scriptName);
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      await runEntry({
        workspaceId,
        entryKey: key,
      });
      setLastRunKey(key);
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleStopScript = async (scriptName: string) => {
    const key = entryKey("script", scriptName);
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      await stopEntry({
        workspaceId,
        entryKey: key,
      });
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleCloseScript = async (scriptName: string) => {
    const key = entryKey("script", scriptName);
    setPendingActions((prev) => ({ ...prev, [key]: true }));
    try {
      await closeEntry({
        workspaceId,
        entryKey: key,
      });
      if (lastRunKey === key) {
        setLastRunKey(null);
      }
      await queryClient.invalidateQueries({
        queryKey: ["states", workspaceId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveSnippet = async (
    itemToSave: Snippet,
    closeOldTerminal = false,
  ) => {
    if (settings.status !== "ready" || !capturedRevision || !capturedValues) {
      return false;
    }

    if (closeOldTerminal && editingSnippet) {
      try {
        await closeEntry({
          workspaceId,
          entryKey: entryKey("snippet", editingSnippet.id),
        });
        await queryClient.invalidateQueries({
          queryKey: ["states", workspaceId],
        });
      } catch {
        // Disappeared terminal is ignored
      }
    }

    const projectKey = workspace?.projectRootPath;
    const workspaceKey = workspace?.directory;

    const nextProjects = { ...capturedValues.projects };
    const nextWorkspaces = { ...capturedValues.workspaces };

    if (editingSnippet) {
      if (editingSnippet.scope === itemToSave.scope) {
        if (
          itemToSave.scope === "project" &&
          projectKey &&
          nextProjects[projectKey]
        ) {
          const list = [...nextProjects[projectKey]];
          const idx = list.findIndex((s) => s.id === editingSnippet.id);
          if (idx >= 0) {
            list[idx] = itemToSave;
            nextProjects[projectKey] = list;
          } else {
            nextProjects[projectKey] = [...list, itemToSave];
          }
        } else if (
          itemToSave.scope === "workspace" &&
          workspaceKey &&
          nextWorkspaces[workspaceKey]
        ) {
          const list = [...nextWorkspaces[workspaceKey]];
          const idx = list.findIndex((s) => s.id === editingSnippet.id);
          if (idx >= 0) {
            list[idx] = itemToSave;
            nextWorkspaces[workspaceKey] = list;
          } else {
            nextWorkspaces[workspaceKey] = [...list, itemToSave];
          }
        }
      } else {
        if (
          editingSnippet.scope === "project" &&
          projectKey &&
          nextProjects[projectKey]
        ) {
          const filtered = nextProjects[projectKey].filter(
            (s) => s.id !== editingSnippet.id,
          );
          if (filtered.length === 0) {
            delete nextProjects[projectKey];
          } else {
            nextProjects[projectKey] = filtered;
          }
        } else if (
          editingSnippet.scope === "workspace" &&
          workspaceKey &&
          nextWorkspaces[workspaceKey]
        ) {
          const filtered = nextWorkspaces[workspaceKey].filter(
            (s) => s.id !== editingSnippet.id,
          );
          if (filtered.length === 0) {
            delete nextWorkspaces[workspaceKey];
          } else {
            nextWorkspaces[workspaceKey] = filtered;
          }
        }

        if (itemToSave.scope === "project") {
          if (!projectKey) return false;
          nextProjects[projectKey] = [
            ...(nextProjects[projectKey] ?? []),
            itemToSave,
          ];
        } else {
          if (!workspaceKey) return false;
          nextWorkspaces[workspaceKey] = [
            ...(nextWorkspaces[workspaceKey] ?? []),
            itemToSave,
          ];
        }
      }
    } else {
      if (itemToSave.scope === "project") {
        if (!projectKey) return false;
        nextProjects[projectKey] = [
          ...(nextProjects[projectKey] ?? []),
          itemToSave,
        ];
      } else {
        if (!workspaceKey) return false;
        nextWorkspaces[workspaceKey] = [
          ...(nextWorkspaces[workspaceKey] ?? []),
          itemToSave,
        ];
      }
    }

    const nextValues: SnippetsSettingsValues = {
      ...capturedValues,
      projects: nextProjects,
      workspaces: nextWorkspaces,
    };

    const success = await settings.save(nextValues, capturedRevision);
    if (success && settings.status === "ready") {
      setCapturedRevision(settings.revision);
      setCapturedValues(settings.values);
    }
    return success;
  };

  const handleDeleteSnippet = async (
    snippet: Snippet,
    closeTerminal = false,
  ) => {
    if (settings.status !== "ready") return false;

    if (closeTerminal) {
      try {
        await closeEntry({
          workspaceId,
          entryKey: entryKey("snippet", snippet.id),
        });
        await queryClient.invalidateQueries({
          queryKey: ["states", workspaceId],
        });
      } catch {
        // Disappeared terminal is ignored
      }
    }

    const revision = capturedRevision ?? settings.revision;
    const baseValues = capturedValues ?? settings.values;

    const projectKey = workspace?.projectRootPath;
    const workspaceKey = workspace?.directory;

    const nextProjects = { ...baseValues.projects };
    const nextWorkspaces = { ...baseValues.workspaces };

    if (projectKey && nextProjects[projectKey]) {
      const filtered = nextProjects[projectKey].filter(
        (s) => s.id !== snippet.id,
      );
      if (filtered.length === 0) {
        delete nextProjects[projectKey];
      } else {
        nextProjects[projectKey] = filtered;
      }
    }
    if (workspaceKey && nextWorkspaces[workspaceKey]) {
      const filtered = nextWorkspaces[workspaceKey].filter(
        (s) => s.id !== snippet.id,
      );
      if (filtered.length === 0) {
        delete nextWorkspaces[workspaceKey];
      } else {
        nextWorkspaces[workspaceKey] = filtered;
      }
    }

    const nextValues: SnippetsSettingsValues = {
      ...baseValues,
      projects: nextProjects,
      workspaces: nextWorkspaces,
    };

    return await settings.save(nextValues, revision);
  };

  const handleConfirmReset = async () => {
    await settings.reset();
    setShowResetConfirm(false);
  };

  const isEditingSnippetTerminalOpen = Boolean(
    editingSnippet &&
      openTerminals[terminalName("snippet", editingSnippet.name)],
  );

  const lastRunSnippetId =
    lastRunKey && lastRunKey.startsWith("snippet:")
      ? lastRunKey.slice("snippet:".length)
      : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          style={styles.buttonSecondary}
          onPress={handleRefresh}
        >
          <Icon name="RotateCw" size={14} color={theme.colors.foreground} />
          <Text style={styles.buttonSecondaryText}>Refresh</Text>
        </Pressable>
      </View>

      {workspaceUnavailable ? (
        <View style={styles.stateBanner}>
          <Text style={styles.stateBannerText}>
            Workspace is not available on this host
          </Text>
        </View>
      ) : null}

      {terminalsUnsupported ? (
        <View style={styles.stateBanner}>
          <Text style={styles.stateBannerText}>
            Update the Paseo daemon to run snippets
          </Text>
        </View>
      ) : null}

      {settings.status === "loading" ? (
        <View style={styles.stateBanner}>
          <Text style={styles.stateBannerTitle}>Loading snippets...</Text>
          <Text style={styles.stateBannerText}>
            Fetching settings from daemon
          </Text>
        </View>
      ) : null}

      {settings.status === "error" ? (
        <View style={styles.stateBannerError}>
          <Text style={styles.stateBannerTitle}>Failed to load snippets</Text>
          <Text style={styles.stateBannerTextDanger}>{settings.error}</Text>
          <View style={styles.stateBannerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload snippets settings"
              style={styles.buttonSecondary}
              onPress={() => settings.reload()}
            >
              <Text style={styles.buttonSecondaryText}>Reload</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {settings.status === "invalid" ? (
        <View style={styles.stateBannerError}>
          <Text style={styles.stateBannerTitle}>Invalid snippets settings</Text>
          <Text style={styles.stateBannerTextDanger}>{settings.error}</Text>
          <View style={styles.stateBannerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload snippets settings"
              style={styles.buttonSecondary}
              onPress={() => settings.reload()}
            >
              <Text style={styles.buttonSecondaryText}>Reload</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset snippets settings"
              style={styles.buttonDanger}
              onPress={() => setShowResetConfirm(true)}
            >
              <Text style={styles.buttonDangerText}>Reset snippets</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {settings.status === "ready" ? (
        <>
          <ScriptsSection
            workspaceId={workspaceId}
            directory={workspace?.directory}
            status={scriptsStatus}
            error={scriptsError}
            packageManager={scriptsPackageManager}
            scripts={scriptsList}
            showScripts={showScripts}
            onToggleShowScripts={handleToggleShowScripts}
            openTerminals={openTerminals}
            pendingActionEntries={pendingActions}
            actionsDisabled={actionsDisabled}
            lastRunKey={lastRunKey}
            theme={theme}
            compact={layout.compact}
            onRun={handleRunScript}
            onRestart={handleRestartScript}
            onStop={handleStopScript}
            onClose={handleCloseScript}
          />
          <SnippetsSection
            workspaceId={workspaceId}
            snippets={allSnippets}
            openTerminals={openTerminals}
            pendingActionEntries={pendingActions}
            actionsDisabled={actionsDisabled}
            lastRunSnippetId={lastRunSnippetId}
            theme={theme}
            compact={layout.compact}
            onRun={handleRunSnippet}
            onRestart={handleRestartSnippet}
            onStop={handleStopSnippet}
            onClose={handleCloseSnippet}
            onAdd={handleOpenAdd}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
          />
        </>
      ) : null}

      <SnippetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        snippet={editingSnippet}
        allSnippets={allSnippets}
        hasProjectRoot={Boolean(workspace?.projectRootPath)}
        isTerminalOpen={isEditingSnippetTerminalOpen}
        theme={theme}
        compact={layout.compact}
        saving={settings.saving}
        saveError={settings.saveError}
        onSave={handleSaveSnippet}
        onDelete={handleDeleteSnippet}
        initialConfirmDelete={initialConfirmDelete}
      />

      <Modal
        title="Reset snippets?"
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
      >
        <Modal.Content style={styles.formContainer}>
          <Text style={styles.stateBannerText}>
            Are you sure you want to reset your snippets settings? This will
            revert settings to defaults and discard any invalid configuration.
          </Text>
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel reset snippets"
              style={styles.buttonSecondary}
              onPress={() => setShowResetConfirm(false)}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm reset snippets"
              style={styles.buttonDangerSolid}
              onPress={handleConfirmReset}
            >
              <Text style={styles.buttonDangerSolidText}>Reset snippets</Text>
            </Pressable>
          </View>
        </Modal.Content>
      </Modal>
    </ScrollView>
  );
}
