# Crystal Full Product Roadmap

This document describes the full product roadmap for Crystal. It is intentionally broader than the current implementation status. The implementation roadmap in `docs/roadmap-implementation.md` tracks what has landed; this file defines where the product is going.

Crystal is a new desktop application for creating, inspecting, and modifying real HTML projects and their dependencies. It is not derived from any previous project. Its fixed technology base is Electron, Node, TypeScript, Sass, Rust, WebAssembly, and WebGPU.

## Product definition

Crystal is a multiplatform workbench for real web project files. It is not only a code editor and not only a visual builder. It combines three main modes over the same project model:

1. Design.
2. Inspector.
3. Developer.

Those modes must share the same Project Graph, selection state, preview state, command history, file state, and workspace state. They must not become separate applications with duplicated internal truth.

## Product principles

Crystal should be a robust desktop authoring environment for real web projects, not a toy page builder and not a browser DevTools clone.

Core principles:

- Real files remain the source of truth.
- The renderer does not access Node or the filesystem directly.
- UI actions go through typed commands, events, validation, state updates, and explicit persistence.
- Preview runs in a sandboxed iframe and must not expose Node, filesystem access, or internal Crystal APIs.
- Read-only inspection and destructive editing are separate phases.
- WebGPU overlays are for Crystal technical UI and should not contaminate the user's DOM.
- Chromium renders the real web page; Crystal must not attempt to recreate an HTML/CSS rendering engine with WebGPU.
- Rust/WASM accelerates parsing, analysis, diffing, dependency processing, and other heavy work; it does not own UI.
- Source modularity stays high: small files, deep folders, and domain-specific modules compiled into compact runtime entrypoints.
- CSS and JavaScript should generally be build outputs when a project uses Sass/TypeScript or modular source inputs.
- Features should degrade safely on malformed HTML, missing assets, stale snapshots, ambiguous mapping, unsupported project structures, unavailable WebGPU, and failed WASM initialization.

## Source and runtime model

The source tree should remain granular while runtime output stays compact:

```txt
source extremely modular
        ↓
build / compile / assemble
        ↓
runtime compact
```

Expected source inputs:

- `.html` partials and templates.
- `.scss` source styles.
- `.ts`, `.types.ts`, `.constants.ts`, `.helpers.ts`, `.utils.ts` modules.
- `.rs` Rust modules.
- `.wgsl` shaders.

Expected runtime outputs:

- `index.html` or equivalent assembled HTML.
- `main.css`.
- `main.js`.
- context-specific worker bundles.
- `crystal.wasm`.
- sourcemaps where useful.
- copied or processed assets.

Each execution context may have its own entrypoint. Electron main, preload, renderer, workers, and WASM should not be forced into one output file.

## Dependency policy

Crystal should use mature external tools when reimplementing them would be irrational, but dependencies must not define Crystal's architecture.

Accepted structural dependencies include Electron, Node, TypeScript, Sass/Dart Sass, Rust, WebAssembly tooling, and the WebGPU API.

Potentially acceptable dependencies include:

- esbuild or Rollup for bundling.
- Tree-sitter for serious incremental parsing.
- Monaco or CodeMirror 6 for Developer Mode editing.
- xterm.js for an integrated terminal.

Avoid unless strongly justified:

- React, Vue, Angular.
- Redux, Zustand, or external state managers.
- Tailwind, Bootstrap, Material UI, Radix, Framer Motion.
- full Lodash.
- visual component libraries.
- packages for trivial debounce/throttle/helpers.

Any accepted dependency should sit behind an adapter, such as `packages/adapters/code-editor/`, `packages/adapters/terminal/`, `packages/adapters/parser/`, or `packages/adapters/bundler/`.

## Product tracks

Crystal has several parallel product tracks. Each track should land incrementally with validation gates.

