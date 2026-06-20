'use strict';
/**
 * Mindly AI Service — Google Gemini 2.5 Flash
 *
 * Public API (signatures unchanged from previous xAI implementation):
 *   generateQuestion(type, targetRole, experienceLevel, resumeText)
 *     → Promise<{ feedback: null, nextQuestion: string }>
 *
 *   sendMessage(history, userMessage)
 *     → Promise<{ feedback: { score, critique, improvementTip }, nextQuestion: string }>
 */

const { GoogleGenAI } = require('@google/genai');

// ─── Config ──────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_RETRIES    = 3;
const RETRY_BASE_MS  = 1500;  // Exponential backoff base
const REQUEST_TIMEOUT_MS = 30000;

if (!GEMINI_API_KEY) {
    console.error('❌ [AI Service] GEMINI_API_KEY is not set. All AI calls will use fallback responses.');
}

const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || 'missing' });

// ─── System Prompt Generator ───────────────────────────────────────────────────

function getSystemPrompt(type = 'Technical') {
    const isHR = type.toLowerCase() === 'hr' || type.toLowerCase() === 'behavioral';
    
    let rules = '';
    if (isHR) {
        rules = `
BEHAVIOURAL RULES (HR/Behavioral Interview):
1. Ask ONE focused, specific question per turn.
2. Focus on Behavioral and Cultural Fit:
   - Ask behavioral questions: Focus on past experiences, conflict resolution, and teamwork.
   - Evaluate using STAR methodology: Ensure the candidate clearly articulates the Situation, Task, Action, and Result.
   - Assess communication: Evaluate clarity, conciseness, and professionalism.
   - Assess leadership: Look for signs of ownership, mentorship, and cross-functional collaboration.
3. Challenge vague answers: If the candidate doesn't provide specific examples or metrics, push them for details.
4. Keep the conversation professional, empathetic, but rigorous.`;
    } else {
        rules = `
BEHAVIOURAL RULES (Technical/System Design Interview):
1. Ask ONE focused, specific question per turn.
2. Simulate a FAANG technical interviewer:
   - Ask practical questions: Focus on real-world engineering, not just trivia.
   - Ask follow-up questions: Dig deeper into the candidate's last answer.
   - Challenge weak answers: If the answer is surface-level, push for depth.
   - Test real-world experience: Ask about failure modes, scaling, and production constraints.
   - Test debugging ability: Present hypothetical bugs or performance bottlenecks.
   - Test system design thinking: Ask about trade-offs, architecture choices, and bottlenecks.
3. Increase difficulty gradually: If they answer well, push them to the edge of their knowledge.`;
    }

    return `You are Mindly, an enterprise-grade senior interviewer at a top-tier tech company. You conduct extremely rigorous, realistic professional mock interviews.

${rules}

GENERAL RULES:
1. Use the candidate's resume, target role, and experience level to personalise questions.
2. Never repeat a question. Track what has been asked.

CONVERSATION FLOW & TOPIC MEMORY:
1. Build a coherent interview narrative. Explore a single topic deeply (e.g., Virtual DOM -> Reconciliation -> Rendering Optimization) before shifting topics.
2. Track strengths and weaknesses. Revisit weak areas later or challenge strong areas with advanced edge cases.
3. Increase difficulty dynamically when answers are strong. Reduce difficulty or pivot when answers are weak.
4. Avoid asking unrelated questions too early. Ensure smooth transitions between topics.

SCORING RUBRIC (Scale 1–10):
  1–3  = Unacceptable/Poor: Lacks fundamental understanding, vague, or incorrect.
  4–5  = Below Bar: Partial understanding, relies on jargon, lacks depth/examples.
  6–7  = Good/Pass: Solid answer, shows basic practical experience, misses edge cases.
  8–9  = Strong Bar: Comprehensive, demonstrates depth, realistic examples.
  10   = Exceptional: Flawless, master-level expertise, perfect structure.

RESPONSE FORMAT:
Always respond with ONLY valid JSON. EXACT structure:
{
  "internalNotes": {
    "currentTopic": "Brief description of current topic",
    "difficultyLevel": "Current difficulty (e.g. Medium, Hard)",
    "strengths": ["List of observed strengths"],
    "weaknesses": ["List of observed weaknesses"],
    "strategy": "What you plan to test next and why"
  },
  "question": "The next interview question to ask the candidate",
  "score": null,
  "critique": null,
  "improvementTip": null
}

When evaluating an answer, populate ALL fields (score, critique, improvementTip). For the very first question, these 3 fields must be null, but internalNotes MUST still be populated. 
Keep feedback extremely CONCISE:
- critique: 2-3 sentences max summarizing strengths and gaps.
- improvementTip: 1 actionable sentence to elevate the answer.`;
}

