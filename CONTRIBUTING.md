# CONTRIBUTING

This document defines the development workflow for the PasteRTC project.

All contributors (human or AI) should follow these rules.

The goal is to keep the project clean, stable, and easy to maintain.

---

# Development Philosophy

PasteRTC is developed incrementally.

Every implementation step should have a single clear objective.

Avoid implementing multiple unrelated features in one change.

Small, verified changes are preferred over large implementations.

---

# Development Order

Always follow the roadmap.

Do not skip phases.

If a phase depends on another phase, complete the earlier phase first.

When uncertain, prefer stability over new functionality.

---

# One Task = One Goal

Each implementation task should have exactly one primary goal.

Good examples:

* Extract signaling into its own module.
* Introduce the Connection abstraction.
* Add Host and Client classes.
* Add unit tests for signaling.

Bad examples:

* Add Host, Client, QR signaling, and multi-client support in one change.
* Replace copy-paste signaling while adding QR helpers.

---

# One Feature Per Commit

Whenever possible, one implementation task should correspond to one logical commit.

Examples:

```text
feat: extract signaling module

feat: introduce Connection class

feat: add Host abstraction

feat: support multiple clients
```

Avoid mixing refactoring and feature development.

---

# Refactoring Rules

Refactoring should not change behavior.

When refactoring:

* Keep the demo working.
* Keep tests passing.
* Avoid changing the public API unless necessary.

Behavioral changes belong in feature phases, not refactoring phases.

---

# Public API Stability

Host and Client form the public API.

Avoid changing public APIs unnecessarily.

When public APIs must change:

1. Update ARCHITECTURE.md.
2. Update ROADMAP.md if needed.
3. Update tests.
4. Update demo code.

---

# Testing Policy

Every major feature should eventually have automated tests.

Bug fixes should include tests whenever practical.

Do not merge large structural changes without ensuring existing tests still pass.

---

# Documentation First

Before implementing a major feature:

* Verify PROJECT.md
* Verify ROADMAP.md
* Verify ARCHITECTURE.md

If the feature changes project direction, update documentation first.

---

# Simplicity First

Prefer the simplest implementation that satisfies the current phase.

Avoid designing for future features too early.

Do not introduce abstractions until they provide clear value.

---

# Dependencies

Avoid unnecessary dependencies.

Before adding a dependency, consider:

* Can this be implemented with native browser APIs?
* Does the dependency significantly simplify the project?
* Is it lightweight and well maintained?

Small libraries are preferred.

For Phase 6 QR planning, do not add dependencies. QR implementation should be
planned as an optional extension first. Any later QR dependency must be justified
in the implementation phase and must not become a Core dependency.

---

# Backward Compatibility

Whenever possible:

* Existing demos should continue working.
* Existing APIs should continue working.
* Existing tests should continue passing.

Breaking changes should be avoided unless absolutely necessary.

---

# Code Quality

Prioritize:

1. Readability
2. Simplicity
3. Maintainability
4. Predictability

Avoid clever solutions that make the code harder to understand.

---

# Project Scope

PasteRTC focuses on browser-to-browser communication.

The project should not include:

* Authentication
* User accounts
* Matchmaking
* Backend services
* Cloud infrastructure

Keep the library focused.

---

# Before Starting Any New Phase

Always read:

* PROJECT.md
* ROADMAP.md
* ARCHITECTURE.md
* CONTRIBUTING.md

For extension phases, also read:

* EXTENSIONS.md

Do not begin implementation before understanding the current project state.

For QR Extension work, confirm that copy-paste signaling remains the baseline,
that QR code lives under `src/extensions/qr/`, and that Core does not import
from QR.

---

# Guiding Principle

Every phase should leave the project in a working state.

The project should compile, run, and pass its existing tests after every completed phase.

Never sacrifice stability for speed.
