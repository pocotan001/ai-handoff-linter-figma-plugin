# Agent Setup

## Shared shadcn integration

The locked shadcn skill is committed at `.agents/skills/shadcn`. Codex reads
that canonical project skill location directly. Claude Code uses the relative
symlink at `.claude/skills/shadcn`, so both clients use the same files.

The repository also commits the shadcn MCP server configuration:

- Codex reads `.codex/config.toml` when the project is trusted.
- Claude Code reads `.mcp.json`.

Both configurations run `bunx --bun shadcn@latest mcp`. Do not add credentials,
absolute paths, environment-specific settings, or unrelated MCP servers to
these files.

## Dependencies and verification

Install dependencies with:

```sh
bun install
```

This installs the Lefthook pre-commit hook. The hook runs Biome checks, type
checking, tests, and the production build in parallel. Run the same checks
manually with:

```sh
bunx lefthook run pre-commit
```

Use `bun run format` to write formatting changes, `bun run check` to run
Biome's non-mutating formatter, linter, and assist checks, and `bun run
check:write` to apply Biome's safe fixes.

## Updating the skill

The checked-in skill is available immediately after cloning; do not run an
initial setup command. To intentionally update its locked contents, run:

```sh
bunx --bun skills update shadcn --yes
```

Review and commit the resulting `.agents/skills/shadcn` and `skills-lock.json`
changes together.