// ─── Utility: Sleep ───────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Utility: Safe JSON Parser ────────────────────────────────────────────────

/**
 * Strips markdown fences and parses JSON safely.
 * Returns the parsed object, or throws if parsing fails.
 */
function safeParseJSON(rawText) {
    // Remove code fences that Gemini occasionally adds despite responseMimeType
    const cleaned = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    return JSON.parse(cleaned);
}

// ─── Utility: Response Validator ─────────────────────────────────────────────

/**
 * Validates the parsed AI response has the required shape.
 * Throws a descriptive error if invalid.
 */
function validateAIResponse(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('AI response is not a JSON object');
    }
    if (typeof parsed.question !== 'string' || parsed.question.trim().length < 5) {
        throw new Error(`Invalid "question" field: "${parsed.question}"`);
    }
    if (!parsed.internalNotes || typeof parsed.internalNotes !== 'object') {
        throw new Error('Invalid or missing "internalNotes" field.');
    }
    // score, critique, improvementTip can be null (first question)
    // but if score is present it must be a number
    if (parsed.score !== null && parsed.score !== undefined && typeof parsed.score !== 'number') {
        throw new Error(`Invalid "score" field: expected number or null, got ${typeof parsed.score}`);
    }
}

// ─── Utility: Map AI Response → Resolver Shape ───────────────────────────────

/**
 * Maps the flat AI JSON response to the shape expected by GraphQL resolvers.
 * Resolvers expect: { feedback: { score, critique, improvementTip } | null, nextQuestion: string }
 */
function mapToResolverShape(parsed, isFirstQuestion) {
    const nextQuestion = parsed.question.trim();

    const feedback = isFirstQuestion
        ? { internalNotes: parsed.internalNotes }
        : {
            score: typeof parsed.score === 'number'
                ? Math.max(1, Math.min(10, Math.round(parsed.score)))
                : 5,
            critique:       parsed.critique       || 'Your answer has been recorded.',
            improvementTip: parsed.improvementTip || 'Keep practicing to strengthen your responses.',
            internalNotes:  parsed.internalNotes
          };

    return { feedback, nextQuestion };
}

// ─── Utility: Fallback Response ───────────────────────────────────────────────

function buildFallback(isFirstQuestion, reason = '') {
    if (reason) {
        console.warn(`[AI Service] Returning fallback response. Reason: ${reason}`);
    }
    return {
        feedback: isFirstQuestion
            ? null
            : {
                score: 5,
                critique: 'I encountered a technical issue while evaluating your answer. Your response has been recorded.',
                improvementTip: 'Please continue — the interview is still in progress.'
              },
        nextQuestion: isFirstQuestion
            ? 'Tell me about yourself and what draws you to this particular role.'
            : 'That was an interesting answer. Can you walk me through a specific example from your past experience that relates to this topic?'
    };
}

// ─── Utility: Determine if error is retryable ────────────────────────────────

function isRetryableError(err) {
    const msg = (err?.message || '').toLowerCase();
    // Do not retry on auth/billing errors — they won't self-heal
    if (msg.includes('api_key') || msg.includes('api key')) return false;
    if (msg.includes('permission') || msg.includes('403'))   return false;
    if (msg.includes('invalid') && msg.includes('key'))      return false;
    if (msg.includes('quota') && msg.includes('exceeded'))   return false;
    // Retry on network errors, 429, 500, 503, timeouts
    return true;
}

// ─── Core: Call Gemini with Retry Logic ──────────────────────────────────────

