import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessage } from '../src/ollama.js';

const MESSAGE = '{"response":"feat: add login"}\n';

/**
 * Collects the generator's output against a stubbed fetch.
 * @param {Function} fetchStub The fetch implementation to install
 * @param {number} timeoutMs The timeout to apply to the initial response
 * @returns {Promise<string>} The generated message
 */
async function runWith(fetchStub, timeoutMs) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchStub;

    try {
        let message = '';
        for await (const chunk of generateCommitMessage('prompt', 'mistral', { timeoutMs })) {
            message += chunk;
        }
        return message;
    } finally {
        globalThis.fetch = originalFetch;
    }
}

test('fails with a timeout message when Ollama never responds', async () => {
    const stalled = (url, init = {}) => new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal.reason));
    });

    await assert.rejects(runWith(stalled, 30), /timed out/i);
});

test('does not time out a slow stream once the response has arrived', async () => {
    const slowStream = async () => ({
        ok: true,
        body: (async function* () {
            // Longer than the timeout: only the first response should be timed
            await new Promise((resolve) => setTimeout(resolve, 120));
            yield new TextEncoder().encode(MESSAGE);
        })(),
    });

    assert.equal(await runWith(slowStream, 30), 'feat: add login');
});
