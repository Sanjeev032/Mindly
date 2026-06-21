'use strict';
/**
 * validation.test.cjs
 *
 * Tests for answer validation in Mindly:
 *
 *   Group 1 — Unit tests for utils/validation.js (pure, no server needed)
 *   Group 2 — Integration tests using a stub GraphQL server
 *             Stubs avoid needing a real DB while still exercising the full
 *             Apollo → resolver → validateAnswer call-path.
 *
 * Run with:
 *   node tests/validation.test.cjs
 *   npm run test:validation
 */

const http   = require('http');
const net    = require('net');

// ── Shared test state ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

function assert(condition, name, detail = '') {
    if (condition) {
        console.log(`  ${PASS} ${name}${detail ? ' — ' + detail : ''}`);
        passed++;
    } else {
        console.log(`  ${FAIL} ${name}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

function assertThrows(fn, name, expectedFragment) {
    try {
        fn();
        console.log(`  ${FAIL} ${name} — expected Error to be thrown but nothing was thrown`);
        failed++;
    } catch (err) {
        const msg = err.message || '';
        if (expectedFragment && !msg.includes(expectedFragment)) {
            console.log(
                `  ${FAIL} ${name} — threw but message missing "${expectedFragment}".\n` +
                `       Actual: "${msg}"`
            );
            failed++;
        } else {
            console.log(`  ${PASS} ${name} — threw: "${msg}"`);
            passed++;
        }
    }
}

function assertNoThrow(fn, name) {
    try {
        fn();
        console.log(`  ${PASS} ${name} — no error thrown`);
        passed++;
    } catch (err) {
        console.log(`  ${FAIL} ${name} — unexpected error: "${err.message}"`);
        failed++;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
        srv.on('error', reject);
    });
}

function gqlRequest(url, query, variables = {}, token = null) {
    const body = JSON.stringify({ query, variables });
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(
            {
                hostname: parsed.hostname, port: parsed.port,
                path: parsed.pathname, method: 'POST', headers
            },
            (res) => {
                let raw = '';
                res.on('data', c => (raw += c));
                res.on('end', () => {
                    try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                    catch { resolve({ status: res.statusCode, body: raw }); }
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Boot a minimal stub Apollo server that uses the REAL validateAnswer utility
 * but stubs the database layer so no DB connection is needed.
 * The stub always returns success for valid answers, and lets validateAnswer
 * throw naturally for invalid ones.
 */
async function bootStubServer() {
    const port = await getFreePort();

    const { ApolloServer } = require('apollo-server-express');
    const { gql }          = require('apollo-server-express');
    const express          = require('express');
    const cors             = require('cors');
    const { validateAnswer } = require('../utils/validation');

    const stubTypeDefs = gql`
        type StubSession { id: ID! }
        type Query { ping: String }
        type Mutation {
            sendMessage(sessionId: ID!, message: String!): StubSession
        }
    `;

    const stubResolvers = {
        Query: { ping: () => 'pong' },
        Mutation: {
            sendMessage: (_, { message }) => {
                // This is the exact same call-pattern as the real resolver
                const _answer = validateAnswer(message, 'message');
                // If we reach here, validation passed → return stub
                return { id: 'stub-session-id' };
            }
        }
    };

    const server = new ApolloServer({
        typeDefs:      stubTypeDefs,
        resolvers:     stubResolvers,
        introspection: true,
        cache:         'bounded'
    });

    const app = express();
    app.use(cors());
    app.use(express.json());

    await server.start();
    server.applyMiddleware({ app });

    const srv = http.createServer(app);
    await new Promise(res => srv.listen(port, '127.0.0.1', res));

    return { port, close: () => new Promise(res => srv.close(res)) };
}

// ── Group 1: Pure unit tests ──────────────────────────────────────────────────

function runUnitTests() {
    console.log('\n  [Group 1] Unit tests — utils/validation.js\n');

    const { validateAnswer, MIN_ANSWER_LENGTH } = require('../utils/validation');

    // --- Rejects ---
    assertThrows(
        () => validateAnswer(null),
        'Rejects null',
        'must be a non-null string (received null)'
    );
    assertThrows(
        () => validateAnswer(undefined),
        'Rejects undefined',
        'must be a non-null string (received undefined)'
    );
    assertThrows(
        () => validateAnswer(42),
        'Rejects number (wrong type)',
        'must be a non-null string (received number)'
    );
    assertThrows(
        () => validateAnswer(''),
        'Rejects empty string',
        'must not be empty'
    );
    assertThrows(
        () => validateAnswer('   '),
        'Rejects whitespace-only (spaces)',
        'must not be whitespace-only'
    );
    assertThrows(
        () => validateAnswer('\t\n\r'),
        'Rejects whitespace-only (tabs/newlines)',
        'must not be whitespace-only'
    );
    assertThrows(
        () => validateAnswer('short'),
        'Rejects answer below MIN_ANSWER_LENGTH',
        `minimum is ${MIN_ANSWER_LENGTH}`
    );
    assertThrows(
        () => validateAnswer('   tiny   '),
        'Rejects answer that is short after trimming (4 chars)',
        `minimum is ${MIN_ANSWER_LENGTH}`
    );

    // --- Accepts ---
    assertNoThrow(
        () => validateAnswer('A'.repeat(MIN_ANSWER_LENGTH)),
        `Accepts exactly ${MIN_ANSWER_LENGTH} characters`
    );
    assertNoThrow(
        () => validateAnswer('  ' + 'A'.repeat(MIN_ANSWER_LENGTH) + '  '),
        `Accepts ${MIN_ANSWER_LENGTH} chars surrounded by whitespace`
    );
    assertNoThrow(
        () => validateAnswer('This is a properly formed interview answer.'),
        'Accepts a normal answer string'
    );

    // --- Return value ---
    const result = validateAnswer('  trimmed answer here  ');
    assert(result === 'trimmed answer here', 'Returns trimmed string', `got "${result}"`);

    // --- Custom field name in error ---
    assertThrows(
        () => validateAnswer('', 'userResponse'),
        'Uses custom field name in error message',
        '"userResponse"'
    );

    // --- Error messages mention character counts ---
    try {
        validateAnswer('abc');
    } catch (err) {
        assert(
            err.message.includes('3 characters after trimming'),
            'Error message includes actual character count',
            err.message.substring(0, 90)
        );
    }
}

// ── Group 2: Integration tests via stub GraphQL server ───────────────────────

async function runIntegrationTests(graphqlUrl) {
    console.log('\n  [Group 2] Integration tests — stub GraphQL server\n');

    const SEND = `
        mutation SendMessage($sessionId: ID!, $message: String!) {
            sendMessage(sessionId: $sessionId, message: $message) {
                id
            }
        }
    `;
    const SESSION_ID = 'test-session-id';

    // 2a — Empty string
    const emptyRes = await gqlRequest(graphqlUrl, SEND, { sessionId: SESSION_ID, message: '' });
    const emptyErr = emptyRes.body?.errors?.[0]?.message || '';
    assert(
        emptyErr.includes('must not be empty'),
        'Empty string: returns "must not be empty" error',
        emptyErr.substring(0, 80)
    );
    assert(
        !emptyRes.body?.data?.sendMessage,
        'Empty string: no session data returned'
    );

    // 2b — Whitespace-only (spaces)
    const wsRes = await gqlRequest(graphqlUrl, SEND, { sessionId: SESSION_ID, message: '     ' });
    const wsErr = wsRes.body?.errors?.[0]?.message || '';
    assert(
        wsErr.includes('must not be whitespace-only'),
        'Whitespace-only (spaces): returns correct error',
        wsErr.substring(0, 80)
    );

    // 2c — Whitespace-only (tabs)
    const tabRes = await gqlRequest(graphqlUrl, SEND, { sessionId: SESSION_ID, message: '\t\t\t' });
    const tabErr = tabRes.body?.errors?.[0]?.message || '';
    assert(
        tabErr.includes('must not be whitespace-only'),
        'Whitespace-only (tabs): returns correct error',
        tabErr.substring(0, 80)
    );

    // 2d — Too short (under 10 chars)
    const shortRes = await gqlRequest(graphqlUrl, SEND, { sessionId: SESSION_ID, message: 'short' });
    const shortErr = shortRes.body?.errors?.[0]?.message || '';
    assert(
        shortErr.includes('too short'),
        'Short answer (5 chars): returns "too short" error',
        shortErr.substring(0, 80)
    );
    assert(
        shortErr.includes('minimum is 10'),
        'Short answer: error states minimum is 10',
        shortErr.substring(0, 80)
    );
    assert(
        shortErr.includes('5 characters after trimming'),
        'Short answer: error includes actual character count',
        shortErr.substring(0, 80)
    );

    // 2e — 9 chars (just under limit)
    const nineRes = await gqlRequest(graphqlUrl, SEND, { sessionId: SESSION_ID, message: '123456789' });
    const nineErr = nineRes.body?.errors?.[0]?.message || '';
    assert(
        nineErr.includes('too short') && nineErr.includes('9 characters'),
        'Answer of 9 chars: correctly rejected with count',
        nineErr.substring(0, 80)
    );

    // 2f — Null (schema enforces String! so Apollo rejects before resolver runs)
    const nullRes = await gqlRequest(graphqlUrl, `
        mutation { sendMessage(sessionId: "x", message: null) { id } }
    `);
    assert(
        nullRes.body?.errors?.length > 0,
        'Null literal: rejected at GraphQL schema level',
        nullRes.body?.errors?.[0]?.message?.substring(0, 60)
    );

    // 2g — Exactly 10 chars: should PASS validation and reach stub response
    const borderRes = await gqlRequest(graphqlUrl, SEND, { sessionId: SESSION_ID, message: 'A'.repeat(10) });
    const borderErr = borderRes.body?.errors?.[0]?.message || '';
    const isValErr = borderErr.includes('Validation error');
    assert(
        !isValErr && borderRes.body?.data?.sendMessage?.id === 'stub-session-id',
        'Exactly 10 chars: passes validation, returns stub session',
        isValErr ? borderErr : 'id=stub-session-id ✓'
    );

    // 2h — Valid answer: happy path
    const validRes = await gqlRequest(graphqlUrl, SEND, {
        sessionId: SESSION_ID,
        message: 'I would implement a binary search tree for efficient O(log n) lookups.'
    });
    const validData = validRes.body?.data?.sendMessage?.id;
    assert(
        validData === 'stub-session-id',
        'Valid answer: resolves to stub session id',
        validData || validRes.body?.errors?.[0]?.message
    );

    // 2i — Trimmed value is what reaches the resolver (test via 10-char padded)
    const paddedRes = await gqlRequest(graphqlUrl, SEND, {
        sessionId: SESSION_ID,
        message: '   ' + 'A'.repeat(10) + '   '
    });
    assert(
        !paddedRes.body?.errors && paddedRes.body?.data?.sendMessage?.id === 'stub-session-id',
        'Padded valid answer: whitespace stripped, passes validation',
        paddedRes.body?.errors?.[0]?.message || 'id=stub-session-id ✓'
    );
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Answer Validation Tests — Mindly Server');
    console.log('═══════════════════════════════════════════════════════════');

    // Group 1 — Pure unit tests
    runUnitTests();

    // Group 2 — Integration via stub server
    console.log(`\n${INFO} Booting stub GraphQL server for integration tests…`);
    const srv = await bootStubServer();
    const graphqlUrl = `http://127.0.0.1:${srv.port}/graphql`;
    console.log(`  Server on port ${srv.port}\n`);

    try {
        await runIntegrationTests(graphqlUrl);
    } finally {
        await srv.close();
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error('\n[FATAL] Test runner crashed:', err);
    process.exit(1);
});
