import { Command } from 'commander';
import chalk from 'chalk';
import { isGitRepo, getStagedDiff, commitChanges } from './git.js';
import { buildPrompt } from './prompt.js';
import { generateCommitMessage } from './ollama.js';
import { generateCommitMessageGemini } from './gemini.js';
import { displayMessage, promptUserAction, promptManualEdit, promptConfigMenu } from './ui.js';
import { getConfig, setConfig } from './config.js';

const program = new Command();

program
    .name('commitgen')
    .description('CLI to generate Conventional Commits using local LLMs')
    .version('1.0.0');

program.command('config')
    .description('Configure default settings')
    .action(async () => {
        try {
            const config = await getConfig();
            console.log(chalk.magenta.bold('\n⚙️  Commitgen Configuration\n'));
            const answers = await promptConfigMenu(config.model);
            await setConfig(answers);
            console.log(chalk.green.bold('\n✅ Configuration saved successfully to ~/.commitgen/config.json!\n'));
        } catch (error) {
            console.log('\n' + chalk.red.bold('❌ Error: ') + error.message);
            process.exit(1);
        }
    });

program
    .option('-m, --model <name>', 'Ollama model to use')
    .option('--dry-run', "show generated message but don't commit")
    .option('--gemini', "use Gemini API instead of local Ollama")
    .action(async (options) => {
        try {
            const config = await getConfig();
            const selectedModel = options.model || config.model;

            // 1. Verify we are in a git repository
            const isRepo = await isGitRepo();
            if (!isRepo) {
                console.log(chalk.red.bold('❌ Error:') + ' You are not inside a git repository.');
                process.exit(1);
            }

            // 2. Get staged changes
            const diff = await getStagedDiff();
            if (!diff) {
                console.log(chalk.yellow('⚠️  No staged changes found.'));
                console.log(chalk.gray('Run `git add <files>` and try again.'));
                process.exit(0);
            }

            // 3. Main interactive loop
            while (true) {
                console.log(chalk.gray('\nAnalyzing staged diff and generating message...'));
                
                const prompt = buildPrompt(diff);
                
                let message;
                if (options.gemini) {
                    if (!process.env.GEMINI_API_KEY) {
                        console.log(chalk.red.bold('\n❌ Error: ') + 'GEMINI_API_KEY environment variable is missing.');
                        console.log(chalk.gray('Set it using: $env:GEMINI_API_KEY="your_key" (PowerShell) or export GEMINI_API_KEY="your_key" (Mac/Linux)\n'));
                        process.exit(1);
                    }
                    message = await generateCommitMessageGemini(prompt);
                } else {
                    message = await generateCommitMessage(prompt, selectedModel);
                }
                
                displayMessage(message);
                
                if (options.dryRun) {
                    console.log(chalk.gray('Dry run complete. No changes were committed.\n'));
                    process.exit(0);
                }
                
                const action = await promptUserAction();
                
                if (action === 'accept') {
                    await commitChanges(message);
                    console.log(chalk.green.bold('\n✅ Successfully committed!'));
                    break;
                } else if (action === 'regenerate') {
                    // Just continue the loop to regenerate
                    continue;
                } else if (action === 'edit') {
                    const edited = await promptManualEdit(message);
                    if (edited && edited.trim() !== '') {
                        await commitChanges(edited.trim());
                        console.log(chalk.green.bold('\n✅ Successfully committed with your edits!'));
                    } else {
                        console.log(chalk.red('\n❌ Commit aborted: Message cannot be empty.'));
                    }
                    break;
                } else if (action === 'cancel') {
                    console.log(chalk.gray('\nProcess cancelled. No changes committed.'));
                    break;
                }
            }
        } catch (error) {
            console.log('\n' + chalk.red.bold('❌ Error: ') + error.message);
            process.exit(1);
        }
    });

export function run() {
    program.parse(process.argv);
}
