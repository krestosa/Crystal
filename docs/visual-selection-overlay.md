# Visual Selection Overlay MVP

[Docs index](./README.md)

The Visual Selection Overlay gives a matched Preview selection a visible outline without inserting editor chrome into the project page. Crystal renders the overlay as its own read-only HTML/CSS layer in the transformed Design Canvas stage. The overlay is external to the Preview iframe and remains outside the user's DOM.

## Projection model

```text
bounded iframe selection rectangle
→ validated Preview Selection state
→ trusted DOM Snapshot mapping
→ Design Canvas coordinate projection
→ external read-only overlay
```

The selection script reports a bounded `selectionRect` from `getBoundingClientRect()` in the `iframe-viewport` coordinate space. Renderer validates the message and main validates the payload again. Coordinates must be finite, serializable, and within accepted bounds.

A highlight appears only when `mappingStatus` is `matched` and a reliable non-zero rectangle is available. Missing snapshots, stale state, mismatches, ambiguity, unknown coordinate data, and unavailable rectangles produce a defensive message or no overlay. Crystal does not invent geometry to preserve visual continuity.

Because the overlay lives inside the transformed stage, it follows Design Canvas pan, zoom, Fit, Center, Reset, and resize behavior. `pointer-events: none` keeps normal iframe interaction available. Preview Select Mode remains responsible for click interception inside the page.

## Boundary

The iframe remains sandboxed without `allow-same-origin`. Crystal does not read `iframe.contentDocument`, does not read `iframe.contentWindow.document`, query the live page, call computed-style APIs, inject a preload into the iframe, or expose Node and filesystem capability to project code.

The MVP has no edit handles, drag/resize behavior, insertion, text or attribute editing, style editing, box-model inspection, rulers, guides, snapping, multi-select, WebGPU rendering, Rust/WASM analysis, or source mutation.

## Validation

```bash
npm run validate:visual-selection-overlay
```

The validator checks payload bounds, mapping gates, lifecycle clearing, projection behavior, pointer transparency, and the absence of user-DOM mutation.
