#!/usr/bin/env node

/**
 * Mock Agent CLI - Simulates AI CLI behavior for testing terminal orchestration
 */

const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
};

// State machine
const States = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  TOOL_USE: 'TOOL_USE',
  OUTPUT: 'OUTPUT',
};

let currentState = States.IDLE;
let stateTimeout = null;

// Spinner frames for thinking animation
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIndex = 0;
let spinnerInterval = null;

// Sample outputs for simulation
const toolUseMessages = [
  '[Tool Use] Searching database...',
  '[Tool Use] Reading file system...',
  '[Tool Use] Executing grep search...',
  '[Tool Use] Analyzing codebase...',
  '[Tool Use] Fetching remote data...',
];

const markdownOutputs = [
  `## Analysis Complete

Found **3 relevant files** in the codebase:
- \`src/index.js\` - Main entry point
- \`src/utils/parser.js\` - Parser utilities
- \`src/config/settings.json\` - Configuration`,

  `### Code Review Summary

\`\`\`javascript
function processData(input) {
  return input.map(item => transform(item));
}
\`\`\`

This function looks good, but consider adding error handling.`,

  `> **Note**: The operation completed successfully.

| Metric | Value |
|--------|-------|
| Files processed | 42 |
| Errors found | 0 |
| Warnings | 3 |`,

  `Here's what I found:

1. The configuration is valid
2. All dependencies are installed
3. Tests are passing

${colors.green}Ready to proceed!${colors.reset}`,
];

const warningMessages = [
  `${colors.yellow}Warning: Deprecated API usage detected${colors.reset}`,
  `${colors.yellow}Warning: Large file detected, processing may take longer${colors.reset}`,
  `${colors.yellow}Warning: Cache invalidated, rebuilding...${colors.reset}`,
];

const successMessages = [
  `${colors.green}Success: Operation completed${colors.reset}`,
  `${colors.green}Done: All tasks finished${colors.reset}`,
  `${colors.green}Completed: No errors found${colors.reset}`,
];

// Utility functions
function print(text) {
  process.stdout.write(text);
}

function println(text) {
  console.log(text);
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// State handlers
function startThinking() {
  currentState = States.THINKING;
  print(`\n${colors.blue}${colors.bold}Thinking${colors.reset}${colors.blue}`);

  spinnerIndex = 0;
  spinnerInterval = setInterval(() => {
    print(`\r${colors.blue}${colors.bold}Thinking ${spinnerFrames[spinnerIndex]}${colors.reset}`);
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  }, 100);

  const thinkDuration = randomInt(2000, 3000);
  stateTimeout = setTimeout(() => {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    print(`\r${colors.blue}${colors.bold}Thinking... done${colors.reset}\n`);
    transitionToNextState();
  }, thinkDuration);
}

function startToolUse() {
  currentState = States.TOOL_USE;
  const message = randomChoice(toolUseMessages);
  println(`\n${colors.cyan}${message}${colors.reset}`);

  // Simulate tool execution with dots
  let dots = 0;
  const dotsInterval = setInterval(() => {
    print('.');
    dots++;
  }, 500);

  const toolDuration = randomInt(1500, 2500);
  stateTimeout = setTimeout(() => {
    clearInterval(dotsInterval);
    println(` ${colors.green}done${colors.reset}`);
    transitionToNextState();
  }, toolDuration);
}

function startOutput() {
  currentState = States.OUTPUT;

  // Randomly choose output type
  const outputType = randomInt(1, 10);

  if (outputType <= 5) {
    // Markdown output (50%)
    println(`\n${randomChoice(markdownOutputs)}`);
  } else if (outputType <= 7) {
    // Warning (20%)
    println(`\n${randomChoice(warningMessages)}`);
  } else {
    // Success (30%)
    println(`\n${randomChoice(successMessages)}`);
  }

  // Schedule next state transition
  stateTimeout = setTimeout(() => {
    transitionToNextState();
  }, randomInt(500, 1500));
}

function goIdle() {
  currentState = States.IDLE;
  println(`\n${colors.dim}[Idle] Waiting for input...${colors.reset}`);
}

function transitionToNextState() {
  // Clear any existing timeouts
  if (stateTimeout) {
    clearTimeout(stateTimeout);
    stateTimeout = null;
  }
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }

  // Random state transition
  const rand = Math.random();

  if (rand < 0.3) {
    startThinking();
  } else if (rand < 0.5) {
    startToolUse();
  } else if (rand < 0.8) {
    startOutput();
  } else {
    goIdle();
  }
}

function handleInput(input) {
  // Clear current state
  if (stateTimeout) {
    clearTimeout(stateTimeout);
    stateTimeout = null;
  }
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }

  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return;
  }

  // Special commands
  if (trimmedInput.toLowerCase() === 'exit' || trimmedInput.toLowerCase() === 'quit') {
    println(`\n${colors.magenta}Goodbye!${colors.reset}`);
    process.exit(0);
  }

  if (trimmedInput.toLowerCase() === 'help') {
    println(`
${colors.bold}Mock Agent CLI - Help${colors.reset}
${colors.cyan}Commands:${colors.reset}
  help    - Show this help message
  status  - Show current state
  think   - Force thinking mode
  tool    - Force tool use mode
  exit    - Exit the mock agent

${colors.cyan}Any other input will be echoed back with a simulated response.${colors.reset}
`);
    return;
  }

  if (trimmedInput.toLowerCase() === 'status') {
    println(`\n${colors.cyan}Current State: ${colors.bold}${currentState}${colors.reset}`);
    return;
  }

  if (trimmedInput.toLowerCase() === 'think') {
    startThinking();
    return;
  }

  if (trimmedInput.toLowerCase() === 'tool') {
    startToolUse();
    return;
  }

  // Echo input and generate response
  println(`\n${colors.dim}Received: ${colors.reset}${colors.white}${trimmedInput}${colors.reset}`);

  // Simulate processing
  setTimeout(() => {
    startThinking();
  }, 500);
}

// Main entry point
function main() {
  println(`
${colors.bgMagenta}${colors.white}${colors.bold} Mock Agent CLI v1.0 ${colors.reset}
${colors.dim}A testing tool for terminal orchestration${colors.reset}
${colors.dim}Type 'help' for commands, 'exit' to quit${colors.reset}
`);

  // Setup readline for stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  rl.on('line', (line) => {
    handleInput(line);
  });

  rl.on('close', () => {
    println(`\n${colors.magenta}Stream closed. Goodbye!${colors.reset}`);
    process.exit(0);
  });

  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    println(`\n${colors.magenta}Interrupted. Goodbye!${colors.reset}`);
    process.exit(0);
  });

  // Start with initial activity
  println(`${colors.green}Agent initialized and ready.${colors.reset}`);

  // Begin random state transitions after a delay
  setTimeout(() => {
    transitionToNextState();
  }, 1000);

  // Keep the process alive and periodically transition states
  setInterval(() => {
    if (currentState === States.IDLE && Math.random() < 0.3) {
      transitionToNextState();
    }
  }, 5000);
}

// Run
main();
