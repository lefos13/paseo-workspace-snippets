import type { PluginTheme } from "@getpaseo/plugin";
import { TextInput } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

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
      paddingBottom: 2,
    },
    headerTitle: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: theme.colors.foregroundMuted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
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
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderLeftWidth: 3,
      borderLeftColor: "transparent",
      backgroundColor: "transparent",
      gap: 2,
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
    emptyContainer: {
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: "center" as const,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.foregroundMuted,
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
  const [filterText, setFilterText] = useState("");
  const styles = useMemo(() => makeProjectListStyles(theme), [theme]);

  // `projects` arrives sorted by SnippetsHome, which also uses that order for its fallback.
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

  return (
    <View style={styles.container}>
      {!compact ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Projects</Text>
        </View>
      ) : null}

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

      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matching projects</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredProjects.map((project) => {
            const isSelected = project.projectId === selectedId;
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
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
