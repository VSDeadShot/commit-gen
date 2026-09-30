import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { getVersion } from '../src/version.js';

test('reports the version from package.json', () => {
    const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

    assert.equal(getVersion(), packageJson.version);
});
