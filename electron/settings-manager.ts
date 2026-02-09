/**
 * Settings Manager
 *
 * Persistent application settings stored in the user's app data directory.
 * Uses Electron's app.getPath('userData') for cross-platform storage.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { AppSettings } from '../src/types/shared.js';

const SETTINGS_FILENAME = 'settings.json';

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

export class SettingsManager {
    private settings: AppSettings;
    private filePath: string;

    constructor() {
        this.filePath = path.join(app.getPath('userData'), SETTINGS_FILENAME);
        this.settings = this.load();
    }

    /**
     * Load settings from disk, deep-merging with defaults
     */
    private load(): AppSettings {
        try {
            if (!fs.existsSync(this.filePath)) {
                return { ...DEFAULT_SETTINGS };
            }

            const raw = fs.readFileSync(this.filePath, 'utf-8');
            const stored = JSON.parse(raw) as Partial<AppSettings>;

            // Deep merge with defaults
            return {
                language: stored.language || DEFAULT_SETTINGS.language,
                theme: stored.theme || DEFAULT_SETTINGS.theme,
                onboarded: stored.onboarded ?? DEFAULT_SETTINGS.onboarded,
                cliPaths: { ...DEFAULT_SETTINGS.cliPaths, ...stored.cliPaths },
                performance: {
                    ...DEFAULT_SETTINGS.performance,
                    ...stored.performance,
                },
            };
        } catch (err) {
            console.error('Failed to load settings, using defaults:', err);
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Save settings to disk
     */
    private persist(): void {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    }

    /**
     * Get current settings
     */
    getSettings(): AppSettings {
        return { ...this.settings };
    }

    /**
     * Update and persist settings
     */
    saveSettings(newSettings: AppSettings): void {
        this.settings = {
            language: newSettings.language || DEFAULT_SETTINGS.language,
            theme: newSettings.theme || DEFAULT_SETTINGS.theme,
            onboarded: newSettings.onboarded ?? DEFAULT_SETTINGS.onboarded,
            cliPaths: { ...newSettings.cliPaths },
            performance: {
                ...DEFAULT_SETTINGS.performance,
                ...newSettings.performance,
            },
        };
        this.persist();
    }

    /**
     * Get a specific setting value
     */
    get<K extends keyof AppSettings>(key: K): AppSettings[K] {
        return this.settings[key];
    }
}
