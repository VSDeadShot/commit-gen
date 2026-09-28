import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessageGemini } from '../src/gemini.js';

/**
 * Builds a single SSE event carrying one chunk of generated text.
 * @param {string} text The token text to wrap
 * @returns {string} The 'data: ' line for the event
 */
function sseEvent(text) {
    return 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] });
}

/**
 * Replaces global fetch with one that streams the given body as bytes.
 * @param {string} body The full response body to stream
 * @returns {Function} The original fetch, for restoring afterwards
 */
function stubFetch(body) {
    const original = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        body: (async function* () { yield new TextEncoder().encode(body); })(),
    });
    return original;
}

/**
 * Collects every chunk yielded by the Gemini generator.
 * @param {string} body The mock response body to stream
 * @returns {Promise<string>} The joined commit message
 */
async function collect(body) {
    const originalFetch = stubFetch(body);
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-key';
    try {
        let message = '';
        for await (const chunk of generateCommitMessageGemini('prompt')) {
            message += chunk;
        }
        return message;
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
    }
}

const tokens = ['feat', '(ui): ', 'add login'];

test('yields the final token when the stream ends without a trailing newline', async () => {
    const body = tokens.map(sseEvent).join('\n\n');

    assert.equal(await collect(body), 'feat(ui): add login');
});

test('yields every token when the stream ends with a trailing newline', async () => {
    const body = tokens.map(sseEvent).join('\n\n') + '\n\n';

    assert.equal(await collect(body), 'feat(ui): add login');
});
