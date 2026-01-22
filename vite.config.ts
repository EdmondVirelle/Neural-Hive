import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },

    // Output directory for production build
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vue-vendor': ['vue', 'pinia'],
                    'xterm-vendor': ['xterm', 'xterm-addon-fit'],
                },
            },
        },
    },

    // Development server configuration
    server: {
        port: 5173,
        strictPort: true,
        // Enable HMR for Electron
        watch: {
            usePolling: true,
        },
    },

    // Optimize dependencies
    optimizeDeps: {
        include: ['vue', 'pinia', 'xterm', 'xterm-addon-fit'],
    },
});
