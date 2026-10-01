# paseo-workspace-snippets

A [Paseo](https://paseo.sh/docs/plugins) plugin for running command snippets in a workspace terminal:

- **Manual snippets**: commands you run often (for example `npm run dev`), saved for each workspace.
- **Auto-detected scripts**: the root `package.json` of the workspace is read, and each script gets a run button.

Status: scaffold only (`paseo plugin init`, Paseo 0.10.2). The implementation plan comes next.

## Feasibility notes (plugin API 0.10.2)

| Need | API |
|---|---|
| UI for each workspace | `client.addWorkspacePanel({ context: "workspace", locations: ["workspace", "explorer"] })` |
| Workspace path | `useWorkspace(workspaceId, w => ({ directory, projectRootPath }))` |
| Run in a terminal | `paseo.workspaces.ref(id).terminals.create({ name, cwd, command?, args? })` |
| Re-run, stop, restart | `terminals.list()` and the handle's `write`, `sendKeys("C-c" \| "Enter")`, `kill()` |
| Output preview | `handle.capture({ start: -50 })` (polling only, no stream) |
| Detect `package.json` | daemon-side RPC (`defineRpc` + `server.handle`) with `node:fs` |
| Persist snippets | `defineSettings({ scope: "host" })`, keyed by project or directory |
| Quick launch | `addCommandCenterItem`, `addSlashCommand` |

Known gaps and risks:

1. No plugin API opens or focuses Paseo's own terminal tab (`openPanel` only opens the plugin's own panels). Not yet verified: whether terminals created by the plugin show up as tabs automatically.
2. Overlap with the built-in `paseo.json` `scripts` and services, which get supervision, `$PASEO_PORT`, and a proxy.
3. Only the root `package.json` is read; monorepo workspaces are out of scope for now.

## Develop

```bash
npm install
npm run typecheck
paseo plugin install "$PWD"
paseo plugin reload paseo-workspace-snippets
paseo plugin logs paseo-workspace-snippets
```
