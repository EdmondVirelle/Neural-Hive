<script setup lang="ts">
/**
 * BroadcastPanel Component
 *
 * Allows broadcasting commands to multiple agents with:
 * - Tag-based filtering
 * - Select all mode
 * - Variable injection support
 *
 * FR-04-01: Batch commands via tags or select all
 * FR-04-02: Variable injection (e.g., {filename})
 */

import { ref, computed, watch } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import type { BroadcastPayload, BroadcastResult } from '@/types/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Send,
  Plus,
  X,
  Users,
  Tag,
  Variable,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-vue-next';

// Props
defineProps<{
  open: boolean;
}>();

// Emits
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

// Store
const store = useAgentStore();

// State
const commandTemplate = ref('');
const targetMode = ref<'all' | 'tags'>('all');
const selectedTags = ref<string[]>([]);
const newTagInput = ref('');
const variables = ref<{ name: string; values: string }[]>([]);
const isLoading = ref(false);
const result = ref<BroadcastResult | null>(null);
const error = ref<string | null>(null);

// Computed: Get all agents
const agents = computed(() => store.agentList);

// Computed: Get unique tags from all agents (from store)
const availableTags = computed(() => store.allTags);

// Computed: Target agent count
const targetAgentCount = computed(() => {
  if (targetMode.value === 'all') {
    return agents.value.length;
  }
  if (selectedTags.value.length === 0) {
    return 0;
  }
  return agents.value.filter((agent) =>
    agent.tags?.some((tag) => selectedTags.value.includes(tag))
  ).length;
});

// Computed: Detected variables in template
const detectedVariables = computed(() => {
  const regex = /\{(\w+)\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(commandTemplate.value)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
});

// Computed: Check if form is valid
const isFormValid = computed(() => {
  if (!commandTemplate.value.trim()) return false;
  if (targetMode.value === 'tags' && selectedTags.value.length === 0) return false;
  if (agents.value.length === 0) return false;
  return true;
});

// Watch for detected variables and auto-add variable inputs
watch(detectedVariables, (newVars) => {
  // Add new variables
  for (const varName of newVars) {
    if (!variables.value.find((v) => v.name === varName)) {
      variables.value.push({ name: varName, values: '' });
    }
  }
  // Remove variables no longer in template
  variables.value = variables.value.filter((v) => newVars.includes(v.name));
});

// Toggle tag selection
function toggleTag(tag: string) {
  const index = selectedTags.value.indexOf(tag);
  if (index === -1) {
    selectedTags.value.push(tag);
  } else {
    selectedTags.value.splice(index, 1);
  }
}

// Add custom tag
function addCustomTag() {
  const tag = newTagInput.value.trim();
  if (tag && !selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag);
  }
  newTagInput.value = '';
}

// Remove tag from selection
function removeSelectedTag(tag: string) {
  const index = selectedTags.value.indexOf(tag);
  if (index !== -1) {
    selectedTags.value.splice(index, 1);
  }
}

// Update variable values
function updateVariableValues(varName: string, values: string) {
  const variable = variables.value.find((v) => v.name === varName);
  if (variable) {
    variable.values = values;
  }
}

// Execute broadcast
async function executeBroadcast() {
  if (!isFormValid.value) return;

  isLoading.value = true;
  error.value = null;
  result.value = null;

  try {
    // Build payload - use plain objects (not Vue Proxy) for IPC serialization
    const payload: BroadcastPayload = {
      template: commandTemplate.value,
    };

    // Add tags if not targeting all (spread to create plain array)
    if (targetMode.value === 'tags') {
      payload.tags = [...selectedTags.value];
    }

    // Add variables if any
    if (variables.value.length > 0) {
      const vars: Record<string, string[]> = {};
      for (const v of variables.value) {
        // Split by comma and trim
        vars[v.name] = v.values
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s);
      }
      payload.variables = vars;
    }

    // Call IPC
    if (window.electronAPI) {
      result.value = await window.electronAPI.broadcastCommand(payload);
    } else {
      throw new Error('Electron API not available');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isLoading.value = false;
  }
}

