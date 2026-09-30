/**
 * Yields the generated text carried by a single server-sent event line.
 * @param {string} line One line of the Gemini SSE response
 * @returns {Generator<string, void, unknown>} Yields the token, or nothing if the line carries none
 */
function* parseSseLine(line) {
    if (!line.startsWith('data: ')) return;

    const dataStr = line.replace('data: ', '').trim();
    if (!dataStr || dataStr === '[DONE]') return;

    const data = JSON.parse(dataStr);
    if (data.candidates && data.candidates.length > 0) {
        const parts = data.candidates[0].content.parts;
        if (parts && parts.length > 0 && parts[0].text) {
            yield parts[0].text;
        }
    }
}

/**
 * Requests the streaming completion once, giving up if no response arrives in time.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @param {string} apiKey The Gemini API key
 * @param {number} timeoutMs How long to wait for the response headers
 * @returns {Promise<Response>} The API response, successful or not
 */
async function requestCompletion(prompt, apiKey, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

    try {
        return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
            signal: controller.signal,
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(`Gemini timed out after ${Math.round(timeoutMs / 1000)}s without responding.`);
        }
        throw error;
    } finally {
        // Stops the clock once the headers are in: streaming time is not counted
        clearTimeout(timer);
    }
}

/**
 * Sends the prompt to the Gemini API and streams the generated commit message.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @param {{retryDelayMs?: number, timeoutMs?: number, onNotice?: Function}} options Retry delay, response timeout and a notice callback
 * @returns {AsyncGenerator<string, void, unknown>} Yields tokens of the commit message
 */
export async function* generateCommitMessageGemini(prompt, { retryDelayMs = 2000, timeoutMs = 30000, onNotice } = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set.');
    }

    try {
        let response = await requestCompletion(prompt, apiKey, timeoutMs);

        // 503 means Gemini is momentarily overloaded, so one retry is usually enough
        if (response.status === 503) {
            if (onNotice) onNotice('Gemini busy, retrying…');
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            response = await requestCompletion(prompt, apiKey, timeoutMs);
        }

        // 429 is the per-minute rate limit or the free-tier quota: the body is long
        // and says nothing actionable
        if (response.status === 429) {
            throw new Error('Gemini rate limit or free-tier quota reached — wait a minute and retry, or run commitgen without --gemini to use Ollama.');
        }

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API returned status ${response.status}: ${errBody}`);
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        for await (const chunk of response.body) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep the incomplete line in the buffer

            for (const line of lines) {
                yield* parseSseLine(line);
            }
        }

        // The last event has no trailing newline when the stream ends abruptly
        yield* parseSseLine(buffer);
    } catch (error) {
        throw new Error('Failed to generate commit message via Gemini: ' + error.message);
    }
}
