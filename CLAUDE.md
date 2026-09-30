# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview

`commitgen` (npm package `@vedanshsharma/commit-gen`) is an offline-first CLI that reads staged git diffs and generates Conventional Commit messages using a local Ollama LLM (default model `mistral`) or, optionally, the Gemini API. Published to npm; installed globally via `npm install -g @vedanshsharma/commit-gen` and invoked as `commitgen`.

## Tech Stack

- **Node.js ES Modules** (`"type": "module"` in package.json) — use `import`/`export`, not `require`.
- **Commander.js** — CLI command/flag parsing (`src/index.js`).
- **Inquirer.js** (`select`/`input`/`confirm` prompt types — note: classic `list` type is deprecated in the installed version) — interactive prompts (`src/ui.js`).
- **Chalk** — terminal styling.
- **Native `fetch`** — talks to Ollama's local HTTP API (`http://localhost:11434/api/generate`) and the Gemini streaming API. No SDKs.
- **`child_process.execFile`** (promisified) — all git interaction; no external git library.
- **`node --test`** — the test suite lives in `test/` and runs via `npm test`; no external test framework.

## Architecture

```
bin/commitgen.js   Shebang entrypoint, just calls run() from src/index.js
src/index.js       Commander setup: main action + `config` and `install-hook` subcommands.
                    Owns the interactive accept/regenerate/edit/cancel loop.
src/git.js         All git shelling out: isGitRepo, getStagedDiff, commitChanges, getCurrentBranch
src/prompt.js      Builds the LLM prompt (system prompt + diff + branch/gitmoji instructions),
                    truncates oversized diffs (default 3500 chars)
src/ollama.js      Streaming generator against local Ollama HTTP API
src/gemini.js      Streaming generator against Gemini API (requires GEMINI_API_KEY env var)
src/ui.js          All inquirer prompts (action menu, manual edit, config menu)
src/config.js      Reads/writes ~/.commitgen/config.json (model, useGitmoji)
src/hook.js        Installs a prepare-commit-msg git hook that shells back into commitgen --hook
```

Both `ollama.js` and `gemini.js` export `async function*` generators that yield text chunks; `index.js` streams these token-by-token to stdout via `for await`.

## Key Conventions

- Every exported function has a JSDoc block (`@param`/`@returns`) — follow this pattern for new exports in `src/`.
- Errors are caught at the call site and rethrown as `new Error('<Context>: ' + error.message)` — keeps user-facing errors descriptive without stack noise.
- `git.js` uses `execFile` (not `exec`) with argument arrays to avoid shell injection — always add new git invocations the same way, never build a shell string.
- `getStagedDiff` explicitly excludes lockfiles and binary/minified assets via pathspecs — keep this list updated if new noisy file types come up.
- Commit messages follow Conventional Commits (`type(scope): description`), optionally gitmoji-prefixed and/or footer-linked to an issue ID parsed from the branch name — this convention is enforced both in the LLM system prompt (`src/prompt.js`) and should be mirrored in this repo's own commit history.
- Version bumps in `package.json` happen in their own `chore:` commit, typically paired with the feature/doc commit that motivated them (see git log).
- No `.env` is committed; `GEMINI_API_KEY` is read from the environment only.

## Known repo quirks

- Both `ollama.js` and `gemini.js` time out only the first response; a stall mid-stream (after the first token) still hangs forever — known and accepted for 1.1.0.

## Workflow Rules

- **Propose one change at a time.** Wait for local review before moving to the next change.
- **Only commit or push after explicit approval.** Never run `git commit`/`git push` proactively, even if a change looks complete and correct.
- **Never commit or push notes/handoff/scratch files** (e.g. this file's drafts, working notes, temp output) to the repo.
