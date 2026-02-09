import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { AppSettings, DetectClisResult, CliInfo } from '@/types/shared'
import { setLocale, type SupportedLocale } from '@/i18n'

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'dark',
  onboarded: false,
  cliPaths: {},
  performance: {
    throttleMs: 100,
    maxScrollback: 10000,
    maxAgents: 20,
  },
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const cliDetectionResult = ref<DetectClisResult | null>(null)
  const isDetecting = ref(false)
  const isLoaded = ref(false)

  /**
   * Load settings from main process
   */
  async function loadSettings(): Promise<void> {
    if (window.electronAPI?.getSettings) {
      try {
        const result = await window.electronAPI.getSettings()
        settings.value = { ...DEFAULT_SETTINGS, ...result }
        setLocale(settings.value.language as SupportedLocale)
        applyTheme(settings.value.theme)
        isLoaded.value = true
      } catch (err) {
        console.error('Failed to load settings:', err)
        isLoaded.value = true
      }
    } else {
      isLoaded.value = true
    }
  }

  /**
   * Save settings to main process
   */
  async function saveSettings(): Promise<boolean> {
    if (window.electronAPI?.saveSettings) {
      try {
        const result = await window.electronAPI.saveSettings(settings.value)
        return result.success
      } catch (err) {
        console.error('Failed to save settings:', err)
        return false
      }
    }
    return false
  }

  /**
   * Update a setting and persist
   */
  async function updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    settings.value[key] = value
    await saveSettings()
  }

  /**
   * Detect installed CLIs
   */
  async function detectClis(): Promise<DetectClisResult | null> {
    if (!window.electronAPI?.detectClis) return null

    isDetecting.value = true
    try {
      const result = await window.electronAPI.detectClis()
      cliDetectionResult.value = result
      return result
    } catch (err) {
      console.error('CLI detection failed:', err)
      return null
    } finally {
      isDetecting.value = false
    }
  }

  /**
   * Get installed CLIs only
   */
  function getInstalledClis(): CliInfo[] {
    return cliDetectionResult.value?.clis.filter(c => c.installed) || []
  }

  /**
   * Apply theme to document
   */
  function applyTheme(theme: 'dark' | 'light') {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    }
  }

  /**
   * Set onboarded flag
   */
  async function completeOnboarding(): Promise<void> {
    settings.value.onboarded = true
    await saveSettings()
  }

  // Watch language changes
  watch(
    () => settings.value.language,
    (newLang) => {
      setLocale(newLang as SupportedLocale)
    }
  )

  // Watch theme changes
  watch(
    () => settings.value.theme,
    (newTheme) => {
      applyTheme(newTheme)
    }
  )

  return {
    settings,
    cliDetectionResult,
    isDetecting,
    isLoaded,
    loadSettings,
    saveSettings,
    updateSetting,
    detectClis,
    getInstalledClis,
    applyTheme,
    completeOnboarding,
  }
})
