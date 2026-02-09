<script setup lang="ts">
/**
 * ErrorBoundary Component
 *
 * Catches rendering errors in child components and displays
 * a graceful error message with retry capability.
 */

import { ref, onErrorCaptured } from 'vue'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  section?: string
}>()

const hasError = ref(false)
const errorMessage = ref('')

onErrorCaptured((err) => {
  hasError.value = true
  errorMessage.value = err instanceof Error ? err.message : String(err)
  console.error(`[ErrorBoundary:${props.section}]`, err)
  return false // Prevent error from propagating
})

function retry() {
  hasError.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="hasError" class="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
    <div class="bg-red-500/10 p-4 rounded-2xl mb-4 border border-red-500/20">
      <AlertTriangle class="w-8 h-8 text-red-500" />
    </div>
    <h3 class="text-lg font-bold text-white mb-2">Something went wrong</h3>
    <p class="text-sm text-gray-400 mb-1">
      {{ section ? `Error in ${section}` : 'An unexpected error occurred' }}
    </p>
    <p v-if="errorMessage" class="text-xs text-gray-500 font-mono mb-4 max-w-md truncate">
      {{ errorMessage }}
    </p>
    <Button
      variant="outline"
      class="border-white/10"
      @click="retry"
    >
      <RotateCcw class="w-4 h-4 mr-2" />
      Retry
    </Button>
  </div>
  <slot v-else />
</template>
