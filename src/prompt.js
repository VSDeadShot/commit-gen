const SYSTEM_PROMPT = `You are a git commit message generator. You follow the Conventional Commits 
specification exactly. Analyze the provided git diff and generate ONE commit 
message. Rules:
- Format: type(scope): description
- Type must be one of: feat, fix, refactor, docs, style, test, chore
- Scope is the main file or module changed (optional but preferred)
- Description is lowercase, present tense, under 72 characters, no period
- Return ONLY the commit message, nothing else, no explanation, no markdown
- Do NOT wrap the output in a code block.`;

/**
 * Cleans and truncates the diff to ensure it fits within the context window.
 * @param {string} diff The raw git diff
 * @param {number} maxLength The maximum allowed length for the diff (default 3500)
 * @returns {string} The processed diff
 */
export function truncateDiff(diff, maxLength = 3500) {
    if (!diff) return '';
    
    if (diff.length <= maxLength) {
        return diff;
    }

    return diff.substring(0, maxLength) + '\n\n... [DIFF TRUNCATED]';
}

/**
 * Builds the final prompt to be sent to the LLM.
 * @param {string} rawDiff The raw git diff from the staged files
 * @returns {string} The complete prompt
 */
export function buildPrompt(rawDiff) {
    const diff = truncateDiff(rawDiff);
    
    return `${SYSTEM_PROMPT}\n\nHere is the git diff:\n\`\`\`diff\n${diff}\n\`\`\`\n\nGenerate the commit message now:`;
}
