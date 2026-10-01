import type { PluginTheme } from "@getpaseo/plugin";
import { Icon, Modal, TextInput } from "@getpaseo/plugin/client/react-native";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { Snippet } from "../../shared/settings";
import { makeStyles } from "./styles";

export interface SnippetEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet?: Snippet | null;
  allSnippets: Snippet[];
  hasProjectRoot: boolean;
  isTerminalOpen?: boolean;
  theme: PluginTheme;
  compact: boolean;
  saving?: boolean;
  saveError?: string | null;
  onSave: (snippet: Snippet, closeOldTerminal?: boolean) => Promise<Boolean>;
  onDelete?: (snippet: Snippet, closeTerminal?: boolean) => Promise<Boolean>;
  initialConfirmDelete?: boolean;
}

export function SnippetEditor({
  open,
  onOpenChange,
  snippet,
  allSnippets,
  hasProjectRoot,
  isTerminalOpen = false,
  theme,
  compact,
  saving = false,
  saveError,
  onSave,
  onDelete,
  initialConfirmDelete = false,
}: SnippetEditorProps) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);

  const [name, setName] = useState(snippet?.name ?? "");
  const [command, setCommand] = useState(snippet?.command ?? "");
  const [scope, setScope] = useState<"project" | "workspace">(
    snippet?.scope ?? (hasProjectRoot ? "project" : "workspace"),
  );
  const [errors, setErrors] = useState<{ name?: string; command?: string }>({});
  const [confirmingDelete, setConfirmingDelete] = useState(initialConfirmDelete);
  const [confirmingRename, setConfirmingRename] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(snippet?.name ?? "");
      setCommand(snippet?.command ?? "");
      setScope(snippet?.scope ?? (hasProjectRoot ? "project" : "workspace"));
      setErrors({});
      setConfirmingDelete(Boolean(initialConfirmDelete));
      setConfirmingRename(false);
      setIsDeleting(false);
    }
  }, [open, snippet, hasProjectRoot, initialConfirmDelete]);

  const proceedWithSave = async (closeOldTerminal: boolean) => {
    const trimmedName = name.trim();
    const trimmedCommand = command.trim();

    const itemToSave: Snippet = {
      id:
        snippet?.id ??
        `snp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`,
      name: trimmedName,
      command: trimmedCommand,
      scope,
    };

    const success = await onSave(itemToSave, closeOldTerminal);
    if (success) {
      setConfirmingRename(false);
      onOpenChange(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedCommand = command.trim();
    const nextErrors: { name?: string; command?: string } = {};

    if (!trimmedName) {
      nextErrors.name = "Name is required";
    } else if (trimmedName.length > 60) {
      nextErrors.name = "Name must be at most 60 characters";
    } else {
      const isDuplicate = allSnippets.some(
        (s) =>
          s.id !== snippet?.id &&
          s.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      );
      if (isDuplicate) {
        nextErrors.name =
          "A snippet with this name already exists in this workspace";
      }
    }

    if (!trimmedCommand) {
      nextErrors.command = "Command is required";
    } else if (trimmedCommand.length > 4000) {
      nextErrors.command = "Command must be at most 4000 characters";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    // Check if renaming with an open terminal
    if (snippet && isTerminalOpen && trimmedName !== snippet.name) {
      setConfirmingRename(true);
      return;
    }

    await proceedWithSave(false);
  };

  const handleConfirmDelete = async () => {
    if (!snippet || !onDelete) return;
    setIsDeleting(true);
    const success = await onDelete(snippet, isTerminalOpen);
    setIsDeleting(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const currentSnippetName = snippet?.name || name || "new";

  if (confirmingRename && snippet) {
    return (
      <Modal
        title={`Rename "${snippet.name}"?`}
        open={open}
        onOpenChange={onOpenChange}
      >
        <Modal.Content style={styles.formContainer}>
          <Text style={styles.stateBannerText}>
            Snippet &quot;{snippet.name}&quot; has an open terminal (snippet:{snippet.name}).
            Renaming will close this terminal. Proceed with rename?
          </Text>

          {saveError ? (
            <Text style={styles.fieldError}>{saveError}</Text>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel renaming snippet ${snippet.name}`}
              style={styles.buttonSecondary}
              onPress={() => setConfirmingRename(false)}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Confirm rename and close terminal for snippet ${snippet.name}`}
              style={styles.buttonDangerSolid}
              disabled={saving}
              onPress={() => proceedWithSave(true)}
            >
              <Text style={styles.buttonDangerSolidText}>
                {saving ? "Saving..." : "Close terminal and rename"}
              </Text>
            </Pressable>
          </View>
        </Modal.Content>
      </Modal>
    );
  }

  if (confirmingDelete && snippet) {
    return (
      <Modal
        title={`Delete "${snippet.name}"?`}
        open={open}
        onOpenChange={onOpenChange}
      >
        <Modal.Content style={styles.formContainer}>
          <Text style={styles.stateBannerText}>
            Are you sure you want to delete snippet &quot;{snippet.name}&quot;?
            {isTerminalOpen
              ? " Its open terminal will also be closed."
              : " This action cannot be undone."}
          </Text>

          {saveError ? (
            <Text style={styles.fieldError}>{saveError}</Text>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel deleting snippet ${snippet.name}`}
              style={styles.buttonSecondary}
              onPress={() => {
                if (initialConfirmDelete) {
                  onOpenChange(false);
                } else {
                  setConfirmingDelete(false);
                }
              }}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isTerminalOpen
                  ? `Delete and close terminal for snippet ${snippet.name}`
                  : `Confirm delete snippet ${snippet.name}`
              }
              style={styles.buttonDangerSolid}
              disabled={isDeleting}
              onPress={handleConfirmDelete}
            >
              <Text style={styles.buttonDangerSolidText}>
                {isDeleting
                  ? "Deleting..."
                  : isTerminalOpen
                    ? "Delete and close terminal"
                    : "Delete"}
              </Text>
            </Pressable>
          </View>
        </Modal.Content>
      </Modal>
    );
  }

  return (
    <Modal
      title={snippet ? `Edit snippet: ${snippet.name}` : "Add snippet"}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Modal.Content style={styles.formContainer}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            accessibilityLabel={`Snippet name for ${currentSnippetName}`}
            style={styles.textInput}
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="e.g. dev"
            placeholderTextColor={theme.colors.foregroundMuted}
          />
          {errors.name ? (
            <Text style={styles.fieldError}>{errors.name}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Command</Text>
          <TextInput
            accessibilityLabel={`Snippet command for ${currentSnippetName}`}
            style={styles.textInputMultiline}
            multiline
            numberOfLines={4}
            value={command}
            onChangeText={(text) => {
              setCommand(text);
              if (errors.command) {
                setErrors((prev) => ({ ...prev, command: undefined }));
              }
            }}
            placeholder="e.g. npm run dev"
            placeholderTextColor={theme.colors.foregroundMuted}
          />
          <Text style={styles.fieldHint}>
            Multi-line commands run each line as a separate shell command.
          </Text>
          {errors.command ? (
            <Text style={styles.fieldError}>{errors.command}</Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Scope</Text>
          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Scope: This project for snippet ${currentSnippetName}`}
              style={
                scope === "project"
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              onPress={() => setScope("project")}
            >
              <Text
                style={
                  scope === "project"
                    ? styles.segmentedButtonActiveText
                    : styles.segmentedButtonText
                }
              >
                This project
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Scope: This workspace for snippet ${currentSnippetName}`}
              style={
                scope === "workspace"
                  ? styles.segmentedButtonActive
                  : styles.segmentedButton
              }
              onPress={() => setScope("workspace")}
            >
              <Text
                style={
                  scope === "workspace"
                    ? styles.segmentedButtonActiveText
                    : styles.segmentedButtonText
                }
              >
                This workspace
              </Text>
            </Pressable>
          </View>
          <Text style={styles.fieldHint}>
            {scope === "project"
              ? "Project snippets are shared by all worktrees of this repository."
              : "Workspace snippets are only available in this directory."}
          </Text>
        </View>

        <Text style={styles.fieldHint}>
          Snippets are saved unencrypted in host settings. Do not store secrets
          or passwords.
        </Text>

        {saveError ? (
          <Text style={styles.fieldError}>{saveError}</Text>
        ) : null}

        <View
          style={
            snippet ? styles.modalActionsSplit : styles.modalActions
          }
        >
          {snippet ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete snippet ${snippet.name}`}
              style={styles.buttonDanger}
              onPress={() => setConfirmingDelete(true)}
            >
              <Icon name="Trash2" size={14} color={theme.colors.statusDanger} />
              <Text style={styles.buttonDangerText}>Delete</Text>
            </Pressable>
          ) : null}

          <View style={styles.rowActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel editing snippet ${currentSnippetName}`}
              style={styles.buttonSecondary}
              onPress={() => onOpenChange(false)}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Save snippet ${currentSnippetName}`}
              style={styles.buttonPrimary}
              disabled={saving}
              onPress={handleSave}
            >
              <Text style={styles.buttonPrimaryText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal.Content>
    </Modal>
  );
}
