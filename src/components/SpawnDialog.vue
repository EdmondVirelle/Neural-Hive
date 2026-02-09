<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAgentStore } from '@/stores/agentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AgentType } from '@/types/shared'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Loader2 } from 'lucide-vue-next'

const { t } = useI18n()
const store = useAgentStore()
const settingsStore = useSettingsStore()

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const newAgentType = ref<AgentType>('claude')
const newAgentCwd = ref('')
const newAgentName = ref('')
const customCommand = ref('')

// All possible agent types for the select
const agentTypes: { value: AgentType; label: string }[] = [
  { value: 'claude', label: 'Claude Code' },
  { value: 'gemini', label: 'Gemini CLI' },
  { value: 'aider', label: 'Aider' },
  { value: 'codex', label: 'Codex CLI' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'copilot', label: 'GitHub Copilot' },
  { value: 'custom', label: 'Custom' },
]

// Detect CLIs when dialog opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && !settingsStore.cliDetectionResult) {
      settingsStore.detectClis()
    }
  }
)

function isCliInstalled(type: AgentType): boolean | null {
  if (!settingsStore.cliDetectionResult) return null
  const cli = settingsStore.cliDetectionResult.clis.find((c) => c.type === type)
  return cli?.installed ?? null
}

async function browseFolder() {
  if (!window.electronAPI?.selectFolder) return
  try {
    const result = await window.electronAPI.selectFolder()
    if (!result.canceled && result.path) {
      newAgentCwd.value = result.path
    }
  } catch (err) {
    console.error('Failed to select folder:', err)
  }
}

async function handleSpawn() {
  if (!newAgentCwd.value) {
    await browseFolder()
    if (!newAgentCwd.value) return
  }
  await store.spawnAgent(
    newAgentType.value,
    newAgentCwd.value,
    newAgentName.value || undefined
  )
  emit('update:open', false)
  newAgentCwd.value = ''
  newAgentName.value = ''
  customCommand.value = ''
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[480px] bg-gray-900 border-gray-800 text-gray-100">
      <DialogHeader>
        <DialogTitle>{{ t('spawn.title') }}</DialogTitle>
        <DialogDescription>{{ t('spawn.description') }}</DialogDescription>
      </DialogHeader>
      <div class="grid gap-6 py-4">
        <!-- Agent Type -->
        <div class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium text-gray-400">{{
            t('spawn.type')
          }}</label>
          <div class="col-span-3">
            <Select v-model="newAgentType">
              <SelectTrigger class="w-full bg-gray-800 border-gray-700 text-gray-100">
                <SelectValue :placeholder="t('spawn.type')" />
              </SelectTrigger>
              <SelectContent class="bg-gray-800 border-gray-700 text-gray-100">
                <SelectItem v-for="at in agentTypes" :key="at.value" :value="at.value">
                  <div class="flex items-center gap-2 w-full">
                    <span>{{ at.label }}</span>
                    <Badge
                      v-if="isCliInstalled(at.value) === true"
                      variant="outline"
                      class="ml-auto text-[9px] border-green-600 text-green-400 px-1.5 py-0"
                    >
                      {{ t('spawn.installed') }}
                    </Badge>
                    <Badge
                      v-else-if="
                        isCliInstalled(at.value) === false && at.value !== 'custom'
                      "
                      variant="outline"
                      class="ml-auto text-[9px] border-gray-600 text-gray-500 px-1.5 py-0"
                    >
                      {{ t('spawn.notInstalled') }}
                    </Badge>
                    <Loader2
                      v-else-if="settingsStore.isDetecting && at.value !== 'custom'"
                      class="ml-auto w-3 h-3 animate-spin text-gray-500"
                    />
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Agent Name -->
        <div class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium text-gray-400">{{
            t('spawn.name')
          }}</label>
          <div class="col-span-3">
            <Input
              v-model="newAgentName"
              :placeholder="t('spawn.namePlaceholder')"
              class="bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
        </div>

        <!-- Custom Command (only for custom type) -->
        <div v-if="newAgentType === 'custom'" class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium text-gray-400">{{
            t('spawn.customCommand')
          }}</label>
          <div class="col-span-3">
            <Input
              v-model="customCommand"
              :placeholder="t('spawn.customCommandPlaceholder')"
              class="bg-gray-800 border-gray-700 text-gray-100 font-mono"
            />
            <div class="text-xs text-gray-500 mt-1">
              {{ t('spawn.customCommandHelp') }}
            </div>
          </div>
        </div>

        <!-- Working Directory -->
        <div class="grid grid-cols-4 items-center gap-4">
          <label class="text-right text-sm font-medium text-gray-400">{{
            t('spawn.directory')
          }}</label>
          <div class="col-span-3 flex gap-2">
            <Input
              v-model="newAgentCwd"
              :placeholder="t('spawn.directoryPlaceholder')"
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
          <div class="col-start-2 col-span-3 text-xs text-gray-500">
            {{ t('spawn.directoryHelp') }}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          variant="outline"
          class="border-gray-700 hover:bg-gray-800 text-gray-300"
          @click="emit('update:open', false)"
        >
          {{ t('spawn.cancel') }}
        </Button>
        <Button
          type="submit"
          class="bg-blue-600 hover:bg-blue-700"
          @click="handleSpawn"
        >
          {{ t('spawn.spawn') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
