/**
 * Unit tests for SettingsManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsManager } from '../settings-manager';
import type { AppSettings } from '../../src/types/shared';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(),
  },
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('SettingsManager', () => {
  const TEMP_DIR = '/tmp/test-app-data';
  const SETTINGS_FILE_PATH = path.join(TEMP_DIR, 'settings.json');

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
  };

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock app.getPath to return temp directory
    vi.mocked(app.getPath).mockReturnValue(TEMP_DIR);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use app.getPath("userData") to determine settings file location', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      new SettingsManager();

      expect(app.getPath).toHaveBeenCalledWith('userData');
    });

    it('should load settings from disk during initialization', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_SETTINGS));

      new SettingsManager();

      expect(fs.existsSync).toHaveBeenCalledWith(SETTINGS_FILE_PATH);
      expect(fs.readFileSync).toHaveBeenCalledWith(SETTINGS_FILE_PATH, 'utf-8');
    });
  });

  describe('getSettings', () => {
    it('should return default settings when no file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();
      const settings = manager.getSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should return a copy of settings (not the internal reference)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();
      const settings1 = manager.getSettings();
      const settings2 = manager.getSettings();

      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2); // Different references
    });

    it('should read and deep-merge with defaults when file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Partial settings stored on disk
      const storedSettings: Partial<AppSettings> = {
        language: 'zh-TW',
        theme: 'light',
        performance: {
          throttleMs: 200,
          maxScrollback: 10000,
          maxAgents: 20,
        },
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedSettings));

      const manager = new SettingsManager();
      const settings = manager.getSettings();

      expect(settings).toEqual({
        language: 'zh-TW',
        theme: 'light',
        onboarded: false, // From defaults
        cliPaths: {}, // From defaults
        performance: {
          throttleMs: 200, // From stored
          maxScrollback: 10000, // From defaults (merged)
          maxAgents: 20, // From defaults (merged)
        },
      });
    });

    it('should handle onboarded:false correctly (not treat as falsy)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const storedSettings: Partial<AppSettings> = {
        onboarded: false,
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedSettings));

      const manager = new SettingsManager();
      const settings = manager.getSettings();

      expect(settings.onboarded).toBe(false);
    });

    it('should use defaults when file read fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const manager = new SettingsManager();
      const settings = manager.getSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load settings, using defaults:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should use defaults when JSON parsing fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json {');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const manager = new SettingsManager();
      const settings = manager.getSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load settings, using defaults:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should deep-merge cliPaths correctly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const storedSettings: Partial<AppSettings> = {
        cliPaths: {
          claude: '/usr/local/bin/claude',
          gemini: '/usr/local/bin/gemini',
        },
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedSettings));

      const manager = new SettingsManager();
      const settings = manager.getSettings();

      expect(settings.cliPaths).toEqual({
        claude: '/usr/local/bin/claude',
        gemini: '/usr/local/bin/gemini',
      });
    });
  });

  describe('saveSettings', () => {
    it('should write settings to disk properly', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      const newSettings: AppSettings = {
        language: 'zh-TW',
        theme: 'light',
        onboarded: true,
        cliPaths: {
          claude: '/usr/local/bin/claude',
        },
        performance: {
          throttleMs: 150,
          maxScrollback: 5000,
          maxAgents: 10,
        },
      };

      manager.saveSettings(newSettings);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        SETTINGS_FILE_PATH,
        JSON.stringify(newSettings, null, 2),
        'utf-8'
      );
    });

    it('should create directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValueOnce(false); // During load
      vi.mocked(fs.existsSync).mockReturnValueOnce(false); // During persist (dir check)

      const manager = new SettingsManager();

      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        language: 'zh-TW',
      };

      manager.saveSettings(newSettings);

      // On Windows, path.join will normalize the path separators
      const normalizedTempDir = path.normalize(TEMP_DIR);
      expect(fs.mkdirSync).toHaveBeenCalledWith(normalizedTempDir, { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(DEFAULT_SETTINGS));

      const manager = new SettingsManager();

      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        language: 'zh-TW',
      };

      manager.saveSettings(newSettings);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle write failures gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const manager = new SettingsManager();

      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        language: 'zh-TW',
      };

      expect(() => manager.saveSettings(newSettings)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save settings:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should merge performance settings with defaults', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      const newSettings: AppSettings = {
        language: 'en',
        theme: 'dark',
        onboarded: false,
        cliPaths: {},
        performance: {
          throttleMs: 200,
          maxScrollback: 10000,
          maxAgents: 20,
        },
      };

      manager.saveSettings(newSettings);

      const savedSettings = manager.getSettings();
      expect(savedSettings.performance).toEqual({
        throttleMs: 200,
        maxScrollback: 10000, // From defaults
        maxAgents: 20, // From defaults
      });
    });

    it('should update internal settings after save', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      const initialSettings = manager.getSettings();
      expect(initialSettings.language).toBe('en');

      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        language: 'zh-TW',
      };

      manager.saveSettings(newSettings);

      const updatedSettings = manager.getSettings();
      expect(updatedSettings.language).toBe('zh-TW');
    });

    it('should preserve cliPaths when saving', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        cliPaths: {
          claude: '/usr/local/bin/claude',
          gemini: '/usr/local/bin/gemini',
        },
      };

      manager.saveSettings(newSettings);

      const savedSettings = manager.getSettings();
      expect(savedSettings.cliPaths).toEqual({
        claude: '/usr/local/bin/claude',
        gemini: '/usr/local/bin/gemini',
      });
    });
  });

  describe('get', () => {
    it('should return a specific setting value by key', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      expect(manager.get('language')).toBe('en');
      expect(manager.get('theme')).toBe('dark');
      expect(manager.get('onboarded')).toBe(false);
      expect(manager.get('cliPaths')).toEqual({});
      expect(manager.get('performance')).toEqual({
        throttleMs: 100,
        maxScrollback: 10000,
        maxAgents: 20,
      });
    });

    it('should return updated values after saveSettings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      expect(manager.get('language')).toBe('en');

      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        language: 'zh-TW',
      };

      manager.saveSettings(newSettings);

      expect(manager.get('language')).toBe('zh-TW');
    });

    it('should return complex objects for nested settings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      const performance = manager.get('performance');
      expect(performance).toEqual({
        throttleMs: 100,
        maxScrollback: 10000,
        maxAgents: 20,
      });
    });

    it('should be type-safe with keyof AppSettings', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      // TypeScript should allow valid keys
      const language: string = manager.get('language');
      const theme: string = manager.get('theme');
      const onboarded: boolean = manager.get('onboarded');
      const cliPaths: Record<string, string> = manager.get('cliPaths');
      const performance: AppSettings['performance'] = manager.get('performance');

      expect(language).toBeDefined();
      expect(theme).toBeDefined();
      expect(onboarded).toBeDefined();
      expect(cliPaths).toBeDefined();
      expect(performance).toBeDefined();
    });
  });

  describe('partial settings merging', () => {
    it('should merge partial settings correctly (not overwrite completely)', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Start with some stored settings
      const initialSettings: Partial<AppSettings> = {
        language: 'zh-TW',
        theme: 'light',
        onboarded: true,
        cliPaths: {
          claude: '/usr/local/bin/claude',
          gemini: '/usr/local/bin/gemini',
        },
        performance: {
          throttleMs: 200,
          maxScrollback: 5000,
          maxAgents: 15,
        },
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialSettings));

      const manager = new SettingsManager();

      // Verify initial load
      let settings = manager.getSettings();
      expect(settings.language).toBe('zh-TW');
      expect(settings.cliPaths.claude).toBe('/usr/local/bin/claude');
      expect(settings.performance.throttleMs).toBe(200);

      // Now save with partial update (only changing language back to en)
      const partialUpdate: AppSettings = {
        ...settings,
        language: 'en',
      };

      manager.saveSettings(partialUpdate);

      // Verify that other settings are preserved
      settings = manager.getSettings();
      expect(settings.language).toBe('en'); // Updated
      expect(settings.theme).toBe('light'); // Preserved
      expect(settings.onboarded).toBe(true); // Preserved
      expect(settings.cliPaths.claude).toBe('/usr/local/bin/claude'); // Preserved
      expect(settings.performance.throttleMs).toBe(200); // Preserved
    });

    it('should handle partial performance updates', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const manager = new SettingsManager();

      // Save with partial performance settings
      const newSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        performance: {
          ...DEFAULT_SETTINGS.performance,
          throttleMs: 500, // Only change this
        },
      };

      manager.saveSettings(newSettings);

      const performance = manager.get('performance');
      expect(performance.throttleMs).toBe(500);
      expect(performance.maxScrollback).toBe(10000); // Still default
      expect(performance.maxAgents).toBe(20); // Still default
    });

    it('should handle empty cliPaths update', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const initialSettings: Partial<AppSettings> = {
        cliPaths: {
          claude: '/usr/local/bin/claude',
        },
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialSettings));

      const manager = new SettingsManager();

      // Verify initial
      expect(manager.get('cliPaths')).toEqual({ claude: '/usr/local/bin/claude' });

      // Save with empty cliPaths (should overwrite, not merge)
      const newSettings: AppSettings = {
        ...manager.getSettings(),
        cliPaths: {},
      };

      manager.saveSettings(newSettings);

      expect(manager.get('cliPaths')).toEqual({});
    });

    it('should handle adding new CLI paths without losing existing ones', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const initialSettings: Partial<AppSettings> = {
        cliPaths: {
          claude: '/usr/local/bin/claude',
        },
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(initialSettings));

      const manager = new SettingsManager();

      // Add new CLI path
      const currentSettings = manager.getSettings();
      const newSettings: AppSettings = {
        ...currentSettings,
        cliPaths: {
          ...currentSettings.cliPaths,
          gemini: '/usr/local/bin/gemini',
        },
      };

      manager.saveSettings(newSettings);

      expect(manager.get('cliPaths')).toEqual({
        claude: '/usr/local/bin/claude',
        gemini: '/usr/local/bin/gemini',
      });
    });
  });
});
