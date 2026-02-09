<script setup lang="ts">
/**
 * LogSearch Component
 *
 * Floating search bar for terminal log searching in FocusMode.
 * Uses xterm's SearchAddon for in-terminal search.
 * VS Code-style floating search bar with Ctrl+F to toggle.
 */

import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, ChevronUp, ChevronDown } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  search: [query: string]
  'search-next': []
  'search-prev': []
  close: []
}>()

const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

function handleSearch() {
  emit('search', searchQuery.value)
}

function handleNext() {
  emit('search-next')
}

function handlePrev() {
  emit('search-prev')
}

function handleClose() {
  searchQuery.value = ''
  emit('close')
  emit('update:visible', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
  } else if (event.key === 'Enter') {
    if (event.shiftKey) {
      handlePrev()
    } else {
      handleNext()
    }
  }
}

watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    setTimeout(() => {
      searchInput.value?.focus()
    }, 100)
  }
})

watch(searchQuery, () => {
  handleSearch()
})
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="visible"
      class="absolute top-4 right-4 z-50 flex items-center gap-2 bg-gray-800/95 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 shadow-xl"
    >
      <Input
        ref="searchInput"
        v-model="searchQuery"
        :placeholder="t('focus.searchPlaceholder')"
        class="w-64 h-8 bg-gray-900 border-gray-700 text-gray-100 text-sm"
        @keydown="handleKeydown"
      />
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-gray-400 hover:text-white"
        @click="handlePrev"
      >
        <ChevronUp class="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-gray-400 hover:text-white"
        @click="handleNext"
      >
        <ChevronDown class="w-4 h-4" />
      </Button>
      <div class="w-px h-5 bg-white/10" />
      <Button
        variant="ghost"
        size="icon"
        class="h-7 w-7 text-gray-400 hover:text-white"
        @click="handleClose"
      >
        <X class="w-4 h-4" />
      </Button>
    </div>
  </Transition>
</template>
