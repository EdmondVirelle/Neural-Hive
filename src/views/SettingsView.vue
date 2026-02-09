<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AgentType } from '@/types/shared'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Settings, Terminal, Gauge, Info, Check } from 'lucide-vue-next'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const showSaved = ref(false)

const cliTypes: { type: AgentType; label: string }[] = [
  { type: 'claude', label: 'Claude Code' },
  { type: 'gemini', label: 'Gemini CLI' },
  { type: 'aider', label: 'Aider' },
  { type: 'codex', label: 'Codex CLI' },
  { type: 'opencode', label: 'OpenCode' },
  { type: 'cursor', label: 'Cursor' },
  { type: 'copilot', label: 'GitHub Copilot' },
]

const localCliPaths = ref<Partial<Record<AgentType, string>>>({ ...settingsStore.settings.cliPaths })
const localThrottle = ref(settingsStore.settings.performance.throttleMs)
const localScrollback = ref(settingsStore.settings.performance.maxScrollback)
const localMaxAgents = ref(settingsStore.settings.performance.maxAgents)

async function saveAll() {
  settingsStore.settings.cliPaths = { ...localCliPaths.value }
  settingsStore.settings.performance.throttleMs = localThrottle.value
  settingsStore.settings.performance.maxScrollback = localScrollback.value
  settingsStore.settings.performance.maxAgents = localMaxAgents.value
  await settingsStore.saveSettings()
  showSaved.value = true
  setTimeout(() => { showSaved.value = false }, 2000)
}

function setLanguage(lang: 'en' | 'zh-TW') {
  settingsStore.updateSetting('language', lang)
}

function toggleTheme() {
  const newTheme = settingsStore.settings.theme === 'dark' ? 'light' : 'dark'
  settingsStore.updateSetting('theme', newTheme)
}

