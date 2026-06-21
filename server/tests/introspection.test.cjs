/**
 * introspection.test.cjs
 *
 * Automated tests verifying GraphQL introspection behaviour:
 *   ✓ Enabled  when NODE_ENV=development
 *   ✓ Disabled when NODE_ENV=production
 *
 * Strategy: Requires the real server files but boots a throw-away
 * Express/Apollo instance on a random free port — no live DB writes needed
 * because introspection is handled entirely by Apollo before resolvers run.
 *
 * Run with:
 *   node server/tests/introspection.test.cjs
 */

'use strict';

const http       = require('http');
const path       = require('path');
const net        = require('net');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find a free TCP port */
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

/** Fire an introspection query at the given URL */
async function sendIntrospection(url) {
    const body = JSON.stringify({
        query: `{ __schema { queryType { name } } }`
    });

    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = http.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => (raw += chunk));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(raw) });
                } catch {
                    resolve({ status: res.statusCode, body: raw });
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/** 
 * Boot a fresh Apollo/Express server on a random port.
 * Returns { httpServer, port, close() }.
 * We isolate each boot in a fresh module-require to avoid caching.
 */
async function bootServer(nodeEnv) {
    const port = await getFreePort();

    // Clear the require cache so we get a fresh ApolloServer instance
    Object.keys(require.cache).forEach((key) => {
        if (key.includes('graphql') || key.includes('server.js')) {
            delete require.cache[key];
        }
    });

    // Override environment for this boot
    process.env.NODE_ENV   = nodeEnv;
    // Point to local SQLite so we never touch Supabase during tests
    process.env.DATABASE_URL = `file:${path.resolve(__dirname, '../prisma/dev.db')}`;
    process.env.PORT       = String(port);
    // Minimal JWT secret
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    // Suppress AI key warnings in test output
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key-for-introspection';

    const express         = require('express');
    const cors            = require('cors');
    const createApolloServer = require('../graphql/apolloServer');

    const app = express();
    app.use(cors());
    app.use(express.json());

    await createApolloServer(app);

    const httpServer = http.createServer(app);
    await new Promise((resolve) => httpServer.listen(port, '127.0.0.1', resolve));

    return {
        port,
        close: () => new Promise((res) => httpServer.close(res))
    };
}

// ── Test Runner ───────────────────────────────────────────────────────────────

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const INFO = '\x1b[36mℹ\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, name, detail = '') {
    if (condition) {
        console.log(`  ${PASS} ${name}${detail ? ' — ' + detail : ''}`);
        passed++;
    } else {
        console.log(`  ${FAIL} ${name}${detail ? ' — ' + detail : ''}`);
        failed++;
    }
}

async function runTests() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  GraphQL Introspection Tests — Mindly Server');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ── TEST GROUP 1: Development mode (NODE_ENV=development) ─────────────────
    console.log(`${INFO} Booting server in DEVELOPMENT mode (NODE_ENV=development)…`);
    const dev = await bootServer('development');
    const devUrl = `http://127.0.0.1:${dev.port}/graphql`;
    console.log(`  Server listening on port ${dev.port}\n`);

    console.log('  [Group 1] Development — Introspection ENABLED\n');

    const devResult = await sendIntrospection(devUrl);

    assert(
        devResult.status === 200,
        'HTTP 200 returned in dev mode',
        `status=${devResult.status}`
    );

    const devHasSchema = (
        devResult.body?.data?.__schema?.queryType?.name === 'Query'
    );
    assert(
        devHasSchema,
        'Introspection returns __schema.queryType.name = "Query"',
        devHasSchema ? 'introspection works ✓' : JSON.stringify(devResult.body).substring(0, 120)
    );

    const devNoError = !devResult.body?.errors?.some(
        e => /introspection/i.test(e.message)
    );
    assert(
        devNoError,
        'No introspection-disabled error in dev response',
        devNoError ? 'no errors' : devResult.body?.errors?.[0]?.message
    );

    await dev.close();

    // ── TEST GROUP 2: Production mode (NODE_ENV=production) ───────────────────
    console.log(`\n${INFO} Booting server in PRODUCTION mode (NODE_ENV=production)…`);

    // Re-require after clearing cache (bootServer handles this)
    const prod = await bootServer('production');
    const prodUrl = `http://127.0.0.1:${prod.port}/graphql`;
    console.log(`  Server listening on port ${prod.port}\n`);

    console.log('  [Group 2] Production — Introspection DISABLED\n');

    const prodResult = await sendIntrospection(prodUrl);

    assert(
        prodResult.status === 400 || prodResult.status === 200,
        'Server responds (not crashed)',
        `status=${prodResult.status}`
    );

    // Apollo Server 3 returns HTTP 400 with an error message when
    // introspection is disabled, or HTTP 200 with an errors array.
    const prodHasIntrospectionError = (
        prodResult.body?.errors?.some(e =>
            /introspection/i.test(e.message) ||
            /cannot query field/i.test(e.message)
        ) ||
        prodResult.body?.error?.includes?.('introspection') ||
        // Apollo Server 3 returns 400 with this message
        (typeof prodResult.body === 'object' && prodResult.body?.errors?.length > 0)
    );

    // Also check that __schema data is NOT present
    const prodNoSchemaData = !prodResult.body?.data?.__schema;
    assert(
        prodNoSchemaData,
        'Introspection data (__schema) is NOT returned in production',
        prodNoSchemaData ? 'schema hidden ✓' : 'SCHEMA WAS LEAKED!'
    );

    const prodHasError = (
        (prodResult.body?.errors && prodResult.body.errors.length > 0) ||
        prodResult.status === 400
    );
    assert(
        prodHasError,
        'Response contains an error (introspection blocked)',
        prodHasError
            ? (prodResult.body?.errors?.[0]?.message || `HTTP ${prodResult.status}`)
            : 'No error found — introspection may be OPEN!'
    );

    await prod.close();

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('\n[FATAL] Test runner crashed:', err);
    process.exit(1);
});
