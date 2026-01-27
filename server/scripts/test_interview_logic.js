const ollamaService = require('../services/ollamaService');

// MOCK Ollama Service to verify controller logic without running server
ollamaService.generate = async (prompt, model, options) => {
    console.log("--- MOCKED OLLAMA CALL ---");
    console.log("Prompt Length:", prompt.length);
    console.log("Model:", model);
    console.log("Options:", options);
    console.log("--------------------------");

    // Return a valid JSON string as if it came from Ollama
    return JSON.stringify({
        answer_quality: "STRONG",
        counter_question: "That's a solid answer. Can you explain how the virtual DOM diffing algorithm works in React efficiently?"
    });
};

const aiController = require('../controllers/aiController');

// Mock req and res
const req = {
    body: {
        role: "Frontend Developer",
        topic: "React Hooks",
        previousQuestion: "What is useEffect?",
        answer: "useEffect is a hook that handles side effects in function components.",
        difficulty: "Easy"
    }
};

const res = {
    status: (code) => {
        console.log(`Status: ${code}`);
        return {
            json: (data) => console.log("Response:", JSON.stringify(data, null, 2))
        };
    }
};

console.log("Testing conductInterview with MOCK service...");
aiController.conductInterview(req, res);
