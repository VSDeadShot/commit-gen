import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageBlock } from '../src/ui.js';

/**
 * Builds a message block that records what it would print.
 * @returns {{block: Object, written: string[]}} The block and its captured output
 */
function recordingBlock() {
    const written = [];
    const block = createMessageBlock({ write: (text) => written.push(text) });
    return { block, written };
}

test('prints no header before the first token arrives', () => {
    const { written } = recordingBlock();

    assert.deepEqual(written, []);
});

test('prints the header once, with the first token', () => {
    const { block, written } = recordingBlock();

    block.write('feat');
    block.write('(ui): add login');

    const output = written.join('');
    assert.equal(output.split('Generated Commit Message').length - 1, 1);
    assert.ok(output.indexOf('Generated Commit Message') < output.indexOf('feat'));
    assert.ok(output.includes('feat(ui): add login'));
});

test('prints nothing when the block ends without a token', () => {
    const { block, written } = recordingBlock();

    block.end();

    assert.deepEqual(written, []);
});
