/**
 * Sends the prompt to the local Ollama instance and returns the generated commit message.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @param {string} model The Ollama model to use (default: 'mistral')
 * @returns {Promise<string>} The generated commit message
 */
export async function generateCommitMessage(prompt, model = 'mistral') {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false, // We want the full response at once
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API returned status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response.trim();
    } catch (error) {
        // Handle connection refused specifically to give a friendly error
        if (error.code === 'ECONNREFUSED' || (error.cause && error.cause.code === 'ECONNREFUSED')) {
            throw new Error('Could not connect to Ollama. Please make sure Ollama is running locally on port 11434.');
        }
        throw new Error('Failed to generate commit message: ' + error.message);
    }
}
