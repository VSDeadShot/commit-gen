import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.commitgen');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
    model: 'mistral',
    useGitmoji: false
};

/**
 * Reads the configuration file or returns defaults if it doesn't exist.
 */
export async function getConfig() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is invalid, return defaults
        return DEFAULT_CONFIG;
    }
}

/**
 * Updates the configuration file with new values.
 */
export async function setConfig(newConfig) {
    try {
        await fs.mkdir(CONFIG_DIR, { recursive: true });
        
        const currentConfig = await getConfig();
        const mergedConfig = { ...currentConfig, ...newConfig };
        
        await fs.writeFile(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2));
    } catch (error) {
        throw new Error('Failed to save configuration: ' + error.message);
    }
}
