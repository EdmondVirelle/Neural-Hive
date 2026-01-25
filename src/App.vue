<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import AgentCard from '@/components/AgentCard.vue';
import BroadcastPanel from '@/components/BroadcastPanel.vue';
import FocusMode from '@/components/FocusMode.vue';
import type { AgentType } from '@/types/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Radio } from 'lucide-vue-next';

const store = useAgentStore();

// Spawn dialog state
const showSpawnDialog = ref(false);
const newAgentType = ref<AgentType>('claude');
const newAgentCwd = ref('.');
const newAgentName = ref('');

// Broadcast panel state
const showBroadcastPanel = ref(false);

// Focus mode state
const focusedAgentId = ref<string | null>(null);

// Handle focus mode
function handleFocus(agentId: string) {
  focusedAgentId.value = agentId;
}

// Handle close focus mode
function handleCloseFocus() {
  focusedAgentId.value = null;
}

// Handle restart from focus mode
async function handleRestartFromFocus() {
  if (!focusedAgentId.value) return;

  const agent = store.getAgent(focusedAgentId.value);
  if (!agent) return;

  const { type, cwd, name } = agent;
  await store.killAgent(focusedAgentId.value);
  const newId = await store.spawnAgent(type, cwd, name);
  focusedAgentId.value = newId;
}

// IPC cleanup function
let cleanupListener: (() => void) | null = null;

