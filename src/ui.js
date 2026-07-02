import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Prompts the user for their next action using a styled list.
 * @returns {Promise<string>} The selected action ('accept', 'regenerate', 'edit', 'cancel')
 */
export async function promptUserAction() {
    const { action } = await inquirer.prompt([
        {
            type: 'select',
            name: 'action',
            message: chalk.white.bold('What would you like to do?'),
            choices: [
                { name: chalk.green('🚀 Accept and Commit'), value: 'accept' },
                { name: chalk.yellow('🔄 Regenerate Message'), value: 'regenerate' },
                { name: chalk.blue('✏️  Edit Manually'), value: 'edit' },
                { name: chalk.red('❌ Cancel Process'), value: 'cancel' }
            ],
            prefix: chalk.magenta('❯') // Overrides the standard '?' prefix
        }
    ]);
    return action;
}

/**
 * Prompts the user to edit the message manually inline.
 * @param {string} currentMessage The default message to pre-fill
 * @returns {Promise<string>} The edited message
 */
export async function promptManualEdit(currentMessage) {
    const { editedMessage } = await inquirer.prompt([
        {
            type: 'input',
            name: 'editedMessage',
            message: chalk.white.bold('Edit your commit message:'),
            default: currentMessage,
            prefix: chalk.magenta('❯')
        }
    ]);
    return editedMessage;
}

/**
 * Prompts the user to configure their default settings.
 * @param {Object} config The current configuration
 * @returns {Promise<{model: string, useGitmoji: boolean}>} The new config answers
 */
export async function promptConfigMenu(config) {
    return await inquirer.prompt([
        {
            type: 'input',
            name: 'model',
            message: chalk.white.bold('Enter your preferred default Ollama model:'),
            default: config.model || 'mistral',
            prefix: chalk.magenta('❯')
        },
        {
            type: 'confirm',
            name: 'useGitmoji',
            message: chalk.white.bold('Enable Gitmoji (e.g. ✨ feat)?'),
            default: config.useGitmoji !== undefined ? config.useGitmoji : false,
            prefix: chalk.magenta('❯')
        }
    ]);
}
