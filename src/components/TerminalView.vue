<script setup lang="ts">
/**
 * TerminalView Component
 *
 * Renders an xterm.js terminal for a specific agent.
 * Subscribes to agent output and handles user input.
 */

import { ref, watch, onMounted } from 'vue';
import { useTerminal } from '@/composables/useTerminal';
import { useAgentStore } from '@/stores/agentStore';

// Props
const props = defineProps<{
  agentId: string;
}>();

// Store
const store = useAgentStore();

// Terminal container ref
const terminalContainer = ref<HTMLElement | null>(null);

// Initialize terminal with input handler and resize handler
const { write, clear, isReady, focus } = useTerminal(
  terminalContainer,
  (data: string) => {
    // Send user input to agent
    store.sendCommand(props.agentId, data);
  },
  (cols: number, rows: number) => {
    // Sync resize with backend PTY
    if (window.electronAPI?.resizeTerminal) {
      window.electronAPI.resizeTerminal(props.agentId, cols, rows);
    }
  }
);

// Track last processed log index to avoid duplicates
let lastLogIndex = 0;

// Watch the counter instead of deep-watching the logs array (performance optimization)
watch(
  () => store.logUpdateCounter,
  () => {
    const logs = store.getAgent(props.agentId)?.logs;
    if (!logs || !isReady.value) return;

    // Write only new logs since last processed index
    for (let i = lastLogIndex; i < logs.length; i++) {
      const log = logs[i];
      // Preserve ANSI codes, just write raw content
      write(log.content);
    }
    lastLogIndex = logs.length;
  }
);

// Reset log index when agent changes
watch(
  () => props.agentId,
  () => {
    lastLogIndex = 0;
    clear();
    // Write existing logs
    const agent = store.getAgent(props.agentId);
    if (agent?.logs) {
      agent.logs.forEach((log) => write(log.content));
      lastLogIndex = agent.logs.length;
    }
  }
);

// Focus terminal on mount
onMounted(() => {
  // Delay focus to ensure terminal is ready
  setTimeout(() => {
    focus();
  }, 100);
});
</script>

<template>
  <div class="terminal-wrapper w-full h-full flex flex-col group/tw">
    <!-- Terminal Status Bar -->
    <div class="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-[10px] font-bold tracking-widest uppercase text-gray-500 backdrop-blur-md">
      <div class="flex items-center gap-2">
          <Radio class="w-3 h-3 text-blue-500/50" />
          <span>Live Session</span>
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="isReady"
          class="flex items-center gap-1.5 text-blue-400"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          Ready
        </span>
        <span
          v-else
          class="flex items-center gap-1.5 text-yellow-500"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Linking
        </span>
      </div>
    </div>

    <!-- Terminal Container -->
    <div
      ref="terminalContainer"
      class="flex-1 overflow-hidden"
    />
  </div>
</template>

<style scoped>
.terminal-wrapper {
  min-height: 200px;
}
</style>

<style>
/* Global styles for xterm (must be non-scoped to affect dynamic elements) */
@import 'xterm/css/xterm.css';

/* Custom scrollbar for xterm viewport */
.xterm-viewport::-webkit-scrollbar {
  width: 10px;
}

.xterm-viewport::-webkit-scrollbar-track {
  background: #111827; /* gray-900 */
}

.xterm-viewport::-webkit-scrollbar-thumb {
  background: #4b5563; /* gray-600 */
  border-radius: 5px;
  border: 2px solid #111827; /* Match track for padding effect */
}

.xterm-viewport::-webkit-scrollbar-thumb:hover {
  background: #6b7280; /* gray-500 */
}
</style>
