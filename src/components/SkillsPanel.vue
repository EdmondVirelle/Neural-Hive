<script setup lang="ts">
/**
 * SkillsPanel Component
 *
 * Displays the Chain of Thought and Skills Used for an agent.
 * Shows real-time updates of agent activity and tool usage.
 */

import { computed, type Component } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import { Brain, Wrench, CheckCircle2, Circle, Loader2, Search, BookOpen, PenTool, Microscope } from 'lucide-vue-next';

// Props
const props = defineProps<{
  agentId: string;
}>();

// Store
const store = useAgentStore();

// Get agent data
const agent = computed(() => store.getAgent(props.agentId));

// Extract thought chain from logs
interface ThoughtStep {
  icon: Component; // Lucide icon component
  text: string;
  timestamp: number;
}

const thoughtChain = computed<ThoughtStep[]>(() => {
  if (!agent.value?.logs) return [];

  const steps: ThoughtStep[] = [];

  // Process logs in order, allowing duplicates for timeline
  for (const log of agent.value.logs) {
    const content = log.content.toLowerCase();
    const timestamp = log.timestamp;

    // Detect thinking (Claude Code uses "Thinking...")
    if (content.includes('thinking')) {
      steps.push({ icon: Brain, text: 'Thinking...', timestamp });
    }

    // Detect reading files
    if (content.includes('reading') || content.includes('read(') || content.includes('⏺ read')) {
      steps.push({ icon: BookOpen, text: 'Reading files', timestamp });
    }

    // Detect searching/grep
    if (content.includes('searching') || content.includes('grep') || content.includes('glob')) {
      steps.push({ icon: Search, text: 'Searching codebase', timestamp });
    }

    // Detect analysis
    if (content.includes('analy') || content.includes('exploring')) {
      steps.push({ icon: Microscope, text: 'Analyzing', timestamp });
    }

    // Detect writing/editing
    if (content.includes('writing') || content.includes('editing') || content.includes('edit(') || content.includes('write(')) {
      steps.push({ icon: PenTool, text: 'Writing code', timestamp });
    }

    // Detect bash/command execution
    if (content.includes('bash') || content.includes('running') || content.includes('executing')) {
      steps.push({ icon: Wrench, text: 'Running command', timestamp });
    }
  }

  // Remove consecutive duplicates and keep last 15 steps
  const filtered: ThoughtStep[] = [];
  for (const step of steps) {
    const last = filtered[filtered.length - 1];
    if (!last || last.text !== step.text) {
      filtered.push(step);
    }
  }

  return filtered.slice(-15);
});

// Extract skills usage from logs
interface SkillUsage {
  name: string;
  count: number;
  status: 'completed' | 'pending' | 'active';
}

// Tool detection patterns for various AI CLI tools
const toolPatterns = [
  // Claude Code patterns
  /⏺\s*(\w+)\s*\(/i,                    // ⏺ Read(file)
  /Running\s+(\w+)\.\.\./i,              // Running Bash...
  /(\w+)\s+tool/i,                       // Read tool, Edit tool
  // Gemini patterns
  /\[Tool Use\]:\s*(\w+)/i,              // [Tool Use]: Read
  // Generic patterns
  /^(Read|Write|Edit|Bash|Grep|Glob|Search|Task|WebFetch|WebSearch)\b/i,
  /Using\s+(\w+)/i,                      // Using Read
  /Calling\s+(\w+)/i,                    // Calling Bash
  /Executing\s+(\w+)/i,                  // Executing command
];

const skillsUsed = computed<SkillUsage[]>(() => {
  if (!agent.value?.logs) return [];

  const skillCounts = new Map<string, number>();

  for (const log of agent.value.logs) {
    const content = log.content;

    for (const pattern of toolPatterns) {
      const match = content.match(pattern);
      if (match) {
        // Get the tool name from capture group or the whole match
        let skillName = match[1] || match[0];
        // Normalize the name
        skillName = skillName.trim().replace(/[^a-zA-Z]/g, '');
        if (skillName) {
          // Capitalize first letter
          skillName = skillName.charAt(0).toUpperCase() + skillName.slice(1).toLowerCase();
          skillCounts.set(skillName, (skillCounts.get(skillName) || 0) + 1);
        }
        break; // Only count once per log line
      }
    }
  }

  return Array.from(skillCounts.entries()).map(([name, count]) => ({
    name,
    count,
    status: 'completed' as const,
  }));
});

// Format timestamp
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<template>
  <div class="skills-panel flex flex-col h-full bg-gray-900 border-l border-gray-800 font-sans">
    <!-- Chain of Thought Section -->
    <section class="flex-1 overflow-y-auto p-4 border-b border-gray-800">
      <h3 class="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <Brain class="w-4 h-4" />
        Chain of Thought
      </h3>
      
      <div
        v-if="thoughtChain.length === 0"
        class="text-gray-600 text-sm italic"
      >
        Waiting for agent activity...
      </div>
      
      <ul
        v-else
        class="space-y-4"
      >
        <li
          v-for="(step, index) in thoughtChain"
          :key="index"
          class="flex items-start gap-3 text-sm animate-fade-in"
        >
          <div class="mt-0.5 text-gray-500">
            <component
              :is="step.icon"
              class="w-4 h-4"
            />
          </div>
          <div class="flex-1">
            <div class="text-gray-300">
              {{ step.text }}
            </div>
            <div class="text-gray-600 text-xs mt-0.5">
              {{ formatTime(step.timestamp) }}
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- Skills Used Section -->
    <section class="p-4 bg-gray-900">
      <h3 class="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
        <Wrench class="w-4 h-4" />
        Skills Used
      </h3>
      
      <div
        v-if="skillsUsed.length === 0"
        class="text-gray-600 text-sm italic"
      >
        No skills used yet
      </div>
      
      <ul
        v-else
        class="space-y-2"
      >
        <li
          v-for="skill in skillsUsed"
          :key="skill.name"
          class="flex items-center gap-2 text-sm"
        >
          <span
            class="flex items-center justify-center"
            :class="{
              'text-green-500': skill.status === 'completed',
              'text-yellow-500': skill.status === 'pending',
              'text-blue-500': skill.status === 'active',
            }"
          >
            <CheckCircle2
              v-if="skill.status === 'completed'"
              class="w-4 h-4"
            />
            <Circle
              v-else-if="skill.status === 'pending'"
              class="w-4 h-4"
            />
            <Loader2
              v-else
              class="w-4 h-4 animate-spin"
            />
          </span>
          <span class="text-gray-300 flex-1 truncate">{{ skill.name }}</span>
          <span class="text-gray-500 text-xs whitespace-nowrap">({{ skill.count }} {{ skill.count === 1 ? 'call' : 'calls' }})</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.skills-panel {
  min-width: 280px;
}
</style>
