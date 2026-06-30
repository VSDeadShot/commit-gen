/**
 * Sends the prompt to the Gemini API and returns the generated commit message.
 * @param {string} prompt The full prompt containing the diff and instructions
 * @returns {Promise<string>} The generated commit message
 */
export async function generateCommitMessageGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set.');
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Gemini API returned no candidates.');
        }

        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        throw new Error('Failed to generate commit message via Gemini: ' + error.message);
    }
}
