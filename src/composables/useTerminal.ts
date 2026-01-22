/**
 * xterm.js Terminal Integration Composable
 *
 * Provides reactive terminal management with:
 * - xterm.js instance lifecycle
 * - FitAddon for automatic resizing
 * - Buffer management (NFR-02: 10,000 line limit)
 * - Write, clear, and destroy operations
 */

import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

// Terminal configuration
const TERMINAL_OPTIONS = {
    cursorBlink: true,
    cursorStyle: 'bar' as const,
    fontSize: 13,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
        background: '#0d0f12',
        foreground: '#e5e7eb',
        cursor: '#60a5fa',
        cursorAccent: '#0d0f12',
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
        black: '#1f2937',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f3f4f6',
        brightBlack: '#4b5563',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
    },
    scrollback: 10000, // NFR-02: Buffer limit
    allowTransparency: true,
};

export interface UseTerminalReturn {
    /** The xterm.js Terminal instance */
    terminal: Ref<Terminal | null>;
    /** Whether the terminal is ready */
    isReady: Ref<boolean>;
    /** Write data to the terminal */
    write: (data: string) => void;
    /** Write a line to the terminal */
    writeln: (data: string) => void;
    /** Clear the terminal */
    clear: () => void;
    /** Resize the terminal to fit container */
    fit: () => void;
    /** Focus the terminal */
    focus: () => void;
    /** Dispose of the terminal */
    dispose: () => void;
}

/**
 * Composable for managing an xterm.js terminal instance
 *
 * @param containerRef - Ref to the container element
 * @param onData - Callback when user types in terminal
 * @param onResize - Callback when terminal is resized
 * @returns Terminal control methods
 *
 * @example
 * ```vue
 * <script setup>
 * const containerRef = ref<HTMLElement | null>(null);
 * const { write, clear, isReady } = useTerminal(
 *   containerRef,
 *   (data) => sendToAgent(data),
 *   (cols, rows) => resizeAgent(cols, rows)
 * );
 * </script>
 *
 * <template>
 *   <div ref="containerRef" class="w-full h-full" />
 * </template>
 * ```
 */
export function useTerminal(
    containerRef: Ref<HTMLElement | null>,
    onData?: (data: string) => void,
    onResize?: (cols: number, rows: number) => void
): UseTerminalReturn {
    const terminal = ref<Terminal | null>(null);
    const fitAddon = ref<FitAddon | null>(null);
    const isReady = ref(false);

    // ResizeObserver for container size changes
    let resizeObserver: ResizeObserver | null = null;

    /**
     * Initialize the terminal when container is available
     */
    function initTerminal() {
        if (!containerRef.value || terminal.value) return;

        // Create terminal instance
        const term = new Terminal(TERMINAL_OPTIONS);
        terminal.value = term;

        // Create and attach FitAddon
        const fit = new FitAddon();
        fitAddon.value = fit;
        term.loadAddon(fit);

        // Open terminal in container
        term.open(containerRef.value);

        // Initial fit
        requestAnimationFrame(() => {
            fit.fit();
        });

        // Setup data callback
        if (onData) {
            term.onData(onData);
        }

        // Setup resize callback
        term.onResize((size) => {
            if (onResize) {
                onResize(size.cols, size.rows);
            }
        });

        // Setup resize observer
        resizeObserver = new ResizeObserver(() => {
            if (!terminal.value || !fitAddon.value) return;

            // Debounce/Defer fit to ensure terminal is ready and avoid resize loops
            requestAnimationFrame(() => {
                if (fitAddon.value && terminal.value) {
                    try {
                        fitAddon.value.fit();
                    } catch (e) {
                        console.warn('Terminal fit failed:', e);
                    }
                }
            });
        });
        resizeObserver.observe(containerRef.value);

        isReady.value = true;
    }

    /**
     * Write raw data to terminal
     */
    function write(data: string): void {
        if (terminal.value) {
            terminal.value.write(data);
        }
    }

    /**
     * Write a line to terminal (with newline)
     */
    function writeln(data: string): void {
        if (terminal.value) {
            terminal.value.writeln(data);
        }
    }

    /**
     * Clear terminal content
     */
    function clear(): void {
        if (terminal.value) {
            terminal.value.clear();
        }
    }

    /**
     * Resize terminal to fit container
     */
    function fit(): void {
        if (fitAddon.value) {
            fitAddon.value.fit();
        }
    }

    /**
     * Focus the terminal
     */
    function focus(): void {
        if (terminal.value) {
            terminal.value.focus();
        }
    }

    /**
     * Dispose of terminal and cleanup resources
     */
    function dispose(): void {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        if (terminal.value) {
            terminal.value.dispose();
            terminal.value = null;
        }

        fitAddon.value = null;
        isReady.value = false;
    }

    // Watch for container changes
    watch(containerRef, (newContainer) => {
        if (newContainer && !terminal.value) {
            initTerminal();
        }
    });

    // Initialize on mount if container exists
    onMounted(() => {
        if (containerRef.value) {
            initTerminal();
        }
    });

    // Cleanup on unmount
    onUnmounted(() => {
        dispose();
    });

    return {
        terminal,
        isReady,
        write,
        writeln,
        clear,
        fit,
        focus,
        dispose,
    };
}
