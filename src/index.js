import { Command } from 'commander';
import chalk from 'chalk';
import { isGitRepo, getStagedDiff, commitChanges, getCurrentBranch } from './git.js';
import { buildPrompt } from './prompt.js';
import { generateCommitMessage } from './ollama.js';
import { generateCommitMessageGemini } from './gemini.js';
import { promptUserAction, promptManualEdit, promptConfigMenu } from './ui.js';
import { getConfig, setConfig } from './config.js';
import { installHook } from './hook.js';
import fs from 'fs';

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

program.command('install-hook')
    .description('Install git hook to auto-run on git commit')
    .action(async () => {
        try {
            await installHook();
        } catch (error) {
            console.log('\n' + chalk.red.bold('❌ Error: ') + error.message);
            process.exit(1);
        }
    });

program
    .option('-m, --model <name>', 'Ollama model to use')
    .option('--dry-run', "show generated message but don't commit")
    .option('--gemini', "use Gemini API instead of local Ollama")
    .option('--hook <file>', "internal use only: pass the commit message file")
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

            // 2.5. Get current branch name
            const branchName = await getCurrentBranch();

            // 3. Main interactive loop
            while (true) {
                console.log(chalk.gray('\nAnalyzing staged diff and generating message...'));
                
                const prompt = buildPrompt(diff, branchName);
                
                console.log('\n' + chalk.magenta.bold('✨ Generated Commit Message ✨'));
                console.log(chalk.gray('─────────────────────────────────────────────'));
                
                let message = '';
                
                if (options.gemini && !process.env.GEMINI_API_KEY) {
                    console.log(chalk.red.bold('\n❌ Error: ') + 'GEMINI_API_KEY environment variable is missing.');
                    console.log(chalk.gray('Set it using: $env:GEMINI_API_KEY="your_key" (PowerShell) or export GEMINI_API_KEY="your_key" (Mac/Linux)\n'));
                    process.exit(1);
                }
                
                const generator = options.gemini 
                    ? generateCommitMessageGemini(prompt) 
                    : generateCommitMessage(prompt, selectedModel);
                
                for await (const chunk of generator) {
                    process.stdout.write(chalk.cyanBright.bold(chunk));
                    message += chunk;
                }
                
                // Print a newline at the end of the stream just in case
                console.log('\n' + chalk.gray('─────────────────────────────────────────────\n'));
                
                message = message.trim();
                
                if (options.dryRun) {
                    console.log(chalk.gray('Dry run complete. No changes were committed.\n'));
                    process.exit(0);
                }
                
                const action = await promptUserAction();
                
                if (action === 'accept') {
                    if (options.hook) {
                        fs.writeFileSync(options.hook, message);
                        console.log(chalk.green.bold('\n✅ Saved AI message to git!'));
                    } else {
                        await commitChanges(message);
                        console.log(chalk.green.bold('\n✅ Successfully committed!'));
                    }
                    break;
                } else if (action === 'regenerate') {
                    // Just continue the loop to regenerate
                    continue;
                } else if (action === 'edit') {
                    const edited = await promptManualEdit(message);
                    if (edited && edited.trim() !== '') {
                        if (options.hook) {
                            fs.writeFileSync(options.hook, edited.trim());
                            console.log(chalk.green.bold('\n✅ Saved your edited message to git!'));
                        } else {
                            await commitChanges(edited.trim());
                            console.log(chalk.green.bold('\n✅ Successfully committed with your edits!'));
                        }
                    } else {
                        console.log(chalk.red('\n❌ Commit aborted: Message cannot be empty.'));
                        if (options.hook) process.exit(1);
                    }
                    break;
                } else if (action === 'cancel') {
                    console.log(chalk.gray('\nProcess cancelled. No changes committed.'));
                    if (options.hook) process.exit(1);
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
