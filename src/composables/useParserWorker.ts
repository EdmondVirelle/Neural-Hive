/**
 * Parser Worker Composable
 *
 * Offloads state detection and skill extraction from the renderer
 * main thread to a dedicated Web Worker. Provides a simple API
 * to dispatch parsing and receive results asynchronously.
 */

import { ref, onUnmounted } from 'vue'
import type { AgentStatus } from '@/types/shared'

interface WorkerInput {
  agentId: string
  content: string
}

interface WorkerOutput {
  agentId: string
  status: AgentStatus | null
  skill: string | null
}

type ResultCallback = (result: WorkerOutput) => void

export function useParserWorker(onResult: ResultCallback) {
  const isReady = ref(false)
  let worker: Worker | null = null

  try {
    worker = new Worker(
      new URL('../workers/parser.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
      onResult(event.data)
    }

    worker.onerror = (error) => {
      console.error('[ParserWorker] Error:', error)
    }

    isReady.value = true
  } catch (err) {
    console.warn('[ParserWorker] Web Worker not available, falling back to sync parsing:', err)
  }

  /**
   * Send content to the worker for parsing.
   * If the worker is unavailable, returns null (caller should fall back to sync).
   */
  function parse(agentId: string, content: string): boolean {
    if (!worker) return false

    const input: WorkerInput = { agentId, content }
    worker.postMessage(input)
    return true
  }

  function terminate() {
    if (worker) {
      worker.terminate()
      worker = null
      isReady.value = false
    }
  }

  onUnmounted(() => {
    terminate()
  })

  return {
    isReady,
    parse,
    terminate,
  }
}
