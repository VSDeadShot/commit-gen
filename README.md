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
# Clone the repository
git clone https://github.com/VSDeadShot/commit-gen.git
cd commit-gen

# Install dependencies and link globally
npm install
npm link
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

Specify a different Ollama model (defaults to `mistral`):
```bash
commitgen --model llama3.2
```

## 🏗 Tech Stack

- **JavaScript / Node.js ES Modules**
- **Commander.js** - CLI command orchestration
- **Inquirer.js (Classic)** - Interactive prompts
- **Chalk** - Premium terminal styling
- **Native Node Fetch & Child_Process** - Zero bloat system integration

this is just a test line to see if the project is working 