/**
 * Calls the Gemini API with retry logic and JSON validation.
 * On all retries exhausted, returns a safe fallback response.
 */
async function callGemini(contents, isFirstQuestion, interviewType = 'Technical') {
    if (!GEMINI_API_KEY) {
        return buildFallback(isFirstQuestion, 'GEMINI_API_KEY not set');
    }

    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Wrap in a timeout promise
            const apiCall = genai.models.generateContent({
                model:    GEMINI_MODEL,
                contents: contents,
                config: {
                    systemInstruction: getSystemPrompt(interviewType),
                    responseMimeType:  'application/json',
                    temperature:       0.75,
                    maxOutputTokens:   1024,
                    thinkingConfig: {
                        thinkingBudget: 0  // Disable thinking for low latency
                    }
                }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timed out after 30s')), REQUEST_TIMEOUT_MS)
            );

            const response = await Promise.race([apiCall, timeoutPromise]);

            const rawText = response.text;
            if (!rawText || rawText.trim().length === 0) {
                throw new Error('Gemini returned an empty response');
            }

            const parsed = safeParseJSON(rawText);
            validateAIResponse(parsed);

            return mapToResolverShape(parsed, isFirstQuestion);

        } catch (err) {
            lastError = err;
            const retryable = isRetryableError(err);

            console.error(
                `[AI Service] Gemini attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}` +
                (retryable && attempt < MAX_RETRIES ? ` — retrying in ${RETRY_BASE_MS * attempt}ms` : '')
            );

            if (!retryable || attempt === MAX_RETRIES) break;
            await sleep(RETRY_BASE_MS * attempt); // Exponential backoff: 1.5s, 3s
        }
    }

    return buildFallback(isFirstQuestion, lastError?.message);
}

// ─── Public: Generate First Interview Question ────────────────────────────────

/**
 * Called when a new interview session starts.
 * Generates the opening question — no prior answer to evaluate.
 *
 * @param {string} type           - Interview type: 'HR' | 'Technical' | 'System Design'
 * @param {string} targetRole     - e.g. 'Software Engineer'
 * @param {string} experienceLevel - e.g. 'Mid-level'
 * @param {string|null} resumeText - Parsed resume content, or null
 * @returns {Promise<{ feedback: null, nextQuestion: string }>}
 */
async function generateQuestion(type, targetRole, experienceLevel, resumeText) {
    const resumeContext = resumeText
        ? `\n\nCandidate Resume (use this to personalise your questions):\n---\n${resumeText.substring(0, 3000)}\n---`
        : '';

    const userPrompt =
        `You are starting a ${type} interview for a ${targetRole} position ` +
        `(candidate experience level: ${experienceLevel}).${resumeContext}\n\n` +
        `Generate the first interview question. ` +
        `This is the opening question so there is no previous answer to evaluate — ` +
        `set score, critique, and improvementTip to null.`;

    const contents = [
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    return callGemini(contents, true, type);
}

// ─── Public: Continue Interview — Evaluate + Next Question ───────────────────

/**
 * Called on every subsequent turn after the candidate submits an answer.
 *
 * @param {Array<{role: 'assistant'|'user', content: string}>} history
 *   Full conversation history from the database.
 * @param {string} userMessage  - The candidate's latest answer.
 * @returns {Promise<{ feedback: { score, critique, improvementTip }, nextQuestion: string }>}
 */
async function sendMessage(history, userMessage, interviewType = 'Technical') {
    // Convert from DB format { role: 'assistant'|'user', content } 
    // to Gemini format { role: 'model'|'user', parts: [{ text }] }
    const geminiHistory = history.map(msg => ({
        role:  msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Gemini requires the conversation to start with a 'user' turn.
    // If history begins with the AI's opening question (role: model),
    // prepend a synthetic user turn to maintain valid turn order.
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
        geminiHistory.unshift({
            role:  'user',
            parts: [{ text: 'Please begin the interview.' }]
        });
    }

    // Append the candidate's latest answer
    const contents = [
        ...geminiHistory,
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    return callGemini(contents, false, interviewType);
}

module.exports = { generateQuestion, sendMessage };
