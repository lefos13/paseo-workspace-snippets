import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useSettings, useWorkspace } from "@getpaseo/plugin/client";
import { Modal, ScrollView } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { snippetsFor } from "../../shared/entries";
import type {
  RevisionId,
  SaveResult,
  Snippet,
  SnippetsSettingsValues,
} from "../../shared/settings";
import { snippetsSettings } from "../../shared/settings";
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

  const styles = useMemo(
    () => makeStyles(theme, layout.compact),
    [theme, layout.compact],
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [initialConfirmDelete, setInitialConfirmDelete] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [capturedRevision, setCapturedRevision] =
    useState<RevisionId | null>(null);
  const [capturedValues, setCapturedValues] =
    useState<SnippetsSettingsValues | null>(null);

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

  const handleSaveSnippet = async (itemToSave: Snippet): SaveResult => {
    if (settings.status !== "ready" || !capturedRevision || !capturedValues) {
      return false;
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
        // Scope changed: remove from old scope and drop key if empty
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

        // Add to new scope
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
      // New snippet: append
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

  const handleDeleteSnippet = async (snippet: Snippet): SaveResult => {
    if (settings.status !== "ready") return false;
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
      </View>

      {!workspace ? (
        <View style={styles.stateBanner}>
          <Text style={styles.stateBannerText}>
            Workspace is not available on this host
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
        <SnippetsSection
          snippets={allSnippets}
          theme={theme}
          compact={layout.compact}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleOpenDelete}
        />
      ) : null}

      <SnippetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        snippet={editingSnippet}
        allSnippets={allSnippets}
        hasProjectRoot={Boolean(workspace?.projectRootPath)}
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
