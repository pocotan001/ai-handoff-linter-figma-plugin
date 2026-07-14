# Tooling and Architecture Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize TypeScript, hooks, shared agent configuration, and MCP configuration while broadly improving module boundaries without changing plugin behavior.

**Architecture:** Keep `core` pure, isolate the stateful Figma runtime in a plugin session module, and isolate UI message transitions from React rendering. Use `.agents/skills` as the canonical shared skill location and equivalent repository-scoped MCP definitions for Codex and Claude.

**Tech Stack:** Bun, TypeScript 6, `@tsconfig/strictest`, Lefthook, Vite, Vitest, React 19, Figma Plugin API, Biome, shadcn skills/MCP.

**Constraint:** Do not create any additional Git commits unless the user explicitly asks. Ignore commit steps from supporting skills during this execution.

---

### Task 1: Add strict tooling and migrate the import alias

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `tsconfig.json`
- Modify: `components.json`
- Modify: `src/shadcn-installation.test.ts`
- Modify: source files currently importing `@/src/*`
- Create: `lefthook.yml`

**Step 1: Update the configuration assertion first**

Change `src/shadcn-installation.test.ts` to expect these aliases:

```ts
expect(config.aliases).toEqual({
	components: "~/components",
	utils: "~/lib/utils",
	ui: "~/components/ui",
	lib: "~/lib",
	hooks: "~/hooks",
});
```

Add assertions that `tsconfig.json` extends `@tsconfig/strictest/tsconfig.json` and maps `~/*` to `./src/*`.

**Step 2: Run the focused test and verify it fails**

Run: `bun run test src/shadcn-installation.test.ts`

Expected: FAIL because the repository still uses `@/*` and does not extend `@tsconfig/strictest`.

**Step 3: Add dependencies and package scripts**

Run:

```sh
bun add --dev @tsconfig/strictest@2.0.8 lefthook@2.1.10
```

Update scripts to include:

```json
{
  "format": "biome format --write .",
  "format:check": "biome format .",
  "prepare": "lefthook install"
}
```

Keep the existing build, lint, test, and typecheck scripts unchanged.

**Step 4: Add Lefthook configuration**

Create `lefthook.yml`:

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: format
      run: bun run format:check
    - name: lint
      run: bun run lint
    - name: typecheck
      run: bun run typecheck
    - name: test
      run: bun run test
    - name: build
      run: bun run build
