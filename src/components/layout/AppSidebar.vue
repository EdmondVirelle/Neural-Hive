<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAgentStore } from '@/stores/agentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Globe,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const store = useAgentStore()
const settingsStore = useSettingsStore()

const collapsed = ref(false)

const statusCounts = computed(() => store.statusCounts)

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function navigate(path: string) {
  router.push(path)
}

function toggleTheme() {
  const newTheme = settingsStore.settings.theme === 'dark' ? 'light' : 'dark'
  settingsStore.updateSetting('theme', newTheme)
}

function toggleLanguage() {
  const newLang = settingsStore.settings.language === 'en' ? 'zh-TW' : 'en'
  settingsStore.updateSetting('language', newLang)
}

const navItems = computed(() => [
  { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
  { path: '/settings', icon: Settings, label: t('nav.settings') },
])
</script>

<template>
  <aside
    class="flex flex-col h-full glass-layer border-r border-white/10 transition-all duration-300 relative z-20"
    :class="collapsed ? 'w-16' : 'w-56'"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 py-5 border-b border-white/5">
      <div class="w-9 h-9 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div v-if="!collapsed" class="overflow-hidden">
        <h1 class="text-base font-black tracking-tighter uppercase text-white leading-tight">
          Neural <span class="text-blue-500">Hive</span>
        </h1>
        <span class="text-[8px] font-black tracking-[0.15em] text-gray-500 uppercase">{{ t('app.version') }}</span>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-3 px-2 space-y-1">
      <Button
        v-for="item in navItems"
        :key="item.path"
        variant="ghost"
        :class="[
          'w-full justify-start gap-3 h-10 font-bold text-xs uppercase tracking-wider transition-all',
          collapsed ? 'px-0 justify-center' : 'px-3',
          route.path === item.path
            ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        ]"
        @click="navigate(item.path)"
      >
        <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
        <span v-if="!collapsed">{{ item.label }}</span>
      </Button>
    </nav>

    <!-- Agent Stats -->
    <div v-if="!collapsed" class="px-3 py-3 border-t border-white/5">
      <div class="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Fleet Status</div>
      <div class="grid grid-cols-2 gap-1.5 text-[10px]">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-green-500" />
          <span class="text-gray-400">{{ statusCounts.IDLE }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-yellow-500" />
          <span class="text-gray-400">{{ statusCounts.THINKING }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-500" />
          <span class="text-gray-400">{{ statusCounts.WORKING }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-red-500" />
          <span class="text-gray-400">{{ statusCounts.ERROR }}</span>
        </div>
      </div>
    </div>

    <!-- Bottom Controls -->
    <div class="px-2 py-3 border-t border-white/5 space-y-1">
      <div class="flex items-center gap-1" :class="collapsed ? 'flex-col' : ''">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5"
          :title="settingsStore.settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'"
          @click="toggleTheme"
        >
          <Sun v-if="settingsStore.settings.theme === 'dark'" class="w-3.5 h-3.5" />
          <Moon v-else class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5"
          title="Toggle Language"
          @click="toggleLanguage"
        >
          <Globe class="w-3.5 h-3.5" />
        </Button>
      </div>

      <Separator class="bg-white/5" />

      <Button
        variant="ghost"
        size="icon"
        class="w-full h-8 text-gray-500 hover:text-white hover:bg-white/5"
        @click="toggleCollapse"
      >
        <ChevronLeft v-if="!collapsed" class="w-4 h-4" />
        <ChevronRight v-else class="w-4 h-4" />
      </Button>
    </div>
  </aside>
</template>
