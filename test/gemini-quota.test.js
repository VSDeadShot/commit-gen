import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCommitMessageGemini } from '../src/gemini.js';

// Shaped like the real free-tier quota response, which spans dozens of lines
const QUOTA_BODY = JSON.stringify({
    error: {
        code: 429,
        message: 'You exceeded your current quota, please check your plan and billing details.',
        status: 'RESOURCE_EXHAUSTED',
        details: [
            {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [
                    { quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }
                ]
            },
            { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '27s' }
        ]
    }
}, null, 2);

/**
 * Runs the generator against a stubbed response with the given status.
 * @param {number} status The HTTP status to report
 * @param {Object} stats Receives the number of fetch calls made
 * @returns {Promise<string>} The generated message, if one ever arrives
 */
async function runAgainstStatus(status, stats = {}) {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;
    stats.calls = 0;

    globalThis.fetch = async () => {
        stats.calls++;
        return { ok: false, status, text: async () => QUOTA_BODY };
    };
    process.env.GEMINI_API_KEY = 'test-key';

    try {
        let message = '';
        for await (const chunk of generateCommitMessageGemini('prompt', { retryDelayMs: 1 })) {
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
 * Captures the error thrown for a given status.
 * @param {number} status The HTTP status to report
 * @param {Object} stats Receives the number of fetch calls made
 * @returns {Promise<Error>} The thrown error
 */
async function errorFor(status, stats = {}) {
    try {
        await runAgainstStatus(status, stats);
    } catch (error) {
        return error;
    }
    throw new Error(`expected status ${status} to throw`);
}

test('fails with a readable rate-limit or quota message on 429', async () => {
    const error = await errorFor(429);

    assert.match(error.message, /rate limit/i);
    assert.match(error.message, /quota/i);
    assert.match(error.message, /ollama/i);
    // A 429 can be the per-minute limit, so it must not promise a wait until tomorrow
    assert.doesNotMatch(error.message, /tomorrow/i);
});

test('does not dump the raw JSON body on 429', async () => {
    const error = await errorFor(429);

    assert.doesNotMatch(error.message, /RESOURCE_EXHAUSTED|quotaMetric|@type/);
    assert.equal(error.message.includes('\n'), false);
});

test('does not retry a 429', async () => {
    const stats = {};

    await errorFor(429, stats);

    assert.equal(stats.calls, 1);
});
