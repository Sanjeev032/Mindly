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

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Mindly, an elite AI interviewer conducting a realistic professional mock interview.

BEHAVIOURAL RULES:
1. Ask ONE focused, specific question per turn — never ask multiple questions in a single response.
2. When evaluating answers: be honest, constructive, and precise. Acknowledge strengths before pointing out gaps.
3. Adapt difficulty dynamically: start moderate, increase complexity if answers are strong, ask a clarifying follow-up if answers are weak or vague.
4. Generate counter-questions when an answer is incomplete, contradictory, or too superficial.
5. Use the candidate's resume, target role, and experience level to personalise every question.
6. Never repeat a question already asked in this session. Track what has been asked.
7. Vary question types: conceptual, situational, behavioral (STAR format), and technical where appropriate.
8. Keep questions professional — modelled after real interviews at top-tier technology companies.

SCORING RUBRIC:
  0–49   = Poor: major gaps, incorrect, or off-topic
  50–69  = Needs improvement: partial understanding, vague, or missing key points
  70–84  = Good: solid answer with minor gaps
  85–100 = Excellent: comprehensive, accurate, well-structured with examples

RESPONSE FORMAT:
Always respond with ONLY valid JSON — no markdown fences, no preamble, no trailing text.
Use this EXACT structure every time:
{
  "question": "The next interview question to ask the candidate",
  "score": null,
  "critique": null,
  "improvementTip": null
}

When responding to a candidate's answer (not the first question), populate ALL four fields:
{
  "question": "The next interview question",
  "score": 78,
  "critique": "Your answer demonstrated a good understanding of X. However, you missed Y and did not mention Z, which is critical in production systems.",
  "improvementTip": "Next time, structure your answer using the STAR method and always quantify the impact of your decisions."
}`;

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
        ? null
        : {
            score: typeof parsed.score === 'number'
                ? Math.max(0, Math.min(100, Math.round(parsed.score)))
                : 50,
            critique:       parsed.critique       || 'Your answer has been recorded.',
            improvementTip: parsed.improvementTip || 'Keep practicing to strengthen your responses.'
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
                score: 50,
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
async function callGemini(contents, isFirstQuestion) {
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
                    systemInstruction: SYSTEM_PROMPT,
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

    return callGemini(contents, true);
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
async function sendMessage(history, userMessage) {
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

    return callGemini(contents, false);
}

module.exports = { generateQuestion, sendMessage };