- Project understanding: graph, dependencies, assets, cache, watcher, analyzer.
- Preview and inspection: Chromium preview, diagnostics, DOM snapshot, selection, inspector.
- Design canvas: Figma-like navigation, overlays, selection, rulers, guides, grids, snapping, responsive viewport control.
- Visual editing: HTML element insertion, reorder, wrap, duplicate, delete, text editing, attribute editing, class management, undo/redo.
- Style editing: CSS/Sass reading, cascade analysis, selector mapping, design tokens, responsive rules, style states.
- Developer mode: files, code, system terminal, browser console, problems, command output, build integration.
- Native acceleration: WebGPU overlay and Rust/WASM analyzers.
- Robustness: validation, fallbacks, snapshots/backups, error recovery, accessibility, performance profiling, packaging.

## Phase -1 — Physical architecture

Goal: establish the source and runtime architecture.

Included:

- npm workspaces monorepo.
- `/apps` and `/packages` root structure.
- Electron main, preload, and renderer separation.
- Modular renderer folders for layout, views, components, styles, and bootstrap.
- Each visual unit can own HTML, SCSS, TypeScript, types, constants, helpers, utilities, state, and events.
- Core command, event, state, and project domains.
- Adapter folders for external tool boundaries.
- Runtime outputs in `dist/main`, `dist/preload`, `dist/renderer`, future `dist/workers`, and future `dist/wasm`.

Done when:

- Source layout is stable enough for small-file modular growth.
- Build outputs are compact and explicit.
- Security boundaries are documented.
- Files stay domain-specific and avoid vague `utils.ts`, `helpers.ts`, `common.ts`, or undifferentiated managers.

## Phase 0 — Tooling foundation

Goal: make local development repeatable.

Included:

- TypeScript configuration.
- esbuild bundling.
- Sass compilation.
- HTML partial/include assembly.
- Electron launch scripts.
- Preload bridge baseline.
- Structure validation.
- Source tree boundary validation.
- Local validation runner.
- Electron diagnostic script.

Future hardening:

- Import boundary validation.
- Dist manifest validation.
- Worker bundle validation.
- WASM build validation.
- HTML include source map support.
- Circular include reporting.

Done when:

- `npm run build`, `npm run typecheck`, and `npm run validate:local` are the baseline pre-merge gate.
- Windows Electron launch is reliable.

## Phase 1 — Project Graph foundation

Goal: understand the project as files, pages, dependencies, assets, and missing routes.

Included:

- Open folder and open HTML entrypoint.
- Recursive scanning with ignored directories and limits.
- HTML, CSS, Sass, JS, TS, image, SVG, font, media, and unknown file classification.
- HTML page discovery.
- Dependency extraction from HTML, CSS/SCSS, JS/TS imports, `srcset`, media, SVG references, and `url(...)`.
- External/local/missing/resolved route classification.
- Watcher events and graph refresh planning.
- In-memory cache and conservative semi-incremental refresh.

Target model expansion:

- Parsed DOM per HTML page.
- CSS classes used in HTML and stylesheets.
- Selectors and rule ownership.
- Applied style candidates where statically resolvable.
- Broken assets and broken links.
- Unused files and unused assets.
- Unused CSS candidates.
- Inferred components and repeated structures.
- Workspace status and project health signals.

Future hardening:

- Framework alias resolution.
- TypeScript path alias resolution.
- Sass include path support.
- npm package asset resolution.
- Better monorepo/package workspace awareness.
- Large-project indexing and persistence.
- Worker-backed scanning and analysis.
- Rust/WASM acceleration behind typed boundaries.

Done when:

- The graph is stable enough to drive Preview, Design, Inspector, and Developer panels.

## Phase 2 — Real Preview, DOM Snapshot, and Preview Selection

Goal: render real project pages safely and expose read-only structural selection.

Included:

- `crystal-preview://current/<relative-project-path>` protocol.
- Secure project-relative path resolution.
- MIME serving for HTML, CSS, JavaScript, SVG, images, and fonts.
- Missing resource, traversal, outside-root, unsupported MIME, and read failure diagnostics.
- Coalesced and bounded Preview issues.
- Load Preview and Reload Preview.
- Watcher-triggered preview reload after graph refresh.
- Safe mode when Preview fails or target cannot be loaded.
- Static read-only DOM Snapshot.
- DOM Tree read-only panel.
- Preview selection script injected only into HTML responses.
- postMessage bridge for click selection.
- Preview selection state and selected node summary.
- Conservative mapping between live selected node and static DOM Snapshot.
- Stale, missing, mismatched, ambiguous, and matched mapping states.

