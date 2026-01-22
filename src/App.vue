<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import AgentCard from '@/components/AgentCard.vue';
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
import { Plus, FolderOpen } from 'lucide-vue-next';

const store = useAgentStore();

// Spawn dialog state
const showSpawnDialog = ref(false);
const newAgentType = ref<AgentType>('claude');
const newAgentCwd = ref('.');
const newAgentName = ref('');

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
  <div class="min-h-screen bg-gray-950 text-gray-100 font-sans">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo & Title -->
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg
                class="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Neural Hive
            </h1>
          </div>

          <!-- Status & Actions -->
          <div class="flex items-center gap-4">
            <span class="text-sm text-gray-400">
              {{ store.agentList.length }} agent{{ store.agentList.length !== 1 ? 's' : '' }} active
            </span>
            <Button
              class="bg-blue-600 hover:bg-blue-700 font-medium"
              @click="openSpawnDialog"
            >
              <Plus class="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Empty State -->
      <div
        v-if="store.agentList.length === 0"
        class="flex flex-col items-center justify-center py-20"
      >
        <div class="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
          <svg
            class="w-10 h-10 text-gray-600"
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
        <h2 class="text-xl font-semibold text-gray-300 mb-2">
          No agents running
        </h2>
        <p class="text-gray-500 mb-6">
          Click "New Agent" to spawn your first AI agent
        </p>
        <Button
          size="lg"
          class="bg-blue-600 hover:bg-blue-700"
          @click="openSpawnDialog"
        >
          <Plus class="w-5 h-5 mr-2" />
          Spawn Agent
        </Button>
      </div>

      <!-- Agent Grid -->
      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <AgentCard
          v-for="agent in store.agentList"
          :key="agent.id"
          :agent="agent"
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
