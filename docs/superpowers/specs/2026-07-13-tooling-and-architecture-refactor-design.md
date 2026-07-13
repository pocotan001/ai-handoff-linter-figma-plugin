# Tooling and Architecture Refactor Design

## Goal

Modernize the repository tooling and broadly refactor the implementation for maintainability without changing the Figma plugin's behavior, messages, persisted data, or lint results.

## Current State

- The project passes type checking, linting, and all 108 tests before changes.
- TypeScript uses a hand-written `strict` configuration and the `@/*` alias points at the repository root.
- Git hooks are not configured.
- `skills-lock.json` is committed, but `.agents/` is ignored and the shadcn skill must be installed manually after cloning.
- `.mcp.json` is ignored, so the documented shadcn MCP setup is not shared with the repository.
- The 450-line plugin entry point owns event wiring, mutable session state, message dispatch, lint execution, selection handling, persistence coordination, and annotation updates.
- The UI entry point owns mounting, application rendering, plugin-message synchronization, and derived lint state.

## Approach

Use responsibility-oriented, incremental extraction rather than a rewrite. Preserve existing domain types and message contracts, isolate mutable runtime state behind a focused module, and prefer pure functions for state transitions and derived values. Keep cohesive data tables and generated shadcn components intact unless strict type checking requires a surgical change.

Alternatives rejected:

- A controller/reducer-centric redesign would introduce more abstraction and behavioral risk than the current project size warrants.
- Mechanical file splitting would reduce file size without resolving mixed responsibilities.

## Tooling Design

### Import Alias

Replace `@/*` with `~/*` and map it directly to `src/*`. Update TypeScript configuration, `components.json`, source imports, and installation assertions together so generated shadcn components and hand-written code use the same convention.

### Strict TypeScript

Add `@tsconfig/strictest` as a development dependency and extend its configuration. Retain only project-specific compiler settings in `tsconfig.json`. Resolve new errors by making optional data and external API boundaries explicit; do not silence them with `any` or non-null assertions.

### Lefthook

Add Lefthook as a development dependency and install hooks through the package lifecycle. Configure one `pre-commit` hook with `parallel: true` and independent jobs for:

- formatting verification,
- linting,
- type checking,
- tests,
- production build.

The build remains one job because the plugin build clears `dist/` before the UI build appends its output; running those two build stages concurrently would introduce a race.

Add a non-mutating `format:check` package script for the hook while retaining the existing write-oriented `format` script for developers. The hook invokes named package scripts rather than duplicating tool commands. Add a `prepare` lifecycle script that runs `lefthook install`, commit the dependency and lockfile update, and verify both a fresh `bun install` and a complete `lefthook run pre-commit` execution.

### Agent Skills

Stop ignoring `.agents/` and commit the locked shadcn skill at `.agents/skills/shadcn`. Codex discovers this canonical repository skill directly. Commit `.claude/skills/shadcn` as a relative symbolic link to `../../.agents/skills/shadcn` so Claude uses the same files without duplication. Do not add a redundant `.codex/skills` copy because Codex's documented repository skill location is `.agents/skills`.

Verify that the canonical `SKILL.md` is tracked, the Claude link resolves inside the repository, and the skills CLI reports the shadcn skill for both `codex` and `claude-code`.

### MCP

Commit equivalent shadcn MCP definitions for both clients:

- `.mcp.json` for Claude Code,
- `.codex/config.toml` for Codex.

Use the repository's Bun-based command convention. Document that Codex only loads project-scoped `.codex/config.toml` from trusted projects.

Parse both configuration files during verification and assert that they define the same `shadcn` stdio server using `bunx --bun shadcn@latest mcp`. Confirm that neither file contains credentials, absolute paths, environment-specific values, or unrelated MCP servers.

## Refactoring Design

### Plugin Runtime

Reduce `src/plugin/main.ts` to the plugin bootstrap and Figma event registration. Extract the session lifecycle and message handling into focused plugin modules. The session module owns the current target, selected node IDs, waivers, disabled rules, pick state, timers, and watched page. Supporting modules encapsulate selection/error formatting and lint result publication where that produces independently testable logic.

Before extraction, add characterization tests around the existing orchestration. Cover UI-ready initialization order, outbound message payloads and sequencing, switching targets and waivers, settings persistence and fallback behavior, pick-mode start/cancel/selection, debounced auto-lint and stale-state writes, annotation synchronization, notifications, and recovery from expected storage or token errors. These tests define the observable contract that the extracted modules must retain.

The runtime continues to:

- defer initial data until `ui-ready`,
- rerun lint after relevant page or style changes,
- persist waivers, settings, and lint state in the existing format,
- synchronize existing AI Handoff Linter annotations only,
- preserve current notifications and errors.

### UI Runtime

Reduce `src/ui/main.tsx` to DOM lookup and React mounting. Move the application component into its own module and isolate plugin-message state transitions from rendering. Derived visible issues, summary, and status remain computed from the current result and disabled rules.

Add characterization coverage for UI message transitions before moving them: settings load, lint errors, ignore add/remove, pick state, lint results, disabled-rule filtering, and the initial `ui-ready` post. Prefer tests of extracted pure transition functions for the final structure, but establish expected behavior before changing ownership.

### Core and Tests

Keep lint behavior in the core layer and clarify boundaries between rule definitions, rule predicates, walking, issue creation, and summary calculation. Split oversized tests by behavior area when doing so improves navigation and keeps shared fixture helpers explicit. Do not introduce one-file-per-rule structure or abstractions that have only one consumer.

### Type Boundaries

Treat Figma API values and `window` messages as external boundaries. Narrow unknown values at those boundaries and pass well-typed data into the core. Preserve message unions and persisted shapes so existing plugin data remains compatible.

## Error Handling

Keep existing user-visible error messages and recovery behavior. Settings and token collection retain their safe fallbacks. Extracted modules must not swallow new errors; top-level UI message handling remains responsible for reporting unexpected plugin errors.

## Documentation

Update `README.md` and `AGENTS.md` so they match the repository after implementation:

- skills and MCP configuration are checked in,
- Codex and Claude setup is explained,
- dependency installation installs Lefthook,
- development and verification commands are current,
- skill update instructions are distinguished from first-time setup.

## Verification

Use the existing 108 tests as the initial regression baseline. Add focused tests for extracted pure state transitions or message handling where the existing suite does not cover the new boundary. Verify, in the same shape as the pre-commit hook:

1. formatting check,
2. lint,
3. typecheck under `@tsconfig/strictest`,
4. full test suite,
5. production build.

Also validate that repository-managed skill and MCP paths are present, aliases resolve in TypeScript and Vite, documentation matches actual commands, and generated `dist/` output remains untracked.

Repository integration acceptance additionally requires:

- `.agents/skills/shadcn/SKILL.md` is tracked and `.claude/skills/shadcn` resolves to it;
- Codex and Claude skill discovery both include shadcn;
- `.mcp.json` parses as JSON and `.codex/config.toml` parses as TOML;
- both MCP files describe the same Bun-based shadcn command and contain no credentials or machine-specific values;
- `bun install` installs the Lefthook Git hook through the package lifecycle;
- `lefthook run pre-commit` completes all five verification jobs successfully; the formatting job does not modify files.

## Non-goals

- Changing lint rules, severities, scoring, UI copy, or visual design.
- Changing plugin data keys or stored value formats.
- Replacing Bun, Biome, Vite, Vitest, React, or shadcn.
- Refactoring generated shadcn UI components without a direct requirement from alias migration or strict type checking.
- Committing personal credentials or machine-specific Codex/Claude settings.
