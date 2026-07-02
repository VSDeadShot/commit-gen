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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`, {
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
                if (line.startsWith('data: ')) {
                    const dataStr = line.replace('data: ', '').trim();
                    if (dataStr && dataStr !== '[DONE]') {
                        const data = JSON.parse(dataStr);
                        if (data.candidates && data.candidates.length > 0) {
                            const parts = data.candidates[0].content.parts;
                            if (parts && parts.length > 0 && parts[0].text) {
                                yield parts[0].text;
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        throw new Error('Failed to generate commit message via Gemini: ' + error.message);
    }
}
