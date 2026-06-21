'use strict';
/**
 * validation.js
 *
 * Pure validation helpers for Mindly GraphQL resolvers.
 * All functions throw a descriptive Error on failure so resolvers can
 * simply call them at the top of each mutation and let Apollo propagate
 * the error to the client as a standard GraphQL error.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** Minimum character count for a valid interview answer (after trimming). */
const MIN_ANSWER_LENGTH = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns true when a value is null, undefined, or not a string.
 * @param {*} value
 * @returns {boolean}
 */
function isMissingOrNonString(value) {
    return value === null || value === undefined || typeof value !== 'string';
}

// ── Public validators ─────────────────────────────────────────────────────────

/**
 * Validates a candidate interview answer.
 *
 * Rules (in order of precedence):
 *   1. Must not be null or undefined.
 *   2. Must be a string.
 *   3. Must not be empty ("").
 *   4. Must not be whitespace-only ("   ", "\t\n", …).
 *   5. Trimmed length must be >= MIN_ANSWER_LENGTH (10).
 *
 * @param {*}      value      - The raw value received from the GraphQL argument.
 * @param {string} [field='message'] - Name used in error messages.
 * @throws {Error} Descriptive validation error.
 * @returns {string} The trimmed, valid answer string.
 */
function validateAnswer(value, field = 'message') {
    // Rule 1 & 2 — null / undefined / wrong type
    if (isMissingOrNonString(value)) {
        throw new Error(
            `Validation error: "${field}" must be a non-null string ` +
            `(received ${value === null ? 'null' : typeof value}).`
        );
    }

    // Rule 3 — empty string
    if (value.length === 0) {
        throw new Error(
            `Validation error: "${field}" must not be empty. ` +
            `Please provide your interview answer.`
        );
    }

    // Rule 4 — whitespace only
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new Error(
            `Validation error: "${field}" must not be whitespace-only. ` +
            `Please provide a meaningful answer.`
        );
    }

    // Rule 5 — minimum length
    if (trimmed.length < MIN_ANSWER_LENGTH) {
        throw new Error(
            `Validation error: "${field}" is too short ` +
            `(${trimmed.length} character${trimmed.length === 1 ? '' : 's'} after trimming, ` +
            `minimum is ${MIN_ANSWER_LENGTH}). Please elaborate on your answer.`
        );
    }

    return trimmed;
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
    validateAnswer,
    MIN_ANSWER_LENGTH,
};
