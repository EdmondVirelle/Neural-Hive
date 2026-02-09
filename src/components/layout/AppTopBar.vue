<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAgentStore } from '@/stores/agentStore'
import { Button } from '@/components/ui/button'
import { Plus, Radio } from 'lucide-vue-next'

const { t } = useI18n()
const store = useAgentStore()

const emit = defineEmits<{
  'open-spawn': []
  'open-broadcast': []
}>()
</script>

<template>
  <header class="h-14 glass-layer border-b border-white/5 flex items-center px-6 z-10">
    <div class="flex-1" />

    <!-- App Status & Actions -->
    <div class="flex items-center gap-6">
      <div class="hidden md:flex flex-col items-end gap-0.5">
        <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">{{ t('dashboard.activeFleet') }}</span>
        <span class="text-xs font-bold text-white tracking-widest">
          {{ store.agentList.length }} {{ t('dashboard.units', store.agentList.length) }}
        </span>
      </div>

      <div class="w-[1px] h-8 bg-white/10" />

      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          class="h-10 px-4 text-gray-400 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px] transition-all"
          :disabled="store.agentList.length === 0"
          @click="emit('open-broadcast')"
        >
          <Radio class="w-4 h-4 mr-2.5 text-blue-500" />
          {{ t('dashboard.broadcast') }}
        </Button>

        <Button
          class="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] shadow-[0_4px_20px_rgba(37,99,235,0.3)] transition-all hover:translate-y-[-2px] active:translate-y-0"
          @click="emit('open-spawn')"
        >
          <Plus class="w-4 h-4 mr-2" />
          {{ t('dashboard.newAgent') }}
        </Button>
      </div>
    </div>
  </header>
</template>
