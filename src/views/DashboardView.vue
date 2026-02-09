<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAgentStore } from '@/stores/agentStore'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import AgentCard from '@/components/AgentCard.vue'
import BroadcastPanel from '@/components/BroadcastPanel.vue'
import FocusMode from '@/components/FocusMode.vue'
import SpawnDialog from '@/components/SpawnDialog.vue'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-vue-next'

const { t } = useI18n()
const store = useAgentStore()

const showSpawnDialog = ref(false)
const showBroadcastPanel = ref(false)
const focusedAgentId = ref<string | null>(null)

// Keyboard shortcuts
useKeyboardShortcuts({
  onSpawn: () => { showSpawnDialog.value = true },
  onBroadcast: () => { showBroadcastPanel.value = true },
  onFocusAgent: (index: number) => {
    const agents = store.agentList
    if (index < agents.length) {
      focusedAgentId.value = agents[index].id
    }
  },
})

function handleFocus(agentId: string) {
  focusedAgentId.value = agentId
}

function handleCloseFocus() {
  focusedAgentId.value = null
}

async function handleRestartFromFocus() {
  if (!focusedAgentId.value) return
  const agent = store.getAgent(focusedAgentId.value)
  if (!agent) return
  const { type, cwd, name } = agent
  await store.killAgent(focusedAgentId.value)
  const newId = await store.spawnAgent(type, cwd, name)
  focusedAgentId.value = newId
}

let cleanupListener: (() => void) | null = null

onMounted(() => {
  if (window.electronAPI?.onUpdate) {
    cleanupListener = window.electronAPI.onUpdate((payload) => {
      store.handleIncomingLog({
        agentId: payload.agentId,
        content: payload.data,
        type: payload.type || 'stdout',
      })
    })
  }
})

onUnmounted(() => {
  if (cleanupListener) cleanupListener()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 pt-8 pb-12 relative z-10">
    <!-- Empty State -->
    <div
      v-if="store.agentList.length === 0"
      class="flex flex-col items-center justify-center py-40 animate-in fade-in zoom-in duration-700"
    >
      <div class="relative group cursor-pointer" @click="showSpawnDialog = true">
        <div class="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full group-hover:bg-blue-600/40 transition-all duration-700" />
        <div class="w-32 h-32 glass-layer rounded-[2.5rem] flex items-center justify-center mb-10 relative group-hover:scale-105 transition-transform duration-500">
          <svg class="w-16 h-16 text-blue-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div class="text-center group">
        <h2 class="text-4xl font-black text-white mb-3 tracking-tighter uppercase">
          {{ t('dashboard.fleetOffline') }}
        </h2>
        <p class="text-gray-500 font-medium tracking-wide max-w-sm mx-auto mb-10">
          {{ t('dashboard.fleetOfflineDesc') }}
        </p>
      </div>
      <Button
        size="lg"
        class="h-14 px-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-[0_10px_40px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95"
        @click="showSpawnDialog = true"
      >
        <Plus class="w-5 h-5 mr-3" />
        {{ t('dashboard.deployUnit') }}
      </Button>
    </div>

    <!-- Agent Grid -->
    <div v-else class="agent-grid animate-in fade-in slide-in-from-bottom-5 duration-700">
      <AgentCard
        v-for="agent in store.agentList"
        :key="agent.id"
        :agent="agent"
        @focus="handleFocus"
      />
    </div>
  </div>

  <!-- Spawn Dialog -->
  <SpawnDialog v-model:open="showSpawnDialog" />

  <!-- Broadcast Panel -->
  <BroadcastPanel v-model:open="showBroadcastPanel" />

  <!-- Focus Mode -->
  <FocusMode
    v-if="focusedAgentId"
    :agent-id="focusedAgentId"
    @close="handleCloseFocus"
    @restart="handleRestartFromFocus"
  />
</template>
