# AI Handoff Linter

AI Handoff Linter is a Figma plugin that checks whether a design is structured clearly enough for AI coding agents to turn it into implementation-ready code.

It reviews selected Sections, Frames, Components, Component Sets, or Instances for common issues that make AI-assisted implementation harder: missing Auto Layout, generic layer names, hidden layers, duplicate names, missing text styles, and raw visual values that are not connected to variables or styles.

The plugin is designed for teams that want a lightweight quality gate before asking an AI coding agent to implement a Figma design.

## What It Does

- Lints a selected Section, Frame, Component, Component Set, or Instance.
- Shows a score, status, and grouped issue list.
- Points each issue to the affected layer.
- Helps make layer structure and naming easier for AI coding agents to interpret.
- Lets you ignore an issue with a reason when the design intentionally breaks a rule.
- Reruns lint automatically after relevant document changes.
- Adds Figma Dev Mode annotations for AI Handoff Ready and Ready for Dev warnings.
- Supports English and Japanese UI copy.
- Allows individual lint rules to be enabled or disabled.

## When To Use It

Use AI Handoff Linter before sending a Figma design to an AI coding workflow, especially when:

- a screen will be implemented by an AI coding agent,
- a component is being prepared for AI-assisted implementation,
- a design was imported or heavily rearranged,
- layer names and hierarchy need to communicate implementation intent,
- you want to reduce ambiguity before Figma-to-code generation.

## Install

### Install From Source

1. Clone this repository.
2. Install dependencies:

   ```sh
   bun install
   ```

3. Build the plugin:

   ```sh
   bun run build
   ```

4. In Figma, open **Plugins > Development > Import plugin from manifest...**.
5. Select `manifest.json` from this repository.
6. Run **AI Handoff Linter** from Figma's plugin menu.

## Basic Usage

1. Select one Section, Frame, Component, Component Set, or Instance in Figma.
2. Run **AI Handoff Linter**.
3. Review the score and issue list.
4. Click an issue to select the affected layer in Figma.
5. Fix the design issue, or ignore it with a reason when it is intentional.
6. Rerun lint, or keep editing and let the plugin rerun automatically.

When there are no active issues, the status becomes **AI Handoff Ready**.

## Lint Targets

The plugin supports these target types:

- Section
- Frame
- Component
- Component Set
- Instance

When you lint a Section, the plugin checks the lintable Frames, Components, Component Sets, and Instances inside that Section. This keeps Section-level checks focused on the parts that are most likely to become implementation units.

## Score and Statuses

The score summarizes how much of the design passes the lint rules, weighted by how strongly each rule affects AI handoff. A design with a blocking error scores at most 49, and any active issue keeps the score below 90. A score of 100 means no active issues.

| Status | Meaning |
| --- | --- |
| Needs design fixes | At least one blocking error is active. |
| Needs improvements | Warnings or review items are active. |
| AI Handoff Ready | No active issues remain. The design is ready to hand off to an AI coding agent. |
| AI Handoff Ready, with ignored issues | All remaining issues have been ignored with reasons. |

## Annotations

AI Handoff Linter writes Dev Mode annotations so the lint result is visible outside the plugin window.

When lint passes, the plugin adds:

```text
AI Handoff Linter: AI Handoff Ready. Lint passed with no active issues.
```

When a design is marked Ready for Dev but lint is missing, stale, or has active issues, the plugin adds a warning annotation.

The plugin only replaces annotations that start with:

```text
AI Handoff Linter:
```

Annotations written manually by designers are preserved.

## Rules

AI Handoff Linter currently checks for:

- Root frame with multiple children but no Auto Layout
- Group nodes used for layout
- Nested frames with multiple children but no Auto Layout
- Auto Layout containers fixed on their primary axis
- Absolutely positioned layers inside Auto Layout frames
- Hidden layers
- Frames with too many direct children
- Deeply nested layer structure
- Generic layer names on component-like layers
- Duplicate sibling layer names
- Overly long layer names
- Raw visual values not connected to variables or styles
- Text layers without a text style
- Placeholder text content such as lorem ipsum
- Image layers with generic names
- Instances whose contents have lint issues (reported on the instance, fixed in the main component)
- Component sets with default variant property names such as "Property 1"
- Components without a description

Each rule includes a short explanation and a recommendation in the issue list.

Hidden layers are reported once; the layers inside them are skipped. Issues inside instances are aggregated into a single review item on the instance, because the fix belongs in the main component. Hidden layers inside instances are treated as variant states and ignored.

## Ignore Issues

Some designs intentionally break a rule. In those cases, you can ignore the issue and save a reason.

Ignored issues are stored on the lint target in Figma plugin data. They remain available when the plugin is reopened.

Use ignore reasons for intentional exceptions, not as a replacement for fixing unclear design structure.

## Settings

Open the settings screen from the plugin header to configure:

- Language: Auto, English, or Japanese
- Rules: enable or disable individual checks

Settings are saved locally for the plugin UI.

## Limitations

AI Handoff Linter does not automatically fix designs.

It also cannot prevent designers from using Figma's standard Ready for Dev action without running the plugin first. It can warn through annotations after lint has run, but a fully enforced workflow would require an external integration such as a webhook service.

The plugin focuses on structure and implementation intent. It does not guarantee that an AI coding agent will produce correct, accessible, or production-ready code without human review.

## Development

Install dependencies:

```sh
bun install
```

`bun install` also installs the Lefthook pre-commit hook. The hook verifies
Biome checks, type checking, tests, and the production build.

Run the full non-mutating verification locally:

```sh
bunx lefthook run pre-commit
```

Use `bun run format` to write formatting changes, `bun run check` to run
Biome's non-mutating formatter, linter, and assist checks, or `bun run
check:write` to apply Biome's safe fixes.

Run type checking:

```sh
bun run typecheck
```

Run tests:

```sh
bun run test
```

Build the plugin:

```sh
bun run build
```

The built plugin files are written to `dist/` and referenced by `manifest.json`.

### Architecture

Source imports use the `~/*` alias for `src/*`. The plugin entry point only
wires Figma events; its mutable runtime state lives in `src/plugin/plugin-session.ts`.
The UI entry point only mounts React; `src/ui/plugin-state.ts` owns pure
plugin-message state transitions and `src/ui/app.tsx` renders the application.

### Agent Integration

The locked shadcn skill is checked in at `.agents/skills/shadcn`. Codex reads
that location directly, while `.claude/skills/shadcn` links Claude Code to the
same files. The shadcn MCP server is configured for Claude Code in `.mcp.json`
and for Codex in `.codex/config.toml`; Codex loads the project-scoped file only
from a trusted project.

These files intentionally contain only the Bun-based shadcn MCP command. Do
not add credentials, absolute paths, or user-specific settings.

To intentionally update the checked-in skill, run:

```sh
bunx --bun skills update shadcn --yes
```

Review the resulting skill and `skills-lock.json` changes before committing.