// Setup IPC listener on mount
onMounted(() => {
  if (window.electronAPI?.onUpdate) {
    cleanupListener = window.electronAPI.onUpdate((payload) => {
      store.handleIncomingLog({
        agentId: payload.agentId,
        content: payload.data,
        type: payload.type || 'stdout',
      });
    });
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (cleanupListener) {
    cleanupListener();
  }
});

// Handle spawn agent
async function handleSpawnAgent() {
  if (!newAgentCwd.value || newAgentCwd.value === '.') {
    // Require folder selection
    await browseFolder();
    if (!newAgentCwd.value || newAgentCwd.value === '.') {
      return;
    }
  }
  await store.spawnAgent(newAgentType.value, newAgentCwd.value, newAgentName.value || undefined);
  showSpawnDialog.value = false;
  newAgentCwd.value = '';
  newAgentName.value = '';
}

// Open spawn dialog
function openSpawnDialog() {
  newAgentCwd.value = '';
  newAgentName.value = '';
  showSpawnDialog.value = true;
}

// Browse for folder
async function browseFolder() {
  console.log('Browse folder clicked');
  if (!window.electronAPI) {
    console.error('Electron API not found! Preload script may have failed to load.');
    alert('System Error: Communication with Electron process failed.');
    return;
  }
  
  if (window.electronAPI.selectFolder) {
    try {
      console.log('Invoking selectFolder...');
      const result = await window.electronAPI.selectFolder();
      console.log('Folder selection result:', result);
      if (!result.canceled && result.path) {
        newAgentCwd.value = result.path;
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
      alert('Error selecting folder: ' + err);
    }
  } else {
    console.error('selectFolder method not found on electronAPI');
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
    <!-- Orbital Background Elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[120px] animate-pulse-slow" />
        <div class="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px] animate-pulse-slow duration-[8s]" />
    </div>

    <!-- Floating Glass Header -->
    <header class="fixed top-6 left-6 right-6 z-40 glass-layer rounded-2xl h-16 flex items-center px-8">
      <div class="flex-1 flex items-center gap-4">
        <!-- Logo & Title -->
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group cursor-pointer hover:scale-110 transition-transform">
            <svg
              class="w-6 h-6 text-white group-hover:rotate-12 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
              <h1 class="text-xl font-black tracking-tighter uppercase text-white">
                Neural <span class="text-blue-500">Hive</span>
              </h1>
              <div class="flex items-center gap-2 mt-[-2px]">
                  <span class="text-[9px] font-black tracking-[0.2em] text-gray-500 uppercase">Orchestrator v1.0.4</span>
                  <div class="w-1 h-1 rounded-full bg-blue-500/50" />
                  <span class="text-[9px] font-black tracking-[0.1em] text-blue-400/60 uppercase">System Nominal</span>
              </div>
          </div>
        </div>
      </div>

      <!-- App Status & Actions -->
      <div class="flex items-center gap-6">
        <div class="hidden md:flex flex-col items-end gap-0.5">
            <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Fleet</span>
            <span class="text-xs font-bold text-white tracking-widest">
                {{ store.agentList.length }} UNIT{{ store.agentList.length !== 1 ? 'S' : '' }}
            </span>
        </div>

        <div class="w-[1px] h-8 bg-white/10" />

        <div class="flex items-center gap-3">
            <!-- Broadcast Button -->
            <Button
              variant="ghost"
              class="h-10 px-4 text-gray-400 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-all"
              :disabled="store.agentList.length === 0"
              @click="showBroadcastPanel = true"
            >
              <Radio class="w-4 h-4 mr-2.5 text-blue-500" />
              Broadcast
            </Button>

            <Button
              class="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-0"
              @click="openSpawnDialog"
            >
              <Plus class="w-4 h-4 mr-2" />
              New Agent
            </Button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 pt-32 pb-12 relative z-10">
      <!-- Empty State -->
      <div
        v-if="store.agentList.length === 0"
        class="flex flex-col items-center justify-center py-40 animate-in fade-in zoom-in duration-700"
      >
        <div class="relative group cursor-pointer" @click="openSpawnDialog">
            <div class="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full group-hover:bg-blue-600/40 transition-all duration-700" />
            <div class="w-32 h-32 glass-layer rounded-[2.5rem] flex items-center justify-center mb-10 relative group-hover:scale-105 transition-transform duration-500">
              <svg
                class="w-16 h-16 text-blue-500 group-hover:text-blue-400 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
        </div>
        
        <div class="text-center group">
            <h2 class="text-4xl font-black text-white mb-3 tracking-tighter uppercase group-hover:tracking-widest transition-all duration-700">
              Fleet Offline
            </h2>
            <p class="text-gray-500 font-medium tracking-wide max-w-sm mx-auto mb-10">
              Initialize your first AI assistant to begin orchestrating computational workflows.
            </p>
        </div>

        <Button
          size="lg"
          class="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_40px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95"
          @click="openSpawnDialog"
        >
          <Plus class="w-5 h-5 mr-3" />
          Deploy Unit
        </Button>
      </div>

      <!-- Agent Grid -->
      <div
        v-else
        class="agent-grid animate-in fade-in slide-in-from-bottom-5 duration-700"
      >
        <AgentCard
          v-for="agent in store.agentList"
          :key="agent.id"
          :agent="agent"
          @focus="handleFocus"
        />
      </div>
    </main>

    <!-- Spawn Dialog -->
    <Dialog v-model:open="showSpawnDialog">
      <DialogContent class="sm:max-w-[425px] bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle>Spawn New Agent</DialogTitle>
          <DialogDescription>
            Configure the agent type and working directory.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-6 py-4">
          <!-- Agent Type -->
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium text-gray-400">
              Type
            </label>
            <div class="col-span-3">
              <Select v-model="newAgentType">
                <SelectTrigger class="w-full bg-gray-800 border-gray-700 text-gray-100">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent class="bg-gray-800 border-gray-700 text-gray-100">
                  <SelectItem value="claude">
                    Claude
                  </SelectItem>
                  <SelectItem value="gemini">
                    Gemini
                  </SelectItem>
                  <SelectItem value="custom">
                    Custom
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <!-- Agent Name -->
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium text-gray-400">
              Name
            </label>
            <div class="col-span-3">
              <Input
                v-model="newAgentName"
                placeholder="Optional custom name"
                class="bg-gray-800 border-gray-700 text-gray-100"
              />
            </div>
          </div>

          <!-- Working Directory -->
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium text-gray-400">
              Directory
            </label>
            <div class="col-span-3 flex gap-2">
              <Input
                v-model="newAgentCwd"
                placeholder="Select project folder..."
                readonly
                class="flex-1 bg-gray-800 border-gray-700 text-gray-100 cursor-pointer"
                @click="browseFolder"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="bg-gray-800 border-gray-700 hover:bg-gray-700"
                title="Browse"
                @click="browseFolder"
              >
                <FolderOpen class="w-4 h-4" />
              </Button>
            </div>
            <!-- Helper text -->
            <div class="col-start-2 col-span-3 text-xs text-gray-500">
              Agent will run in this directory (required)
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            class="border-gray-700 hover:bg-gray-800 text-gray-300"
            @click="showSpawnDialog = false"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700"
            @click="handleSpawnAgent"
          >
            Spawn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Broadcast Panel -->
    <BroadcastPanel v-model:open="showBroadcastPanel" />

    <!-- Focus Mode -->
    <FocusMode
      v-if="focusedAgentId"
      :agent-id="focusedAgentId"
      @close="handleCloseFocus"
      @restart="handleRestartFromFocus"
    />
  </div>
</template>

<style>
/* Global styles for the app */
html {
  color-scheme: dark;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  @apply bg-gray-950 text-gray-100;
}
</style>