Validation:

- `validate:preview`.
- `validate:dom-snapshot`.
- `validate:preview-selection`.
- Manual UI checks for Preview, DOM Snapshot, selection, and mapping.

Done when:

- Preview can safely render project pages.
- DOM Snapshot can represent static HTML within limits.
- Selection can identify nodes conservatively without pretending unreliable mappings are valid.
- Bad project files produce controlled diagnostics, not crashes.

## Phase 3 — Preview Inspector read-only

Goal: show a structured read-only inspector for the selected node.

Included:

- Inspector derived from `previewSelection`, `domSnapshot`, and Preview state.
- Selected node summary.
- Mapped DOM Snapshot node details when mapping is `matched`.
- Defensive states for `missing-snapshot`, `stale`, `mismatched`, and `ambiguous`.
- Attributes, text preview, source location, depth, sibling index, child count, and truncation flags when available.
- Element identity: tag, ID, classes, attributes, source file, approximate source line when available, and dominant selector candidate where safely known.

Out of scope:

- Attribute editing.
- Text editing.
- Computed styles.
- Box model.
- CSS rule editing.
- DOM Tree navigation.
- Scroll-to-node.

Done when:

- A selected node can be inspected structurally without any source mutation or live DOM access.

## Phase 4 — Design Canvas Navigation MVP

Goal: add a real design workspace around Preview with Figma-like navigation.

Included:

- Infinite or large virtual canvas state.
- Page/artboard framing around the active Preview.
- Pan with Space + drag.
- Zoom with Ctrl + wheel.
- Fit to page, center page, zoom reset.
- Persistent viewport state per project/session.
- Device viewport presets.
- Canvas background, page shadow, and non-destructive framing.
- Rulers foundation.
- Guides foundation.
- Grid display foundation.
- Safe mode surface if the loaded page fails.
- Keyboard shortcut registry for canvas commands.

Out of scope:

- Editing HTML.
- Moving DOM elements.
- Resizing elements.
- CSS style editing.
- WebGPU overlay engine, unless used behind a feature flag as technical groundwork only.

Done when:

- The user can navigate a page like a design canvas without changing project files.

## Phase 5 — Visual Selection and Overlay MVP

Goal: make selection visually understandable on the canvas.

Included:

- Non-persistent selection outlines.
- Bounding boxes derived from safe overlay data.
- Hover highlight as a separate optional state.
- Selection handles shown read-only at first.
- Multi-frame awareness for different preview viewports.
- Overlay lifecycle tied to Preview reload/loadId.
- Visual breadcrumbs foundation.
- Layout type badges for `block`, `flex`, `grid`, `absolute`, `fixed`, and `sticky` when safely derivable.
- No mutation of user DOM beyond the existing temporary selection script.

Out of scope:

- Resize handles that write styles.
- Dragging elements.
- Layout editing.
- Box model editing.

Done when:

- Selection is visually clear and synchronized with `previewSelection` without becoming an editor.

## Phase 6 — HTML5 Element Library and Insertion

Goal: provide Webflow/Pinegrow-like insertion primitives for real HTML source.

The panel should be organized by user intent, not as a flat tag list.

Structural elements:

- `div`, `section`, `article`, `main`, `header`, `footer`, `aside`, `nav`.

Text elements:

- `h1` through `h6`, `p`, `span`, `blockquote`, `code`, `pre`, `strong`, `em`, `small`.

Media elements:

- `img`, `picture`, `source`, `video`, `audio`, `svg` references, `canvas`.

Form elements:

- `form`, `label`, `input`, `textarea`, `select`, `option`, `button`, `fieldset`, `legend`.

Lists and table elements:

- `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tr`, `th`, `td`.

Interaction elements:

- `details`, `summary`, `dialog`.

Semantic and accessibility helpers:

- Landmark presets.
- Required roles where appropriate.
- ARIA attribute helpers when appropriate.
- Label/input pairing helpers.

Presets:

