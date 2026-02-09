<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopBar from '@/components/layout/AppTopBar.vue'
import SpawnDialog from '@/components/SpawnDialog.vue'
import BroadcastPanel from '@/components/BroadcastPanel.vue'
import { ref } from 'vue'

const router = useRouter()
const settingsStore = useSettingsStore()

const showSpawnDialog = ref(false)
const showBroadcastPanel = ref(false)

onMounted(async () => {
  await settingsStore.loadSettings()

  // Redirect to onboarding if not completed
  if (!settingsStore.settings.onboarded) {
    router.push('/onboarding')
  }
})

// Watch for onboarding completion
watch(
  () => settingsStore.settings.onboarded,
  (onboarded) => {
    if (!onboarded) {
      router.push('/onboarding')
    }
  }
)
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
    <!-- Orbital Background Elements -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[120px] animate-pulse-slow" />
      <div class="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px] animate-pulse-slow duration-[8s]" />
    </div>

    <!-- Onboarding (full screen, no shell) -->
    <template v-if="$route.name === 'onboarding'">
      <router-view />
    </template>

    <!-- App Shell -->
    <template v-else>
      <div class="flex h-screen relative z-10">
        <!-- Sidebar -->
        <AppSidebar />

        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
          <!-- Top Bar -->
          <AppTopBar
            @open-spawn="showSpawnDialog = true"
            @open-broadcast="showBroadcastPanel = true"
          />

          <!-- Router View -->
          <main class="flex-1 overflow-y-auto">
            <router-view />
          </main>
        </div>
      </div>
    </template>

    <!-- Global Dialogs -->
    <SpawnDialog v-model:open="showSpawnDialog" />
    <BroadcastPanel v-model:open="showBroadcastPanel" />
  </div>
</template>

<style>
html {
  color-scheme: dark;
}

html.light {
  color-scheme: light;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}
</style>
