import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { isGitRepo } from './git.js';

export async function installHook() {
    const isRepo = await isGitRepo();
    if (!isRepo) {
        throw new Error('You are not inside a git repository.');
    }

    const hookDir = path.join(process.cwd(), '.git', 'hooks');
    const hookPath = path.join(hookDir, 'prepare-commit-msg');

    if (!fs.existsSync(hookDir)) {
        fs.mkdirSync(hookDir, { recursive: true });
    }

    const hookScript = `#!/bin/sh
# Only run if no message was provided via -m or other means
if [ -z "$2" ] || [ "$2" = "template" ]; then
    # Run commitgen in hook mode, passing the file path.
    # We redirect stdin from /dev/tty so interactive prompts work.
    commitgen --hook "$1" < /dev/tty
fi
`;

    fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
    console.log(chalk.green.bold('\n✅ Successfully installed prepare-commit-msg hook!'));
    console.log(chalk.gray('Now, simply typing `git commit` will trigger the AI to write your message automatically.\n'));
}
