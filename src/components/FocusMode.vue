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
  <div class="focus-mode fixed inset-0 z-50 bg-gray-950 flex flex-col animate-in fade-in duration-500 font-sans text-gray-100 overflow-hidden">
    <!-- Orbital Background Effect -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse-slow" />
        <div class="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] animate-pulse-slow duration-5000" />
    </div>

    <!-- Header -->
    <header class="relative flex items-center justify-between px-8 py-5 glass-header z-10">
      <div class="flex items-center gap-6">
        <!-- Back button -->
        <Button
          variant="ghost"
          size="sm"
          class="text-gray-400 hover:text-white hover:bg-white/5 group"
          @click="handleClose"
        >
          <ArrowLeft class="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Return to Deck
        </Button>

        <!-- Agent info -->
        <div class="flex items-center gap-5 pl-6 border-l border-white/10">
          <div class="relative">
              <div
                class="w-3 h-3 rounded-full status-transition shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                :class="[
                  getStatusDotClass(agent?.status),
                  { 'animate-pulse': agent?.status === 'THINKING' || agent?.status === 'WORKING' }
                ]"
              />
              <div 
                v-if="agent?.status === 'WORKING'"
                class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30"
              />
          </div>
          <div>
            <div class="flex items-center gap-2">
                <h1 class="text-xl font-black text-white tracking-tighter uppercase">
                  {{ agent?.name || 'Unknown Agent' }}
                </h1>
                <span class="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-500 font-mono tracking-widest">
                  OPERATIONAL
                </span>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold tracking-widest text-blue-400/60 uppercase">
                <div class="w-1 h-1 rounded-full bg-blue-400/40" />
                {{ agent?.type }}
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Status badge -->
        <div v-if="agent" class="px-4 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md flex items-center gap-3">
            <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status:</span>
            <Badge
              :variant="statusConfig[agent.status].variant"
              class="px-3 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-lg"
              :class="statusConfig[agent.status].class"
            >
              {{ statusConfig[agent.status].label }}
            </Badge>
        </div>

        <div class="flex items-center gap-2 ml-2">
            <!-- Restart button -->
            <Button
              variant="outline"
              size="sm"
              class="border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 font-bold uppercase tracking-widest text-[10px] h-9"
              title="Restart Agent"
              @click="handleRestart"
            >
              <RotateCw class="w-3.5 h-3.5 mr-2" />
              Reset
            </Button>

            <!-- Close button -->
            <Button
              variant="ghost"
              size="icon"
              class="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-9 w-9"
              title="Close (Esc)"
              @click="handleClose"
            >
              <X class="w-5 h-5" />
            </Button>
        </div>
      </div>
    </header>

    <!-- Main content: Terminal + Skills Panel -->
    <main class="flex-1 flex overflow-hidden relative z-0">
      <!-- Terminal (Left) -->
      <div class="flex-1 p-6 overflow-hidden flex flex-col">
        <div class="flex-1 terminal-container shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <TerminalView :agent-id="agentId" />
        </div>
      </div>

      <!-- Skills Panel (Right) -->
      <div class="w-96 glass-layer border-y-0 border-r-0 backdrop-blur-3xl animate-in slide-in-from-right duration-700">
        <SkillsPanel :agent-id="agentId" />
      </div>
    </main>

    <!-- Footer Bar (Context Info) -->
    <footer class="h-10 bg-black/40 backdrop-blur-md border-t border-white/5 flex items-center px-8 justify-between text-[10px] font-bold tracking-widest text-gray-500 uppercase">
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
                <FolderOpen class="w-3.5 h-3.5 mb-0.5" />
                <span>Path: <span class="text-gray-300">{{ agent?.cwd }}</span></span>
            </div>
            <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Node Process: <span class="text-gray-300">Active</span></span>
            </div>
        </div>
        <div class="flex items-center gap-4">
            <span>Latency: <span class="text-blue-400">12ms</span></span>
            <span>Uptime: <span class="text-gray-300">02:45:12</span></span>
        </div>
    </footer>
  </div>
</template>

<style scoped>
.focus-mode {
  /* Ensure it covers everything */
  isolation: isolate;
}
</style>
