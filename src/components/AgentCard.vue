<script setup lang="ts">
import { computed } from 'vue';
import type { AgentSession, AgentStatus } from '@/types/shared';
import { useAgentStore } from '@/stores/agentStore';
import TerminalView from './TerminalView.vue';
import TagManager from './TagManager.vue';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, AlertTriangle, RotateCcw, FolderOpen, Tag, Maximize2 } from 'lucide-vue-next';

// Props
const props = defineProps<{
  agent: AgentSession;
}>();

// Emits
const emit = defineEmits<{
  focus: [agentId: string];
}>();

const store = useAgentStore();

// Handle focus mode
function handleFocus() {
  emit('focus', props.agent.id);
}


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
    class="flex flex-col h-[600px] overflow-hidden transition-all duration-500 glass-layer group relative"
    :class="{
      'glow-error ring-1 ring-red-500/50 scale-[1.02] z-10': agent.status === 'ERROR',
      'glow-thinking ring-1 ring-yellow-500/30': agent.status === 'THINKING',
      'glow-working ring-1 ring-blue-500/40': agent.status === 'WORKING',
      'glow-idle ring-1 ring-white/10': agent.status === 'IDLE',
      'glow-waiting ring-1 ring-orange-500/30': agent.status === 'WAITING_USER',
      'opacity-80 scale-95': agent.status === 'PAUSED',
    }"
  >
    <!-- Background Accent Glow (Interior) -->
    <div 
      class="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] blur-[100px] rounded-full pointer-events-none transition-all duration-1000 opacity-20"
      :class="{
        'bg-red-500': agent.status === 'ERROR',
        'bg-yellow-500': agent.status === 'THINKING',
        'bg-blue-500': agent.status === 'WORKING',
        'bg-slate-400': agent.status === 'IDLE',
        'bg-orange-500': agent.status === 'WAITING_USER',
      }"
    />

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/5 backdrop-blur-md">
      <div class="flex items-center gap-4">
        <!-- Status Indicator with Ring -->
        <div class="relative flex items-center justify-center">
             <div
              class="w-3 h-3 rounded-full status-transition shadow-lg"
              :class="{
                'status-idle': agent.status === 'IDLE',
                'status-thinking': agent.status === 'THINKING',
                'status-working animate-breathe': agent.status === 'WORKING',
                'status-error': agent.status === 'ERROR',
                'status-waiting': agent.status === 'WAITING_USER',
                'bg-violet-500': agent.status === 'PAUSED',
                'bg-amber-700': agent.status === 'STALLED',
              }"
            />
            <div 
                v-if="agent.status === 'WORKING' || agent.status === 'THINKING'"
                class="absolute inset-0 rounded-full animate-ping opacity-20"
                :class="agent.status === 'WORKING' ? 'bg-blue-500' : 'bg-yellow-500'"
            />
        </div>
        
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-white tracking-tight text-base group-hover:text-blue-400 transition-colors">
              {{ agent.name }}
            </h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-500 uppercase font-mono tracking-tighter">
              #{{ agent.id.slice(0, 4) }}
            </span>
          </div>
          <span class="text-xs text-blue-400/60 font-medium tracking-wide">{{ agent.type }}</span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 bg-black/20 p-1 rounded-lg border border-white/5">
        <!-- Status Badge -->
        <Badge
          :variant="currentStatus.variant"
          class="px-2 py-0 text-[10px] font-bold uppercase tracking-wider"
          :class="currentStatus.class"
        >
          {{ currentStatus.label }}
        </Badge>

        <div class="w-[1px] h-4 bg-white/10 mx-0.5" />

        <!-- Quick Actions -->
        <div class="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
              title="Focus Mode"
              @click="handleFocus"
            >
              <Maximize2 class="h-4 w-4" />
            </Button>

            <Button
              v-if="!isPaused"
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-gray-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
              title="Pause"
              @click="handlePause"
            >
              <Pause class="h-4 w-4" />
            </Button>
            <Button
              v-else
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-violet-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
              title="Resume"
              @click="handleResume"
            >
              <Play class="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Kill"
              @click="handleKill"
            >
              <X class="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>

    <!-- Activity Bar -->
    <div
      v-if="agent.currentActivity"
      class="px-5 py-2.5 bg-blue-500/5 border-b border-white/5 flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-500"
    >
      <div class="flex-shrink-0 relative">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <div class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
      </div>
      <span class="text-xs font-mono text-blue-300/80 truncate">{{ agent.currentActivity }}</span>
    </div>

    <!-- Terminal View -->
    <div
      class="flex-1 min-h-[300px] bg-black/60 overflow-hidden relative group/term cursor-pointer"
      title="Double-click to enter Focus Mode"
      @dblclick="handleFocus"
    >
      <!-- Terminal Scanline Effect (Only in working/thinking) -->
      <div 
        v-if="agent.status === 'WORKING' || agent.status === 'THINKING'"
        class="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-blue-500/5 to-transparent h-20 w-full animate-scan z-10"
      />
      
      <TerminalView :agent-id="agent.id" />
      
      <!-- Overlay Tooltip -->
      <div class="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover/term:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div class="bg-blue-600/90 text-white text-[10px] px-3 py-1 rounded-full backdrop-blur-md shadow-lg font-bold tracking-widest uppercase">
            Double Click to Expand
          </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-gray-950/60 border-t border-white/5 backdrop-blur-md">
      <!-- Tags & Stats Row -->
      <div class="px-5 py-3 flex items-center justify-between border-b border-white/5">
        <div class="flex items-center gap-3 overflow-hidden">
            <Tag class="w-3.5 h-3.5 text-blue-500/60 flex-shrink-0" />
            <TagManager :agent-id="agent.id" compact />
        </div>
      </div>
      <!-- Detailed Info Row -->
      <div class="px-5 py-3 flex items-center justify-between group/footer">
        <div class="flex items-center text-[11px] text-gray-500 flex-1 min-w-0">
          <FolderOpen class="w-3.5 h-3.5 mr-2.5 text-blue-500/40 flex-shrink-0 group-hover/footer:text-blue-500 transition-colors" />
          <span class="truncate font-mono group-hover/footer:text-gray-300 transition-colors" :title="agent.cwd">
            {{ agent.cwd }}
          </span>
        </div>
        <div class="flex items-center gap-4 text-[10px] text-gray-600 font-bold tracking-tighter ml-4">
            <span class="flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                UP
            </span>
            <span>v1.0.2</span>
        </div>
      </div>
    </div>

    <!-- Stalled Warning Overlay -->
    <div
      v-if="agent.status === 'STALLED'"
      class="absolute inset-0 bg-gray-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-50 animate-in fade-in duration-500"
    >
      <Card class="w-full max-w-sm border-amber-500/50 bg-gray-900 shadow-[0_0_50px_rgba(245,158,11,0.2)] glass-layer">
        <CardHeader class="pb-2">
          <div class="mx-auto bg-amber-500/10 p-4 rounded-2xl mb-4 border border-amber-500/20">
            <AlertTriangle class="h-10 w-10 text-amber-500" />
          </div>
          <h3 class="text-xl font-black text-white uppercase tracking-tighter">
            System Stall Detected
          </h3>
          <p class="text-gray-400 text-sm mt-1 leading-relaxed">
            Connection to <span class="text-white font-bold">{{ agent.name }}</span> has been interrupted.
          </p>
        </CardHeader>
        <CardContent class="grid gap-4 pt-6">
          <Button
            variant="outline"
            class="border-white/10 hover:bg-white/5 h-10 font-bold tracking-widest uppercase text-xs"
            @click="handleWait"
          >
            Wait for Recovery
          </Button>
          <Button
            class="bg-blue-600 hover:bg-blue-700 h-10 font-bold tracking-widest uppercase text-xs shadow-[0_4px_20px_rgba(37,99,235,0.4)]"
            @click="handleRestart"
          >
            <RotateCcw class="mr-2 h-4 w-4" />
            Hard Reset
          </Button>
          <Button
            variant="ghost"
            class="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 font-bold tracking-widest uppercase text-[10px]"
            @click="handleKill"
          >
            Terminate Process
          </Button>
        </CardContent>
      </Card>
    </div>
  </Card>
</template>
