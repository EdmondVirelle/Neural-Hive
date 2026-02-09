import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AgentSession, AgentType, LogPayload, AgentStatus, ResourceUpdatePayload } from '@/types/shared';
import { detectState, extractSkill } from '@/utils/parser';

// Generate unique agent ID
function generateId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Generate default agent name
function generateName(type: AgentType, index: number): string {
  const typeNames: Record<AgentType, string> = {
    claude: 'Claude',
    gemini: 'Gemini',
    aider: 'Aider',
    codex: 'Codex',
    opencode: 'OpenCode',
    cursor: 'Cursor',
    copilot: 'Copilot',
    custom: 'Custom',
  };
  const typeName = typeNames[type] ?? 'Agent';
  return `${typeName}-${String(index).padStart(2, '0')}`;
}

export const useAgentStore = defineStore('agent', () => {
  // State: Map of agent sessions keyed by ID
  const agents = ref<Map<string, AgentSession>>(new Map());

  // Counter for naming agents
  const agentCounter = ref(0);

  // Log update counter: incremented each time new logs arrive.
  // TerminalView watches this instead of deep-watching the logs array.
  const logUpdateCounter = ref(0);

  // Track previous status before pause (FR-01-03)
  // Map<agentId, previousStatus>
  const pausedPreviousStatus = ref<Map<string, AgentStatus>>(new Map());

  // Computed: Get agents as array for iteration
  const agentList = computed(() => Array.from(agents.value.values()));

  // Computed: Get agent count by status
  const statusCounts = computed(() => {
    const counts: Record<AgentStatus, number> = {
      IDLE: 0,
      THINKING: 0,
      WORKING: 0,
      ERROR: 0,
      WAITING_USER: 0,
      PAUSED: 0,
      STALLED: 0,
    };
    for (const agent of agents.value.values()) {
      counts[agent.status]++;
    }
    return counts;
  });

  // Computed: Get total memory usage across all agents (AGENT-02)
  const totalMemoryUsage = computed(() => {
    let total = 0;
    for (const agent of agents.value.values()) {
      if (agent.resourceUsage) {
        total += agent.resourceUsage.memory;
      }
    }
    return total;
  });

  /**
   * Spawn a new agent session
   */
  async function spawnAgent(
    type: AgentType = 'claude',
    cwd: string = process.cwd?.() || '.',
    customName?: string
  ): Promise<string> {
    agentCounter.value++;
    // Generate name first
    const name = customName || generateName(type, agentCounter.value);

    let id = generateId(); // Default/Fallback ID

    // Request Main Process to spawn the actual CLI process first to get the real ID
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.spawnAgent({ type, cwd, name });
        if (result.success && result.agentId) {
          id = result.agentId;
        } else if (result.error) {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Failed to spawn agent:', error);
        // Create an error session so user sees something happened
        const session: AgentSession = {
          id,
          name,
          type,
          status: 'ERROR',
          cwd,
          logs: [{
            timestamp: Date.now(),
            content: `Failed to spawn agent: ${error}`,
            type: 'system',
          }],
          createdAt: Date.now(),
        };
        agents.value.set(id, session);
        return id;
      }
    }

    const session: AgentSession = {
      id,
      name,
      type,
      status: 'IDLE', // Initially IDLE, backend will send updates
      cwd,
      logs: [],
      createdAt: Date.now(),
    };

    agents.value.set(id, session);
    return id;
  }

  /**
   * Send a command to a specific agent
   */
  async function sendCommand(agentId: string, text: string): Promise<void> {
    const agent = agents.value.get(agentId);
    if (!agent) {
      console.error(`Agent ${agentId} not found`);
      return;
    }

    // Do not manually add command to logs. 
    // Let the PTY (xterm) handle the echo back to us.
    // This prevents "Double Echo" (123123).

    // Send to Main Process
    if (window.electronAPI) {
      try {
        await window.electronAPI.sendCommand(agentId, text);
      } catch (error) {
        agent.logs.push({
          timestamp: Date.now(),
          content: `Failed to send command: ${error}`,
          type: 'system',
        });
      }
    }
  }

  /**
   * Handle incoming log from IPC (called by Main Process events)
   */
  function handleIncomingLog(payload: LogPayload): void {
    const agent = agents.value.get(payload.agentId);
    if (!agent) {
      console.warn(`Received log for unknown agent: ${payload.agentId}`);
      return;
    }

    // Append log entry
    agent.logs.push({
      timestamp: Date.now(),
      content: payload.content,
      type: payload.type,
    });

    // Bump counter so watchers can react without deep-watching the logs array
    logUpdateCounter.value++;

    // Parse output to detect state changes
    // FR-01-03: Don't change status if agent is paused
    const detectedStatus = detectState(payload.content);
    if (detectedStatus && agent.status !== 'PAUSED') {
      agent.status = detectedStatus;
    }

    // Extract skill/activity if available
    const skill = extractSkill(payload.content);
    if (skill) {
      agent.currentActivity = skill;
    }

    // Trim logs if exceeding limit (NFR-02: 10,000 lines)
    const MAX_LOGS = 10000;
    if (agent.logs.length > MAX_LOGS) {
      agent.logs = agent.logs.slice(-MAX_LOGS);
    }
  }

  /**
   * Update agent status directly (for external status updates)
   */
  function updateStatus(agentId: string, status: AgentStatus): void {
    const agent = agents.value.get(agentId);
    if (agent) {
      agent.status = status;
    }
  }

  /**
   * Handle resource usage updates from Main Process (AGENT-02)
   * Updates are batched - all agents in one payload
   */
  function handleResourceUpdate(payload: ResourceUpdatePayload): void {
    for (const [agentId, usage] of Object.entries(payload.resources)) {
      const agent = agents.value.get(agentId);
      if (agent) {
        agent.resourceUsage = usage;
      }
    }
  }

  /**
   * Kill and remove an agent
   */
  async function killAgent(agentId: string): Promise<void> {
    if (window.electronAPI) {
      try {
        await window.electronAPI.killAgent(agentId);
      } catch (error) {
        console.error(`Failed to kill agent ${agentId}:`, error);
      }
    }
    pausedPreviousStatus.value.delete(agentId);  // FR-01-03: Clean up
    agents.value.delete(agentId);
  }

  /**
   * Pause an agent - stop accepting input (FR-01-03)
   * PTY process continues running, output still displayed
   */
  async function pauseAgent(agentId: string): Promise<boolean> {
    const agent = agents.value.get(agentId);
    if (!agent) {
      console.error(`Agent ${agentId} not found`);
      return false;
    }

    // Already paused
    if (agent.status === 'PAUSED') {
      return true;
    }

    // Store previous status for resume
    pausedPreviousStatus.value.set(agentId, agent.status);

    // Call Main Process
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.pauseAgent(agentId);
        if (!result.success) {
          console.error(`Failed to pause agent ${agentId}:`, result.error);
          pausedPreviousStatus.value.delete(agentId);
          return false;
        }
      } catch (error) {
        console.error(`Failed to pause agent ${agentId}:`, error);
        pausedPreviousStatus.value.delete(agentId);
        return false;
      }
    }

    agent.status = 'PAUSED';
    return true;
  }

  /**
   * Resume a paused agent - restore input capability (FR-01-03)
   */
  async function resumeAgent(agentId: string): Promise<boolean> {
    const agent = agents.value.get(agentId);
    if (!agent) {
      console.error(`Agent ${agentId} not found`);
      return false;
    }

    // Not paused
    if (agent.status !== 'PAUSED') {
      return true;
    }

    // Call Main Process
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.resumeAgent(agentId);
        if (!result.success) {
          console.error(`Failed to resume agent ${agentId}:`, result.error);
          return false;
        }
      } catch (error) {
        console.error(`Failed to resume agent ${agentId}:`, error);
        return false;
      }
    }

    // Restore previous status or default to IDLE
    const previousStatus = pausedPreviousStatus.value.get(agentId) || 'IDLE';
    pausedPreviousStatus.value.delete(agentId);
    agent.status = previousStatus;
    return true;
  }

  /**
   * Check if an agent is paused (FR-01-03)
   */
  function isAgentPaused(agentId: string): boolean {
    const agent = agents.value.get(agentId);
    return agent?.status === 'PAUSED';
  }

  /**
   * Get a specific agent by ID
   */
  function getAgent(agentId: string): AgentSession | undefined {
    return agents.value.get(agentId);
  }

  /**
   * Clear all logs for an agent
   */
  function clearLogs(agentId: string): void {
    const agent = agents.value.get(agentId);
    if (agent) {
      agent.logs = [];
    }
  }

  /**
   * Set tags for an agent (FR-04: Tag-based broadcasting)
   */
  async function setAgentTags(agentId: string, tags: string[]): Promise<boolean> {
    const agent = agents.value.get(agentId);
    if (!agent) {
      console.error(`Agent ${agentId} not found`);
      return false;
    }

    // Update local state
    agent.tags = tags;

    // Sync with Main Process
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.setAgentTags(agentId, tags);
        return result.success;
      } catch (error) {
        console.error(`Failed to set tags for agent ${agentId}:`, error);
        return false;
      }
    }

    return true;
  }

  /**
   * Add a tag to an agent
   */
  async function addAgentTag(agentId: string, tag: string): Promise<boolean> {
    const agent = agents.value.get(agentId);
    if (!agent) return false;

    const currentTags = agent.tags || [];
    if (currentTags.includes(tag)) return true; // Already has tag

    return setAgentTags(agentId, [...currentTags, tag]);
  }

  /**
   * Remove a tag from an agent
   */
  async function removeAgentTag(agentId: string, tag: string): Promise<boolean> {
    const agent = agents.value.get(agentId);
    if (!agent) return false;

    const currentTags = agent.tags || [];
    if (!currentTags.includes(tag)) return true; // Doesn't have tag

    return setAgentTags(agentId, currentTags.filter(t => t !== tag));
  }

  /**
   * Get all unique tags across all agents
   */
  const allTags = computed(() => {
    const tagSet = new Set<string>();
    for (const agent of agents.value.values()) {
      if (agent.tags) {
        for (const tag of agent.tags) {
          tagSet.add(tag);
        }
      }
    }
    return Array.from(tagSet).sort();
  });

  /**
   * Initialize IPC listeners (call once on app mount)
   */
  function initializeIpcListeners(): void {
    if (window.electronAPI) {
      window.electronAPI.onAgentLog(handleIncomingLog);
      window.electronAPI.onAgentStatusChange(updateStatus);
      // Resource monitoring (AGENT-02)
      window.electronAPI.onResourceUpdate(handleResourceUpdate);
    }
  }

  return {
    // State
    agents,
    agentList,
    statusCounts,
    totalMemoryUsage,  // AGENT-02
    allTags,           // FR-04: All unique tags
    logUpdateCounter,  // Performance: counter-based log watching
    // Actions
    spawnAgent,
    sendCommand,
    handleIncomingLog,
    handleResourceUpdate,  // AGENT-02
    updateStatus,
    killAgent,
    pauseAgent,    // FR-01-03
    resumeAgent,   // FR-01-03
    isAgentPaused, // FR-01-03
    getAgent,
    clearLogs,
    setAgentTags,   // FR-04
    addAgentTag,    // FR-04
    removeAgentTag, // FR-04
    initializeIpcListeners,
  };
});
