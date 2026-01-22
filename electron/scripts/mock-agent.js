/**
 * Mock Agent for testing
 * Echoes input and simulates processing delay
 */
console.log('🤖 Mock Agent v1.0 initialized');
console.log('Type any message to see it echoed. Type "exit" to quit.');

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
    const input = chunk.toString().trim();
    if (input === 'exit') {
        console.log('👋 Goodbye!');
        process.exit(0);
    }

    // Simulate thinking
    if (input) {
        process.stdout.write(`Thinking...`);
        setTimeout(() => {
            // Clear current line if possible or just print
            process.stdout.write(`\r[Mock Agent]: I received your message: "${input}"\n`);
            console.log('> ');
        }, 500);
    }
});

console.log('> ');
