import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Returns the CLI's version string, read from package.json so it cannot drift.
 * @returns {string} The version reported by `commitgen --version`
 */
export function getVersion() {
    return require('../package.json').version;
}
