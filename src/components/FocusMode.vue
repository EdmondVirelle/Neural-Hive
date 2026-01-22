<script setup lang="ts">
/**
 * FocusMode Component
 *
 * Full-screen agent view with:
 * - Left: Complete xterm.js terminal
 * - Right: Chain of Thought and Skills Panel
 * - Footer: Command input
 *
 * Spec Reference: 4.1.2 Focus View
 */

import { computed, onMounted, onUnmounted } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import TerminalView from './TerminalView.vue';
import SkillsPanel from './SkillsPanel.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCw, X } from 'lucide-vue-next';
import type { AgentStatus } from '@/types/shared';

// Props
const props = defineProps<{
  agentId: string;
}>();

// Emits
const emit = defineEmits<{
  close: [];
  restart: [];
}>();

// Store
const store = useAgentStore();

// Get agent data
const agent = computed(() => store.getAgent(props.agentId));

// Handle restart
async function handleRestart() {
  emit('restart');
}

// Handle close
function handleClose() {
  emit('close');
}

// Keyboard shortcut: Escape to close
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

// Status configuration
const statusConfig: Record<AgentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', class: string, label: string }> = {
  IDLE: { variant: 'outline', class: 'text-green-400 border-green-500/20 bg-green-500/10', label: 'Idle' },
  THINKING: { variant: 'outline', class: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10', label: 'Thinking' },
  WORKING: { variant: 'outline', class: 'text-blue-400 border-blue-500/20 bg-blue-500/10', label: 'Working' },
  ERROR: { variant: 'destructive', class: 'text-red-100', label: 'Error' },
  WAITING_USER: { variant: 'outline', class: 'text-orange-400 border-orange-500/20 bg-orange-500/10', label: 'Waiting' },
  PAUSED: { variant: 'secondary', class: 'text-gray-400', label: 'Paused' },
  STALLED: { variant: 'outline', class: 'text-amber-400 border-amber-500/20 bg-amber-500/10', label: 'Stalled' },
};

function getStatusDotClass(status: AgentStatus | undefined): string {
  if (!status) return 'bg-gray-500';
  const colorMap: Record<AgentStatus, string> = {
      IDLE: 'bg-green-500',
      THINKING: 'bg-yellow-500',
      WORKING: 'bg-blue-500',
      ERROR: 'bg-red-500',
      WAITING_USER: 'bg-orange-500',
      PAUSED: 'bg-gray-500',
      STALLED: 'bg-amber-500'
  }
  return colorMap[status] || 'bg-gray-500';
}
</script>

<template>
  <div class="focus-mode fixed inset-0 z-50 bg-gray-950 flex flex-col animate-fade-in font-sans text-gray-100">
    <!-- Header -->
    <header class="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <div class="flex items-center gap-4">
        <!-- Back button -->
        <Button
          variant="ghost"
          size="sm"
          class="text-gray-400 hover:text-gray-200"
          @click="handleClose"
        >
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back
        </Button>

        <!-- Agent info -->
        <div class="flex items-center gap-3 pl-4 border-l border-gray-800">
          <div
            class="w-3 h-3 rounded-full"
            :class="[
              getStatusDotClass(agent?.status),
              { 'animate-pulse': agent?.status === 'THINKING' || agent?.status === 'WORKING' }
            ]"
          />
          <div>
            <h1 class="text-lg font-semibold text-gray-100">
              {{ agent?.name || 'Unknown Agent' }}
            </h1>
            <span class="text-xs text-gray-500 capitalize">{{ agent?.type }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Status badge -->
        <Badge
          v-if="agent"
          :variant="statusConfig[agent.status].variant"
          :class="statusConfig[agent.status].class"
        >
          {{ statusConfig[agent.status].label }}
        </Badge>

        <!-- Restart button -->
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-400 hover:text-gray-200"
          title="Restart Agent"
          @click="handleRestart"
        >
          <RotateCw class="w-5 h-5" />
        </Button>

        <!-- Close button -->
        <Button
          variant="ghost"
          size="icon"
          class="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          title="Close (Esc)"
          @click="handleClose"
        >
          <X class="w-5 h-5" />
        </Button>
      </div>
    </header>

    <!-- Main content: Terminal + Skills Panel -->
    <main class="flex-1 flex overflow-hidden bg-gray-950">
      <!-- Terminal (Left) -->
      <div class="flex-1 p-4 overflow-hidden">
        <div class="h-full bg-black rounded-xl overflow-hidden border border-gray-800 shadow-xl">
          <TerminalView :agent-id="agentId" />
        </div>
      </div>

      <!-- Skills Panel (Right) -->
      <div class="w-80 border-l border-gray-800 bg-gray-900 overflow-hidden">
        <SkillsPanel :agent-id="agentId" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.focus-mode {
  /* Ensure it covers everything */
  isolation: isolate;
}
</style>