// Close dialog
function handleClose() {
  emit('update:open', false);
  // Reset state after a delay to allow animation
  setTimeout(() => {
    result.value = null;
    error.value = null;
  }, 300);
}

// Reset form
function resetForm() {
  commandTemplate.value = '';
  targetMode.value = 'all';
  selectedTags.value = [];
  variables.value = [];
  result.value = null;
  error.value = null;
}

// Format variable placeholder for display
function formatVarPlaceholder(varName: string): string {
  return '{' + varName + '}';
}

// Set target mode
function setTargetMode(mode: 'all' | 'tags') {
  targetMode.value = mode;
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[600px] bg-gray-900 border-gray-800 text-gray-100 max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Radio class="w-5 h-5 text-blue-500" />
          Broadcast Command
        </DialogTitle>
        <DialogDescription>
          Send the same command to multiple agents simultaneously.
        </DialogDescription>
      </DialogHeader>

      <!-- Result View -->
      <div v-if="result" class="py-4">
        <div
          class="rounded-lg p-4"
          :class="result.success ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/20 border border-red-800'"
        >
          <div class="flex items-center gap-2 mb-3">
            <CheckCircle2 v-if="result.success" class="w-5 h-5 text-green-500" />
            <AlertCircle v-else class="w-5 h-5 text-red-500" />
            <span class="font-medium" :class="result.success ? 'text-green-400' : 'text-red-400'">
              {{ result.success ? 'Broadcast Successful' : 'Broadcast Failed' }}
            </span>
          </div>

          <div class="text-sm text-gray-300 mb-2">
            Command sent to {{ result.sentTo.length }} agent{{ result.sentTo.length !== 1 ? 's' : '' }}:
          </div>

          <div class="flex flex-wrap gap-2 mb-3">
            <Badge
              v-for="agentId in result.sentTo"
              :key="agentId"
              variant="outline"
              class="text-green-400 border-green-600"
            >
              {{ store.getAgent(agentId)?.name || agentId }}
            </Badge>
          </div>

          <!-- Errors if any -->
          <div v-if="result.errors && Object.keys(result.errors).length > 0" class="mt-3">
            <div class="text-sm text-red-400 mb-2">Errors:</div>
            <div
              v-for="(errMsg, agentId) in result.errors"
              :key="agentId"
              class="text-xs text-red-300 bg-red-900/30 rounded px-2 py-1 mb-1"
            >
              {{ store.getAgent(agentId)?.name || agentId }}: {{ errMsg }}
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-4">
          <Button
            variant="outline"
            class="flex-1 border-gray-700 hover:bg-gray-800"
            @click="resetForm"
          >
            New Broadcast
          </Button>
          <Button
            class="flex-1 bg-blue-600 hover:bg-blue-700"
            @click="handleClose"
          >
            Done
          </Button>
        </div>
      </div>

      <!-- Form View -->
      <div v-else class="grid gap-6 py-4">
        <!-- Command Template -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Send class="w-4 h-4 text-gray-500" />
            Command Template
          </label>
          <Input
            v-model="commandTemplate"
            placeholder="Enter command... (e.g., npm run lint)"
            class="bg-gray-800 border-gray-700 text-gray-100 font-mono"
          />
          <p class="text-xs text-gray-500">
            Use <code class="text-blue-400">&#123;varName&#125;</code> for variable injection
          </p>
        </div>

        <!-- Target Mode -->
        <div class="space-y-3">
          <label class="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Users class="w-4 h-4 text-gray-500" />
            Target Agents
          </label>

          <div class="flex gap-3">
            <Button
              type="button"
              :variant="targetMode === 'all' ? 'default' : 'outline'"
              :class="targetMode === 'all' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700 hover:bg-gray-800'"
              @click="setTargetMode('all')"
            >
              All Agents ({{ agents.length }})
            </Button>
            <Button
              type="button"
              :variant="targetMode === 'tags' ? 'default' : 'outline'"
              :class="targetMode === 'tags' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700 hover:bg-gray-800'"
              @click="setTargetMode('tags')"
            >
              <Tag class="w-4 h-4 mr-2" />
              By Tags
            </Button>
          </div>

          <!-- Tag Selection (when targeting by tags) -->
          <div v-if="targetMode === 'tags'" class="space-y-3 pl-4 border-l-2 border-gray-800">
            <!-- Available Tags -->
            <div v-if="availableTags.length > 0" class="space-y-2">
              <span class="text-xs text-gray-500">Available tags:</span>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="tag in availableTags"
                  :key="tag"
                  :variant="selectedTags.includes(tag) ? 'default' : 'outline'"
                  :class="selectedTags.includes(tag)
                    ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'border-gray-600 hover:bg-gray-800 cursor-pointer'"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </Badge>
              </div>
            </div>

            <!-- Selected Tags -->
            <div v-if="selectedTags.length > 0" class="space-y-2">
              <span class="text-xs text-gray-500">Selected tags:</span>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="tag in selectedTags"
                  :key="tag"
                  class="bg-blue-600 pr-1"
                >
                  {{ tag }}
                  <button
                    class="ml-1 hover:bg-blue-700 rounded p-0.5"
                    @click="removeSelectedTag(tag)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </Badge>
              </div>
            </div>

            <!-- Add Custom Tag -->
            <div class="flex gap-2">
              <Input
                v-model="newTagInput"
                placeholder="Add custom tag..."
                class="flex-1 bg-gray-800 border-gray-700 text-gray-100 text-sm h-8"
                @keyup.enter="addCustomTag"
              />
              <Button
                size="sm"
                variant="outline"
                class="border-gray-700 hover:bg-gray-800 h-8"
                :disabled="!newTagInput.trim()"
                @click="addCustomTag"
              >
                <Plus class="w-4 h-4" />
              </Button>
            </div>

            <!-- Target Count -->
            <div class="text-sm">
              <span class="text-gray-500">Will target:</span>
              <span
                class="ml-2 font-medium"
                :class="targetAgentCount > 0 ? 'text-blue-400' : 'text-red-400'"
              >
                {{ targetAgentCount }} agent{{ targetAgentCount !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Variable Injection -->
        <div v-if="detectedVariables.length > 0" class="space-y-3">
          <label class="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Variable class="w-4 h-4 text-gray-500" />
            Variable Injection
          </label>

          <div
            v-for="varName in detectedVariables"
            :key="varName"
            class="flex items-center gap-3"
          >
            <Badge variant="outline" class="border-blue-600 text-blue-400 font-mono">
              {{ formatVarPlaceholder(varName) }}
            </Badge>
            <Input
              :model-value="variables.find(v => v.name === varName)?.values || ''"
              placeholder="value1, value2, value3..."
              class="flex-1 bg-gray-800 border-gray-700 text-gray-100 text-sm"
              @update:model-value="updateVariableValues(varName, $event as string)"
            />
          </div>

          <p class="text-xs text-gray-500">
            Enter comma-separated values. Each agent will receive the value at its index.
          </p>
        </div>

        <!-- Error -->
        <div
          v-if="error"
          class="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-2"
        >
          <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0" />
          <span class="text-sm text-red-400">{{ error }}</span>
        </div>
      </div>

      <!-- Footer -->
      <DialogFooter v-if="!result">
        <Button
          variant="outline"
          class="border-gray-700 hover:bg-gray-800 text-gray-300"
          @click="handleClose"
        >
          Cancel
        </Button>
        <Button
          class="bg-blue-600 hover:bg-blue-700"
          :disabled="!isFormValid || isLoading"
          @click="executeBroadcast"
        >
          <Loader2 v-if="isLoading" class="w-4 h-4 mr-2 animate-spin" />
          <Radio v-else class="w-4 h-4 mr-2" />
          Broadcast to {{ targetAgentCount }} Agent{{ targetAgentCount !== 1 ? 's' : '' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
