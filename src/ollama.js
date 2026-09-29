/**
 * Requests the streaming completion once, giving up if no response arrives in time.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @param {string} model The Ollama model to use
 * @param {number} timeoutMs How long to wait for the response headers
 * @returns {Promise<Response>} The API response, successful or not
 */
async function requestCompletion(prompt, model, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

    try {
        return await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: true, // Enable streaming
            }),
            signal: controller.signal,
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new Error(`Ollama timed out after ${Math.round(timeoutMs / 1000)}s without responding. A cold model can be slow to load.`);
        }
        throw error;
    } finally {
        // Stops the clock once the headers are in: streaming time is not counted
        clearTimeout(timer);
    }
}

/**
 * Sends the prompt to the local Ollama instance and streams the generated commit message.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @param {string} model The Ollama model to use (default: 'mistral')
 * @param {{timeoutMs?: number}} options How long to wait for the first response
 * @returns {AsyncGenerator<string, void, unknown>} Yields tokens of the commit message
 */
export async function* generateCommitMessage(prompt, model = 'mistral', { timeoutMs = 120000 } = {}) {
    try {
        const response = await requestCompletion(prompt, model, timeoutMs);

        if (!response.ok) {
            throw new Error(`Ollama API returned status ${response.status}: ${response.statusText}`);
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        for await (const chunk of response.body) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep the incomplete line in the buffer
            
            for (const line of lines) {
                if (line.trim()) {
                    const data = JSON.parse(line);
                    if (data.response) {
                        yield data.response;
                    }
                }
            }
        }
        
        if (buffer.trim()) {
            const data = JSON.parse(buffer);
            if (data.response) {
                yield data.response;
            }
        }
    } catch (error) {
        // Handle connection refused specifically to give a friendly error
        if (error.code === 'ECONNREFUSED' || (error.cause && error.cause.code === 'ECONNREFUSED')) {
            throw new Error('Could not connect to Ollama. Please make sure Ollama is running locally on port 11434.');
        }
        throw new Error('Failed to generate commit message: ' + error.message);
    }
}