- Hero section.
- Card.
- Navbar.
- Footer.
- Product grid.
- Modal.
- Form group.
- CTA block.
- Gallery.
- Menu/listing section.

Architecture:

- Insertions are commands, not direct renderer writes.
- Commands validate target, mapping status, insertion position, allowed parent/child constraints, accessibility defaults, and formatting.
- Source mutation happens in main/core services, not in renderer.
- Preview and Project Graph refresh after write.
- Undo/redo records a reversible source patch.
- Presets generate clean HTML and must not produce builder-specific junk.

Done when:

- A user can insert valid HTML5 elements into a real file with safe persistence and undo support.

## Phase 7 — Design Editing MVP

Goal: add controlled visual editing for structure and text.

Included:

- Text edit mode for selected text-bearing nodes.
- Duplicate selected element.
- Delete selected element with confirmation and undo.
- Wrap/unwrap with allowed containers.
- Move/reorder among siblings.
- Add before/after/inside selected element.
- Basic attribute editing for safe attributes: `id`, `class`, `href`, `src`, `alt`, `title`, `aria-*`, `data-*`.
- Class management: add existing class, remove class, create class through the command system.
- Breadcrumb functional enough to expose selection ancestry.
- Hover, focus, and active state preview hooks without writing state-specific CSS by default.
- Undo/redo for every mutation.
- Dirty state and save/apply behavior.
- Source formatting preservation strategy.

Out of scope:

- CSS cascade editing.
- Advanced layout algorithms.
- Component refactoring.
- JS-aware refactoring.

Done when:

- Users can perform basic Webflow/Pinegrow-like structural edits on real HTML files safely.

## Phase 8 — Inspector MVP editable

Goal: turn read-only inspection into controlled editing.

Included:

- Editable attributes with validation.
- Class list editing.
- Text content editing.
- ARIA and accessibility hints.
- Source location awareness.
- Conflict detection when snapshot or Preview is stale.
- Disabled editing for ambiguous/mismatched selections.

Inspector submodules:

- Identity: tag, ID, classes, attributes, source file, approximate line, inferred component, dominant selector, and current state.
- Cascade Map: applied rules, source file, winning selector, specificity, overridden properties, inactive properties, active media queries, and origin such as user agent, project, framework, or inline.
- Class Composer: add class, create class, rename class, detect orphan classes, show class usage, convert inline styles to classes, and extract repeated styles.
- Layout Intelligence: real layout type, parent flex/grid/block context, affected children, overflow, stacking context, effective z-index, position context, size problems, out-of-ratio images, invisible nodes, and covered nodes.
- Style Diff: original style, current style, unsaved changes, Crystal-generated changes, and manual code changes.
- Semantic and Accessibility Inspector: landmarks, missing alt text, heading order, input labels, unnamed buttons, empty links, approximate contrast, and unnecessary roles.

Out of scope initially:

- Full CSS rule editor.
- JS event handler editing.
- Arbitrary script mutation.

Done when:

- The Inspector can safely mutate selected HTML through commands with undo/redo and show enough intelligence to explain the selected element in project context.

## Phase 9 — Style Engine and CSS/Sass Inspector

Goal: understand and edit style sources without treating compiled CSS as the only truth.

Included:

- Stylesheet graph and source classification.
- CSS selector parsing.
- Simple cascade and specificity model.
- Matched rules for selected element where statically resolvable.
- Sass partial awareness and output/source boundary notes.
- Class-based style authoring.
- Design tokens for colors, spacing, typography, radii, shadows, and breakpoints.
- Safe style insertion location policy.
- Property editor for common properties.

Visual style editor categories:

- Layout.
- Spacing.
- Size.
- Position.
- Typography.
- Color.
- Background.
- Border.
- Effects.
- Transform.
- Flex.
- Grid.
- Responsive.
- Custom properties.
- States.

Style write policy:

- Crystal should not write inline styles by default.
- Prefer existing reusable classes when safe.
- Create new classes when needed.
- Prefer authored stylesheets over generated CSS outputs.
- Prefer CSS variables/design tokens for repeated values where the project structure supports them.
- Inline style should require explicit user intent.

Out of scope initially:

