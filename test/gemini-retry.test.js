import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessageGemini } from '../src/gemini.js';

const MESSAGE = 'data: {"candidates":[{"content":{"parts":[{"text":"feat: add login"}]}}]}\n\n';

/**
 * Builds a response that fails with the given status.
 * @param {number} status The HTTP status to report
 * @returns {Object} A fetch-like response
 */
function errorResponse(status) {
    // Shaped like the real body, which spans many lines
    const body = JSON.stringify({
        error: {
            code: status,
            message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',
            status: 'UNAVAILABLE'
        }
    }, null, 2);
    return { ok: false, status, text: async () => body };
}

/**
 * Builds a streaming response carrying one commit message.
 * @returns {Object} A fetch-like response
 */
function okResponse() {
    return {
        ok: true,
        body: (async function* () { yield new TextEncoder().encode(MESSAGE); })(),
    };
}

/**
 * Runs the generator against a queue of canned responses.
 * @param {Object[]} responses One response per expected fetch call
 * @param {Object} options Options forwarded to the generator
 * @returns {Promise<{message: string, calls: number, notices: string[]}>} The run's result
 */
async function run(responses, options = {}, stats = {}) {
    const queue = [...responses];
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;
    const notices = stats.notices = [];
    stats.calls = 0;

    globalThis.fetch = async () => {
        stats.calls++;
        return queue.shift();
    };
    process.env.GEMINI_API_KEY = 'test-key';

    try {
        let message = '';
        const generator = generateCommitMessageGemini('prompt', {
            retryDelayMs: 1,
            onNotice: (text) => notices.push(text),
            ...options,
        });
        for await (const chunk of generator) {
            message += chunk;
        }
        return { message, calls: stats.calls, notices };
    } finally {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
    }
}

test('retries once after a 503 and yields the message', async () => {
    const result = await run([errorResponse(503), okResponse()]);

    assert.equal(result.message, 'feat: add login');
    assert.equal(result.calls, 2);
    assert.equal(result.notices.length, 1);
});

test('fails after a second 503, having tried exactly twice', async () => {
    const stats = {};

    await assert.rejects(run([errorResponse(503), errorResponse(503)], {}, stats), /overloaded/i);

    assert.equal(stats.calls, 2);
});

test('reports a final 503 in one readable line, without the body', async () => {
    let thrown;
    try {
        await run([errorResponse(503), errorResponse(503)]);
    } catch (error) {
        thrown = error;
    }

    assert.ok(thrown, 'expected a second 503 to throw');
    assert.match(thrown.message, /overloaded/i);
    assert.match(thrown.message, /ollama/i);
    assert.doesNotMatch(thrown.message, /UNAVAILABLE|"error"/);
    assert.equal(thrown.message.includes('\n'), false);
});

test('does not retry a status other than 503', async () => {
    const stats = {};

    await assert.rejects(run([errorResponse(400), okResponse()], {}, stats), /400/);

    assert.equal(stats.calls, 1);
});
