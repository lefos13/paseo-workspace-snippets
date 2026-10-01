# paseo-workspace-snippets

A Paseo plugin for running command snippets and package.json scripts in workspace terminals.

## What it does

- **Package scripts**: Automatically detects scripts in the root `package.json` and runs them using the appropriate package manager (npm, pnpm, yarn, bun).
- **Saved snippets**: Save custom commands with project or workspace scope.
- **Terminal orchestration**: Creates and manages interactive workspace terminal tabs with Run, Restart, Stop, Close, and inline output peek.
- **Quick access**: Command Center integration (⌘K "Open snippets") and `/snippet <name>` slash command.

## Install

Requires Paseo 0.10.2 or newer on both the daemon and the app, with **Settings → Plugins → Enable plugins** turned on.

```bash
paseo plugin install npm:paseo-workspace-snippets
# or from GitHub
paseo plugin install github:lefos13/paseo-workspace-snippets
```

You can also paste either source into **Settings → Plugins → Plugin source**. Then run `paseo plugin ls`: `paseo-workspace-snippets` should be `running`, and **Snippets** appears in the sidebar.

## Usage

### Sidebar → Snippets (No Workspace Open)

When starting a session or viewing the **New workspace** screen before any workspace is open, access snippets via the `Snippets` item in the Paseo application sidebar.

- **Project picker & reordering**: Switch between any registered Paseo project. Click the reorder button in the header to customize project order with move up/down/top controls or reset to A–Z, persisted in plugin settings.
- **Scripts and project snippets**: Lists auto-detected `package.json` scripts and project-scoped snippets for the selected project. (Workspace-scoped snippets require an active workspace and are not shown).
- **Local workspace orchestration**: Clicking **Run** opens (or reuses) the project's Local workspace (`directory === projectRootPath`), executes the command in a dedicated terminal tab (`script:<name>` or `snippet:<name>`), and navigates directly to that workspace.
- **Lifecycle actions**: When a Local workspace is already active for the selected project, entries reflect live open status with **Restart**, **Stop**, **Close**, and terminal output peek.

### Workspace Panel

Open the Snippets panel through:
- The `Snippets` button in the workspace header.
- The `Snippets` tab in the workspace panel bar or explorer sidebar.
- Command Center (⌘K) search for "Open snippets".
- The `/snippet` slash command with no arguments.

The panel contains two sections:
- **Scripts (`<pm>` · `package.json`)**: Auto-detected scripts from the workspace's root `package.json`. Use the `Hide`/`Show` toggle to collapse the section. Click `Refresh` in the panel header to re-detect scripts.
- **Snippets**: Custom shell commands. Click `Add` to create new snippets, or `Edit`/`Delete` on existing rows.

### Entry Actions

- **Run**: Creates a dedicated terminal tab named `script:<name>` or `snippet:<name>` and executes the command.
- **Restart**: Sends `C-c` to interrupt any existing process, waits briefly, and executes the command again.
- **Stop**: Sends `C-c` to interrupt the running command without closing the terminal tab.
- **Close**: Terminates and closes the terminal tab.
- **Output preview**: Click the chevron on any row to view the last 40 lines of terminal output in an expandable peek without leaving the panel.

### Slash Command

In any workspace composer or agent prompt:
- `/snippet <name>`: Runs the matching snippet or package script. Resolution matches exact snippet names first, then exact script names, then unique case-insensitive prefixes. If ambiguous or not found, candidates are listed.
- `/snippet`: Opens the Snippets workspace panel.

## Scope: Project vs Workspace

When adding or editing a snippet:
- **This project**: Keyed by `projectRootPath`. Available across every worktree of the project.
- **This workspace**: Keyed by the workspace `directory`. Scoped strictly to that specific working directory.

## Package Manager Detection

The package manager for `package.json` scripts is detected in order:
1. `packageManager` field in `package.json` (for example `"pnpm@9.1.0"` or `"npm@10.0.0"`).
2. The first lockfile found in the workspace root directory:
   - `pnpm-lock.yaml` -> `pnpm`
   - `yarn.lock` -> `yarn`
   - `bun.lockb` or `bun.lock` -> `bun`
   - Otherwise -> `npm`

Scripts are invoked as `<pm> run <scriptName>`. Names containing characters outside `[A-Za-z0-9:._/-]` are shell-quoted.

## Relation to paseo.json Scripts and Services

`paseo.json` scripts are committed with the repository and run in supervised processes with ports and proxies. This plugin provides personal, interactive, zero-config terminal shortcuts.

| | `paseo.json` scripts/services | This plugin |
|---|---|---|
| Where defined | Committed file, read from the base branch | Host-local settings + live `package.json` |
| Needs a commit / config | Yes | No |
| Supervision, ports, proxy, health | Yes (services) | No: a plain interactive shell |
| Environment | `PASEO_*` variables | The user's login shell (nvm, PATH, direnv) |
| Who sees it | Everyone who clones the repo | Only this daemon host |

Use `paseo.json` services for team-shared dev servers that require ports or supervision. Use this plugin for personal workflow commands and ad-hoc scripts.

## Limitations

- **Process state**: Commands run interactively in the user's default shell. Paseo does not expose process exit codes to plugins; the plugin tracks whether the terminal tab is open or closed, not whether a process inside it has completed.
- **Root package.json only**: Only the workspace root `package.json` is inspected. Monorepo subpackage detection is not supported in v1.
- **Terminal tab focus**: Creating a new terminal tab immediately focuses that tab in the Paseo workspace.
- **Host-wide settings**: Snippets are stored in plain JSON in host-level daemon plugin settings. Do not store sensitive secrets or credentials in snippets.

## Develop

When the Paseo CLI is not on your `PATH`, use the full application binary:
```bash
PASEO=/Applications/Paseo.app/Contents/Resources/bin/paseo
```

Commands:
```bash
npm install
npm run typecheck
$PASEO plugin install "$PWD"
$PASEO plugin reload paseo-workspace-snippets
$PASEO plugin ls
$PASEO plugin logs paseo-workspace-snippets
```