- Full browser-grade cascade parity.
- Runtime CSS-in-JS frameworks.
- Advanced animations editor.

Done when:

- Crystal can show and edit common CSS/Sass rules for selected elements with clear source ownership.

## Phase 10 — Responsive Design and Layout Tools

Goal: provide robust responsive authoring.

Included:

- Breakpoint manager.
- Device presets.
- Per-breakpoint preview widths.
- CSS media query awareness.
- Grid/flex visual helpers.
- Spacing measurement overlays.
- Snapping foundation.
- Responsive guides.
- Safe layout property editing.
- Responsive issue warnings for overflowing content, missing viewport meta, large fixed widths, and media without responsive attributes.

Done when:

- A user can inspect and adjust a page across common responsive breakpoints without losing source clarity.

## Phase 11 — Components, Snippets, and Reusable Blocks

Goal: support reusable authoring patterns without imposing a framework.

Included:

- Local snippet library.
- Project-level reusable blocks.
- Section templates.
- HTML partial awareness where the project uses modular HTML.
- Naming conventions for generated classes.
- Optional project templates for restaurant pages, landing pages, menus, galleries, forms, and content pages.
- Import/export of snippets as plain source.

Out of scope initially:

- React/Vue/Angular component compilation.
- Proprietary lock-in format.

Done when:

- Users can add and reuse consistent blocks while still owning the generated HTML/CSS.

## Phase 12 — Assets, Fonts, SVG, and Media Management

Goal: make asset-heavy real projects manageable.

Included:

- Asset browser.
- Image metadata and missing image diagnostics.
- SVG preview and dependency tracking.
- Font discovery and usage mapping.
- Replace asset command.
- Copy/import asset command.
- Alt text and accessibility prompts.
- Large asset warnings.
- Basic media optimization recommendations.
- Broken asset repair suggestions.
- Unused asset candidates.

Done when:

- A user can manage images, SVGs, fonts, and media references without breaking paths.

## Phase 13 — Developer Mode and IDE Tools

Goal: add developer-facing project tools while keeping Design mode focused.

Included:

- File explorer.
- Lightweight code editor panel.
- Multiple open files.
- Preview side-by-side.
- Search across project.
- Problems panel.
- Browser Console for the Preview, scoped separately from the system terminal.
- System/project terminal, scoped separately from Browser Console.
- Build/dev command runner with explicit user configuration.
- Output panel.
- Git status read-only at first.
- Outline.
- File breadcrumbs.
- Dependency viewer.
- Assets panel.
- Task runner.
- Jump from element to code.
- Jump from code to element.
- Command palette.

Out of scope initially:

- Full VS Code replacement.
- Integrated terminal with arbitrary shell execution by default.
- Silent mutation of project config.

Done when:

- Developers can inspect files, diagnostics, and configured commands without leaving Crystal for simple tasks, while terminal and Preview console remain clearly separated.

## Phase 14 — WebGPU Overlay Engine

Goal: render high-performance overlays independent of the user's DOM.

Included:

- WebGPU renderer context for Crystal overlays.
- Bounding boxes.
- Handles.
- Guides and rulers.
- Grids.
- Minimap.
- Measurement lines.
- Hover and selection overlay layers.
- Hit-testing visual data.
- Massive rectangle/line/vector overlay rendering.
- Invalidation tied to Preview loadId and viewport transform.
- Canvas2D fallback path if WebGPU is unavailable.

Out of scope:

- Using WebGPU to render the webpage itself.
- Mutating user DOM for overlay visuals.

Done when:

- Crystal can render fast design overlays over the Preview without DOM contamination.

## Phase 15 — Rust/WASM Analyzer

Goal: move heavy parsing and analysis to a robust native/WASM layer.

Included:

- HTML tokenizer/parser experiments.
- CSS parser/analyzer.
- Selector matching support for static cases.
- Dependency graph acceleration.
- Incremental diff and analysis APIs.
- Asset metadata analysis.
- Tree-sitter integration evaluation.
- WASM boundary types.
- Worker-hosted WASM calls for expensive tasks.
- Performance benchmarks against TypeScript implementation.

Out of scope initially:

