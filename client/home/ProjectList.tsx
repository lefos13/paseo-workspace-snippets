import type { PluginTheme } from "@getpaseo/plugin";
import { useSettings } from "@getpaseo/plugin/client";
import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { SnippetsSettingsValues } from "../../shared/settings";
import { snippetsSettings } from "../../shared/settings";
import { orderProjects } from "./projectOrder";

export interface ProjectDescriptor {
  projectId: string;
  projectDisplayName: string;
  projectRootPath: string;
  projectKind?: string;
}

export interface ProjectListProps {
  projects: ProjectDescriptor[];
  selectedId: string | null;
  onSelect: (projectId: string) => void;
  theme: PluginTheme;
  compact: boolean;
}

export function shortenPath(path: string): string {
  if (!path) return "";
  return path.replace(
    /^(\/(?:Users|home)\/[^/]+)(\/.*)?$/,
    (_match, _home, rest) => {
      return rest ? `~${rest}` : "~";
    },
  );
}

function makeProjectListStyles(theme: PluginTheme) {
  return {
    container: {
      gap: 10,
    },
    header: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingBottom: 2,
    },
    headerTitle: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: theme.colors.foregroundMuted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    reorderButton: {
      padding: 4,
      borderRadius: 4,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: "transparent",
    },
    reorderButtonActive: {
      backgroundColor: theme.colors.surface2,
    },
    reorderButtonPressed: {
      backgroundColor: theme.colors.surface1,
    },
    filterInput: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface1,
      fontSize: 13,
      color: theme.colors.foreground,
    },
    list: {
      gap: 4,
    },
    projectRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
      backgroundColor: "transparent",
      gap: 8,
    },
    projectRowSelected: {
      backgroundColor: theme.colors.surface2,
      borderLeftColor: theme.colors.accent,
    },
    projectRowPressed: {
      backgroundColor: theme.colors.surface1,
    },
    projectRowPressedSelected: {
      backgroundColor: theme.colors.surface2,
      opacity: 0.85,
    },
    projectRowEdit: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
      backgroundColor: theme.colors.surface1,
      gap: 8,
    },
    projectInfo: {
      flex: 1,
      gap: 2,
    },
    projectName: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: theme.colors.foreground,
    },
    projectNameSelected: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: theme.colors.foreground,
    },
    projectPath: {
      fontSize: 11,
      color: theme.colors.foregroundMuted,
    },
    rowActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
    },
    iconButton: {
      padding: 4,
      borderRadius: 4,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    iconButtonPressed: {
      backgroundColor: theme.colors.surface2,
    },
    iconButtonDisabled: {
      opacity: 0.35,
    },
    emptyContainer: {
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: "center" as const,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.foregroundMuted,
    },
    footer: {
      gap: 6,
      marginTop: 4,
    },
    footerActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      flexWrap: "wrap" as const,
      gap: 8,
    },
    footerRightActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    buttonPrimary: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.accent,
    },
    buttonPrimaryPressed: {
      opacity: 0.85,
    },
    buttonPrimaryText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: theme.colors.accentForeground,
    },
    buttonSecondary: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonSecondaryPressed: {
      backgroundColor: theme.colors.surface1,
    },
    buttonSecondaryText: {
      fontSize: 12,
      color: theme.colors.foreground,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.statusDanger,
      marginTop: 2,
    },
  };
}

