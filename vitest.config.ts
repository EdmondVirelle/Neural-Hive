import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],

    test: {
        // Enable global test APIs (describe, it, expect)
        globals: true,

        // Use jsdom for DOM simulation
        environment: 'jsdom',

        // Test file patterns
        include: [
            'src/**/__tests__/**/*.spec.ts',
            'src/**/__tests__/**/*.test.ts',
            'electron/**/__tests__/**/*.spec.ts',
            'electron/**/__tests__/**/*.test.ts',
        ],

        // Exclude patterns
        exclude: [
            'node_modules',
            'dist',
            '.idea',
            '.git',
        ],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',

            // Files to include in coverage
            include: [
                'src/**/*.ts',
                'src/**/*.vue',
                'electron/**/*.ts',
            ],

            // Files to exclude from coverage
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.d.ts',
                '**/__tests__/**',
                '**/types/**',
                'src/main.ts', // Entry point
            ],

            // Coverage thresholds (NFR: ≥75%)
            thresholds: {
                global: {
                    branches: 75,
                    functions: 75,
                    lines: 75,
                    statements: 75,
                },
            },
        },

        // Setup files
        setupFiles: ['./src/__tests__/setup.ts'],

        // Mock dependencies
        deps: {
            inline: ['vue'],
        },
    },

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
