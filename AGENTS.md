# Agent Setup

## MCP Servers

This project uses the [shadcn MCP server](https://ui.shadcn.com/docs/mcp) to install and manage UI components.

Run once after cloning, replacing `<client>` with your AI tool (`claude`, `cursor`, `vscode`, `codex`, `opencode`):

```sh
bunx --bun shadcn@latest mcp init --client <client>
```

## Skills

This project uses the [shadcn skill](https://ui.shadcn.com/docs/skills). `skills-lock.json` is committed; `.agents/` is not.

Run once after cloning:

```sh
bunx --bun skills add shadcn/ui
```
