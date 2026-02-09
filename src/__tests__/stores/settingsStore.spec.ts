/**
 * Unit Tests for Settings Store
 *
 * Tests the settings store functionality including loading, saving,
 * updating settings, CLI detection, and onboarding completion.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settingsStore'
import { mockElectronAPI } from '../setup'
import type { AppSettings, DetectClisResult } from '@/types/shared'

// Mock the i18n module
vi.mock('@/i18n', () => ({
  setLocale: vi.fn(),
  type: {
    SupportedLocale: {} as any
  }
}))

describe('settingsStore', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())

    // Reset mocks
    vi.clearAllMocks()

    // Reset the mock implementations to defaults
    mockElectronAPI.getSettings.mockResolvedValue({
      language: 'en',
      theme: 'dark',
      onboarded: false,
      cliPaths: {},
      performance: { throttleMs: 100, maxScrollback: 10000, maxAgents: 10 }
    })
    mockElectronAPI.saveSettings.mockResolvedValue({ success: true })
    mockElectronAPI.detectClis.mockResolvedValue({ clis: [], timestamp: Date.now() })
  })

  describe('loadSettings', () => {
    it('should call electronAPI.getSettings and populate state', async () => {
      const store = useSettingsStore()

      const mockSettings: AppSettings = {
        language: 'zh-TW',
        theme: 'light',
        onboarded: true,
        cliPaths: { claude: '/usr/bin/claude' },
        performance: { throttleMs: 200, maxScrollback: 5000, maxAgents: 15 }
      }

      mockElectronAPI.getSettings.mockResolvedValue(mockSettings)

      await store.loadSettings()

      expect(mockElectronAPI.getSettings).toHaveBeenCalledOnce()
      expect(store.settings).toEqual(mockSettings)
      expect(store.isLoaded).toBe(true)
    })

    it('should merge loaded settings with defaults', async () => {
      const store = useSettingsStore()

      const partialSettings = {
        language: 'zh-TW',
        theme: 'light' as const
      }

      mockElectronAPI.getSettings.mockResolvedValue(partialSettings)

      await store.loadSettings()

      expect(store.settings.language).toBe('zh-TW')
      expect(store.settings.theme).toBe('light')
      expect(store.settings.onboarded).toBe(false) // default value
      expect(store.settings.cliPaths).toEqual({}) // default value
    })

    it('should handle errors gracefully', async () => {
      const store = useSettingsStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockElectronAPI.getSettings.mockRejectedValue(new Error('Failed to load'))

      await store.loadSettings()

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error))
      expect(store.isLoaded).toBe(true) // should still be marked as loaded
      consoleErrorSpy.mockRestore()
    })

    it('should set isLoaded to true when electronAPI is not available', async () => {
      // Temporarily remove electronAPI
      const originalAPI = window.electronAPI
      // @ts-ignore
      window.electronAPI = undefined

      const store = useSettingsStore()
      await store.loadSettings()

      expect(store.isLoaded).toBe(true)

      // Restore electronAPI
      window.electronAPI = originalAPI
    })
  })

  describe('saveSettings', () => {
    it('should call electronAPI.saveSettings with current settings', async () => {
      const store = useSettingsStore()

      store.settings = {
        language: 'en',
        theme: 'dark',
        onboarded: true,
        cliPaths: { claude: '/usr/bin/claude' },
        performance: { throttleMs: 100, maxScrollback: 10000, maxAgents: 10 }
      }

      const result = await store.saveSettings()

      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(store.settings)
      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      const store = useSettingsStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockElectronAPI.saveSettings.mockRejectedValue(new Error('Save failed'))

      const result = await store.saveSettings()

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })

    it('should return false when electronAPI is not available', async () => {
      // Temporarily remove electronAPI
      const originalAPI = window.electronAPI
      // @ts-ignore
      window.electronAPI = undefined

      const store = useSettingsStore()
      const result = await store.saveSettings()

      expect(result).toBe(false)

      // Restore electronAPI
      window.electronAPI = originalAPI
    })

    it('should return false when saveSettings returns unsuccessful result', async () => {
      const store = useSettingsStore()

      mockElectronAPI.saveSettings.mockResolvedValue({ success: false })

      const result = await store.saveSettings()

      expect(result).toBe(false)
    })
  })

  describe('updateSetting', () => {
    it('should modify a single key and save', async () => {
      const store = useSettingsStore()

      await store.updateSetting('language', 'zh-TW')

      expect(store.settings.language).toBe('zh-TW')
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'zh-TW' })
      )
    })

    it('should update theme setting', async () => {
      const store = useSettingsStore()

      await store.updateSetting('theme', 'light')

      expect(store.settings.theme).toBe('light')
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
    })

    it('should update onboarded setting', async () => {
      const store = useSettingsStore()

      await store.updateSetting('onboarded', true)

      expect(store.settings.onboarded).toBe(true)
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
    })

    it('should update cliPaths setting', async () => {
      const store = useSettingsStore()

      const newCliPaths = { claude: '/usr/local/bin/claude', aider: '/usr/local/bin/aider' }
      await store.updateSetting('cliPaths', newCliPaths)

      expect(store.settings.cliPaths).toEqual(newCliPaths)
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
    })

    it('should update performance setting', async () => {
      const store = useSettingsStore()

      const newPerformance = { throttleMs: 50, maxScrollback: 20000, maxAgents: 30 }
      await store.updateSetting('performance', newPerformance)

      expect(store.settings.performance).toEqual(newPerformance)
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
    })
  })

  describe('detectClis', () => {
    it('should call electronAPI.detectClis and store results', async () => {
      const store = useSettingsStore()

      const mockResult: DetectClisResult = {
        clis: [
          { type: 'claude', name: 'claude', installed: true, path: '/usr/bin/claude', version: '1.0.0' },
          { type: 'aider', name: 'aider', installed: false, path: undefined, version: undefined }
        ],
        timestamp: Date.now()
      }

      mockElectronAPI.detectClis.mockResolvedValue(mockResult)

      const result = await store.detectClis()

      expect(mockElectronAPI.detectClis).toHaveBeenCalledOnce()
      expect(store.cliDetectionResult).toEqual(mockResult)
      expect(result).toEqual(mockResult)
      expect(store.isDetecting).toBe(false)
    })

    it('should set isDetecting to true during detection', async () => {
      const store = useSettingsStore()

      let isDetectingDuringCall = false

      mockElectronAPI.detectClis.mockImplementation(async () => {
        isDetectingDuringCall = store.isDetecting
        return { clis: [], timestamp: Date.now() }
      })

      await store.detectClis()

      expect(isDetectingDuringCall).toBe(true)
      expect(store.isDetecting).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const store = useSettingsStore()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockElectronAPI.detectClis.mockRejectedValue(new Error('Detection failed'))

      const result = await store.detectClis()

      expect(result).toBeNull()
      expect(store.isDetecting).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith('CLI detection failed:', expect.any(Error))
      consoleErrorSpy.mockRestore()
    })

    it('should return null when electronAPI is not available', async () => {
      // Temporarily remove electronAPI
      const originalAPI = window.electronAPI
      // @ts-ignore
      window.electronAPI = undefined

      const store = useSettingsStore()
      const result = await store.detectClis()

      expect(result).toBeNull()

      // Restore electronAPI
      window.electronAPI = originalAPI
    })
  })

  describe('getInstalledClis', () => {
    it('should return only installed CLIs', async () => {
      const store = useSettingsStore()

      const mockResult: DetectClisResult = {
        clis: [
          { type: 'claude', name: 'claude', installed: true, path: '/usr/bin/claude', version: '1.0.0' },
          { type: 'aider', name: 'aider', installed: false, path: undefined, version: undefined },
          { type: 'cursor', name: 'cursor', installed: true, path: '/usr/bin/cursor', version: '2.0.0' }
        ],
        timestamp: Date.now()
      }

      mockElectronAPI.detectClis.mockResolvedValue(mockResult)
      await store.detectClis()

      const installedClis = store.getInstalledClis()

      expect(installedClis).toHaveLength(2)
      expect(installedClis[0].name).toBe('claude')
      expect(installedClis[1].name).toBe('cursor')
      expect(installedClis.every(cli => cli.installed)).toBe(true)
    })

    it('should return empty array when no CLIs are detected', () => {
      const store = useSettingsStore()

      const installedClis = store.getInstalledClis()

      expect(installedClis).toEqual([])
    })

    it('should return empty array when all CLIs are not installed', async () => {
      const store = useSettingsStore()

      const mockResult: DetectClisResult = {
        clis: [
          { type: 'claude', name: 'claude', installed: false, path: undefined, version: undefined },
          { type: 'aider', name: 'aider', installed: false, path: undefined, version: undefined }
        ],
        timestamp: Date.now()
      }

      mockElectronAPI.detectClis.mockResolvedValue(mockResult)
      await store.detectClis()

      const installedClis = store.getInstalledClis()

      expect(installedClis).toEqual([])
    })
  })

  describe('completeOnboarding', () => {
    it('should set onboarded to true and save', async () => {
      const store = useSettingsStore()

      expect(store.settings.onboarded).toBe(false)

      await store.completeOnboarding()

      expect(store.settings.onboarded).toBe(true)
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledOnce()
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ onboarded: true })
      )
    })

    it('should persist onboarded state', async () => {
      const store = useSettingsStore()

      await store.completeOnboarding()

      expect(store.settings.onboarded).toBe(true)

      // Verify that the setting persists by checking it wasn't reset
      expect(store.settings.onboarded).toBe(true)
    })
  })

  describe('applyTheme', () => {
    it('should apply dark theme to document', () => {
      const store = useSettingsStore()

      store.applyTheme('dark')

      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.classList.contains('light')).toBe(false)
    })

    it('should apply light theme to document', () => {
      const store = useSettingsStore()

      store.applyTheme('light')

      expect(document.documentElement.classList.contains('light')).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should switch from dark to light theme', () => {
      const store = useSettingsStore()

      store.applyTheme('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(true)

      store.applyTheme('light')
      expect(document.documentElement.classList.contains('light')).toBe(true)
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('initial state', () => {
    it('should have correct default values', () => {
      const store = useSettingsStore()

      expect(store.settings.language).toBe('en')
      expect(store.settings.theme).toBe('dark')
      expect(store.settings.onboarded).toBe(false)
      expect(store.settings.cliPaths).toEqual({})
      expect(store.settings.performance).toEqual({
        throttleMs: 100,
        maxScrollback: 10000,
        maxAgents: 20
      })
      expect(store.cliDetectionResult).toBeNull()
      expect(store.isDetecting).toBe(false)
      expect(store.isLoaded).toBe(false)
    })
  })
})
