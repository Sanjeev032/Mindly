const pdf = require('pdf-parse');
const fs = require('fs');

console.log('Testing PDF Parse...');
try {
    // Create dummy buffer
    const buffer = Buffer.from('Count 0 obj\n<<\n/Type /Catalog\n>>\nendobj', 'utf-8');
    // This is not a valid PDF really, but pdf-parse might try.
    // Actually, let's just require it to ensure it loads.
    console.log('pdf-parse loaded successfully.');
} catch (e) {
    console.error('Failed to load pdf-parse', e);
}
