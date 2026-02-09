<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Search,
  Maximize2,
  Radio,
  Keyboard,
  Check,
  Loader2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const settingsStore = useSettingsStore()

const currentStep = ref(0)
const totalSteps = 4

onMounted(() => {
  if (currentStep.value === 1) {
    settingsStore.detectClis()
  }
})

function next() {
  if (currentStep.value < totalSteps - 1) {
    currentStep.value++
    if (currentStep.value === 1) {
      settingsStore.detectClis()
    }
  }
}

function back() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

async function finish() {
  await settingsStore.completeOnboarding()
  router.push('/')
}

function skip() {
  finish()
}

const installedCount = ref(0)
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-8 relative">
    <!-- Background -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/5 blur-[120px]" />
      <div class="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px]" />
    </div>

    <div class="w-full max-w-lg glass-layer rounded-2xl p-8 relative z-10">
      <!-- Progress -->
      <div class="flex items-center gap-2 mb-8">
        <div
          v-for="i in totalSteps"
          :key="i"
          class="flex-1 h-1 rounded-full transition-all duration-500"
          :class="i - 1 <= currentStep ? 'bg-blue-500' : 'bg-gray-700'"
        />
      </div>

      <!-- Step 0: Welcome -->
      <div v-if="currentStep === 0" class="text-center animate-in fade-in duration-500">
        <div class="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto mb-6">
          <Zap class="w-10 h-10 text-white" />
        </div>
        <h2 class="text-2xl font-black text-white uppercase tracking-tighter mb-2">
          {{ t('onboarding.welcome.title') }}
        </h2>
        <p class="text-sm text-blue-400 font-bold uppercase tracking-widest mb-4">
          {{ t('onboarding.welcome.subtitle') }}
        </p>
        <p class="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
          {{ t('onboarding.welcome.description') }}
        </p>
        <Button
          class="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs"
          @click="next"
        >
          {{ t('onboarding.welcome.getStarted') }}
          <ArrowRight class="w-4 h-4 ml-2" />
        </Button>
      </div>

      <!-- Step 1: CLI Detection -->
      <div v-else-if="currentStep === 1" class="animate-in fade-in duration-500">
        <div class="text-center mb-6">
          <Search class="w-10 h-10 text-blue-500 mx-auto mb-4" />
          <h2 class="text-xl font-black text-white uppercase tracking-tighter mb-1">
            {{ t('onboarding.cliDetection.title') }}
          </h2>
          <p class="text-sm text-gray-400">{{ t('onboarding.cliDetection.description') }}</p>
        </div>

        <div v-if="settingsStore.isDetecting" class="flex items-center justify-center gap-3 py-8 text-gray-400">
          <Loader2 class="w-5 h-5 animate-spin" />
          <span class="text-sm">{{ t('onboarding.cliDetection.scanning') }}</span>
        </div>

        <div v-else-if="settingsStore.cliDetectionResult" class="space-y-2 mb-6">
          <div
            v-for="cli in settingsStore.cliDetectionResult.clis"
            :key="cli.type"
            class="flex items-center justify-between p-3 rounded-lg"
            :class="cli.installed ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-800/50 border border-white/5'"
          >
            <div class="flex items-center gap-3">
              <Check v-if="cli.installed" class="w-4 h-4 text-green-500" />
              <div v-else class="w-4 h-4 rounded-full border border-gray-600" />
              <span class="text-sm font-medium" :class="cli.installed ? 'text-white' : 'text-gray-500'">
                {{ cli.name }}
              </span>
            </div>
            <Badge
              v-if="cli.installed"
              variant="outline"
              class="border-green-600 text-green-400 text-[10px]"
            >
              {{ cli.version || t('spawn.installed') }}
            </Badge>
          </div>

          <p class="text-center text-xs text-gray-500 mt-4">
            {{ settingsStore.getInstalledClis().length > 0
              ? t('onboarding.cliDetection.found', { count: settingsStore.getInstalledClis().length }, settingsStore.getInstalledClis().length)
              : t('onboarding.cliDetection.noneFound')
            }}
          </p>
        </div>

        <div class="flex justify-between">
          <Button variant="ghost" class="text-gray-400" @click="back">
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ t('onboarding.back') }}
          </Button>
          <div class="flex gap-2">
            <Button variant="outline" class="border-gray-700" @click="settingsStore.detectClis()">
              {{ t('onboarding.cliDetection.rescan') }}
            </Button>
            <Button class="bg-blue-600 hover:bg-blue-700" @click="next">
              {{ t('onboarding.cliDetection.continue') }}
              <ArrowRight class="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Step 2: Quick Start Tips -->
      <div v-else-if="currentStep === 2" class="animate-in fade-in duration-500">
        <div class="text-center mb-6">
          <h2 class="text-xl font-black text-white uppercase tracking-tighter mb-1">
            {{ t('onboarding.quickStart.title') }}
          </h2>
          <p class="text-sm text-gray-400">{{ t('onboarding.quickStart.subtitle') }}</p>
        </div>

        <div class="space-y-4 mb-8">
          <div class="flex items-start gap-4 p-3 rounded-lg bg-white/5">
            <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap class="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">{{ t('onboarding.quickStart.tip1Title') }}</h4>
              <p class="text-xs text-gray-400 mt-0.5">{{ t('onboarding.quickStart.tip1Desc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-3 rounded-lg bg-white/5">
            <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Maximize2 class="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">{{ t('onboarding.quickStart.tip2Title') }}</h4>
              <p class="text-xs text-gray-400 mt-0.5">{{ t('onboarding.quickStart.tip2Desc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-3 rounded-lg bg-white/5">
            <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Radio class="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">{{ t('onboarding.quickStart.tip3Title') }}</h4>
              <p class="text-xs text-gray-400 mt-0.5">{{ t('onboarding.quickStart.tip3Desc') }}</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-3 rounded-lg bg-white/5">
            <div class="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Keyboard class="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-white">{{ t('onboarding.quickStart.tip4Title') }}</h4>
              <p class="text-xs text-gray-400 mt-0.5">{{ t('onboarding.quickStart.tip4Desc') }}</p>
            </div>
          </div>
        </div>

        <div class="flex justify-between">
          <Button variant="ghost" class="text-gray-400" @click="back">
            <ArrowLeft class="w-4 h-4 mr-2" />
            {{ t('onboarding.back') }}
          </Button>
          <Button class="bg-blue-600 hover:bg-blue-700" @click="next">
            {{ t('onboarding.next') }}
            <ArrowRight class="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <!-- Step 3: Done -->
      <div v-else-if="currentStep === 3" class="text-center animate-in fade-in duration-500">
        <div class="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 mx-auto mb-6">
          <Check class="w-10 h-10 text-green-500" />
        </div>
        <h2 class="text-2xl font-black text-white uppercase tracking-tighter mb-2">
          {{ t('onboarding.done.title') }}
        </h2>
        <p class="text-sm text-gray-400 mb-8">
          {{ t('onboarding.done.subtitle') }}
        </p>
        <Button
          class="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs"
          @click="finish"
        >
          {{ t('onboarding.done.launchDashboard') }}
          <ArrowRight class="w-4 h-4 ml-2" />
        </Button>
      </div>

      <!-- Skip button -->
      <div v-if="currentStep > 0 && currentStep < totalSteps - 1" class="mt-6 text-center">
        <Button variant="link" class="text-gray-500 text-xs" @click="skip">
          <SkipForward class="w-3 h-3 mr-1" />
          {{ t('onboarding.skip') }}
        </Button>
      </div>
    </div>
  </div>
</template>
