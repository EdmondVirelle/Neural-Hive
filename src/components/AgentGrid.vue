<script setup lang="ts">
import { useAgentStore } from '@/stores/agentStore';
import AgentCard from '@/components/AgentCard.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { ref } from 'vue';
import type { AgentType } from '@/types/shared';

const store = useAgentStore();

// Spawn dialog state
const showSpawnDialog = ref(false);
const newAgentType = ref<AgentType>('claude');
const newAgentCwd = ref('.');

// Handle spawn agent
async function handleSpawnAgent() {
  if (!newAgentCwd.value || newAgentCwd.value === '.') {
     // Trigger folder browse if possible, or just warn. 
     // Since this is a component, we reuse the store or needs a way to trigger browse.
     // For simplicity in this reusable component, we'll assume manual input or simplistic browse if moved here.
     // But browse logic was in App.vue. 
     // Let's rely on basic input for now or replicate the browse logic if checking electronAPI.
  }
  await store.spawnAgent(newAgentType.value, newAgentCwd.value);
  showSpawnDialog.value = false;
  newAgentCwd.value = '.';
}

async function browseFolder() {
  if (window.electronAPI?.selectFolder) {
    const result = await window.electronAPI.selectFolder();
    if (!result.canceled && result.path) {
      newAgentCwd.value = result.path;
    }
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header / Actions -->
    <div class="flex justify-between items-center mb-6 px-1">
      <h2 class="text-xl font-semibold text-gray-100">
        Agents
      </h2>
      <Button
        class="bg-blue-600 hover:bg-blue-700"
        @click="showSpawnDialog = true"
      >
        <Plus class="w-4 h-4 mr-2" />
        Spawn Agent
      </Button>
    </div>

    <!-- Empty State -->
    <div
      v-if="store.agentList.length === 0"
      class="flex flex-col items-center justify-center py-20 text-gray-500"
    >
      <div class="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
        <Plus class="w-8 h-8 text-gray-700" />
      </div>
      <p class="text-lg font-medium text-gray-400">
        No agents running
      </p>
      <p class="text-sm mt-1 text-gray-600">
        Click "Spawn Agent" to get started
      </p>
    </div>

    <!-- Grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      <AgentCard
        v-for="agent in store.agentList"
        :key="agent.id"
        :agent="agent"
      />
    </div>

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
          <div class="grid grid-cols-4 items-center gap-4">
            <label class="text-right text-sm font-medium text-gray-400">
              Directory
            </label>
            <div class="col-span-3 flex gap-2">
              <Input
                v-model="newAgentCwd"
                placeholder="."
                class="flex-1 bg-gray-800 border-gray-700 text-gray-100"
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
