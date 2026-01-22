<script setup lang="ts">
/**
 * TagManager Component
 *
 * Inline tag management for agents.
 * Allows viewing, adding, and removing tags.
 *
 * FR-04: Tag-based broadcasting support
 */

import { ref, computed } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, Plus, X, Check } from 'lucide-vue-next';

// Props
const props = defineProps<{
  agentId: string;
  compact?: boolean;
}>();

// Store
const store = useAgentStore();

// State
const isEditing = ref(false);
const newTagInput = ref('');
const isLoading = ref(false);

// Computed: Get agent
const agent = computed(() => store.getAgent(props.agentId));

// Computed: Current tags
const currentTags = computed(() => agent.value?.tags || []);

// Computed: Suggested tags (from other agents, excluding current)
const suggestedTags = computed(() => {
  return store.allTags.filter(tag => !currentTags.value.includes(tag));
});

// Add a new tag
async function addTag(tag: string) {
  const trimmedTag = tag.trim().toLowerCase();
  if (!trimmedTag) return;
  if (currentTags.value.includes(trimmedTag)) return;

  isLoading.value = true;
  await store.addAgentTag(props.agentId, trimmedTag);
  isLoading.value = false;
  newTagInput.value = '';
}

// Remove a tag
async function removeTag(tag: string) {
  isLoading.value = true;
  await store.removeAgentTag(props.agentId, tag);
  isLoading.value = false;
}

// Handle Enter key
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag(newTagInput.value);
  } else if (event.key === 'Escape') {
    isEditing.value = false;
    newTagInput.value = '';
  }
}

// Toggle edit mode
function toggleEdit() {
  isEditing.value = !isEditing.value;
  if (!isEditing.value) {
    newTagInput.value = '';
  }
}
</script>

<template>
  <div class="tag-manager">
    <!-- Compact Mode: Just show tags with add button -->
    <div v-if="compact" class="flex flex-wrap items-center gap-1.5">
      <!-- Existing Tags -->
      <Badge
        v-for="tag in currentTags"
        :key="tag"
        variant="outline"
        class="text-xs border-gray-600 text-gray-300 pr-1 h-5"
      >
        {{ tag }}
        <button
          class="ml-1 hover:text-red-400 transition-colors"
          title="Remove tag"
          @click.stop="removeTag(tag)"
        >
          <X class="w-3 h-3" />
        </button>
      </Badge>

      <!-- Add Tag Button / Input -->
      <div v-if="isEditing" class="flex items-center gap-1">
        <Input
          v-model="newTagInput"
          placeholder="tag..."
          class="h-5 w-20 text-xs bg-gray-800 border-gray-600 px-1.5"
          @keydown="handleKeydown"
        />
        <Button
          size="icon"
          variant="ghost"
          class="h-5 w-5 text-green-500 hover:text-green-400 hover:bg-green-500/10"
          :disabled="!newTagInput.trim() || isLoading"
          @click="addTag(newTagInput)"
        >
          <Check class="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          class="h-5 w-5 text-gray-500 hover:text-gray-400"
          @click="toggleEdit"
        >
          <X class="w-3 h-3" />
        </Button>
      </div>
      <Button
        v-else
        size="icon"
        variant="ghost"
        class="h-5 w-5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
        title="Add tag"
        @click="toggleEdit"
      >
        <Plus class="w-3 h-3" />
      </Button>
    </div>

    <!-- Full Mode: Show with label and suggestions -->
    <div v-else class="space-y-2">
      <!-- Label -->
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <Tag class="w-3 h-3" />
        <span>Tags</span>
      </div>

      <!-- Tags List -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- Existing Tags -->
        <Badge
          v-for="tag in currentTags"
          :key="tag"
          variant="outline"
          class="text-xs border-blue-600 text-blue-400 pr-1"
        >
          {{ tag }}
          <button
            class="ml-1 hover:text-red-400 transition-colors"
            title="Remove tag"
            @click="removeTag(tag)"
          >
            <X class="w-3 h-3" />
          </button>
        </Badge>

        <!-- Empty state -->
        <span v-if="currentTags.length === 0" class="text-xs text-gray-600 italic">
          No tags
        </span>
      </div>

      <!-- Add Tag Section -->
      <div class="flex items-center gap-2">
        <Input
          v-model="newTagInput"
          placeholder="Add tag..."
          class="h-7 text-xs bg-gray-800 border-gray-700 flex-1"
          @keydown="handleKeydown"
        />
        <Button
          size="sm"
          variant="outline"
          class="h-7 text-xs border-gray-700 hover:bg-gray-800"
          :disabled="!newTagInput.trim() || isLoading"
          @click="addTag(newTagInput)"
        >
          <Plus class="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      <!-- Suggestions -->
      <div v-if="suggestedTags.length > 0" class="space-y-1">
        <span class="text-xs text-gray-600">Suggestions:</span>
        <div class="flex flex-wrap gap-1">
          <Badge
            v-for="tag in suggestedTags.slice(0, 5)"
            :key="tag"
            variant="outline"
            class="text-xs border-gray-700 text-gray-500 cursor-pointer hover:border-blue-600 hover:text-blue-400 transition-colors"
            @click="addTag(tag)"
          >
            + {{ tag }}
          </Badge>
        </div>
      </div>
    </div>
  </div>
</template>
