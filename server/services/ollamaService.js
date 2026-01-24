const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class OllamaService {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:11434';
        this.defaultModel = 'llama3';
    }

    async isRunning() {
        try {
            const res = await fetch(`${this.baseUrl}/`);
            return res.ok;
        } catch (error) {
            console.error('Ollama connection failed:', error.message);
            return false;
        }
    }

    async generate(prompt, model = this.defaultModel) {
        try {
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: false
                })
            });

            if (!response.ok) throw new Error(`Ollama API Error: ${response.statusText}`);
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('AI Generation Failed:', error);
            throw error;
        }
    }

    async chat(messages, model = this.defaultModel) {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    stream: false
                })
            });

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            console.error('AI Chat Failed:', error);
            throw error;
        }
    }

    // New: Feedback Analysis
    async analyzeResponse(question, answer, model = this.defaultModel) {
        const prompt = `
        Act as a strict Interview Coach. Analyze the candidate's answer to the question.
        
        Question: "${question}"
        Answer: "${answer}"
        
        Provide your feedback in the following format exactly (no intro text):
        Score: [1-10]
        Critique: [1 sentence on what was wrong]
        Improvement: [1 sentence on how to fix it]
        `;

        const response = await this.generate(prompt, model);
        return this.parseFeedback(response);
    }

    parseFeedback(text) {
        try {
            // Regex to extract structured fields if AI output is messy
            const scoreMatch = text.match(/Score:\s*(\d+)/i);
            const critiqueMatch = text.match(/Critique:\s*(.+?)(?=\n|Improvement:|$)/is);
            const improvementMatch = text.match(/Improvement:\s*(.+?)(?=$)/is);

            return {
                score: scoreMatch ? parseInt(scoreMatch[1]) : 5,
                critique: critiqueMatch ? critiqueMatch[1].trim() : "Could not parse critique.",
                improvement: improvementMatch ? improvementMatch[1].trim() : "Try to be more specific."
            };
        } catch (e) {
            return { score: 5, critique: "Analysis failed", improvement: "N/A" };
        }
    }
}

module.exports = new OllamaService();
