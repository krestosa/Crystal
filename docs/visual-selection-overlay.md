# Visual Selection Overlay MVP

The Visual Selection Overlay MVP is a read-only Design Canvas layer for showing the currently selected Preview element without editing the user project.

The overlay is external to the Preview iframe. It is rendered by Crystal UI as HTML/CSS in the Design Canvas frame wrapper, above the iframe and inside the same transformed Design Canvas stage. Because it is inside the stage, the selection box moves and scales with Design Canvas pan, zoom, Fit, Center, Reset, and resize behavior. The Design Canvas toolbar and Preview controls remain outside that transform.

The Preview document is still sandboxed without `allow-same-origin`. Crystal does not read `iframe.contentDocument`, does not read `iframe.contentWindow.document`, does not query the live iframe document, does not call computed styles, does not inject a preload into the iframe, and does not expose Node or filesystem APIs to the iframe.

Selection data flows through the existing Preview selection bridge:

```txt
iframe selection rect
-> validated Preview selection message
-> previewSelection state
-> DOM Snapshot mapping status
-> Design Canvas overlay projection
-> external overlay render
```

The injected Preview selection script now serializes a bounded `selectionRect` from `getBoundingClientRect()` and labels it as `iframe-viewport`. The payload is validated in the renderer and again in main before it updates `previewSelection` state. Rect values must be finite, bounded, serializable numbers; `NaN`, `Infinity`, invalid coordinate spaces, and unsafe ranges are rejected.

The overlay follows the same trust boundary as the read-only Preview Inspector. A bounding box is shown only when `mappingStatus` is `matched` and a reliable non-zero `selectionRect` is available. `missing-snapshot`, `stale`, `ambiguous`, mismatched, unknown, and rect-unavailable states do not show a false highlight. They render a compact defensive message or hide the overlay when no selection exists.

The overlay has `pointer-events: none`, so it does not block normal iframe interaction. Preview Select Mode continues to own selection interception inside the iframe. Clearing selection, changing Preview target, or reloading Preview clears the selected node through the existing Preview selection state flow.

This MVP does not implement visual editing, drag handles, moving, resizing, insertion, text editing, attribute editing, style editing, computed styles, box model inspection, rulers, guides, snapping, multi-select, WebGPU, canvas overlay rendering, Rust/WASM analysis, or source mutation.

Validation is exposed as:

```bash
npm run validate:visual-selection-overlay
```

It is also wired into:

```bash
npm run validate:local
```
