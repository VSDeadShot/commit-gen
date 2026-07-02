/**
 * Sends the prompt to the local Ollama instance and streams the generated commit message.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @param {string} model The Ollama model to use (default: 'mistral')
 * @returns {AsyncGenerator<string, void, unknown>} Yields tokens of the commit message
 */
export async function* generateCommitMessage(prompt, model = 'mistral') {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: true, // Enable streaming
            }),
        });

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
