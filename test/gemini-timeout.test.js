import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessageGemini } from '../src/gemini.js';

const MESSAGE = 'data: {"candidates":[{"content":{"parts":[{"text":"feat: add login"}]}}]}\n\n';

/**
 * Runs the generator against a fetch that never answers until it is aborted.
 * @param {number} timeoutMs The timeout to apply to the initial response
 * @returns {Promise<string>} The generated message, if one ever arrives
 */
async function runAgainstStalledApi(timeoutMs) {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;

    globalThis.fetch = (url, init = {}) => new Promise((resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal.reason));
    });
    process.env.GEMINI_API_KEY = 'test-key';

    try {
        let message = '';
        for await (const chunk of generateCommitMessageGemini('prompt', { timeoutMs })) {
            message += chunk;
        }
        return message;
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
    }
}

/**
 * Runs the generator against an API that answers, then streams slowly.
 * @param {number} timeoutMs The timeout to apply to the initial response
 * @returns {Promise<string>} The generated message
 */
async function runAgainstSlowStream(timeoutMs) {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;

    globalThis.fetch = async () => ({
        ok: true,
        body: (async function* () {
            // Longer than the timeout: only the first response should be timed
            await new Promise((resolve) => setTimeout(resolve, timeoutMs * 4));
            yield new TextEncoder().encode(MESSAGE);
        })(),
    });
    process.env.GEMINI_API_KEY = 'test-key';

    try {
        let message = '';
        for await (const chunk of generateCommitMessageGemini('prompt', { timeoutMs })) {
            message += chunk;
        }
        return message;
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
    }
}

test('fails with a timeout message when the API never responds', async () => {
    await assert.rejects(runAgainstStalledApi(30), /timed out/i);
});

test('does not time out a slow stream once the response has arrived', async () => {
    assert.equal(await runAgainstSlowStream(30), 'feat: add login');
});