- Replacing the entire TypeScript core at once.
- Browser-grade full layout/render engine.
- UI ownership from Rust/WASM.

Done when:

- Rust/WASM can provide measurable speed or correctness benefits for project analysis without destabilizing the app.

## Phase 16 — Automation and Assistant Workflows

Goal: support safe automated changes without hiding what will be modified.

Included:

- Command previews before mutation.
- Patch review UI.
- Batch operations over selected nodes or files.
- Accessibility suggestions.
- SEO/meta suggestions.
- Broken-link repair suggestions.
- Image alt text suggestions.
- Refactor suggestions for repeated structures.
- Optional AI-assisted generation gated behind reviewable commands.

Rules:

- No automatic write without an explicit user action.
- Every generated change must be shown as a patch or command preview.
- Undo/redo must cover accepted changes.

Done when:

- Automation improves productivity without bypassing Crystal's safety model.

## Phase 17 — Testing, Packaging, and Product Hardening

Goal: make Crystal shippable and resilient.

Included:

- Expanded non-visual validation scripts.
- UI smoke testing when a stable framework is selected.
- Screenshot testing when the UI stabilizes.
- Fixture gallery for Preview, selection, Inspector, design canvas, editing, Style Engine, Developer Mode, WebGPU overlay, and WASM analyzer.
- Regression tests for path traversal and sandbox security.
- Crash recovery.
- Project backups before destructive writes.
- Local autosave drafts.
- Versioned command history.
- Windows packaging.
- Update strategy.
- Performance profiling for large projects.
- Memory and watcher stress tests.

Done when:

- Crystal can be packaged and used on real projects with predictable recovery from errors.

## Workers roadmap

Heavy processing should move off the UI thread when possible.

Potential workers:

- `parser.worker`.
- `analyzer.worker`.
- `asset-scanner.worker`.
- `css.worker`.
- `html.worker`.
- `ts.worker`.
- `preview-sync.worker`.
- `wasm.worker`.

Rules:

- UI must not block on parsing, scanning, analysis, or expensive computation.
- Worker boundaries must use typed messages.
- Worker results must be validated before updating project state.

## Fallback roadmap

Crystal must degrade in controlled ways:

- If WebGPU fails, use Canvas2D overlay or disable overlay with a visible reason.
- If WASM fails, use TypeScript fallback or limited analysis mode.
- If Preview fails, show safe mode with diagnostics.
- If HTML is malformed, use tolerant parsing with issues.
- If CSS or assets fail to load, show visible diagnostics.
- If a script blocks or crashes Preview, isolate the failure and show a warning.
- If terminal or command runner fails, show explicit error state.

## Build pipeline target

The long-term build pipeline should be explicit:

```txt
1. validate source tree
2. assemble HTML partials
3. compile SCSS
4. bundle TypeScript
5. compile Rust/WASM
6. process/copy assets
7. generate manifest
8. validate dist
```

Expected output:

```txt
dist/
  main/
    main.cjs
  preload/
    preload.cjs
  renderer/
    index.html
    main.css
    main.js
  workers/
    parser.worker.js
    analyzer.worker.js
  wasm/
    crystal.wasm
  assets/
```

## Command system roadmap

All meaningful mutations must pass through commands.

Representative commands:

- `AddHtmlElementCommand`.
- `RemoveHtmlElementCommand`.
- `UpdateTextCommand`.
- `UpdateAttributeCommand`.
- `AddClassCommand`.
- `RemoveClassCommand`.
- `UpdateCssPropertyCommand`.
- `CreateCssClassCommand`.
- `RenameCssClassCommand`.
- `MoveDomNodeCommand`.
- `DuplicateDomNodeCommand`.

Commands enable undo, redo, history, logging, reproducibility, multi-view synchronization, and a future macro system.

## Event system roadmap

Commands execute actions. Events report changes. The two concepts must remain separate.

Representative events:

- `ProjectOpened`.
- `ProjectClosed`.
- `FileChanged`.
- `FileSaved`.
- `GraphUpdated`.
- `PreviewLoaded`.
- `PreviewCrashed`.
- `DomSnapshotUpdated`.
- `SelectionChanged`.
- `CssRuleChanged`.
- `AssetMissing`.
- `BuildStarted`.
- `BuildCompleted`.
- `BuildFailed`.