```

Do not split `build:plugin` and `build:ui` into parallel jobs because `build:plugin` clears `dist/` before `build:ui` appends to it.

**Step 5: Adopt the strictest base config and new alias**

Use this shape for `tsconfig.json`:

```json
{
  "extends": "@tsconfig/strictest/tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "types": ["@figma/plugin-typings", "vitest/globals"],
    "noEmit": true,
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src", "vitest.config.ts"]
}
```

Update `components.json` to the aliases from Step 1. Replace every `@/src/…` import with `~/…` and ensure `rg -n '@/' src components.json tsconfig.json` returns no matches.

**Step 6: Verify the alias migration**

Run:

```sh
bun run test src/shadcn-installation.test.ts
bun run build
```

Expected: focused test PASS and Vite resolves all `~/*` imports.

---

### Task 2: Resolve `@tsconfig/strictest` findings without weakening types

**Files:**
- Modify: TypeScript files reported by `bun run typecheck`
- Modify: tests when fixture types need explicit optional-property handling

**Step 1: Capture the strict errors**

Run: `bun run typecheck`

Expected: FAIL on newly enabled checks such as indexed access, exact optional properties, or override/catch-variable safety.

**Step 2: Fix external data boundaries first**

For objects with exact optional properties, omit absent properties instead of assigning `undefined`. For indexed array access, narrow the value before use. For caught errors, retain the existing `instanceof Error` narrowing. Do not add `any`, `!`, or blanket compiler-option overrides.

Use conditional spreads when optional Figma metadata is absent:

```ts
figma: {
	id: value.id,
	...(value.key === undefined ? {} : { key: value.key }),
}
```

**Step 3: Tighten rule-copy typing**

Change the rule copy table to require every lint rule in every locale:

```ts
export const ISSUE_COPY: Record<Locale, Record<LintRuleId, IssueCopy>> = {
	// existing copy unchanged
};
```

Import `LintRuleId` from `src/core/rules.ts`. Fix only real omissions found by the compiler; do not change copy.

**Step 4: Loop until strict type checking passes**

Run after each focused group of fixes:

```sh
bun run typecheck
bun run test
```

Expected: typecheck PASS, all existing tests PASS, and `rg -n '\bany\b|[^=!]==?[^=]*!\.' src` shows no newly introduced escape hatches.

---

### Task 3: Commit shared shadcn skill configuration for Codex and Claude

**Files:**
- Modify: `.gitignore`
- Create: `.agents/skills/shadcn/**`
- Create: `.claude/skills/shadcn` (relative symbolic link)
- Modify: `skills-lock.json` only if the installer refreshes its locked metadata
- Modify: `src/shadcn-installation.test.ts`

**Step 1: Add failing repository-layout assertions**

Extend `src/shadcn-installation.test.ts` to assert:

```ts
expect(existsSync(".agents/skills/shadcn/SKILL.md")).toBe(true);
expect(realpathSync(".claude/skills/shadcn")).toBe(
	realpathSync(".agents/skills/shadcn"),
);
```

Run: `bun run test src/shadcn-installation.test.ts`

Expected: FAIL because `.agents/` is ignored and absent.

**Step 2: Install the locked skill for both clients**

Remove `.agents/` from `.gitignore`, then run:

```sh
bunx --bun skills add shadcn/ui --agent codex claude-code --skill shadcn --yes
```

Ensure `.agents/skills/shadcn` is the canonical copy. If the CLI does not create the Claude reference in the required form, create `.claude/skills/shadcn` as a relative link to `../../.agents/skills/shadcn`. Do not duplicate skill contents under `.codex/skills`.

**Step 3: Verify both discovery paths**

Run:

```sh
bunx --bun skills list --agent codex --json
bunx --bun skills list --agent claude-code --json
bun run test src/shadcn-installation.test.ts
git ls-files .agents .claude skills-lock.json
```

Expected: both lists include `shadcn`; the focused test passes; the canonical files and Claude link are visible to Git.

---

### Task 4: Add repository-scoped MCP configuration for both clients

**Files:**
- Modify: `.gitignore`
- Create: `.mcp.json`
- Create: `.codex/config.toml`
- Create: `src/agent-configuration.test.ts`

**Step 1: Write failing MCP configuration tests**

Create tests that:

- parse `.mcp.json` with `JSON.parse`,
- parse `.codex/config.toml` with Bun's TOML support or an existing TOML parser available to the test runtime,
- assert both define a server named `shadcn`,
- assert command `bunx` and args `["--bun", "shadcn@latest", "mcp"]`,
- recursively reject keys matching `token`, `secret`, `password`, `authorization`, or `env`,
- reject absolute paths.

Run: `bun run test src/agent-configuration.test.ts`

Expected: FAIL because neither tracked config exists.

**Step 2: Add equivalent client configurations**

Remove `.mcp.json` from `.gitignore` and create:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "bunx",
      "args": ["--bun", "shadcn@latest", "mcp"]
    }
  }
}
```

Create `.codex/config.toml`:

```toml
[mcp_servers.shadcn]
command = "bunx"
args = ["--bun", "shadcn@latest", "mcp"]
```

**Step 3: Verify parsing and equivalence**

Run:

```sh
bun run test src/agent-configuration.test.ts
git diff --check
```

Expected: PASS with no credentials, machine paths, or unrelated servers.

---

### Task 5: Characterize plugin orchestration before extraction

**Files:**
- Create: `src/plugin/main.test.ts`
- Create: `src/plugin/testing/figma-runtime.ts`

**Step 1: Build a minimal Figma runtime harness**

The harness should expose registered callbacks and spies for `showUI`, `ui.postMessage`, `ui.resize`, `notify`, page events, viewport selection, storage methods, and annotation writes. Stub `globalThis.figma` and `globalThis.__html__`, call `vi.resetModules()`, then dynamically import `src/plugin/main.ts` so every test starts with fresh module state.

**Step 2: Characterize initialization and messaging**

Add tests for:

- no settings or lint result is posted before `ui-ready`,
- `ui-ready` posts settings before starting initial lint,
- ignore add/remove persists waivers, reruns lint, then posts confirmation and notification,
- saving settings persists them, posts `settings-loaded`, and reruns only when a live target exists,
- selecting an issue node updates selection and viewport,
- resize messages use the existing clamp behavior.

**Step 3: Characterize event-driven behavior and errors**

Use fake timers to cover pick start/cancel, selection changes, 500 ms debounced auto-lint, stale lint-state writes, current-page listener replacement, annotation synchronization, settings-read fallback, token-read fallback, and unexpected message-handler errors posted as `lint-error`.

**Step 4: Run characterization tests**

Run:

```sh
bun run test src/plugin/main.test.ts
bun run test
```

Expected: new tests PASS against the pre-extraction implementation and the full suite remains green.

---

### Task 6: Extract the plugin session and keep the entry point declarative

**Files:**
- Create: `src/plugin/plugin-session.ts`
- Create: `src/plugin/selection.ts`
- Modify: `src/plugin/main.ts`
- Modify: `src/plugin/main.test.ts`
- Create: `src/plugin/selection.test.ts`

**Step 1: Extract selection helpers with tests**

Move selection validation and error formatting into pure functions taking a readonly selection. Preserve exact error strings. Test zero, one valid, one invalid, and multiple selections before switching callers.

**Step 2: Introduce one stateful session boundary**

Create a focused `PluginSession` whose constructor receives the Figma API and whose public methods match runtime events:

```ts
export class PluginSession {
	constructor(private readonly figmaApi: PluginAPI) {}

	async handleMessage(message: UiToPluginMessage): Promise<void> {}
	async handleSelectionChange(): Promise<void> {}
	handlePageChange(): void {}
	handleStyleChanges(changes: AutoLintDocumentChange[]): void {}
	handleNodeChanges(changes: AutoLintDocumentChange[]): void {}
}
```

Keep current target, node IDs, waivers, disabled rules, picking state, timer, and watched page private to this class. Move existing function bodies without changing sequencing.

**Step 3: Reduce `main.ts` to wiring**

`main.ts` should create one session, register Figma callbacks, wrap `handleMessage` with the existing top-level error reporting, and call the initial page-watch setup. It should not contain lint algorithms, persistence logic, or session state.

**Step 4: Run tests after each movement**

Run:

```sh
bun run test src/plugin/main.test.ts src/plugin/selection.test.ts
bun run typecheck
bun run test
```

Expected: characterization behavior and all existing plugin/core tests remain unchanged.

---

### Task 7: Isolate UI state transitions from React mounting and rendering

**Files:**
- Create: `src/ui/plugin-state.ts`
- Create: `src/ui/plugin-state.test.ts`
- Create: `src/ui/app.tsx`
- Modify: `src/ui/main.tsx`
- Modify: existing `src/ui/state.test.ts` only if shared helpers move

**Step 1: Write transition tests before moving component logic**

Define cases for `settings-loaded`, `lint-error`, `ignore-saved`, `ignore-removed`, `pick-state`, and `lint-result`. Assert exact view/settings/picking output and preserve the rule that an ignore message without a current result only clears the error.

**Step 2: Extract pure message reduction**

Use one explicit UI model:

```ts
export type PluginUiState = {
	view: ViewState;
	settings: UiSettings;
	isPicking: boolean;
};

export function reducePluginMessage(
	state: PluginUiState,
	message: PluginToUiMessage,
): PluginUiState {}
```

Keep `applyIgnoreToResult` and `removeIgnoreFromResult` as existing domain helpers; do not duplicate them.

**Step 3: Move rendering to `app.tsx`**

Move `App`, its effects, settings update, and derived visible issue/status calculation to `src/ui/app.tsx`. Use the pure transition function inside the message handler. Preserve initial `ui-ready`, outside-pointer cancel behavior, locale resolution, and rendered props.

**Step 4: Reduce `main.tsx` to mounting**

Keep only the root lookup, error, and `createRoot(...).render(...)` call in `src/ui/main.tsx`.

**Step 5: Verify UI behavior**

Run:

```sh
bun run test src/ui/plugin-state.test.ts src/ui/state.test.ts
bun run typecheck
bun run test
bun run build:ui
```

Expected: all checks PASS and the UI bundle still inlines scripts and CSS.

---

### Task 8: Clarify core rule boundaries and split oversized regression tests

**Files:**
- Modify: `src/core/node-rules.ts`
- Create: `src/core/node-rule-predicates.ts`
- Create: `src/core/testing/lintable-node.ts`
- Split: `src/core/linter.test.ts`
- Create: `src/core/linter-status.test.ts`
- Create: `src/core/node-rules-layout.test.ts`
- Create: `src/core/node-rules-content.test.ts`
- Create: `src/core/node-rules-components.test.ts`

**Step 1: Move test fixtures without changing assertions**

Extract the shared lintable-node builder from `linter.test.ts`, then split tests by status/waivers, layout rules, content/naming rules, and component/instance rules. Run the full suite and confirm the test count does not decrease.

**Step 2: Extract reusable pure predicates**

Move only the cohesive predicate helpers used by rule definitions—generic-name detection, placeholder detection, duplicate sibling discovery, component checks, and token-reference checks—into `node-rule-predicates.ts`. Keep thresholds and the `NODE_RULES` declaration together in `node-rules.ts`.

Do not introduce classes, one-file-per-rule modules, or a registry abstraction.

**Step 3: Verify unchanged rule behavior**

Run:

```sh
bun run test src/core
bun run typecheck
bun run test
```

Expected: the test count is at least the original 108 plus new orchestration/transition tests, with identical lint expectations.

---

### Task 9: Reconcile README and agent instructions

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Update `AGENTS.md`**

Document that:

- `.agents/skills/shadcn` and MCP configs are committed,
- Codex uses `.agents/skills` and `.codex/config.toml` in a trusted project,
- Claude uses `.claude/skills/shadcn` and `.mcp.json`,
- `bun install` installs dependencies and Lefthook,
- `bunx --bun skills update shadcn --yes` is for updating, not initial setup,
- the verification command is `bunx lefthook run pre-commit`.

Remove the stale statement that `.agents/` is not committed and the clone-time MCP initialization instructions.

**Step 2: Update `README.md` development guidance**

Add concise sections for repository-managed agent integration, the `~/*` alias, strict type checking, hook behavior, manual verification, and updating the shadcn skill/MCP dependency. Keep end-user installation and plugin behavior documentation unchanged.

**Step 3: Check documentation against files**

Run:

```sh
rg -n '@\/|\.agents/.*not|mcp init' README.md AGENTS.md
git diff --check
```

Expected: no stale alias or setup claims and no whitespace errors.

---

### Task 10: Run fresh-install and full pre-commit verification

**Files:**
- Modify only files directly required by failures attributable to this change

**Step 1: Verify dependency lifecycle and hook installation**

Run:

```sh
bun install
test -x .git/hooks/pre-commit
```

Expected: `prepare` runs Lefthook installation and the hook exists. If this worktree uses a Git indirection file, use `git rev-parse --git-path hooks/pre-commit` for the actual hook path.

**Step 2: Run the same five jobs as Lefthook**

Run: `bunx lefthook run pre-commit`

Expected: format check, lint, typecheck, test, and build all PASS with parallel execution.

**Step 3: Run final repository checks**

Run:

```sh
git diff --check
git status --short
git diff origin/main...
```

Confirm:

- no `dist/` files are tracked,
- no credentials or absolute machine paths were added,
- all requested files are present,
- unrelated files were not changed,
- no additional commits were created.

**Step 4: Manual Figma smoke checklist**

Build and import `manifest.json` in Figma, then verify initial lint, target picking, issue selection, ignore add/remove, settings changes, auto-lint after document edits, annotations, and window resizing. Record any step that cannot be executed in the current environment for handoff.
