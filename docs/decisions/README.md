# Architecture Decision Records

[Docs index](../README.md)

ADRs preserve decisions that would otherwise be rediscovered whenever a feature touches security, Preview, command planning, or renderer composition. They record the historical constraint and the accepted trade-off; they are not a substitute for current implementation evidence.

## Decisions

- [0001 — Electron Security Boundaries](./0001-electron-security-boundaries.md)
- [0002 — Read-only Preview First](./0002-read-only-preview-first.md)
- [0003 — Command Preview Before Write](./0003-command-preview-before-write.md)
- [0004 — Modular Shell UI Primitives](./0004-modular-shell-ui-primitives.md)

An accepted ADR remains normative for the decision it records until a later ADR supersedes it. Current code and validators still determine whether the decision has been implemented correctly.

## Related docs

- [Architecture overview](../architecture/README.md)
- [Security model](../architecture/security-model.md)
- [Module boundaries](../architecture/module-boundaries.md)
- [Validation system](../architecture/validation-system.md)
