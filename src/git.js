import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

/**
 * Checks if the current working directory is inside a git repository.
 * @returns {Promise<boolean>}
 */
export async function isGitRepo() {
    try {
        await execFilePromise('git', ['rev-parse', '--is-inside-work-tree']);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the currently staged git diff.
 * @returns {Promise<string>} The diff output
 */
export async function getStagedDiff() {
    try {
        const { stdout } = await execFilePromise('git', ['diff', '--staged']);
        return stdout.trim();
    } catch (error) {
        throw new Error('Failed to get staged diff: ' + error.message);
    }
}

/**
 * Commits the staged changes with the provided message.
 * @param {string} message The commit message
 * @returns {Promise<string>} stdout from git commit
 */
export async function commitChanges(message) {
    try {
        const { stdout } = await execFilePromise('git', ['commit', '-m', message]);
        return stdout.trim();
    } catch (error) {
        throw new Error('Failed to commit changes: ' + error.message);
    }
}
