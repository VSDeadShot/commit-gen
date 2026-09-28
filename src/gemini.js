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
 * Sends the prompt to the Gemini API and streams the generated commit message.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @returns {AsyncGenerator<string, void, unknown>} Yields tokens of the commit message
 */
export async function* generateCommitMessageGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set.');
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
        });

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
