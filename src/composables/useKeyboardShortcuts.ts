/**
 * Keyboard Shortcuts Composable
 *
 * Global keyboard shortcuts for the application:
 * - Ctrl+N: Spawn new agent
 * - Ctrl+B: Open broadcast panel
 * - Ctrl+,: Open settings
 * - Ctrl+1-9: Focus agent by index
 * - Ctrl+F: Log search (in FocusMode)
 */

import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export interface KeyboardShortcutCallbacks {
  onSpawn?: () => void
  onBroadcast?: () => void
  onFocusAgent?: (index: number) => void
  onLogSearch?: () => void
}

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  const router = useRouter()

  function handleKeydown(event: KeyboardEvent) {
    // Ignore when typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape to blur from inputs
      if (event.key === 'Escape') {
        target.blur()
      }
      return
    }

    const isCtrl = event.ctrlKey || event.metaKey

    if (!isCtrl) return

    switch (event.key) {
      case 'n':
      case 'N':
        event.preventDefault()
        callbacks.onSpawn?.()
        break

      case 'b':
      case 'B':
        event.preventDefault()
        callbacks.onBroadcast?.()
        break

      case ',':
        event.preventDefault()
        router.push('/settings')
        break

      case 'f':
      case 'F':
        event.preventDefault()
        callbacks.onLogSearch?.()
        break

      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        event.preventDefault()
        callbacks.onFocusAgent?.(parseInt(event.key) - 1)
        break
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
