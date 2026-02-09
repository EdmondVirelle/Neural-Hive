/**
 * Theme Composable
 *
 * Manages dark/light theme switching for the application.
 * Toggles `.dark` / `.light` class on <html> element.
 * Also provides xterm.js theme configurations.
 */

import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'

export const DARK_TERMINAL_THEME = {
  background: 'transparent',
  foreground: '#e2e8f0',
  cursor: '#60a5fa',
  cursorAccent: '#0d0f12',
  selectionBackground: 'rgba(59, 130, 246, 0.4)',
  black: '#1e293b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#f1f5f9',
  brightBlack: '#475569',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#f59e0b',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#ffffff',
}

export const LIGHT_TERMINAL_THEME = {
  background: 'transparent',
  foreground: '#1e293b',
  cursor: '#3b82f6',
  cursorAccent: '#ffffff',
  selectionBackground: 'rgba(59, 130, 246, 0.3)',
  black: '#f1f5f9',
  red: '#dc2626',
  green: '#16a34a',
  yellow: '#ca8a04',
  blue: '#2563eb',
  magenta: '#9333ea',
  cyan: '#0891b2',
  white: '#1e293b',
  brightBlack: '#94a3b8',
  brightRed: '#ef4444',
  brightGreen: '#22c55e',
  brightYellow: '#eab308',
  brightBlue: '#3b82f6',
  brightMagenta: '#a855f7',
  brightCyan: '#06b6d4',
  brightWhite: '#0f172a',
}

export function useTheme() {
  const settingsStore = useSettingsStore()

  const isDark = computed(() => settingsStore.settings.theme === 'dark')

  const terminalTheme = computed(() =>
    isDark.value ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME
  )

  function toggle() {
    const newTheme = isDark.value ? 'light' : 'dark'
    settingsStore.updateSetting('theme', newTheme)
  }

  return {
    isDark,
    terminalTheme,
    toggle,
  }
}