export function ProjectList({
  projects,
  selectedId,
  onSelect,
  theme,
  compact,
}: ProjectListProps) {
  const settings = useSettings(snippetsSettings);
  const [filterText, setFilterText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [capturedValues, setCapturedValues] =
    useState<SnippetsSettingsValues | null>(null);
  const [capturedRevision, setCapturedRevision] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const styles = useMemo(() => makeProjectListStyles(theme), [theme]);

  const filteredProjects = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => {
      const name = project.projectDisplayName.toLowerCase();
      const path = project.projectRootPath.toLowerCase();
      const short = shortenPath(project.projectRootPath).toLowerCase();
      return (
        name.includes(query) || path.includes(query) || short.includes(query)
      );
    });
  }, [projects, filterText]);

  const displayedProjects = useMemo(() => {
    if (!isEditing || draftIds === null) {
      return filteredProjects;
    }
    return orderProjects(projects, draftIds);
  }, [isEditing, draftIds, filteredProjects, projects]);

  const handleToggleEdit = () => {
    if (isEditing) {
      handleCancel();
    } else {
      if (settings.status !== "ready") return;
      setCapturedValues(settings.values);
      setCapturedRevision(settings.revision);
      setDraftIds(projects.map((p) => p.projectId));
      setSaveError(null);
      setFilterText("");
      setIsEditing(true);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const currentIds = displayedProjects.map((p) => p.projectId);
    const [target] = currentIds.splice(index, 1);
    currentIds.splice(index - 1, 0, target);
    setDraftIds(currentIds);
  };

  const handleMoveDown = (index: number) => {
    if (index >= displayedProjects.length - 1) return;
    const currentIds = displayedProjects.map((p) => p.projectId);
    const [target] = currentIds.splice(index, 1);
    currentIds.splice(index + 1, 0, target);
    setDraftIds(currentIds);
  };

  const handleMoveToTop = (index: number) => {
    if (index <= 0) return;
    const currentIds = displayedProjects.map((p) => p.projectId);
    const [target] = currentIds.splice(index, 1);
    currentIds.unshift(target);
    setDraftIds(currentIds);
  };

  const handleResetToAZ = () => {
    setDraftIds([]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraftIds(null);
    setCapturedValues(null);
    setCapturedRevision(null);
    setSaveError(null);
  };

  const handleDone = async () => {
    if (
      settings.status !== "ready" ||
      !capturedValues ||
      !capturedRevision ||
      draftIds === null
    ) {
      setIsEditing(false);
      return;
    }
    setSaveError(null);
    const nextValues: SnippetsSettingsValues = {
      ...capturedValues,
      projectOrder: draftIds,
    };
    const success = await settings.save(nextValues, capturedRevision);
    if (!success) {
      setSaveError(settings.saveError || "Failed to save project order");
    } else {
      setIsEditing(false);
      setDraftIds(null);
      setCapturedValues(null);
      setCapturedRevision(null);
      setSaveError(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Projects</Text>
        {settings.status === "ready" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reorder projects"
            accessibilityState={{ selected: isEditing }}
            style={({ pressed }) => [
              styles.reorderButton,
              isEditing && styles.reorderButtonActive,
              pressed && styles.reorderButtonPressed,
            ]}
            onPress={handleToggleEdit}
          >
            <Icon
              name="ArrowUpDown"
              size={14}
              color={isEditing ? theme.colors.accent : theme.colors.foreground}
            />
          </Pressable>
        ) : null}
      </View>

      {!isEditing ? (
        <TextInput
          placeholder="Filter projects"
          placeholderTextColor={theme.colors.foregroundMuted}
          value={filterText}
          onChangeText={setFilterText}
          style={styles.filterInput}
          accessibilityLabel="Filter projects"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      ) : null}

      {displayedProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isEditing ? "No projects" : "No matching projects"}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {displayedProjects.map((project, index) => {
            const isSelected = !isEditing && project.projectId === selectedId;
            const isFirst = index === 0;
            const isLast = index === displayedProjects.length - 1;

            if (isEditing) {
              return (
                <View key={project.projectId} style={styles.projectRowEdit}>
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {project.projectDisplayName}
                    </Text>
                    <Text
                      style={styles.projectPath}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {shortenPath(project.projectRootPath)}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${project.projectDisplayName} up`}
                      accessibilityState={{ disabled: isFirst }}
                      disabled={isFirst || settings.saving}
                      style={({ pressed }) => [
                        styles.iconButton,
                        isFirst && styles.iconButtonDisabled,
                        pressed && !isFirst && styles.iconButtonPressed,
                      ]}
                      onPress={() => handleMoveUp(index)}
                    >
                      <Icon
                        name="ChevronUp"
                        size={14}
                        color={
                          isFirst
                            ? theme.colors.foregroundMuted
                            : theme.colors.foreground
                        }
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${project.projectDisplayName} down`}
                      accessibilityState={{ disabled: isLast }}
                      disabled={isLast || settings.saving}
                      style={({ pressed }) => [
                        styles.iconButton,
                        isLast && styles.iconButtonDisabled,
                        pressed && !isLast && styles.iconButtonPressed,
                      ]}
                      onPress={() => handleMoveDown(index)}
                    >
                      <Icon
                        name="ChevronDown"
                        size={14}
                        color={
                          isLast
                            ? theme.colors.foregroundMuted
                            : theme.colors.foreground
                        }
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Move ${project.projectDisplayName} to top`}
                      accessibilityState={{ disabled: isFirst }}
                      disabled={isFirst || settings.saving}
                      style={({ pressed }) => [
                        styles.iconButton,
                        isFirst && styles.iconButtonDisabled,
                        pressed && !isFirst && styles.iconButtonPressed,
                      ]}
                      onPress={() => handleMoveToTop(index)}
                    >
                      <Icon
                        name="ChevronsUp"
                        size={14}
                        color={
                          isFirst
                            ? theme.colors.foregroundMuted
                            : theme.colors.foreground
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              );
            }

            return (
              <Pressable
                key={project.projectId}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Select project ${project.projectDisplayName}`}
                onPress={() => onSelect(project.projectId)}
                style={({ pressed }) => [
                  styles.projectRow,
                  isSelected && styles.projectRowSelected,
                  pressed && !isSelected && styles.projectRowPressed,
                  pressed && isSelected && styles.projectRowPressedSelected,
                ]}
              >
                <View style={styles.projectInfo}>
                  <Text
                    style={
                      isSelected
                        ? styles.projectNameSelected
                        : styles.projectName
                    }
                    numberOfLines={1}
                  >
                    {project.projectDisplayName}
                  </Text>
                  <Text
                    style={styles.projectPath}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {shortenPath(project.projectRootPath)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {isEditing ? (
        <View style={styles.footer}>
          <View style={styles.footerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset to A–Z"
              disabled={settings.saving}
              style={({ pressed }) => [
                styles.buttonSecondary,
                settings.saving && styles.buttonDisabled,
                pressed && !settings.saving && styles.buttonSecondaryPressed,
              ]}
              onPress={handleResetToAZ}
            >
              <Text style={styles.buttonSecondaryText}>Reset to A–Z</Text>
            </Pressable>
            <View style={styles.footerRightActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                disabled={settings.saving}
                style={({ pressed }) => [
                  styles.buttonSecondary,
                  settings.saving && styles.buttonDisabled,
                  pressed && !settings.saving && styles.buttonSecondaryPressed,
                ]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                disabled={settings.saving}
                style={({ pressed }) => [
                  styles.buttonPrimary,
                  settings.saving && styles.buttonDisabled,
                  pressed && !settings.saving && styles.buttonPrimaryPressed,
                ]}
                onPress={handleDone}
              >
                <Text style={styles.buttonPrimaryText}>
                  {settings.saving ? "Saving..." : "Done"}
                </Text>
              </Pressable>
            </View>
          </View>
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
