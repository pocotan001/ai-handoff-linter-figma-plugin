---
name: figma-ai-handoff-to-react
description: Implement an AI Handoff Ready Figma node as maintainable React and TypeScript. Use for React implementation requests with a Figma URL/node ID or selection. Verify AI Handoff Linter's shared handoff state through remote Figma MCP before retrieving design context, then follow the target repository's conventions without guessing missing behavior.
---

# Figma AI Handoff to React

Turn a linted Figma handoff into repository-ready React and TypeScript. Treat
the design as evidence, not as a DOM template or a license to duplicate a
code generator's output.

Require access to the target React repository and remote Figma MCP with
`use_figma` plus the standard design-context tools.

## Inputs and outcome

Accept a Figma URL containing a node ID or a selected node in remote Figma MCP.
The AI Handoff Linter plugin must have run on that node or one of its enclosing
lint targets.

Before finishing, provide a short handoff report: source node, files changed,
checks run, visual validation, assumptions, deviations, and remaining risks.

## AI Handoff gate

Do not begin implementation until remote Figma MCP verifies the exact **AI
Handoff Ready** state before retrieving design context or editing code.

Use `use_figma` in read-only mode to inspect the requested node and its
ancestors. For each node, read shared plugin data with:

```js
node.getSharedPluginData("ai_handoff_linter", "lint-state-v1")
```

Accept only a JSON record on the requested node or an ancestor when all of the
following hold:

- `version` is `1`;
- `targetNodeId` equals the node that stores the record;
- `lintStatus` is `"ai-handoff-ready"`;
- `stale` is `false`; and
- `activeIssueCount` is `0`.

This shared record is the Linter's machine-readable handoff contract. It
includes `lastLintedAt` for the final report. Load the platform's Figma Plugin
API workflow before calling `use_figma`; if `use_figma` is unavailable, stop.

Reject the handoff and ask the user to fix and rerun the linter when it is:

- any status other than `ai-handoff-ready`, including ignored issues;
- missing, malformed, stale, or mismatched shared state; or
- a Figma MCP connection without read-only `use_figma` support.

Do not silently turn linter findings into implementation exceptions. State the
reported status and return the user to the Figma handoff; alter the design only
when the user explicitly asks for design remediation.

## Evidence hierarchy

Keep these sources distinct:

| Evidence | Use it for |
| --- | --- |
| Project files and instructions | Framework, file placement, component reuse, styling, tokens, assets, tests, and validation commands |
| Figma context and screenshot | Visible structure, layout, visual values, explicit variants, named assets, variables, and styles |
| User input | Product behavior, non-visible states, scope, and tradeoffs neither the project nor design establishes |

Read local project evidence before deciding how to implement anything. Read
`AGENTS.md` and other project instructions first, then nearby components,
styling/token documentation, asset conventions, and package scripts.

Never invent hover, loading, error, empty, disabled, responsive, or interaction
states that are not supported by evidence. Make a minor, reversible inference
only when it does not materially alter the result and disclose it. Ask the user
or stop when the missing decision would materially alter implementation.

## Workflow

### 1. Establish the implementation boundary

Verify the shared lint handoff state, then confirm the target node, target
screen sizes, intended behavior, and target files. Inspect the repository to
establish:

- its React and TypeScript conventions;
- the existing styling and token approach;
- reusable primitives and their APIs;
- asset/icon handling;
- the narrowest applicable test, typecheck, lint, build, preview, or visual
  comparison command.

If more than one target file, component boundary, or existing primitive is
equally plausible and local evidence cannot decide, ask the user.

### 2. Gather design evidence before coding

1. Fetch structured design context for the exact node.
2. Fetch a screenshot for the same node and variant.
3. Fetch metadata only when the design context is incomplete or too large.
4. Fetch variables/styles and only the assets the implementation needs.

The screenshot is the visual reference; structured context establishes layout,
constraints, text, variants, tokens, and assets. If a design response is too
large, retain its trustworthy parent container as the composition source and
fetch only the child subtrees needed to fill the gap. Do not reconstruct omitted
parent or sibling layout from guessing.

Retry one transient connection failure. Do not blindly retry an invalid
selection, inaccessible node, incomplete response, or missing asset: narrow
scope or request the missing input instead.

### 3. Translate the linted handoff into React

Use the lint report to make implementation decisions, not to reproduce layer
names literally.

| Linted design evidence | React implementation decision |
| --- | --- |
| Auto Layout and content-driven dimensions | Use flexbox or grid with content-responsive sizing; retain fixed dimensions only where the design requires them |
| Semantic, unique layer names | Name components, props, and local variables by role; use names only as context when assessing image purpose |
| Components, component sets, and named variants | Reuse an existing primitive or create a focused component with typed, role-based props |
| Variables, styles, and text styles | Use the repository's matching tokens when value and meaning agree; otherwise preserve the value and report the mapping gap |
| Named image layers and supplied assets | Use the supplied asset through the repository's asset pipeline and choose alt text from image purpose, not the layer name alone |
| Intentional overlays | Use limited absolute positioning only for true overlays such as a badge; keep ordinary content in layout flow |

Prefer a semantic DOM hierarchy over Figma's raw frame tree. Reuse an existing
component when it fits without distortion. Extract a new component only for a
meaningful reusable unit or a clear local pattern. Keep the change narrow; do
not refactor adjacent UI merely because the design is nearby.

### 4. Handle tokens, assets, and accessibility deliberately

Preserve design-token references where the repository can carry them. Map a
design token to a local token only when both rendered value and semantic role
match. If a mode or mapping is unresolved, use an explicit value and disclose
the choice rather than mapping by a similar name.

Obtain asset bytes only from the design handoff or a design-tool-provided URL.
Do not substitute unrelated public assets. Follow the repository's existing
asset and SVG delivery policy.

Use native semantic controls where appropriate. Decorative images use empty alt
text; informative images receive purpose-based alt text. Give controls an
accessible name, expose relevant selected/expanded/disabled state, and verify
keyboard operation and visible focus. Preserve focus movement and close
behavior for a dialog or menu only when that interaction is evidenced.

### 5. Validate and report

At each supplied viewport, compare the implementation with the Figma screenshot
for layout, spacing, type, color, assets, and explicitly evidenced states.
Capture a local screenshot when the project already supports a preview or
browser-automation workflow. If visual comparison cannot be performed, mark it
unverified; do not claim pixel-perfect completion.

Run the narrowest relevant repository checks. If a check was unavailable or
already failing before the change, distinguish it from a regression introduced
by the implementation. Do not enter an open-ended visual-tuning loop without
new evidence.

With exactly one supplied viewport, implement the intrinsic resizing supported
by Auto Layout, constraints, and content sizing. Report other viewport behavior
as unverified rather than inventing breakpoints.

## Stop conditions

Stop before speculative UI work when:

- Figma MCP cannot read the shared lint handoff state or provide trustworthy
  design evidence for the exact target;
- a required asset cannot be retrieved through the established policy;
- the target is not a React and TypeScript implementation;
- project, design, and user evidence still conflict after narrowing the scope;
- a missing user decision materially changes the result; or
- no layout evidence exists beyond a flattened image without hierarchy,
  dimensions, or constraints.

If blocked, provide no more than three concrete inputs or decisions needed to
continue.

## Completion report

Use this structure when delivering work:

```markdown
Implemented: [component/screen] in [files]
Design evidence: [Figma node/selection and screenshot status]
Lint status: [shared record's status, target node, and lastLintedAt]
Validation: [commands and outcomes; visual comparison status]
Assumptions and deviations: [only material items]
Remaining risk: [unverified viewport, unavailable check, or none]
```
