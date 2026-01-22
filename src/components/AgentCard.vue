<script setup lang="ts">
import { computed } from 'vue';
import type { AgentSession, AgentStatus } from '@/types/shared';
import { useAgentStore } from '@/stores/agentStore';
import TerminalView from './TerminalView.vue';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, AlertTriangle, RotateCcw, FolderOpen } from 'lucide-vue-next';

// Props
const props = defineProps<{
  agent: AgentSession;
}>();

const store = useAgentStore();


// using custom colors for specific statuses as Shadcn has limited defaults.
const statusConfig: Record<AgentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', class: string, label: string }> = {
  IDLE: { variant: 'outline', class: 'border-green-500 text-green-500', label: 'Idle' },
  THINKING: { variant: 'outline', class: 'border-blue-500 text-blue-500 animate-pulse', label: 'Thinking' },
  WORKING: { variant: 'default', class: 'bg-purple-600 hover:bg-purple-700', label: 'Working' },
  ERROR: { variant: 'destructive', class: '', label: 'Error' },
  WAITING_USER: { variant: 'secondary', class: 'bg-orange-500 text-orange-950 hover:bg-orange-600', label: 'Waiting' },
  PAUSED: { variant: 'outline', class: 'border-violet-500 text-violet-500', label: 'Paused' },
  STALLED: { variant: 'destructive', class: 'bg-amber-700 hover:bg-amber-800', label: 'Stalled' },
};

// Computed: current status config
const currentStatus = computed(() => statusConfig[props.agent.status]);

// Handle kill agent
async function handleKill() {
  await store.killAgent(props.agent.id);
}

// Handle pause agent (FR-01-03)
async function handlePause() {
  await store.pauseAgent(props.agent.id);
}

// Handle resume agent (FR-01-03)
async function handleResume() {
  await store.resumeAgent(props.agent.id);
}

// Handle wait (reset stall timer)
async function handleWait() {
  store.updateStatus(props.agent.id, 'IDLE');
}

// Handle restart
async function handleRestart() {
  const type = props.agent.type;
  const cwd = props.agent.cwd;
  const name = props.agent.name;
  
  await store.killAgent(props.agent.id);
  await store.spawnAgent(type, cwd, name);
}

// Computed: Check if agent is paused (FR-01-03)
const isPaused = computed(() => props.agent.status === 'PAUSED');
</script>

<template>
  <Card
    class="flex flex-col h-[600px] overflow-hidden transition-all duration-300 hover:shadow-xl border-gray-700 bg-gray-900"
    :class="{
      'ring-2 ring-red-500/60': agent.status === 'ERROR',
      'ring-2 ring-blue-500/40': agent.status === 'THINKING',
      'ring-2 ring-purple-500/40': agent.status === 'WORKING',
      'ring-2 ring-violet-500/50': agent.status === 'PAUSED',
      'ring-4 ring-amber-600/80': agent.status === 'STALLED',
    }"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-700">
      <div class="flex items-center gap-3">
        <!-- Status indicator dot (Keep simpler visual indicator) -->
        <div
          class="w-2.5 h-2.5 rounded-full"
          :class="{
            'bg-green-500': agent.status === 'IDLE',
            'bg-blue-500 animate-pulse': agent.status === 'THINKING',
            'bg-purple-500 animate-pulse': agent.status === 'WORKING',
            'bg-red-500': agent.status === 'ERROR',
            'bg-orange-500': agent.status === 'WAITING_USER',
            'bg-violet-500': agent.status === 'PAUSED',
            'bg-amber-700': agent.status === 'STALLED',
          }"
        />
        <div>
          <h3 class="font-semibold text-gray-100 text-sm">
            {{ agent.name }}
          </h3>
          <span class="text-xs text-gray-500 capitalize">{{ agent.type }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Status Badge -->
        <Badge
          :variant="currentStatus.variant"
          :class="currentStatus.class"
        >
          {{ currentStatus.label }}
        </Badge>

        <!-- Pause/Resume button -->
        <Button
          v-if="!isPaused"
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-gray-400 hover:text-violet-400"
          title="Pause Agent"
          @click="handlePause"
        >
          <Pause class="h-4 w-4" />
        </Button>
        <Button
          v-else
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-violet-400 hover:text-green-400"
          title="Resume Agent"
          @click="handleResume"
        >
          <Play class="h-4 w-4" />
        </Button>

        <!-- Kill button -->
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 text-gray-400 hover:text-red-400"
          title="Kill Agent"
          @click="handleKill"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Current Activity Banner -->
    <div
      v-if="agent.currentActivity"
      class="px-4 py-2 bg-gray-800/30 border-b border-gray-700 text-sm"
    >
      <span class="text-gray-500">Activity:</span>
      <span class="text-gray-300 ml-1">{{ agent.currentActivity }}</span>
    </div>

    <!-- Terminal View -->
    <div class="flex-1 min-h-[300px] bg-black overflow-hidden relative">
      <TerminalView :agent-id="agent.id" />
    </div>

    <!-- Footer: CWD -->
    <div class="px-4 py-2 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400 flex items-center overflow-hidden">
      <FolderOpen class="w-3 h-3 mr-2 text-gray-500 flex-shrink-0" />
      <span class="truncate" :title="agent.cwd">{{ agent.cwd }}</span>
    </div>

    <!-- Stalled Warning Overlay -->
    <div
      v-if="agent.status === 'STALLED'"
      class="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10"
    >
      <Card class="w-full max-w-sm border-amber-600 bg-gray-800">
        <CardHeader class="pb-2">
          <div class="mx-auto bg-amber-900/20 p-3 rounded-full mb-2">
            <AlertTriangle class="h-8 w-8 text-amber-500" />
          </div>
          <h3 class="text-lg font-bold text-gray-100">
            Agent Stalled
          </h3>
          <p class="text-gray-400 text-sm">
            This agent hasn't responded for a while.
          </p>
        </CardHeader>
        <CardContent class="grid gap-3 pt-4">
          <Button
            variant="secondary"
            @click="handleWait"
          >
            Wait (Reset Timer)
          </Button>
          <Button
            class="bg-blue-600 hover:bg-blue-700"
            @click="handleRestart"
          >
            <RotateCcw class="mr-2 h-4 w-4" />
            Restart Agent
          </Button>
          <Button
            variant="destructive"
            variant-class="bg-red-900/20 hover:bg-red-900/40 text-red-500"
            @click="handleKill"
          >
            Terminate
          </Button>
        </CardContent>
      </Card>
    </div>
  </Card>
</template>
