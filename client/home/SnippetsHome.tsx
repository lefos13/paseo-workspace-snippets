import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { usePaseo, useRpc, useSettings } from "@getpaseo/plugin/client";
import {
  Icon,
  Modal,
  ScrollView,
  useToast,
} from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { entryKey, terminalName } from "../../shared/entries";
import {
  closeEntryRpc,
  projectDetectRpc,
  projectRunEntryRpc,
  projectStatesRpc,
  stopEntryRpc,
} from "../../shared/rpc";
import type { Snippet, SnippetsSettingsValues } from "../../shared/settings";
import { snippetsSettings } from "../../shared/settings";
import {
  isProjectUnavailable,
  isTerminalsUnsupported,
  mapErrorMessage,
} from "../panel/errors";
import { ScriptsSection } from "../panel/ScriptsSection";
import { SnippetEditor } from "../panel/SnippetEditor";
import { SnippetsSection } from "../panel/SnippetsSection";
import { makeStyles } from "../panel/styles";
import { ProjectList, shortenPath } from "./ProjectList";
import type { ProjectDescriptor } from "./ProjectList";

export function SnippetsHome({
  theme,
  layout,
  navigation,
}: PluginSurfaceProps) {
  const paseo = usePaseo();
  const toast = useToast();
  const queryClient = useQueryClient();
  const settings = useSettings(snippetsSettings);

  const styles = useMemo(
    () => makeStyles(theme, layout.compact),
    [theme, layout.compact],
  );

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: () => paseo.projects.list(),
  });

  const projects: ProjectDescriptor[] = useMemo(
    () => (projectsData?.projects as ProjectDescriptor[]) ?? [],
    [projectsData],
  );

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) =>
      a.projectDisplayName.localeCompare(b.projectDisplayName, undefined, {
        sensitivity: "base",
      }),
    );
  }, [projects]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const selectedProject = useMemo(() => {
    if (selectedProjectId) {
      const match = sortedProjects.find(
        (p) => p.projectId === selectedProjectId,
      );
      if (match) return match;
    }
    return sortedProjects[0] ?? null;
  }, [sortedProjects, selectedProjectId]);

  const projectId = selectedProject?.projectId;
  const projectRootPath = selectedProject?.projectRootPath;

  const getProjectStates = useRpc(projectStatesRpc);
  const getProjectScripts = useRpc(projectDetectRpc);
  const runProjectEntry = useRpc(projectRunEntryRpc);
  const stopEntry = useRpc(stopEntryRpc);
  const closeEntry = useRpc(closeEntryRpc);

  const { data: statesData, error: statesError } = useQuery({
    queryKey: ["projectStates", projectId],
    queryFn: () => getProjectStates({ projectId: projectId! }),
    enabled: Boolean(projectId),
    refetchInterval: 3000,
  });

  const { data: scriptsData, error: scriptsQueryError } = useQuery({
    queryKey: ["projectDetect", projectId],
    queryFn: () => getProjectScripts({ projectId: projectId! }),
    enabled: Boolean(projectId),
  });

  const workspaceId = statesData?.workspaceId ?? null;
  const openTerminals = useMemo(() => statesData?.open ?? {}, [statesData]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [initialConfirmDelete, setInitialConfirmDelete] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [capturedRevision, setCapturedRevision] = useState<string | null>(null);
  const [capturedValues, setCapturedValues] =
    useState<SnippetsSettingsValues | null>(null);

  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>(
    {},
  );
  const [lastRunKey, setLastRunKey] = useState<string | null>(null);

  const projectSnippets = useMemo(() => {
    if (settings.status !== "ready" || !projectRootPath) return [];
    return settings.values.projects?.[projectRootPath] ?? [];
  }, [settings, projectRootPath]);

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

  const terminalsUnsupported = isTerminalsUnsupported(statesError);
  const projectUnavailable = isProjectUnavailable(statesError);
  const actionsDisabled = terminalsUnsupported || projectUnavailable;

  const handleRefresh = async () => {
    if (!projectId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["projectDetect", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["projectStates", projectId] }),
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

  const handleRunOrRestart = async (
    entryKeyString: string,
    idForPending: string,
  ) => {
    if (!projectId) return;
    setPendingActions((prev) => ({ ...prev, [idForPending]: true }));
    try {
      const result = await runProjectEntry({
        projectId,
        entryKey: entryKeyString,
      });
      setLastRunKey(entryKeyString);
      await queryClient.invalidateQueries({
        queryKey: ["projectStates", projectId],
      });
      if (navigation?.openWorkspace) {
        navigation.openWorkspace({ workspaceId: result.workspaceId });
      } else {
        toast.show("Started in workspace", { variant: "info" });
      }
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [idForPending]: false }));
    }
  };

  const handleStop = async (entryKeyString: string, idForPending: string) => {
    if (!workspaceId || !projectId) return;
    setPendingActions((prev) => ({ ...prev, [idForPending]: true }));
    try {
      await stopEntry({
        workspaceId,
        entryKey: entryKeyString,
      });
      await queryClient.invalidateQueries({
        queryKey: ["projectStates", projectId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [idForPending]: false }));
    }
  };

  const handleClose = async (entryKeyString: string, idForPending: string) => {
    if (!workspaceId || !projectId) return;
    setPendingActions((prev) => ({ ...prev, [idForPending]: true }));
    try {
      await closeEntry({
        workspaceId,
        entryKey: entryKeyString,
      });
      if (lastRunKey === entryKeyString) {
        setLastRunKey(null);
      }
      await queryClient.invalidateQueries({
        queryKey: ["projectStates", projectId],
      });
    } catch (err) {
      toast.error(mapErrorMessage(err));
    } finally {
      setPendingActions((prev) => ({ ...prev, [idForPending]: false }));
    }
  };

  const handleRunScript = (scriptName: string) => {
    const key = entryKey("script", scriptName);
    return handleRunOrRestart(key, key);
  };

  const handleRestartScript = (scriptName: string) => {
    const key = entryKey("script", scriptName);
    return handleRunOrRestart(key, key);
  };

  const handleStopScript = (scriptName: string) => {
    const key = entryKey("script", scriptName);
    return handleStop(key, key);
  };

  const handleCloseScript = (scriptName: string) => {
    const key = entryKey("script", scriptName);
    return handleClose(key, key);
  };

  const handleRunSnippet = (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    return handleRunOrRestart(key, snippet.id);
  };

  const handleRestartSnippet = (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    return handleRunOrRestart(key, snippet.id);
  };

  const handleStopSnippet = (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    return handleStop(key, snippet.id);
  };

  const handleCloseSnippet = (snippet: Snippet) => {
    const key = entryKey("snippet", snippet.id);
    return handleClose(key, snippet.id);
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

  const handleSaveSnippet = async (
    itemToSave: Snippet,
    closeOldTerminal = false,
  ) => {
    if (
      settings.status !== "ready" ||
      !capturedRevision ||
      !capturedValues ||
      !projectRootPath
    ) {
      return false;
    }

    if (closeOldTerminal && editingSnippet && workspaceId) {
      try {
        await closeEntry({
          workspaceId,
          entryKey: entryKey("snippet", editingSnippet.id),
        });
        if (projectId) {
          await queryClient.invalidateQueries({
            queryKey: ["projectStates", projectId],
          });
        }
      } catch {
        // Disappeared terminal is ignored
      }
    }

    const nextProjects = { ...capturedValues.projects };
    const currentList = nextProjects[projectRootPath] ?? [];

    if (editingSnippet) {
      const list = [...currentList];
      const idx = list.findIndex((s) => s.id === editingSnippet.id);
      if (idx >= 0) {
        list[idx] = itemToSave;
        nextProjects[projectRootPath] = list;
      } else {
        nextProjects[projectRootPath] = [...list, itemToSave];
      }
    } else {
      nextProjects[projectRootPath] = [...currentList, itemToSave];
    }

    const nextValues: SnippetsSettingsValues = {
      ...capturedValues,
      projects: nextProjects,
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
    if (settings.status !== "ready" || !projectRootPath) return false;

    if (closeTerminal && workspaceId) {
      try {
        await closeEntry({
          workspaceId,
          entryKey: entryKey("snippet", snippet.id),
        });
        if (projectId) {
          await queryClient.invalidateQueries({
            queryKey: ["projectStates", projectId],
          });
        }
      } catch {
        // Disappeared terminal is ignored
      }
    }

    const revision = capturedRevision ?? settings.revision;
    const baseValues = capturedValues ?? settings.values;
    const nextProjects = { ...baseValues.projects };

    if (nextProjects[projectRootPath]) {
      const filtered = nextProjects[projectRootPath].filter(
        (s) => s.id !== snippet.id,
      );
      if (filtered.length === 0) {
        delete nextProjects[projectRootPath];
      } else {
        nextProjects[projectRootPath] = filtered;
      }
    }

    const nextValues: SnippetsSettingsValues = {
      ...baseValues,
      projects: nextProjects,
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

  const content = (
    <>
      {selectedProject ? (
        <>
          <View style={styles.projectHeaderRow}>
            <View style={styles.projectHeaderInfo}>
              <Text style={styles.projectHeaderTitle} numberOfLines={1}>
                {selectedProject.projectDisplayName}
              </Text>
              <Text
                style={styles.projectHeaderPath}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {shortenPath(selectedProject.projectRootPath)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Refresh snippets for ${selectedProject.projectDisplayName}`}
              style={styles.buttonSecondary}
              onPress={handleRefresh}
            >
              <Icon name="RotateCw" size={14} color={theme.colors.foreground} />
              <Text style={styles.buttonSecondaryText}>Refresh</Text>
            </Pressable>
          </View>

          {projectUnavailable ? (
            <View style={styles.stateBannerError}>
              <Text style={styles.stateBannerTextDanger}>
                Project is not available on this host
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
              <Text style={styles.stateBannerTitle}>
                Failed to load snippets
              </Text>
              <Text style={styles.stateBannerTextDanger}>{settings.error}</Text>
              <View style={styles.stateBannerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reload snippets settings for ${selectedProject.projectDisplayName}`}
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
              <Text style={styles.stateBannerTitle}>
                Invalid snippets settings
              </Text>
              <Text style={styles.stateBannerTextDanger}>{settings.error}</Text>
              <View style={styles.stateBannerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reload snippets settings for ${selectedProject.projectDisplayName}`}
                  style={styles.buttonSecondary}
                  onPress={() => settings.reload()}
                >
                  <Text style={styles.buttonSecondaryText}>Reload</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reset snippets settings for ${selectedProject.projectDisplayName}`}
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
                directory={selectedProject.projectRootPath}
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
                entryCanPreview={(isOpen) => Boolean(workspaceId && isOpen)}
                theme={theme}
                compact={layout.compact}
                onRun={handleRunScript}
                onRestart={handleRestartScript}
                onStop={handleStopScript}
                onClose={handleCloseScript}
              />
              <SnippetsSection
                title="Project snippets"
                workspaceId={workspaceId}
                snippets={projectSnippets}
                openTerminals={openTerminals}
                pendingActionEntries={pendingActions}
                actionsDisabled={actionsDisabled}
                lastRunSnippetId={lastRunSnippetId}
                entryCanPreview={(isOpen) => Boolean(workspaceId && isOpen)}
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
        </>
      ) : (
        <>
          {projectsLoading ? (
            <View style={styles.stateBanner}>
              <Text style={styles.stateBannerTitle}>Loading projects...</Text>
              <Text style={styles.stateBannerText}>
                Fetching projects from Paseo
              </Text>
            </View>
          ) : null}

          {projectsError ? (
            <View style={styles.stateBannerError}>
              <Text style={styles.stateBannerTitle}>
                Failed to load projects
              </Text>
              <Text style={styles.stateBannerTextDanger}>
                {mapErrorMessage(projectsError)}
              </Text>
            </View>
          ) : null}

          {!projectsLoading && !projectsError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {projects.length === 0
                  ? "Add a project in Paseo first"
                  : "No project selected"}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </>
  );

  const modals = (
    <>
      <SnippetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        snippet={editingSnippet}
        allSnippets={projectSnippets}
        hasProjectRoot={true}
        lockedScope="project"
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
              accessibilityLabel={
                selectedProject
                  ? `Cancel reset snippets for ${selectedProject.projectDisplayName}`
                  : "Cancel reset snippets"
              }
              style={styles.buttonSecondary}
              onPress={() => setShowResetConfirm(false)}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                selectedProject
                  ? `Confirm reset snippets for ${selectedProject.projectDisplayName}`
                  : "Confirm reset snippets"
              }
              style={styles.buttonDangerSolid}
              onPress={handleConfirmReset}
            >
              <Text style={styles.buttonDangerSolidText}>Reset snippets</Text>
            </Pressable>
          </View>
        </Modal.Content>
      </Modal>
    </>
  );

  if (layout.compact) {
    return (
      <View style={styles.compactRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            selectedProject
              ? `Select project, currently ${selectedProject.projectDisplayName}`
              : "Select project"
          }
          style={({ pressed }) => [
            styles.compactSelectorRow,
            pressed && styles.compactSelectorRowPressed,
          ]}
          onPress={() => setProjectModalOpen(true)}
        >
          <View style={styles.compactSelectorInfo}>
            <Text style={styles.compactSelectorName} numberOfLines={1}>
              {selectedProject?.projectDisplayName ??
                (projectsLoading ? "Loading projects..." : "Select project")}
            </Text>
            {selectedProject ? (
              <Text
                style={styles.compactSelectorPath}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {shortenPath(selectedProject.projectRootPath)}
              </Text>
            ) : null}
          </View>
          <Icon
            name="ChevronsUpDown"
            size={16}
            color={theme.colors.foregroundMuted}
          />
        </Pressable>

        <ScrollView
          style={styles.compactScroll}
          contentContainerStyle={styles.compactScrollContent}
        >
          {content}
        </ScrollView>

        <Modal
          title="Projects"
          open={projectModalOpen}
          onOpenChange={setProjectModalOpen}
        >
          <Modal.Content style={styles.formContainer}>
            <ProjectList
              projects={sortedProjects}
              selectedId={selectedProject?.projectId ?? null}
              onSelect={(id) => {
                setSelectedProjectId(id);
                setProjectModalOpen(false);
              }}
              theme={theme}
              compact={true}
            />
          </Modal.Content>
        </Modal>

        {modals}
      </View>
    );
  }

  return (
    <View style={styles.wideRoot}>
      <ScrollView
        style={styles.leftColumn}
        contentContainerStyle={styles.leftColumnContent}
      >
        <ProjectList
          projects={sortedProjects}
          selectedId={selectedProject?.projectId ?? null}
          onSelect={(id) => setSelectedProjectId(id)}
          theme={theme}
          compact={false}
        />
      </ScrollView>

      <ScrollView
        style={styles.rightColumn}
        contentContainerStyle={styles.rightColumnContent}
      >
        {content}
      </ScrollView>

      {modals}
    </View>
  );
}