function resetOnboarding() {
  settingsStore.settings.onboarded = false
  settingsStore.saveSettings()
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-black text-white uppercase tracking-tighter">{{ t('settings.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('app.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div
          v-if="showSaved"
          class="flex items-center gap-2 text-green-400 text-sm font-bold animate-in fade-in duration-300"
        >
          <Check class="w-4 h-4" />
          {{ t('settings.saved') }}
        </div>
        <Button class="bg-blue-600 hover:bg-blue-700" @click="saveAll">
          {{ t('common.save') }}
        </Button>
      </div>
    </div>

    <Tabs default-value="general">
      <TabsList class="bg-gray-800/50 border border-white/5">
        <TabsTrigger value="general" class="data-[state=active]:bg-gray-700">
          <Settings class="w-4 h-4 mr-2" />
          {{ t('settings.general') }}
        </TabsTrigger>
        <TabsTrigger value="cli" class="data-[state=active]:bg-gray-700">
          <Terminal class="w-4 h-4 mr-2" />
          {{ t('settings.cliPaths') }}
        </TabsTrigger>
        <TabsTrigger value="performance" class="data-[state=active]:bg-gray-700">
          <Gauge class="w-4 h-4 mr-2" />
          {{ t('settings.performance') }}
        </TabsTrigger>
        <TabsTrigger value="about" class="data-[state=active]:bg-gray-700">
          <Info class="w-4 h-4 mr-2" />
          {{ t('settings.about') }}
        </TabsTrigger>
      </TabsList>

      <!-- General -->
      <TabsContent value="general" class="space-y-6 mt-6">
        <!-- Language -->
        <div class="glass-layer rounded-xl p-6">
          <h3 class="text-sm font-bold text-white mb-1">{{ t('settings.language') }}</h3>
          <p class="text-xs text-gray-500 mb-4">{{ t('settings.languageDesc') }}</p>
          <div class="flex gap-3">
            <Button
              :variant="settingsStore.settings.language === 'en' ? 'default' : 'outline'"
              :class="settingsStore.settings.language === 'en' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700'"
              @click="setLanguage('en')"
            >
              {{ t('settings.english') }}
            </Button>
            <Button
              :variant="settingsStore.settings.language === 'zh-TW' ? 'default' : 'outline'"
              :class="settingsStore.settings.language === 'zh-TW' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-700'"
              @click="setLanguage('zh-TW')"
            >
              {{ t('settings.chinese') }}
            </Button>
          </div>
        </div>

        <!-- Theme -->
        <div class="glass-layer rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white mb-1">{{ t('settings.theme') }}</h3>
              <p class="text-xs text-gray-500">{{ t('settings.themeDesc') }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-400">{{ t('settings.dark') }}</span>
              <Switch
                :checked="settingsStore.settings.theme === 'light'"
                @update:checked="toggleTheme"
              />
              <span class="text-xs text-gray-400">{{ t('settings.light') }}</span>
            </div>
          </div>
        </div>

        <!-- Reset Onboarding -->
        <div class="glass-layer rounded-xl p-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white mb-1">{{ t('settings.resetOnboarding') }}</h3>
              <p class="text-xs text-gray-500">{{ t('settings.resetOnboardingDesc') }}</p>
            </div>
            <Button variant="outline" class="border-gray-700" @click="resetOnboarding">
              {{ t('settings.resetOnboarding') }}
            </Button>
          </div>
        </div>
      </TabsContent>

      <!-- CLI Paths -->
      <TabsContent value="cli" class="mt-6">
        <div class="glass-layer rounded-xl p-6">
          <p class="text-xs text-gray-500 mb-6">{{ t('settings.cliPathsDesc') }}</p>
          <div class="space-y-4">
            <div
              v-for="cli in cliTypes"
              :key="cli.type"
              class="flex items-center gap-4"
            >
              <label class="w-36 text-sm font-medium text-gray-300">{{ cli.label }}</label>
              <Input
                v-model="localCliPaths[cli.type]"
                :placeholder="t('settings.pathPlaceholder')"
                class="flex-1 bg-gray-800 border-gray-700 text-gray-100 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </TabsContent>

      <!-- Performance -->
      <TabsContent value="performance" class="space-y-6 mt-6">
        <div class="glass-layer rounded-xl p-6 space-y-6">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="text-sm font-bold text-white">{{ t('settings.throttleMs') }}</h3>
                <p class="text-xs text-gray-500">{{ t('settings.throttleMsDesc') }}</p>
              </div>
              <span class="text-sm font-mono text-blue-400">{{ localThrottle }}ms</span>
            </div>
            <Input
              v-model.number="localThrottle"
              type="number"
              min="16"
              max="500"
              step="10"
              class="w-32 bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>

          <Separator class="bg-white/5" />

          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="text-sm font-bold text-white">{{ t('settings.maxScrollback') }}</h3>
                <p class="text-xs text-gray-500">{{ t('settings.maxScrollbackDesc') }}</p>
              </div>
              <span class="text-sm font-mono text-blue-400">{{ localScrollback.toLocaleString() }}</span>
            </div>
            <Input
              v-model.number="localScrollback"
              type="number"
              min="1000"
              max="100000"
              step="1000"
              class="w-32 bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>

          <Separator class="bg-white/5" />

          <div>
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="text-sm font-bold text-white">{{ t('settings.maxAgents') }}</h3>
                <p class="text-xs text-gray-500">{{ t('settings.maxAgentsDesc') }}</p>
              </div>
              <span class="text-sm font-mono text-blue-400">{{ localMaxAgents }}</span>
            </div>
            <Input
              v-model.number="localMaxAgents"
              type="number"
              min="1"
              max="50"
              class="w-32 bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
        </div>
      </TabsContent>

      <!-- About -->
      <TabsContent value="about" class="mt-6">
        <div class="glass-layer rounded-xl p-8 text-center">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-6">
            <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 class="text-xl font-black text-white uppercase tracking-tighter mb-1">{{ t('settings.aboutTitle') }}</h2>
          <p class="text-sm text-blue-400 mb-4">{{ t('settings.aboutVersion', { version: '1.0.4' }) }}</p>
          <p class="text-sm text-gray-400 max-w-md mx-auto">{{ t('settings.aboutDesc') }}</p>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