## State roadmap

Crystal should keep explicit project state rather than hiding important data inside UI components.

Major state domains:

- `WorkspaceState`.
- `ProjectGraphState`.
- `SelectionState`.
- `PreviewState`.
- `InspectorState`.
- `DeveloperState`.
- `FileState`.
- `BuildState`.
- `CommandHistoryState`.
- `UIState`.

State can be centralized or modular by domain, but it should remain owned by Crystal modules and exposed through controlled APIs.

## Cross-cutting robustness features

These features should be considered throughout multiple phases:

- Command palette for all major actions.
- Undo/redo transaction log.
- Project backups before source mutation.
- Read-only mode for protected projects.
- Workspace/session restore.
- Feature flags for experimental modules.
- Problem details panel with exact reason and suggested action.
- Accessibility audit basics: labels, alt text, heading order, landmarks, contrast warnings when style data is available.
- SEO basics: title, description, canonical, social metadata, headings.
- Performance basics: large assets, missing dimensions, render-blocking assets, excessive dependency count.
- Security basics: unsafe external links, inline script warnings, path traversal hardening.
- Project health score.
- Compare changes.
- Clean export.
- Import/export of snippets and settings.
- Adapter/plugin API only after command/state boundaries are mature.

## Non-negotiable project rules

- Crystal is a new project from scratch.
- Crystal does not depend on any previous project.
- Electron, Node, TypeScript, Sass, Rust, WebAssembly, and WebGPU are fixed technologies.
- Crystal must be multiplatform.
- Source architecture must remain highly modular.
- Each UI unit should have its own folder and may own HTML, SCSS, TypeScript, types, helpers, utilities, constants, state, and events.
- Modular source must compile or assemble into compact entrypoints.
- External dependencies must be justified and isolated behind adapters.
- UI, state, commands, and events belong to Crystal.
- Chromium renders the real webpage.
- WebGPU renders Crystal technical overlays.
- Rust/WASM handles analysis and heavy processing, not UI.
- Preview must not contaminate the user's DOM with heavy overlays.
- All important modifications must pass through commands.
- Crystal must fail in a controlled way when user projects are broken.

## Pending decisions

These decisions are intentionally not frozen yet:

1. Primary bundler beyond current esbuild usage, if a change is needed later.
2. Code editor adapter: Monaco, CodeMirror 6, or another option.
3. Integrated terminal adapter: xterm.js or another option.
4. Incremental parser strategy: Tree-sitter, Rust/WASM parser, or phased internal parser.
5. UI implementation strategy: native modular UI, Web Components, Lit, Solid, or another justified option.
6. Exact long-term HTML include syntax and source map strategy.
7. Plugin and adapter API boundaries.
8. UI testing strategy and timing.
9. Theming system and token model.
10. Exact command bus structure.
11. Exact Project Graph long-term schema.
12. Source maps between visual selection and code.
13. Sass visual editing strategy.
14. Strategy for external frameworks and generated projects.
15. Sandbox policy for user scripts and Preview console integration.

## Validation policy

Every phase must add non-visual validation where possible and document manual checks where automation is not enough.

Required baseline before merge remains:

```bash
npm run validate:local
```

For Electron launch checks:

```bash
npm run validate:local -- --with-dev
```

Feature-specific scripts should be added as phases land, for example:

- `validate:preview-inspector`.
- `validate:design-canvas`.
- `validate:design-editing`.
- `validate:style-engine`.
- `validate:webgpu-overlay`.
- `validate:wasm-analyzer`.

## Current priority after Phase 2

The next immediate priority is the read-only Preview Inspector. After that, the roadmap should move toward Design Canvas navigation before any broad visual editing. The sequence should stay conservative:

1. Read-only Inspector.
2. Canvas navigation MVP.
3. Visual overlay/selection hardening.
4. HTML5 insertion commands.
5. Safe editing with undo/redo.
6. Editable Inspector and Style Engine.

This order prevents Crystal from becoming a fragile editor before the identity, preview, snapshot, and command boundaries are reliable.
