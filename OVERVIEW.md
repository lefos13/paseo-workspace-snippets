Workspace Snippets runs commands in terminal tabs of your workspace: the scripts from every `package.json` in the project, the `*.sh` shell scripts it finds, plus shell commands you save yourself. You can open it from a Snippets screen in the sidebar, a Snippets button in each workspace header, the Command Center ("Open snippets"), or the `/snippet <name>` slash command.

Each entry gets its own terminal tab (`script:<name>`, `script:<package>/<name>`, `shell:<path>` or `snippet:<name>`) with Run, Restart, Stop and Close, plus a peek at its last lines of output. The sidebar screen works before any workspace is open: Run reuses the most recent workspace at the project's root directory, opens one if there is none, and switches to it.

## Setup

Requires Paseo 0.10.2 or newer. Nothing to configure.

## Things to know

- Each snippet is scoped either to a project, where it is shared by every worktree of that project, or to a single workspace directory.
- Scripts are detected in the Root package and in Nested packages up to four folders deep (50 Packages max), skipping `node_modules`, `.git`, `dist`, `build`, `.next` and dot-folders; symlinked folders are not followed. The Scripts section groups them as `<folder> · <package manager>`, with the Root package expanded and Nested packages collapsed by default.
- A Nested Script runs as `cd <folder> && <pm> run <script>` with the nearest Package manager (its own `packageManager` field or lockfile, otherwise an ancestor's, up to the workspace root; npm by default).
- Every `*.sh` file is listed under Shell scripts, grouped by folder. Executable files run as `./path` (honouring their shebang), the rest with `bash path`, always from the workspace root; the executable bit is optional. The section has its own Show/Hide toggle.
- `/snippet <name>` also reaches Nested Scripts by Qualified name (`apps/web/dev`) and Shell scripts by path or basename (`scripts/deploy.sh`, `deploy`). It prefers an exact Snippet, then an exact Root Script, then an exact Shell script path, then an exact Qualified name, then a unique case-insensitive match; otherwise it lists the candidates.
- Package and folder groups remember their collapsed state per project for the app session.
- Commands are typed into an interactive shell in the workspace terminal, so they run with the same shell authority as a terminal you open yourself on that host.
- Snippets are stored as unencrypted JSON in plugin settings shared across the whole host, so do not put secrets in them.
- The plugin reads `package.json` files and `*.sh` files and makes no network requests.
- The status shown for an entry only reflects whether its terminal tab is open. It does not show whether the command finished or what its exit status was.
