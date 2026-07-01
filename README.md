# 🚀 Commit Message Generator (commitgen)

A lightning-fast, offline-first CLI tool that reads your staged git diffs and automatically generates professional Conventional Commits using locally running LLMs (via Ollama).

*(Replace this text with a Demo GIF once recorded)*

## ✨ Why this tool?

- **100% Offline & Private:** Uses local LLMs. Your source code never leaves your machine.
- **Zero API Costs:** No OpenAI/Anthropic API keys needed.
- **Professional History:** Strictly adheres to the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- **Lightning Fast:** Generates and commits in seconds without disrupting your terminal flow.

## 🛠 Prerequisites

1. **Node.js** (v18+ recommended for native `fetch`).
2. **Ollama** - You must have [Ollama](https://ollama.com/) installed and running locally.
3. **LLM Model** - Download your preferred model (default is `mistral`):
   ```bash
   ollama pull mistral
   ```

## 📦 Installation

To install this tool globally on your machine so you can use it in any repository:

```bash
npm install -g @vedanshsharma/commit-gen
```

## 🚀 Usage

Whenever you have changes ready to commit:

1. Stage your files as usual:
   ```bash
   git add <files>
   ```

2. Run the CLI:
   ```bash
   commitgen
   ```

3. The AI-generated commit message will be presented in a styled box. You can then:
   - **Accept and Commit** instantly
   - **Regenerate** if you want a different variation
   - **Edit Manually** to tweak the generated message inline
   - **Cancel** to abort without committing

### Command Options

- **Change Model**: Specify a different Ollama model (defaults to `mistral`).
  ```bash
  commitgen --model llama3.2
  ```

- **Dry Run**: Generate and preview the message without actually running `git commit`.
  ```bash
  commitgen --dry-run
  ```

- **Gemini Fallback**: Use the Gemini API instead of local Ollama (requires the `GEMINI_API_KEY` environment variable).
  ```bash
  commitgen --gemini
  ```

- **Configure Defaults**: Interactively set your default model so you don't have to pass the `--model` flag every time. This saves your preference to `~/.commitgen/config.json`.
  ```bash
  commitgen config
  ```

## 🏗 Tech Stack

- **JavaScript / Node.js ES Modules**
- **Commander.js** - CLI command orchestration
- **Inquirer.js (Classic)** - Interactive prompts
- **Chalk** - Premium terminal styling
- **Native Node Fetch & Child_Process** - Zero bloat system integration
