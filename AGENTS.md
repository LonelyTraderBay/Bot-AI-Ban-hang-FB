# BotSales AI repository instructions

## Repository boundaries

- This Git repository contains separate project areas; it is not a single npm workspace.
- `.github/` contains repository-level workflows. Keep workflow paths, working directories, lockfile paths, and artifact paths aligned with the project each workflow runs.
- `botsales-kit/` owns shared product contracts, design tokens, specifications, and its own planning/release tools. Treat its canonical source files as authoritative. `IMPLEMENTATION_PLAN.md` and other generated reports are outputs; update their source files and use the owning generator instead of editing generated output by hand.
- `BotSalesAI_Frontend/` is the React/TypeScript npm workspace root. Keep its `package.json`, lockfile, Node/npm configuration, app, packages, scripts, tests, frontend docs, and evidence within that workspace unless the workspace itself is intentionally redesigned.
- `BotSalesAI_Backend/` is the only workspace for backend implementation. Keep backend API and worker source, database schemas and migrations, fixtures, tests, scripts, dependencies, and backend-specific configuration there. Repository workflows stay in `.github/`, and canonical shared contracts stay in `botsales-kit/`. Follow [the backend workspace rules](BotSalesAI_Backend/AGENTS.md). Describe backend behavior as implemented only when supported by source and verification.
- The root `README.md` is the entry point for this multi-project repository. Component READMEs describe their own workspace.

## Working in a component

- Read this file and the nearest applicable `AGENTS.md` before changing a component. More specific instructions in `BotSalesAI_Frontend/AGENTS.md`, `BotSalesAI_Backend/AGENTS.md`, and `botsales-kit/AGENTS.md` govern work within those areas.
- Keep package-local instructions and files needed to distribute either component with that component. In particular, do not relocate or remove package-local `AI_RULES.md` copies without updating the package's release, checksum, and validation process.
- Before moving files, inspect all path consumers, generated artifacts, workflow filters, and package commands; update them together and preserve historical evidence as historical evidence.
- Preserve existing staged, unstaged, and untracked work. Do not reset, clean, bulk-stage, or commit unrelated changes.
- Verify structural changes with path/reference checks and the validators or generators owned by the affected component. Report which application checks were not run; static consistency checks are not application or backend verification.
