# Commit Message Generator CLI — Full Project Document

## The Idea

Every developer writes commit messages, and almost every developer writes lazy ones — "fix bug", "update", "changes", "wip". Conventional Commits is the standard that solves this: structured messages like `feat(auth): add JWT refresh token rotation` that make git history readable, changelogs automatic, and codebases professional. The problem is nobody wants to think about message formatting mid-flow.

The Commit Message Generator is a global CLI tool that reads exactly what you changed in your staged files, understands the intent of the diff, and generates a properly formatted Conventional Commit message using a locally running LLM. One command, one second, professional commit history — no internet required, no API costs, runs entirely on your machine.

---

## What We Are Building

A Node.js CLI tool that installs globally via npm and integrates into your existing git workflow. When you stage your changes with `git add` and run a single command, the tool reads your diff, sends it to a local Ollama model, gets back a Conventional Commit message, shows it to you for approval, and either commits directly or lets you edit. You never leave the terminal. The entire flow takes under 10 seconds.

---

---

## Tech Stack

**Runtime**
- Node.js — consistent with OmniTask and your existing CLI experience

**CLI Framework**
- Commander.js — cleaner and more production-standard than Inquirer for command-based CLIs
- Inquirer.js — for the interactive accept/edit/regenerate prompt after message generation (you already know this)
- Chalk — terminal output colors and formatting

**LLM Integration**
- Ollama — runs LLMs locally on your machine, free, no API key, works offline
- Model: `mistral` or `llama3.2` via Ollama's REST API at `localhost:11434`
- Fallback: Gemini API (optional flag `--gemini`) for machines without Ollama — you already know this from Bixby

**Git Integration**
- Node.js `child_process` — spawn git commands, read diff output, execute final commit
- No external git library needed — raw git commands give you full control

**Distribution**
- npm publish — makes it installable globally via `npm install -g`
- The `bin` field in `package.json` maps the `commitgen` command to your entry file

---

## How It Works — Full Flow

```
1. User runs: commitgen
2. CLI checks if inside a git repo — exits with clear error if not
3. CLI runs: git diff --staged
4. If no staged files — exits with message "nothing staged, run git add first"
5. Diff is cleaned and truncated to fit LLM context window
6. Prompt is built: diff + Conventional Commits format instructions
7. Request sent to local Ollama API at localhost:11434
8. LLM returns a commit message
9. CLI displays the message in a styled box
10. User sees three options: Accept, Regenerate, Edit manually
11. If Accept: runs git commit -m "generated message" automatically
12. If Regenerate: repeats from step 6 with a temperature variation
13. If Edit: opens the message in a temp file in the user's $EDITOR
```

---

## Conventional Commits Format

The tool generates messages in this exact format:

```
<type>(<scope>): <short description>

[optional body]
```

**Types the LLM is instructed to use:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code restructure, no behavior change
- `docs` — documentation changes
- `style` — formatting, no logic change
- `test` — adding or fixing tests
- `chore` — build process, dependencies, tooling

**Examples of output:**
```
feat(auth): add JWT refresh token rotation
fix(dashboard): resolve null pointer on empty task list
refactor(cli): extract diff parsing into separate module
docs(readme): add installation instructions for Linux
```

---

## The Prompt Engineering

The quality of the output lives entirely in the prompt. The system prompt sent to Ollama looks like this:

```
You are a git commit message generator. You follow the Conventional Commits 
specification exactly. Analyze the provided git diff and generate ONE commit 
message. Rules:
- Format: type(scope): description
- Type must be one of: feat, fix, refactor, docs, style, test, chore
- Scope is the main file or module changed (optional but preferred)
- Description is lowercase, present tense, under 72 characters, no period
- Return ONLY the commit message, nothing else, no explanation, no markdown
```

This is the core of the project. Getting the prompt right so the output is consistently clean is the main engineering challenge.

---

## Commands

```bash
commitgen                    — main command, reads staged diff and generates message
commitgen --gemini           — use Gemini API instead of local Ollama
commitgen --model llama3.2   — specify a different Ollama model
commitgen --dry-run          — show generated message but don't commit
commitgen --copy             — copy message to clipboard instead of committing
commitgen config             — set default model, API keys, preferences
```

---

## Folder Structure

```
commit-gen/
├── bin/
│   └── commitgen.js         — entry point, registered in package.json bin
├── src/
│   ├── index.js             — Commander setup, command registration
│   ├── git.js               — git diff reading, git commit execution
│   ├── ollama.js            — Ollama API client
│   ├── gemini.js            — Gemini API fallback client
│   ├── prompt.js            — prompt builder, diff cleaner, context truncation
│   └── ui.js                — Chalk styling, Inquirer interactive prompt
├── config/
│   └── defaults.js          — default model, max diff length, preferences
├── package.json             — bin field maps commitgen → bin/commitgen.js
└── README.md
```

---

## First Sprint Plan (Monday dev slot — Project A)

1. Set up repo, configure `package.json` bin field, test `npm link` globally
2. Build `git.js` — read staged diff, detect if inside git repo, handle edge cases
3. Build `ollama.js` — POST to localhost:11434, handle model not running error gracefully
4. Build `prompt.js` — construct system prompt, clean and truncate diff
5. Build `ui.js` — display generated message, accept/regenerate/edit flow
6. Wire everything in `index.js`, test end-to-end on a real repo
7. Write README with installation instructions and demo GIF
